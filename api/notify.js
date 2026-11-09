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
    return { para, titulo: (await nomeDe(db, eu)) + ' começou a te seguir', texto: 'Veja o perfil e siga de volta 💚', url: '/#mural' };
  }
  const id = String(body.id || ''); if (!ID.test(id)) return null;
  const ref = db.doc('duelos/' + id);
  if (body.acao === 'duelo') {
    const v = await marcar(db, ref, 'avisoDe', v => v.de === eu && v.status === 'aberto'); if (!v) return null;
    return { para: v.para, titulo: '⚡ ' + (await nomeDe(db, eu)) + ' te desafiou: prova de ' + v.dist + ' km', texto: 'Tempo pra bater: ' + fmtT(v.tempoDe) + '. Aceita o duelo?', url: '/#galera' };
  }
  if (body.acao === 'duelo-res') {
    const v = await marcar(db, ref, 'avisoRes', v => v.para === eu && v.status === 'feito'); if (!v) return null;
    const ganhou = v.vencedor === v.de, nm = await nomeDe(db, eu);
    return { para: v.de, titulo: ganhou ? '🏆 Você venceu o duelo contra ' + nm : '😤 ' + nm + ' venceu o seu duelo', texto: 'Prova de ' + v.dist + ' km: você ' + fmtT(v.tempoDe) + ' × ' + fmtT(v.tempoPara) + ' ' + nm + (ganhou ? '' : '. Revanche?'), url: '/#galera' };
  }
  return null;
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
    if (body.acao) {
      social = await avisoSocial(db, user.uid, body);
      if (!social) return res.status(200).json({ enviados: 0, ignorado: true });
    } else if (!email || !(await db.doc('admins/' + email).get()).exists) return res.status(403).json({ erro: 'Só organizadores podem enviar avisos.' });

    const tipo = social ? 'social' : (TIPOS.includes(body.tipo) ? body.tipo : 'geral');
    const title = corta(social ? social.titulo : body.titulo, 70);
    const text = corta(social ? social.texto : body.texto, 180);
    const url = social ? social.url : (typeof body.url === 'string' && body.url.startsWith('/') ? body.url.slice(0, 100) : '/');
    if (!title) return res.status(400).json({ erro: 'Escreva um título.' });

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
