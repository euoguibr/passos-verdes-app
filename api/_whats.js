// Envio automático do boleto pelo WhatsApp oficial (API Cloud da Meta).
// Variáveis na Vercel:
//   WHATSAPP_TOKEN     → token permanente do app na Meta
//   WHATSAPP_PHONE_ID  → ID do número que envia (Phone number ID)
//   WHATSAPP_TEMPLATE  → nome do modelo aprovado (padrão: mensalidade_boleto)
//   APP_URL            → endereço do app (opcional; a Vercel já informa o domínio de produção)
// O modelo precisa ter: cabeçalho DOCUMENTO e corpo com 4 variáveis:
//   {{1}} primeiro nome · {{2}} valor · {{3}} "vence hoje" / "vence em 3 dias (dd/mm)" · {{4}} Pix copia e cola
const https = require('https');
const crypto = require('crypto');
const { api, cfg: interCfg, brtISO } = require('./_inter');

const wcfg = () => ({ token: process.env.WHATSAPP_TOKEN || '', phone: process.env.WHATSAPP_PHONE_ID || '',
  template: process.env.WHATSAPP_TEMPLATE || 'mensalidade_boleto', lang: process.env.WHATSAPP_LANG || 'pt_BR',
  host: String(process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, '') });
const whatsOk = () => { const c = wcfg(); return !!(c.token && c.phone && c.host && interCfg().hook); };

// Link do PDF assinado e com validade, para a Meta buscar o arquivo.
const assina = (codigo, exp) => crypto.createHmac('sha256', interCfg().hook).update(codigo + '.' + exp).digest('hex').slice(0, 32);
function linkPdf(codigo, dias = 7) { const exp = Date.now() + dias * 864e5; return `https://${wcfg().host}/api/inter?pdf=${encodeURIComponent(codigo)}&e=${exp}&s=${assina(codigo, exp)}`; }
function confere(codigo, exp, s) { if (!codigo || !(+exp > Date.now()) || !interCfg().hook) return false;
  const a = Buffer.from(assina(codigo, exp)), b = Buffer.from(String(s || '')); return a.length === b.length && crypto.timingSafeEqual(a, b); }

function graph(path, body) {
  const c = wcfg(), data = JSON.stringify(body);
  return new Promise((ok, bad) => {
    const r = https.request({ host: 'graph.facebook.com', path: '/v21.0/' + path, method: 'POST', timeout: 20000,
      headers: { Authorization: 'Bearer ' + c.token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, res => {
      let t = ''; res.on('data', d => t += d); res.on('end', () => { let j = {}; try { j = JSON.parse(t); } catch (e) {}
        res.statusCode < 300 ? ok(j) : bad(new Error((j.error && (j.error.error_user_msg || j.error.message)) || 'WhatsApp respondeu ' + res.statusCode)); });
    });
    r.on('timeout', () => r.destroy(new Error('WhatsApp demorou para responder.'))); r.on('error', bad); r.write(data); r.end();
  });
}
const fone = w => { let n = String(w || '').replace(/\D/g, ''); if (n.length === 10 || n.length === 11) n = '55' + n; return n.length >= 12 ? n : null; };
const reais = v => 'R$ ' + (+v).toFixed(2).replace('.', ',');
const ddmm = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7);

async function enviarBoleto(db, codigo, quando) {
  const c = wcfg(), ref = db.doc('caixa_cobrancas/' + codigo), cob = (await ref.get()).data();
  if (!cob) throw new Error('Cobrança não encontrada.');
  const al = (await db.doc('caixa_alunos/' + cob.alunoId).get()).data() || {};
  const to = fone(al.whatsapp); if (!to) throw new Error(`${cob.nome}: sem WhatsApp cadastrado.`);
  let pix = '-'; try { const d = await api('GET', '/cobranca/v3/cobrancas/' + encodeURIComponent(codigo), 'boleto-cobranca.read'); if (d.pix && d.pix.pixCopiaECola) pix = d.pix.pixCopiaECola; } catch (e) {}
  const nome = String(al.nome || cob.nome || 'aluno').split(' ')[0];
  await graph(c.phone + '/messages', { messaging_product: 'whatsapp', to, type: 'template', template: { name: c.template, language: { code: c.lang }, components: [
    { type: 'header', parameters: [{ type: 'document', document: { link: linkPdf(codigo), filename: `Boleto PV Assessoria ${ddmm(cob.venc)}.pdf` } }] },
    { type: 'body', parameters: [nome, reais(cob.valor), quando, pix].map(text => ({ type: 'text', text })) }] } });
  return cob;
}

// Roda junto com o aviso das 8h: manda o boleto 3 dias antes e no dia do vencimento.
async function lembretesBoleto(db) {
  if (!whatsOk()) return [];
  const hoje = brtISO(), d3 = new Date(Date.UTC(+hoje.slice(0, 4), +hoje.slice(5, 7) - 1, +hoje.slice(8, 10) + 3)).toISOString().slice(0, 10);
  const snap = await db.collection('caixa_cobrancas').where('venc', 'in', [hoje, d3]).get(), out = [];
  for (const d of snap.docs) {
    const cob = d.data(); if (cob.tipo !== 'boleto') continue;
    const etapa = cob.venc === hoje ? 'd0' : 'd3';
    if ((cob.avisos || {})[etapa]) continue;
    if ((await db.doc('caixa_pagamentos/inter_' + d.id).get()).exists) continue; // já pagou
    try {
      await enviarBoleto(db, d.id, etapa === 'd0' ? 'vence hoje' : `vence em 3 dias (${ddmm(cob.venc)})`);
      await d.ref.set({ avisos: { [etapa]: new Date().toISOString() } }, { merge: true }); out.push(`Boleto enviado: ${cob.nome}`);
    } catch (e) { await d.ref.set({ avisoErro: e.message }, { merge: true }); out.push(`Falhou ${cob.nome}: ${e.message}`); }
  }
  return out;
}

// Link do PDF para mandar à mão (vale até 15 dias depois do vencimento)
function linkManual(codigo, venc) { if (!interCfg().hook || !wcfg().host) return null;
  const dias = Math.max(7, Math.ceil((Date.parse(venc + 'T12:00:00Z') - Date.now()) / 864e5) + 15); return linkPdf(codigo, dias); }

module.exports = { whatsOk, confere, enviarBoleto, lembretesBoleto, linkManual };
