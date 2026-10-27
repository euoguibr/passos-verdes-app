// Importar corrida do Strava.
// A pessoa conecta a própria conta, escolhe uma corrida e ela entra como lançamento "pendente"
// no desafio (a organização confere como sempre). As chaves do Strava ficam só no servidor.
//
// Variáveis na Vercel: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET (e a FIREBASE_SERVICE_ACCOUNT que já existe).
//
// Ações (?acao=...):
//   link         POST                           -> devolve o endereço de autorização do Strava
//   callback     GET  (o Strava chama)          -> guarda a conexão e mostra "pode voltar para o app"
//   lista        POST {desafio}                 -> últimas corridas do período do desafio (nada é guardado)
//   importar     POST {desafio, id}             -> cria o lançamento pendente com os dados do Strava
//   desconectar  POST                           -> revoga o acesso no Strava e apaga a conexão
const crypto = require('crypto');
const admin = require('firebase-admin');

function getApp() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('Falta a variável FIREBASE_SERVICE_ACCOUNT na Vercel.');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

const API = 'https://www.strava.com/api/v3';
const CORRIDA = ['Run', 'TrailRun', 'VirtualRun'];
const cfg = () => {
  const id = process.env.STRAVA_CLIENT_ID, secret = process.env.STRAVA_CLIENT_SECRET;
  if (!id || !secret) throw Object.assign(new Error('O Strava ainda não foi configurado na Vercel (STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET).'), { status: 503 });
  return { id, secret };
};
const base = req => `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
const corpo = req => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}));

// "state" assinado: liga a volta do Strava à pessoa certa, vale 15 minutos
function assinar(uid, secret) {
  const ts = Date.now().toString(36);
  const sig = crypto.createHmac('sha256', secret).update(uid + '.' + ts).digest('base64url').slice(0, 32);
  return `${uid}.${ts}.${sig}`;
}
function conferir(state, secret) {
  const [uid, ts, sig] = String(state || '').split('.');
  if (!uid || !ts || !sig) return null;
  const ok = crypto.createHmac('sha256', secret).update(uid + '.' + ts).digest('base64url').slice(0, 32);
  if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return null;
  if (Date.now() - parseInt(ts, 36) > 15 * 60 * 1000) return null;
  return uid;
}

async function quem(a, req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) throw Object.assign(new Error('Entre na sua conta.'), { status: 401 });
  try { return await a.auth().verifyIdToken(t); }
  catch (e) { throw Object.assign(new Error('Sua sessão expirou. Feche e abra o app.'), { status: 401 }); }
}

async function trocar(params) {
  const r = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error('O Strava recusou a conexão. Tente conectar de novo.'), { status: 502, detalhe: j });
  return j;
}

// Pega um access_token válido (renova se venceu)
async function acesso(db, uid) {
  const ref = db.doc('stravaTokens/' + uid);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Conecte seu Strava primeiro.'), { status: 409, conectar: true });
  const t = snap.data();
  if (t.expira && t.expira * 1000 > Date.now() + 120000) return t.access;
  const { id, secret } = cfg();
  const j = await trocar({ client_id: id, client_secret: secret, grant_type: 'refresh_token', refresh_token: t.refresh });
  await ref.set({ access: j.access_token, refresh: j.refresh_token, expira: j.expires_at }, { merge: true });
  return j.access_token;
}

async function stravaGet(db, uid, path) {
  const tok = await acesso(db, uid);
  const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + tok } });
  if (r.status === 401) {
    await db.doc('stravaTokens/' + uid).delete().catch(() => {});
    await db.doc('membros/' + uid).set({ stravaConectado: admin.firestore.FieldValue.delete() }, { merge: true }).catch(() => {});
    throw Object.assign(new Error('O acesso ao Strava foi removido. Conecte de novo.'), { status: 409, conectar: true });
  }
  if (r.status === 429) throw Object.assign(new Error('O Strava está recebendo muitos pedidos agora. Tente em alguns minutos.'), { status: 429 });
  if (!r.ok) throw Object.assign(new Error('Não deu para falar com o Strava agora.'), { status: 502 });
  return r.json();
}

// Datas do desafio (YYYY-MM-DD, horário de Brasília) → intervalo em segundos
function periodo(d) {
  const ini = d.inicio ? Date.parse(d.inicio + 'T00:00:00-03:00') : Date.now() - 30 * 864e5;
  const fim = d.fim ? Date.parse(d.fim + 'T23:59:59-03:00') : Date.now();
  return { depois: Math.floor(Math.max(ini, Date.now() - 120 * 864e5) / 1000), antes: Math.floor(fim / 1000) };
}
function tempo(s) { s = Math.round(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
function resumo(at) {
  const km = Math.round((at.distance || 0) / 10) / 100;
  return {
    id: String(at.id), nome: String(at.name || 'Corrida').slice(0, 80), km,
    data: String(at.start_date_local || at.start_date || '').slice(0, 10),
    tempo: tempo(at.moving_time), ritmo: km ? tempo((at.moving_time || 0) / km) : '',
    manual: !!at.manual, tipo: at.sport_type || at.type || ''
  };
}

function pagina(res, titulo, texto, ok) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#050505;color:#F5F7F2;font-family:system-ui,sans-serif;padding:24px;text-align:center}
.c{max-width:360px;display:flex;flex-direction:column;gap:14px;align-items:center}.i{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;font-size:36px;background:${ok ? '#1F2A0F' : '#2a1414'};color:${ok ? '#C8F560' : '#ff8a8a'}}
h1{margin:0;font-size:26px}p{margin:0;color:#8E968C;line-height:1.5}a{display:inline-block;margin-top:6px;background:#C8F560;color:#0B1200;font-weight:700;padding:14px 22px;border-radius:999px;text-decoration:none}</style></head>
<body><div class="c"><div class="i">${ok ? '✓' : '!'}</div><h1>${titulo}</h1><p>${texto}</p><a href="/#desafios">Voltar para o app</a></div>
<script>setTimeout(()=>{location.replace('/#desafios')},${ok ? 1800 : 6000})</script></body></html>`);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const acao = String((req.query && req.query.acao) || '');
  try {
    const a = getApp();
    const db = a.firestore();

    if (acao === 'link') {
      if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' });
      const { id, secret } = cfg();
      const u = await quem(a, req);
      const url = 'https://www.strava.com/oauth/authorize?' + new URLSearchParams({
        client_id: id, response_type: 'code', approval_prompt: 'auto', scope: 'activity:read',
        redirect_uri: base(req) + '/api/strava?acao=callback', state: assinar(u.uid, secret)
      });
      return res.status(200).json({ url });
    }

    if (acao === 'callback') {
      const { id, secret } = cfg();
      if (req.query.error) return pagina(res, 'Conexão cancelada', 'Você não autorizou o acesso. Se quiser, tente de novo pelo app.', false);
      const uid = conferir(req.query.state, secret);
      if (!uid) return pagina(res, 'Link expirado', 'Volte para o app e toque em Importar do Strava de novo.', false);
      const escopo = String(req.query.scope || '');
      if (!escopo.includes('activity:read')) return pagina(res, 'Falta uma permissão', 'Para importar, deixe marcada a opção de ver suas atividades. Tente de novo pelo app.', false);
      const j = await trocar({ client_id: id, client_secret: secret, code: req.query.code, grant_type: 'authorization_code' });
      const at = j.athlete || {};
      await db.doc('stravaTokens/' + uid).set({ access: j.access_token, refresh: j.refresh_token, expira: j.expires_at, atleta: at.id || null, conectado: Date.now() });
      await db.doc('membros/' + uid).set({ stravaConectado: true }, { merge: true });
      return pagina(res, 'Strava conectado!', 'Pronto. Volte para o app e toque em Importar do Strava para escolher sua corrida.', true);
    }

    if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' });
    const u = await quem(a, req);
    const b = corpo(req);

    if (acao === 'desconectar') {
      const ref = db.doc('stravaTokens/' + u.uid);
      const snap = await ref.get();
      if (snap.exists) {
        const t = snap.data();
        await fetch('https://www.strava.com/oauth/deauthorize', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'access_token=' + encodeURIComponent(t.access || '') }).catch(() => {});
        await ref.delete();
      }
      await db.doc('membros/' + u.uid).set({ stravaConectado: admin.firestore.FieldValue.delete() }, { merge: true });
      return res.status(200).json({ ok: true });
    }

    const dsnap = await db.doc('desafios/' + String(b.desafio || '')).get();
    if (!dsnap.exists || !dsnap.data().ativo) return res.status(400).json({ erro: 'Esse desafio não está valendo.' });
    const des = dsnap.data();
    const p = periodo(des);

    if (acao === 'lista') {
      const lista = await stravaGet(db, u.uid, `/athlete/activities?after=${p.depois}&before=${p.antes}&per_page=50`);
      const ja = new Set();
      (await db.collection('lancamentos').where('uid', '==', u.uid).get()).forEach(d => { if (d.id.startsWith('strava-')) ja.add(d.id.slice(7)); });
      const corridas = (Array.isArray(lista) ? lista : []).filter(x => CORRIDA.includes(x.sport_type || x.type) && x.distance > 0)
        .map(resumo).map(x => ({ ...x, enviado: ja.has(x.id) })).slice(0, 20);
      return res.status(200).json({ corridas });
    }

    if (acao === 'importar') {
      const aid = String(b.id || '').replace(/\D/g, '');
      if (!aid) return res.status(400).json({ erro: 'Escolha uma corrida.' });
      const at = await stravaGet(db, u.uid, '/activities/' + aid);
      const tok = (await db.doc('stravaTokens/' + u.uid).get()).data() || {};
      if (!at || !at.athlete || (tok.atleta && String(at.athlete.id) !== String(tok.atleta))) return res.status(403).json({ erro: 'Essa corrida não é sua.' });
      if (!CORRIDA.includes(at.sport_type || at.type)) return res.status(400).json({ erro: 'Só corridas entram no desafio.' });
      const quando = Date.parse(at.start_date) / 1000;
      if (quando < p.depois || quando > p.antes) return res.status(400).json({ erro: 'Essa corrida foi fora do período do desafio.' });
      const r = resumo(at);
      if (!(r.km > 0) || r.km > 300) return res.status(400).json({ erro: 'Distância inválida.' });
      const m = (await db.doc('membros/' + u.uid).get()).data() || {};
      try {
        await db.doc('lancamentos/strava-' + aid).create({
          uid: u.uid, nome: m.apelido || m.nome || u.name || '', desafio: dsnap.id, km: r.km,
          link: 'https://www.strava.com/activities/' + aid, status: 'pendente', criado: Date.now(),
          origem: 'strava', manual: r.manual
        });
      } catch (e) {
        if (e && (e.code === 6 || /already exists/i.test(e.message || ''))) return res.status(409).json({ erro: 'Essa corrida já foi enviada.' });
        throw e;
      }
      return res.status(200).json({ ok: true, km: r.km });
    }

    return res.status(400).json({ erro: 'Ação desconhecida.' });
  } catch (e) {
    const st = e.status || 500;
    if (st >= 500) console.error('strava', e.message, e.detalhe || '');
    if (acao === 'callback') return pagina(res, 'Não deu certo', e.message || 'Tente de novo em instantes.', false);
    return res.status(st).json({ erro: e.message || 'Erro.', conectar: !!e.conectar });
  }
};
