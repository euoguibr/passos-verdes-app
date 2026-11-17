// Ações da Gestão com o Banco Inter. Só organizadores (coleção "admins") podem chamar.
// POST /api/inter  { acao, ... }  com o token do Firebase no cabeçalho Authorization.
const { cfg, api, getAdmin, brtISO } = require('./_inter');
const { whatsOk, confere, enviarBoleto } = require('./_whats');

const S_EXTRATO = 'extrato.read';
const S_BOL_R = 'boleto-cobranca.read', S_BOL_W = 'boleto-cobranca.write';
const S_COB = 'cob.read cob.write', S_PIX = 'pix.read', S_HOOK = 'webhook.read webhook.write';

const so = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const dig = s => String(s || '').replace(/\D/g, '');

async function organizador(a, req) {
  const h = req.headers.authorization || '', tok = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!tok) return null;
  try { const u = await a.auth().verifyIdToken(tok); const e = String(u.email || '').toLowerCase();
    if (e && (await a.firestore().doc('admins/' + e).get()).exists) return u; } catch (e) {}
  return null;
}

async function aluno(db, id) {
  const s = await db.doc('caixa_alunos/' + String(id || '')).get();
  if (!s.exists) throw Object.assign(new Error('Aluno não encontrado.'), { status: 404 });
  return { id: s.id, ...s.data() };
}

// Emite um boleto (com Pix) para o aluno e guarda a ligação cobrança → aluno.
async function boleto(db, b) {
  const a = await aluno(db, b.alunoId);
  const venc = /^\d{4}-\d{2}-\d{2}$/.test(b.venc || '') ? b.venc : a.proxVenc;
  const valor = Math.round((+b.valor || +a.valor || 0) * 100) / 100;
  if (dig(a.cpf).length !== 11) throw Object.assign(new Error(`${a.nome}: falta o CPF.`), { status: 400 });
  if (dig(a.cep).length !== 8) throw Object.assign(new Error(`${a.nome}: falta o CEP.`), { status: 400 });
  if (!(valor > 0) || !venc) throw Object.assign(new Error(`${a.nome}: falta valor ou vencimento.`), { status: 400 });
  const fone = dig(a.whatsapp).replace(/^55(?=\d{10,11}$)/, '');
  const conf = (await db.doc('caixa_config/boleto').get()).data() || {};
  const multa = +conf.multa >= 0 ? +conf.multa : 2, juros = +conf.juros >= 0 ? +conf.juros : 1;
  const seu = ('PV' + venc.replace(/-/g, '').slice(2) + a.id.slice(0, 6)).slice(0, 15);
  const body = {
    seuNumero: seu, valorNominal: valor, dataVencimento: venc, numDiasAgenda: +conf.limite || 30,
    pagador: { cpfCnpj: dig(a.cpf), tipoPessoa: 'FISICA', nome: so(a.nome).slice(0, 100), endereco: so(a.endereco || 'NAO INFORMADO').slice(0, 90),
      cidade: so(a.cidade || 'Mage').slice(0, 60), uf: (a.uf || 'RJ').toUpperCase().slice(0, 2), cep: dig(a.cep),
      ...(a.email ? { email: a.email } : {}), ...(fone.length >= 10 ? { ddd: fone.slice(0, 2), telefone: fone.slice(2) } : {}) },
    ...(multa > 0 ? { multa: { codigo: 'PERCENTUAL', taxa: multa } } : {}),
    ...(juros > 0 ? { mora: { codigo: 'TAXAMENSAL', taxa: juros } } : {}),
    mensagem: { linha1: so(b.msg || conf.msg || 'Mensalidade PV Assessoria').slice(0, 78) }
  };
  const r = await api('POST', '/cobranca/v3/cobrancas', S_BOL_W, body);
  const codigo = r.codigoSolicitacao;
  await db.doc('caixa_cobrancas/' + codigo).set({ tipo: 'boleto', alunoId: a.id, nome: a.nome, valor, venc, seuNumero: seu, criado: new Date().toISOString() });
  await db.doc('caixa_alunos/' + a.id).update({ cobranca: 'Boleto', boletoAte: a.boletoAte && a.boletoAte > venc ? a.boletoAte : venc });
  let det = null; try { det = await api('GET', '/cobranca/v3/cobrancas/' + codigo, S_BOL_R); } catch (e) {}
  return { codigo, nome: a.nome, valor, venc, whatsapp: a.whatsapp || '',
    linha: det && det.boleto ? det.boleto.linhaDigitavel : null, pix: det && det.pix ? det.pix.pixCopiaECola : null };
}

