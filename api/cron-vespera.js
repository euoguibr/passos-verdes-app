// Roda todo dia por volta das 18h (Brasília): lembra quem confirmou presença no encontro de amanhã.
const { rodar } = require('./_lib');
module.exports = (req, res) => rodar('vespera', req, res);
