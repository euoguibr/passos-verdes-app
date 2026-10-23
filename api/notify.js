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
const TIPOS = ['geral', 'eventos', 'noticias', 'desafios', 'loja'];
const INVALIDOS = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument'];
const corta = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

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
    if (!email || !(await db.doc('admins/' + email).get()).exists) return res.status(403).json({ erro: 'Só organizadores podem enviar avisos.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const tipo = TIPOS.includes(body.tipo) ? body.tipo : 'geral';
    const title = corta(body.titulo, 70);
    const text = corta(body.texto, 180);
    const url = typeof body.url === 'string' && body.url.startsWith('/') ? body.url.slice(0, 100) : '/';
    if (!title) return res.status(400).json({ erro: 'Escreva um título.' });

    const [devs, membros] = await Promise.all([db.collection('dispositivos').get(), db.collection('membros').get()]);
    const prefs = {};
    membros.forEach(d => { prefs[d.id] = (d.data() && d.data().avisos) || {}; });
    const tokens = [];
    devs.forEach(d => {
      const v = d.data() || {};
      if (tipo !== 'geral' && (prefs[v.uid] || {})[tipo] === false) return;
      tokens.push(d.id);
    });

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
