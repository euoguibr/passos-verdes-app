// Roda todo dia por volta das 8h (Brasília): parabéns aos aniversariantes e, às segundas, o campeão do jogo.
const { rodar } = require('./_lib');
module.exports = (req, res) => rodar('manha', req, res);
