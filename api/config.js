// Entrega ao app a chave pública dos avisos (não é segredo).
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ vapidKey: process.env.FIREBASE_VAPID_KEY || '' });
};
