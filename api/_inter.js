// Conexão com a API do Banco Inter (mTLS + OAuth). Arquivo com "_" não vira endereço na Vercel.
// Variáveis na Vercel:
//   INTER_CLIENT_ID, INTER_CLIENT_SECRET  → da tela da integração no Inter
//   INTER_CERT, INTER_KEY                 → conteúdo dos arquivos .crt e .key (texto PEM ou base64)
//   INTER_CONTA                           → conta corrente, só números (opcional)
//   INTER_PIX_CHAVE                       → chave Pix da conta PJ (para cobranças Pix)
//   INTER_WEBHOOK_TOKEN                   → uma senha longa qualquer, protege o endereço dos avisos
const https = require('https');
const admin = require('firebase-admin');

const HOST = 'cdpj.partners.bancointer.com.br';
const pem = v => { v = String(v || '').trim(); if (!v) return ''; return v.includes('BEGIN') ? v.replace(/\\n/g, '\n') : Buffer.from(v, 'base64').toString('utf8'); };

function cfg() {
  const id = process.env.INTER_CLIENT_ID, secret = process.env.INTER_CLIENT_SECRET;
  const cert = pem(process.env.INTER_CERT), key = pem(process.env.INTER_KEY);
  return { ok: !!(id && secret && cert && key), id, secret, cert, key,
    conta: String(process.env.INTER_CONTA || '').replace(/\D/g, ''),
    chave: String(process.env.INTER_PIX_CHAVE || '').trim(),
    hook: String(process.env.INTER_WEBHOOK_TOKEN || '') };
}

let agent = null;
function http(method, path, { body, form, headers = {} } = {}) {
  const c = cfg();
  if (!c.ok) return Promise.reject(Object.assign(new Error('Integração Inter ainda não configurada na Vercel.'), { status: 503 }));
  if (!agent) agent = new https.Agent({ cert: c.cert, key: c.key, keepAlive: true });
  const data = form ? new URLSearchParams(form).toString() : body !== undefined ? JSON.stringify(body) : null;
  const h = { Accept: 'application/json', ...headers };
  if (data) { h['Content-Type'] = form ? 'application/x-www-form-urlencoded' : 'application/json'; h['Content-Length'] = Buffer.byteLength(data); }
  return new Promise((ok, bad) => {
    const r = https.request({ host: HOST, path, method, agent, headers: h, timeout: 20000 }, res => {
      let t = ''; res.on('data', d => t += d); res.on('end', () => {
        let j = null; try { j = t ? JSON.parse(t) : {}; } catch (e) { j = { raw: t }; }
        if (res.statusCode >= 200 && res.statusCode < 300) ok(j);
        else { const msg = (j && (j.detail || j.title || j.message || (j.violacoes && j.violacoes.map(v => v.razao).join('; ')))) || ('Inter respondeu ' + res.statusCode);
          bad(Object.assign(new Error(msg), { status: res.statusCode, inter: j })); }
      });
    });
    r.on('timeout', () => r.destroy(new Error('O Inter demorou para responder.')));
    r.on('error', bad); if (data) r.write(data); r.end();
  });
}

// Um token por conjunto de permissões, guardado enquanto vale.
const tokens = {};
async function token(scope) {
  const t = tokens[scope]; if (t && Date.now() < t.exp - 60000) return t.v;
  const c = cfg();
  const r = await http('POST', '/oauth/v2/token', { form: { client_id: c.id, client_secret: c.secret, grant_type: 'client_credentials', scope } });
  tokens[scope] = { v: r.access_token, exp: Date.now() + (+r.expires_in || 3600) * 1000 };
  return r.access_token;
}
async function api(method, path, scope, body) {
  const c = cfg(), tk = await token(scope);
  const headers = { Authorization: 'Bearer ' + tk }; if (c.conta) headers['x-conta-corrente'] = c.conta;
  return http(method, path, { body, headers });
}

function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('Falta a variável FIREBASE_SERVICE_ACCOUNT na Vercel.');
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
  }
  return admin;
}

