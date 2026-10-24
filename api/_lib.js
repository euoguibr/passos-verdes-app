// Funções compartilhadas pelos avisos automáticos (arquivos com "_" não viram endereço na Vercel).
const admin = require('firebase-admin');

function getApp() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('Falta a variável FIREBASE_SERVICE_ACCOUNT na Vercel.');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}
const INVALIDOS = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'];
const corta = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

// Datas no horário de Brasília
function brtISO(d = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
function addDias(iso, n) { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); }
function diaSemana(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); } // 0 = domingo
function segundaDe(iso) { return addDias(iso, -((diaSemana(iso) + 6) % 7)); }
function dataLonga(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }

async function tokensPorUid(db) {
  const map = {};
  (await db.collection('dispositivos').get()).forEach(d => { const u = (d.data() || {}).uid; if (u) (map[u] = map[u] || []).push(d.id); });
  return map;
}
async function enviar(a, tokens, msg) {
  tokens = [...new Set(tokens)];
  let enviados = 0; const remover = [];
  for (let i = 0; i < tokens.length; i += 500) {
    const lote = tokens.slice(i, i + 500);
    const r = await a.messaging().sendEachForMulticast({
      tokens: lote,
      data: { title: corta(msg.title, 70), body: corta(msg.body, 180), url: msg.url || '/', tag: msg.tag || ('auto-' + Date.now()) },
      webpush: { headers: { Urgency: 'high', TTL: '43200' } }
    });
    enviados += r.successCount;
    r.responses.forEach((x, j) => { if (!x.success && x.error && INVALIDOS.includes(x.error.code)) remover.push(lote[j]); });
  }
  await Promise.all(remover.map(t => a.firestore().doc('dispositivos/' + t).delete().catch(() => {})));
  return enviados;
}

// Quem pode rodar: a própria Vercel (CRON_SECRET) ou um organizador em modo de teste.
async function autorizar(a, req) {
  const h = req.headers.authorization || '';
  const secret = process.env.CRON_SECRET;
  if (secret && h === 'Bearer ' + secret) return { modo: 'cron' };
  const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  try {
    const u = await a.auth().verifyIdToken(tok);
    const email = String(u.email || '').toLowerCase();
    if (email && (await a.firestore().doc('admins/' + email).get()).exists) return { modo: 'teste', uid: u.uid };
  } catch (e) {}
  return null;
}

const nomeDe = m => (m && (m.apelido || (m.nome || '').split(' ')[0])) || 'corredor(a)';

async function vespera(a, ctx) {
  const db = a.firestore();
  const amanha = addDias(brtISO(), 1);
  const [evs, membros, toks] = await Promise.all([db.collection('eventos').where('data', '==', amanha).get(), db.collection('membros').get(), tokensPorUid(db)]);
  const resumo = [];
  if (evs.empty) return ['Nenhum encontro amanhã'];
  for (const e of evs.docs) {
    const ev = e.data();
    const uids = []; membros.forEach(m => { const p = (m.data() || {}).presencas || {}; if (p[e.id]) uids.push(m.id); });
    const msg = {
      title: `Amanhã tem ${String(ev.tipo || 'treino').toLowerCase()}: ${ev.titulo}`,
      body: [ev.hora, ev.local].filter(Boolean).join(' · ') + '. Você confirmou presença. Te esperamos!',
      url: '/#agenda', tag: 'vespera-' + e.id
    };
    if (ctx.modo === 'teste') { const n = await enviar(a, toks[ctx.uid] || [], { ...msg, title: '[Teste] ' + msg.title }); resumo.push(`${ev.titulo}: ${uids.length} confirmados (teste enviado para ${n} aparelho${n === 1 ? '' : 's'} seu${n === 1 ? '' : 's'})`); }
    else { const n = await enviar(a, uids.flatMap(u => toks[u] || []), msg); resumo.push(`${ev.titulo}: ${n} avisos`); }
  }
  return resumo;
}

async function manha(a, ctx) {
  const db = a.firestore(); const hoje = brtISO(); const resumo = [];
  const [membros, toks] = await Promise.all([db.collection('membros').get(), tokensPorUid(db)]);
  // Aniversários
  const [, mm, dd] = hoje.split('-').map(Number);
  const aniv = [];
  membros.forEach(m => { const v = String((m.data() || {}).aniversario || ''); const r = v.match(/^(\d{1,2})\/(\d{1,2})$/); if (r && Number(r[1]) === dd && Number(r[2]) === mm) aniv.push({ uid: m.id, m: m.data() }); });
  for (const p of aniv) {
    const msg = { title: `Feliz aniversário, ${nomeDe(p.m)}! 🎉`, body: 'A família Passos Verdes deseja muitos quilômetros felizes. Bora comemorar correndo?', url: '/#perfil', tag: 'aniv-' + hoje };
    if (ctx.modo === 'teste') await enviar(a, toks[ctx.uid] || [], { ...msg, title: '[Teste] ' + msg.title });
    else await enviar(a, toks[p.uid] || [], msg);
  }
  resumo.push(aniv.length ? `${aniv.length} aniversariante${aniv.length === 1 ? '' : 's'} hoje` : 'Nenhum aniversário hoje');
  // Campeão da semana (às segundas)
  if (diaSemana(hoje) === 1 || ctx.modo === 'teste') {
    const semana = addDias(segundaDe(hoje), -7);
    const top = await db.collection('jogo').doc(semana).collection('placar').orderBy('pontos', 'desc').limit(1).get();
    if (top.empty) resumo.push('Ninguém jogou na semana passada');
    else {
      const c = top.docs[0].data();
      const premio = ((await db.doc('projeto/info').get()).data() || {}).premioJogo || '';
      const nome = nomeDe((membros.docs.find(d => d.id === c.uid) || { data: () => ({ nome: c.nome }) }).data());
      const msg = { title: `🏆 Campeão da semana: ${nome}`, body: `${Number(c.pontos || 0).toLocaleString('pt-BR')} pontos no Corre, Verde!${premio ? ' Prêmio: ' + premio + '.' : ''} O ranking zerou. Bora?`, url: '/#galera', tag: 'campeao-' + semana };
      if (ctx.modo === 'teste') { await enviar(a, toks[ctx.uid] || [], { ...msg, title: '[Teste] ' + msg.title }); resumo.push('Campeão: ' + nome); }
      else {
        const ref = db.doc('campeoes/' + semana);
        if (!(await ref.get()).exists) {
          await ref.set({ uid: c.uid, nome: c.nome || '', pontos: c.pontos || 0, semana, criado: Date.now() });
          const n = await enviar(a, Object.values(toks).flat(), msg); resumo.push(`Campeão ${nome} anunciado (${n} avisos)`);
        } else resumo.push('Campeão já anunciado');
      }
    }
  }
  return resumo;
}

async function rodar(tarefa, req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const a = getApp();
    const ctx = await autorizar(a, req);
    if (!ctx) return res.status(401).json({ erro: 'Sem permissão.' });
    const db = a.firestore();
    if (ctx.modo === 'cron') {
      // trava para não enviar duas vezes no mesmo dia
      const trava = db.doc('envios/' + tarefa + '-' + brtISO());
      try { await trava.create({ criado: Date.now() }); } catch (e) { return res.status(200).json({ ok: true, resumo: ['Já enviado hoje'] }); }
    }
    const resumo = tarefa === 'vespera' ? await vespera(a, ctx) : await manha(a, ctx);
    return res.status(200).json({ ok: true, modo: ctx.modo, resumo });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: e.message || 'Erro.' });
  }
}
module.exports = { rodar, brtISO, addDias, diaSemana, segundaDe };