// Cobrança Pix imediata (QR com valor exato). Quando cai, o aviso do Inter dá baixa sozinho.
async function pix(db, b) {
  const c = cfg(); if (!c.chave) throw Object.assign(new Error('Falta a variável INTER_PIX_CHAVE na Vercel.'), { status: 503 });
  const a = await aluno(db, b.alunoId);
  const valor = Math.round((+b.valor || +a.valor || 0) * 100) / 100;
  if (!(valor > 0)) throw Object.assign(new Error('Valor inválido.'), { status: 400 });
  const body = { calendario: { expiracao: 7 * 86400 }, valor: { original: valor.toFixed(2) }, chave: c.chave,
    solicitacaoPagador: so(`Mensalidade PV Assessoria - ${a.nome}`).slice(0, 140) };
  if (dig(a.cpf).length === 11) body.devedor = { cpf: dig(a.cpf), nome: so(a.nome).slice(0, 200) };
  const r = await api('POST', '/pix/v2/cob', S_COB, body);
  await db.doc('caixa_cobrancas/' + r.txid).set({ tipo: 'pix', alunoId: a.id, nome: a.nome, valor, criado: new Date().toISOString() });
  return { txid: r.txid, pix: r.pixCopiaECola, valor, nome: a.nome, whatsapp: a.whatsapp || '' };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  // PDF do boleto por link assinado (é o que a Meta baixa para anexar no WhatsApp)
  if (req.method === 'GET' && req.query && req.query.pdf) {
    if (!confere(String(req.query.pdf), req.query.e, req.query.s)) return res.status(403).end();
    try { const r = await api('GET', '/cobranca/v3/cobrancas/' + encodeURIComponent(req.query.pdf) + '/pdf', S_BOL_R);
      res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', 'inline; filename="boleto-pv.pdf"');
      return res.status(200).send(Buffer.from(r.pdf, 'base64')); } catch (e) { return res.status(502).end(); }
  }
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' });
  let a; try { a = getAdmin(); } catch (e) { return res.status(500).json({ erro: e.message }); }
  if (!(await organizador(a, req))) return res.status(401).json({ erro: 'Só organizadores podem usar a integração.' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const db = a.firestore(), c = cfg();
  try {
    switch (b.acao) {
      case 'status': return res.json({ configurado: c.ok, pix: !!c.chave, avisos: !!c.hook, whats: c.ok && whatsOk() });
      case 'saldo': { const r = await api('GET', '/banking/v2/saldo' + (b.data ? '?dataSaldo=' + b.data : ''), S_EXTRATO); return res.json({ saldo: +r.disponivel || 0, bloqueado: (+r.bloqueadoCheque || 0) + (+r.bloqueadoJudicialmente || 0) + (+r.bloqueadoAdministrativo || 0), data: brtISO() }); }
      case 'extrato': {
        const fim = b.fim || brtISO(), ini = b.inicio || fim.slice(0, 8) + '01';
        const r = await api('GET', `/banking/v2/extrato?dataInicio=${ini}&dataFim=${fim}`, S_EXTRATO);
        const L = (r.transacoes || []).map((t, i) => ({ id: [t.dataEntrada, t.tipoOperacao, t.valor, i].join('_'), data: t.dataEntrada, tipo: t.tipoOperacao === 'C' ? 'entrada' : 'saida',
          valor: Math.abs(+t.valor || 0), titulo: t.titulo || t.tipoTransacao || '', descricao: t.descricao || '' }));
        return res.json({ inicio: ini, fim, transacoes: L });
      }
      case 'boleto': return res.json(await boleto(db, b));
      case 'boletoPdf': { const r = await api('GET', '/cobranca/v3/cobrancas/' + encodeURIComponent(b.codigo) + '/pdf', S_BOL_R); return res.json({ pdf: r.pdf }); }
      case 'pix': return res.json(await pix(db, b));
      case 'whats': { if (!whatsOk()) return res.status(503).json({ erro: 'WhatsApp oficial ainda não configurado na Vercel.' });
        const ref = (await db.doc('caixa_cobrancas/' + String(b.codigo || '')).get()).data(); if (!ref) return res.status(404).json({ erro: 'Boleto não encontrado.' });
        await enviarBoleto(db, String(b.codigo), 'vence em ' + ref.venc.slice(8, 10) + '/' + ref.venc.slice(5, 7)); return res.json({ ok: true }); }
      case 'avisos': {
        if (!c.hook || c.hook.length < 16) return res.status(400).json({ erro: 'Crie a variável INTER_WEBHOOK_TOKEN na Vercel (uma senha com 16 ou mais caracteres).' });
        const url = `https://${req.headers.host}/api/inter-webhook?t=${encodeURIComponent(c.hook)}`, feito = [];
        await api('PUT', '/cobranca/v3/cobrancas/webhook', S_BOL_W, { webhookUrl: url }); feito.push('boletos');
        if (c.chave) { await api('PUT', '/pix/v2/webhook/' + encodeURIComponent(c.chave), S_HOOK, { webhookUrl: url }); feito.push('Pix'); }
        return res.json({ ok: true, feito });
      }
      default: return res.status(400).json({ erro: 'Ação desconhecida.' });
    }
  } catch (e) {
    console.error('inter', b.acao, e.status, e.message, e.inter || '');
    return res.status(e.status && e.status < 600 ? e.status : 500).json({ erro: e.message });
  }
};
