// Avisos do Banco Inter: boleto pago ou Pix recebido.
// Nunca confia só no aviso: confere direto na API do Inter antes de dar baixa.
const { cfg, api, getAdmin, brtISO, baixaMensalidade, confirmaPedido } = require('./_inter');

const dataBR = s => { try { return brtISO(new Date(s)); } catch (e) { return brtISO(); } };

async function boletoPago(db, item) {
  const codigo = item.codigoSolicitacao; if (!codigo) return 'sem código';
  const det = await api('GET', '/cobranca/v3/cobrancas/' + encodeURIComponent(codigo), 'boleto-cobranca.read');
  const cob = det.cobranca || {};
  if (!/RECEBIDO|PAGO|MARCADO_RECEBIDO/i.test(cob.situacao || '')) return 'não pago: ' + cob.situacao;
  const ref = (await db.doc('caixa_cobrancas/' + codigo).get()).data();
  if (!ref || !ref.alunoId) return 'cobrança de fora da Gestão';
  const valor = +cob.valorTotalRecebido || +item.valorTotalRecebido || +ref.valor;
  const ok = await baixaMensalidade(db, { chave: codigo, alunoId: ref.alunoId, valor, data: dataBR(cob.dataSituacao || item.dataHoraSituacao || Date.now()), forma: 'Boleto' });
  return ok ? 'baixa feita' : 'já registrado';
}

async function pixRecebido(db, item) {
  const e2e = item.endToEndId; if (!e2e) return 'sem id';
  const p = await api('GET', '/pix/v2/pix/' + encodeURIComponent(e2e), 'pix.read');
  const txid = p.txid || item.txid || '', valor = +p.valor || 0, data = dataBR(p.horario || Date.now());
  if (!txid || !(valor > 0)) return 'Pix sem identificação';
  const ref = (await db.doc('caixa_cobrancas/' + txid).get()).data();
  if (ref && ref.alunoId) return (await baixaMensalidade(db, { chave: txid, alunoId: ref.alunoId, valor, data, forma: 'Pix' })) ? 'mensalidade' : 'já registrado';
  // Pedido da loja: o QR do app usa o identificador "PV" + id do pedido
  if (/^PV[A-Za-z0-9]{10,}$/.test(txid)) return (await confirmaPedido(db, txid.slice(2), { valor, data, e2e })) ? 'pedido pago' : 'pedido não confirmado';
  return 'Pix avulso';
}

module.exports = async (req, res) => {
  const c = cfg();
  if (!c.hook || req.query.t !== c.hook) return res.status(401).end();
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const db = getAdmin().firestore(), log = [];
  try {
    const boletos = Array.isArray(body) ? body : body && body.codigoSolicitacao ? [body] : [];
    for (const it of boletos) log.push(await boletoPago(db, it).catch(e => 'erro: ' + e.message));
    for (const it of (body && body.pix) || []) log.push(await pixRecebido(db, it).catch(e => 'erro: ' + e.message));
    await db.collection('caixa_avisos_inter').add({ em: new Date().toISOString(), resultado: log }).catch(() => {});
  } catch (e) { console.error('inter-webhook', e); }
  return res.status(200).json({ ok: true, resultado: log });
};
