// Envia um aviso para os celulares que ativaram as notificações.
// Só organizadores (coleção "admins" no Firestore) podem disparar.
const admin = require('firebase-admin');

function getApp() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('Falta a variável FIREBASE_SERVICE_ACCOUNT na Vercel.');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}
const TIPOS = ['geral', 'eventos', 'noticias', 'desafios', 'loja', 'folhas'];
const INVALIDOS = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'];
const corta = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

const ID = /^[A-Za-z0-9_-]{1,160}$/;
const fmtT = t => { t = Math.max(0, Math.round(Number(t) || 0)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), x = t % 60; return (h ? h + 'h' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
async function nomeDe(db, uid) { const m = (await db.doc('membros/' + uid).get()).data() || {}; return corta(m.apelido || m.nome || 'Alguém', 28); }
// Marca o aviso como enviado numa transação, para cada aviso sair uma vez só.
async function marcar(db, ref, campo, ok) {
  return db.runTransaction(async tx => {
    const d = await tx.get(ref); if (!d.exists) return null; const v = d.data();
    if (v[campo] || !ok(v)) return null; tx.update(ref, { [campo]: Date.now() }); return v;
  });
}
async function avisoSocial(db, eu, body) {
  if (body.acao === 'seguir') {
    const para = String(body.uid || ''); if (!ID.test(para) || para === eu) return null;
    const v = await marcar(db, db.doc('seguidores/' + eu + '_' + para), 'avisado', v => v.de === eu && v.para === para);
    if (!v) return null;
    return { para, titulo: (await nomeDe(db, eu)) + ' começou a te seguir', texto: 'Toque pra ver o perfil e seguir de volta 💚', url: '/#p=' + eu };
  }
  const id = String(body.id || ''); if (!ID.test(id)) return null;
  if (body.acao === 'curtida') { // só vai pra caixa de notificações, sem push
    const p = (await db.doc('mural/' + id).get()).data();
    if (!p || p.uid === eu || !(p.curtidas || {})[eu]) return null;
    return { para: p.uid, semPush: true, docId: 'curtida_' + id + '_' + eu, titulo: (await nomeDe(db, eu)) + ' curtiu seu treino 💚', texto: corta(p.texto || (p.km ? p.km + ' km' : 'Seu post no Mural'), 80), url: '/#mural' };
  }
  const ref = db.doc('duelos/' + id);
  if (body.acao === 'duelo') {
    const v = await marcar(db, ref, 'avisoDe', v => v.de === eu && v.status === 'aberto'); if (!v) return null;
    return { para: v.para, titulo: '⚡ ' + (await nomeDe(db, eu)) + (v.jogo === 'mandala' ? ' te desafiou na Mandala PV' : ' te desafiou: Prova PV ' + v.dist + ' km'), texto: v.jogo === 'mandala' ? 'Passe de ' + v.alvo + ' medalhas seguidas pra vencer. Aceita o duelo?' : 'Tempo pra bater: ' + fmtT(v.tempoDe) + '. Aceita o duelo?', url: '/#galera' };
  }
  if (body.acao === 'duelo-res') {
    const v = await marcar(db, ref, 'avisoRes', v => v.para === eu && v.status === 'feito'); if (!v) return null;
    const ganhou = v.vencedor === v.de, nm = await nomeDe(db, eu);
    return { para: v.de, titulo: ganhou ? '🏆 Você venceu o duelo contra ' + nm : '😤 ' + nm + ' venceu o seu duelo', texto: (v.jogo === 'mandala' ? 'Mandala PV: você ' + v.alvo + ' × ' + v.resposta + ' ' : 'Prova ' + v.dist + ' km: você ' + fmtT(v.tempoDe) + ' × ' + fmtT(v.tempoPara) + ' ') + nm + (ganhou ? '' : '. Revanche?'), url: '/#galera' };
  }
  return null;
}

// "Fulano passou você no ranking": o servidor confere as pontuações antes de avisar.
const JOGOS = { corre: ['jogo', 'pontos', 1, 'Corre, Verde!'], mandala: ['mandala', 'pontos', 1, 'Mandala PV'] };
async function ultrapassou(a, db, eu, isAdmin, body) {
  const alvos = (Array.isArray(body.alvos) ? body.alvos : []).filter(u => typeof u === 'string' && ID.test(u)).slice(0, 10);
  if (!alvos.length) return 0;
  let quem = eu, mapa = {}, maior = true, nomeR = '', periodo = '', url = '/#galera', tipo = 'social', fmt = v => String(v);
  if (body.jogo === 'km') {
    if (!isAdmin) return 0;
    quem = String(body.quem || ''); const des = String(body.desafio || '');
    if (!ID.test(quem) || !ID.test(des)) return 0;
    (await db.collection('lancamentos').where('desafio', '==', des).where('status', '==', 'aprovado').get()).forEach(d => { const v = d.data(); mapa[v.uid] = (mapa[v.uid] || 0) + (Number(v.km) || 0); });
    nomeR = des.startsWith('semana-') ? 'desafio da semana' : corta(((await db.doc('desafios/' + des).get()).data() || {}).titulo || 'desafio', 40);
    periodo = des; url = '/#desafios'; tipo = 'desafios'; fmt = v => (Math.round(v * 10) / 10).toLocaleString('pt-BR') + ' km';
  } else {
    const sem = String(body.sem || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(sem)) return 0;
    let col, campo;
    if (body.jogo === 'prova') { const d = Number(body.dist); if (![5, 10, 15, 21, 42].includes(d)) return 0; col = 'prova'; campo = 't' + d; maior = false; nomeR = 'Prova PV ' + d + ' km'; periodo = sem + d; fmt = v => fmtT(v); }
    else if (JOGOS[body.jogo]) { [col, campo, , nomeR] = JOGOS[body.jogo]; periodo = sem; fmt = v => Number(v).toLocaleString('pt-BR'); }
    else return 0;
    (await db.collection(col).doc(sem).collection('placar').get()).forEach(d => { const v = Number(d.data()[campo]); if (v > 0) mapa[d.id] = v; });
  }
  const meu = mapa[quem]; if (!(meu > 0)) return 0;
  const melhor = (x, y) => maior ? x > y : x < y;
  const ordem = Object.entries(mapa).sort((x, y) => maior ? y[1] - x[1] : x[1] - y[1]).map(e => e[0]);
  const nm = await nomeDe(db, quem); let n = 0;
  for (const alvo of alvos) {
    if (alvo === quem || !(alvo in mapa) || !melhor(meu, mapa[alvo])) continue;
    const pos = ordem.indexOf(alvo) + 1;
    if (pos > 4) continue; // só avisa quem estava no pódio (top 3) e acabou de cair
    const doc = { para: alvo, de: quem, tipo, titulo: '⚠️ ' + nm + ' passou você no ' + nomeR, texto: body.jogo === 'km' ? 'Agora você está em ' + pos + 'º com ' + fmt(mapa[alvo]) + '. Bora correr?' : 'Você caiu pro ' + pos + 'º lugar no ranking da semana. Bora recuperar?', url, criado: Date.now() };
    try { await db.doc('notificacoes/ultra_' + String(body.jogo) + '_' + periodo + '_' + quem + '_' + alvo).create(doc); } catch (e) { continue; } // já avisou essa semana
    const toks = []; (await db.collection('dispositivos').where('uid', '==', alvo).get()).forEach(d => toks.push(d.id));
    if (toks.length) { try { await a.messaging().sendEachForMulticast({ tokens: toks, data: { title: corta(doc.titulo, 70), body: corta(doc.texto, 180), url, tag: 'ranking-' + Date.now() }, webpush: { headers: { Urgency: 'high', TTL: '86400' } } }); } catch (e) {} }
    n++;
  }
  return n;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' });
  try {
    const a = getApp();
    const db = a.firestore();
    const h = req.headers.authorization || '';
    const idToken = h.startsWith('Bearer ') ? h.slice(7) : '';
    if (!idToken) return res.status(401).json({ erro: 'Entre na sua conta.' });
    const user = await a.auth().verifyIdToken(idToken);
    const email = String(user.email || '').toLowerCase();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // Avisos sociais (qualquer pessoa logada): o servidor confere no banco e monta o texto.
    let social = null;
    if (body.acao === 'ultrapassou') {
      const adm = !!email && (await db.doc('admins/' + email).get()).exists;
      return res.status(200).json({ avisados: await ultrapassou(a, db, user.uid, adm, body) });
    }
    if (body.acao) {
      social = await avisoSocial(db, user.uid, body);
      if (!social) return res.status(200).json({ enviados: 0, ignorado: true });
    } else if (!email || !(await db.doc('admins/' + email).get()).exists) return res.status(403).json({ erro: 'Só organizadores podem enviar avisos.' });

    const tipo = social ? 'social' : (TIPOS.includes(body.tipo) ? body.tipo : 'geral');
    const title = corta(social ? social.titulo : body.titulo, 70);
    const text = corta(social ? social.texto : body.texto, 180);
    const url = social ? social.url : (typeof body.url === 'string' && body.url.startsWith('/') ? body.url.slice(0, 100) : '/');
    if (!title) return res.status(400).json({ erro: 'Escreva um título.' });

    // caixa de notificações do app (o sininho): pessoal ou para todo mundo
    const inbox = { tipo, titulo: title, texto: text, url, criado: Date.now() };
    const paraInbox = social ? social.para : (typeof body.uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(body.uid) ? body.uid : '');
    try {
      if (paraInbox) {
        const d = { ...inbox, para: paraInbox, de: social ? user.uid : '' };
        if (social && social.docId) await db.doc('notificacoes/' + social.docId).create(d); else await db.collection('notificacoes').add(d);
      } else await db.collection('avisos').add(inbox);
    } catch (e) { if (social && social.docId) return res.status(200).json({ enviados: 0, repetido: true }); console.warn('inbox', e.message); }
    if (social && social.semPush) return res.status(200).json({ enviados: 0, inbox: true });

    const tokens = [];
    // Aviso pessoal (ex.: "você ganhou folhas"): só os celulares dessa pessoa.
    const para = social ? social.para : (typeof body.uid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(body.uid) ? body.uid : '');
    if (para) {
      if (social) { const m = (await db.doc('membros/' + para).get()).data() || {}; if ((m.avisos || {}).social === false) return res.status(200).json({ enviados: 0 }); }
      (await db.collection('dispositivos').where('uid', '==', para).get()).forEach(d => tokens.push(d.id));
    } else {
      const [devs, membros] = await Promise.all([db.collection('dispositivos').get(), db.collection('membros').get()]);
      const prefs = {};
      membros.forEach(d => { prefs[d.id] = (d.data() && d.data().avisos) || {}; });
      devs.forEach(d => {
        const v = d.data() || {};
        if (tipo !== 'geral' && (prefs[v.uid] || {})[tipo] === false) return;
        tokens.push(d.id);
      });
    }

    let enviados = 0, falhas = 0;
    const remover = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const lote = tokens.slice(i, i + 500);
      const r = await a.messaging().sendEachForMulticast({
        tokens: lote,
        data: { title, body: text, url, tag: tipo + '-' + Date.now() },
        webpush: { headers: { Urgency: 'high', TTL: '86400' } }
      });
      enviados += r.successCount; falhas += r.failureCount;
      r.responses.forEach((x, j) => { if (!x.success && x.error && INVALIDOS.includes(x.error.code)) remover.push(lote[j]); });
    }
    await Promise.all(remover.map(t => db.doc('dispositivos/' + t).delete().catch(() => {})));
    return res.status(200).json({ enviados, falhas, removidos: remover.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: e.message || 'Erro ao enviar.' });
  }
};
