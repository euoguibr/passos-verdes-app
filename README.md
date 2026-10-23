# App Passos Verdes

App da comunidade de corrida Passos Verdes (Magé/RJ): agenda com confirmação de presença,
desafios com ranking de km, enquetes, quiz, notícias e painel da equipe.

- Hospedagem: Vercel (site estático, sem build)
- Login e banco: Firebase (Google + Firestore)
- Organizadores: documentos na coleção `admins` do Firestore, com o e-mail Google como ID
- Regras de segurança: `firestore.rules` (colar em Firestore > Regras)