// ---- datas e regras iguais às da Gestão ----
const pad = n => String(n).padStart(2, '0');
const brtISO = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
function addMonth(iso, dia, k = 1) {
  let y = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + k; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  const last = new Date(y, m + 1, 0).getDate(); return y + '-' + pad(m + 1) + '-' + pad(Math.min(dia || +iso.slice(8), last));
}

// Registra a mensalidade paga uma vez só (o id do documento é a chave da cobrança).
async function baixaMensalidade(db, { chave, alunoId, valor, data, forma }) {
  const pagRef = db.doc('caixa_pagamentos/inter_' + chave), alRef = db.doc('caixa_alunos/' + alunoId);
  return db.runTransaction(async tx => {
    const [p, a] = await Promise.all([tx.get(pagRef), tx.get(alRef)]);
    if (p.exists || !a.exists) return false;
    const al = a.data(), novo = addMonth(al.proxVenc || data, al.dia);
    tx.set(pagRef, { alunoId, nome: al.nome, valor, data, forma, interId: chave, registradoEm: new Date().toISOString(), vencAnterior: al.proxVenc || null, ultimoAnterior: al.ultimoPgto || null, automatico: true });
    tx.update(alRef, { ultimoPgto: data, proxVenc: novo });
    return true;
  });
}

// Confirma um pedido da loja pago no Pix (mesma lógica do botão "Confirmar pagamento").
const vkey = (t, c) => (t || '-') + '|' + (c || '-');
const controla = p => !!(p && p.estoque && typeof p.estoque === 'object');
const estTotal = p => Object.values(p.estoque || {}).reduce((s, v) => s + (+v || 0), 0);
const pedDesc = p => `${p.qtd || 1}x ${p.produto || 'Produto'}${p.tamanho ? ' · ' + p.tamanho : ''}${p.cor ? ' · ' + p.cor : ''}`;
async function confirmaPedido(db, id, { valor, data, e2e }) {
  const pe = db.doc('pedidos/' + id);
  return db.runTransaction(async tx => {
    const ps = await tx.get(pe); if (!ps.exists) return false; const p = ps.data();
    if ((p.status || 'novo') !== 'novo') return false;
    if (valor + 0.009 < (+p.total || 0)) return false; // pagou menos que o pedido: deixa para a equipe conferir
    const pr = p.produtoId ? db.doc('produtos/' + p.produtoId) : null, prs = pr ? await tx.get(pr) : null, prod = prs && prs.exists ? prs.data() : null;
    const q = +p.qtd || 1, k = vkey(p.tamanho, p.cor); let baixou = false, encomenda = false, upd = null;
    if (prod && (controla(prod) || prod.encomenda)) {
      if (prod.encomenda) encomenda = true;
      else { const cur = +prod.estoque[k] || 0; if (cur >= q) { const est = { ...prod.estoque, [k]: cur - q }; upd = { estoque: est, esgotado: controla(prod) && !prod.encomenda && estTotal({ estoque: est }) <= 0 }; baixou = true; } else encomenda = true; }
    }
    const lr = db.collection('caixa_lancamentos').doc();
    tx.set(lr, { tipo: 'entrada', frente: 'produtos', eventoId: null, desc: `Venda · ${pedDesc(p)}${p.nome ? ' · ' + p.nome : ''}`, cat: 'Venda de camisas', qtd: q, unit: Math.round(valor / q * 100) / 100, valor, data, previsto: false, registradoEm: new Date().toISOString(), pedidoId: id, interId: e2e });
    tx.update(pe, { status: 'pago', pagoEm: data, forma: 'Pix', valorPago: valor, caixaId: lr.id, baixouEstoque: baixou, encomenda, confirmadoPor: 'Inter (automático)' });
    if (upd) tx.update(pr, upd);
    return true;
  });
}

module.exports = { cfg, api, getAdmin, brtISO, addMonth, baixaMensalidade, confirmaPedido };
