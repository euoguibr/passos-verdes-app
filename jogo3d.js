// Corre, Verde! 3D — corrida de frente pelas ruas de Magé.
// Carregado só quando alguém abre o jogo. Usa three.js pelo CDN.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

/* ---------- o corredor Passos Verdes ---------- */
const LANES = [-2.4, 0, 2.4];
const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
let GRAD = null;
function toon(c) {
  if (!GRAD) { GRAD = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]), 3, 1); GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true; }
  return new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD });
}
const CONTORNO = new THREE.MeshBasicMaterial({ color: 0x0b1200, side: THREE.BackSide });
function contorno(m, k = 1.07) { const o = new THREE.Mesh(m.geometry, CONTORNO); o.scale.setScalar(k); o.raycast = () => {}; m.add(o); return m; }

function texCostas() { // logo nas costas da camisa preta
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#121412'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#c8f560'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 64px Archivo, "Arial Narrow", Arial, sans-serif'; g.fillText('PASSOS', 128, 92); g.fillText('VERDES', 128, 152);
  g.strokeStyle = '#c8f560'; g.lineWidth = 6; g.beginPath(); g.moveTo(40, 196); g.lineTo(216, 196); g.stroke();
  g.font = '700 22px Figtree, Arial, sans-serif'; g.fillStyle = '#f5f7f2'; g.fillText('MAGÉ · RJ', 128, 222);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const img = new Image(); img.onload = () => { g.fillStyle = '#121412'; g.fillRect(0, 0, 256, 256); g.drawImage(img, 28, 20, 200, 200); g.font = '700 22px Figtree, Arial, sans-serif'; g.fillStyle = '#c8f560'; g.fillText('MAGÉ · RJ', 128, 236); t.needsUpdate = true; };
  img.src = '/icons/logo.png';
  return t;
}

function boneco() {
  const NEON = 0xc8f560, PRETO = 0x161816, PELE = 0xb57650, CABELO = 0x141010;
  const root = new THREE.Group(); const piv = new THREE.Group(); piv.position.y = 1; root.add(piv); const corpo = new THREE.Group(); corpo.position.y = -1; piv.add(corpo);
  const pele = toon(PELE), camisa = toon(PRETO), neon = toon(NEON), short = toon(PRETO), branco = toon(0xf4f4f0), cabelo = toon(CABELO);
  const cap = (r, l, m, seg = 10) => contorno(new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, seg), m));
  const esf = (r, m, w = 16, h = 12) => contorno(new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m));
  // tronco: camisa preta com detalhes neon
  const tronco = cap(0.27, 0.38, camisa, 14); tronco.scale.set(1.15, 1, 0.8); tronco.position.y = 1.38; corpo.add(tronco);
  const gola = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 16), neon); gola.rotation.x = Math.PI / 2; gola.position.y = 1.73; corpo.add(gola);
  for (const sx of [-1, 1]) { const lt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.36), neon); lt.position.set(0.305 * sx, 1.38, 0); corpo.add(lt); }
  const costas = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: texCostas() })); costas.position.set(0, 1.42, 0.222); corpo.add(costas);
  const pv = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: NEON })); pv.position.set(-0.12, 1.55, -0.222); pv.rotation.y = Math.PI; corpo.add(pv);
  const quadril = contorno(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.32, 14), short)); quadril.scale.z = 0.82; quadril.position.y = 0.98; corpo.add(quadril);
  const cint = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.05, 14), neon); cint.scale.z = 0.82; cint.position.y = 1.12; corpo.add(cint);
  // cabeça (um pouco maior, estilo desenho)
  const pesc = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.14, 10), pele); pesc.position.y = 1.78; corpo.add(pesc);
  const cab = new THREE.Group(); cab.position.y = 2.0; corpo.add(cab);
  cab.add(esf(0.23, pele, 20, 16));
  const cb = new THREE.Mesh(new THREE.SphereGeometry(0.236, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), cabelo); cb.position.set(0, 0.01, 0.015); cab.add(cb);
  const nuca = new THREE.Mesh(new THREE.SphereGeometry(0.234, 16, 10, 0, Math.PI, Math.PI * 0.3, Math.PI * 0.3), cabelo); nuca.position.z = 0.01; cab.add(nuca);
  const faixa = new THREE.Mesh(new THREE.CylinderGeometry(0.242, 0.242, 0.07, 20, 1, true), neon); faixa.position.y = 0.07; cab.add(faixa);
  const no = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.05), neon); no.position.set(0.05, 0.03, 0.25); no.rotation.z = 0.5; cab.add(no);
  for (const sx of [-1, 1]) {
    const or = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), pele); or.position.set(0.225 * sx, -0.01, 0.01); or.scale.set(0.55, 1, 0.9); cab.add(or);
    const ol = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), branco); ol.position.set(0.085 * sx, -0.005, -0.205); ol.scale.z = 0.5; cab.add(ol);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), toon(0x101010)); pu.position.set(0.085 * sx, -0.005, -0.228); cab.add(pu);
    const sb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.02), cabelo); sb.position.set(0.085 * sx, 0.06, -0.218); sb.rotation.z = -0.15 * sx; cab.add(sb);
  }
  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), pele); nariz.position.set(0, -0.06, -0.228); cab.add(nariz);
  const boca = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 4, 10, Math.PI), toon(0x5a2318)); boca.position.set(0, -0.12, -0.215); boca.rotation.z = Math.PI; cab.add(boca);
  // braços
  const bracos = [];
  for (const sx of [-1, 1]) {
    const om = new THREE.Group(); om.position.set(0.35 * sx, 1.6, 0); corpo.add(om);
    om.add(esf(0.12, neon, 12, 10)); // manga neon
    const sup = cap(0.075, 0.2, pele); sup.position.y = -0.18; om.add(sup);
    const cot = new THREE.Group(); cot.position.y = -0.32; om.add(cot);
    const ant = cap(0.07, 0.18, pele); ant.position.y = -0.13; cot.add(ant);
    const pulso = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.06, 10), neon); pulso.position.y = -0.24; cot.add(pulso);
    const mao = esf(0.09, pele, 10, 8); mao.position.y = -0.31; cot.add(mao);
    bracos.push({ om, cot });
  }
  // pernas
  const pernas = [];
  for (const sx of [-1, 1]) {
    const qd = new THREE.Group(); qd.position.set(0.14 * sx, 0.92, 0); corpo.add(qd);
    const cx = cap(0.11, 0.28, pele); cx.position.y = -0.22; qd.add(cx);
    const barra = contorno(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.135, 0.18, 12), short)); barra.position.y = -0.04; qd.add(barra);
    const fx = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.142, 0.035, 12), neon); fx.position.y = -0.12; qd.add(fx);
    const jo = new THREE.Group(); jo.position.y = -0.44; qd.add(jo);
    const can = cap(0.09, 0.26, pele); can.position.y = -0.19; jo.add(can);
    const meia = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.09, 0.12, 10), branco); meia.position.y = -0.36; jo.add(meia);
    const pe = new THREE.Group(); pe.position.y = -0.43; jo.add(pe);
    const t = contorno(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.36), neon), 1.08); t.position.set(0, -0.02, -0.07); pe.add(t);
    const so = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.05, 0.37), branco); so.position.set(0, -0.1, -0.07); pe.add(so);
    pernas.push({ qd, jo, pe });
  }
  root.userData = { corpo: piv, bracos, pernas, cab };
  return root;
}

function pose(b, ph, modo, k = 1) {
  const { corpo, bracos, pernas, cab } = b.userData;
  if (modo === 'pulo') {
    pernas[0].qd.rotation.x = -1.0; pernas[0].jo.rotation.x = 1.6; pernas[1].qd.rotation.x = 0.5; pernas[1].jo.rotation.x = 0.9;
    bracos[0].om.rotation.x = -1.3; bracos[1].om.rotation.x = 0.7; bracos[0].cot.rotation.x = -0.3; bracos[1].cot.rotation.x = -0.8;
    bracos[0].om.rotation.z = -0.3; bracos[1].om.rotation.z = 0.3; corpo.rotation.set(-0.1, 0, 0); corpo.position.y = 1; corpo.scale.setScalar(1); return;
  }
  if (modo === 'caiu') {
    corpo.rotation.x = Math.max(-1.5, corpo.rotation.x - 0.12); corpo.position.y = Math.max(0.3, corpo.position.y - 0.05); corpo.scale.setScalar(1);
    for (const a of bracos) { a.om.rotation.x = -2.6; a.om.rotation.z = 0; } return;
  }
  const s = Math.sin(ph), c = Math.cos(ph);
  pernas[0].qd.rotation.x = -s * 0.95 * k; pernas[1].qd.rotation.x = s * 0.95 * k;
  pernas[0].jo.rotation.x = Math.max(0, c) * 1.5 * k + 0.15; pernas[1].jo.rotation.x = Math.max(0, -c) * 1.5 * k + 0.15;
  pernas[0].pe.rotation.x = -0.2 * s; pernas[1].pe.rotation.x = 0.2 * s;
  bracos[0].om.rotation.x = s * 0.9 * k; bracos[1].om.rotation.x = -s * 0.9 * k;
  bracos[0].om.rotation.z = -0.12; bracos[1].om.rotation.z = 0.12;
  bracos[0].cot.rotation.x = -1.25; bracos[1].cot.rotation.x = -1.25;
  corpo.position.y = 1 + Math.abs(c) * 0.09 * k; corpo.rotation.set(-0.14 * k, s * 0.12 * k, 0); corpo.scale.setScalar(1);
  if (cab.userData.rabo) cab.userData.rabo.rotation.z = Math.sin(ph * 2) * 0.35;
}

/* ---------- texturas ---------- */
function canvasTex(w, h, desenha, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; desenha(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function ruido(g, w, h, n, cores) { for (let i = 0; i < n; i++) { g.fillStyle = cores[i % cores.length]; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 3, 2 + Math.random() * 3); } }
function serra(noite, camada) {
  return canvasTex(2048, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cores = noite ? ['#1b2c3a', '#172a22', '#10221a'] : ['#8fb3c9', '#6d9c7e', '#4f8a5f'];
    g.fillStyle = cores[camada];
    g.beginPath(); g.moveTo(0, h);
    let pts;
    if (camada === 0) { // Serra dos Órgãos com o Dedo de Deus
      pts = [[0, 330], [120, 260], [240, 290], [360, 200], [470, 240], [560, 170], [640, 190], [700, 120], [730, 40], [748, 30], [760, 70], [790, 140], [860, 170], [960, 140], [1040, 200], [1160, 150], [1260, 210], [1380, 160], [1500, 230], [1620, 180], [1760, 250], [1900, 200], [2048, 300]];
    } else if (camada === 1) {
      pts = []; for (let x = 0; x <= w; x += 64) pts.push([x, 330 + Math.sin(x / 170) * 50 + Math.sin(x / 61) * 20]);
    } else { pts = []; for (let x = 0; x <= w; x += 48) pts.push([x, 400 + Math.sin(x / 120 + 2) * 35 + Math.sin(x / 37) * 12]); }
    for (const [x, y] of pts) g.lineTo(x, y); g.lineTo(w, h); g.closePath(); g.fill();
    if (camada === 0 && !noite) { g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(700, 120); g.lineTo(730, 40); g.lineTo(748, 30); g.lineTo(760, 70); g.lineTo(745, 110); g.closePath(); g.fill(); }
    if (camada === 2) { // árvores na crista
      g.fillStyle = noite ? '#0b1a12' : '#3f7d4f';
      for (let x = 10; x < w; x += 22 + Math.random() * 20) { const y = 400 + Math.sin(x / 120 + 2) * 35 + Math.sin(x / 37) * 12; g.beginPath(); g.arc(x, y + 6, 10 + Math.random() * 10, 0, 7); g.fill(); }
    }
  });
}

/* ---------- jogo ---------- */
export function criar(el, opt = {}) {
  const noite = !!opt.noite;
  const W = () => el.clientWidth || 360, H = () => el.clientHeight || 600;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.setSize(W(), H()); renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);
  const cv = renderer.domElement; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';

  const scene = new THREE.Scene();
  const ceuCor = noite ? 0x0a1422 : 0xbfe4f5;
  scene.background = canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (noite) { gr.addColorStop(0, '#02050b'); gr.addColorStop(.55, '#0b1a2c'); gr.addColorStop(1, '#1d3b3a'); }
    else { gr.addColorStop(0, '#4fa8e0'); gr.addColorStop(.6, '#a9dcf3'); gr.addColorStop(1, '#e9f6ef'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(ceuCor, 45, noite ? 150 : 175);
  const cam = new THREE.PerspectiveCamera(62, W() / H(), 0.1, 400);

  scene.add(new THREE.HemisphereLight(noite ? 0x6f86b0 : 0xe4f3ff, noite ? 0x16201a : 0x5a7a45, noite ? 0.75 : 1.15));
  const sol = new THREE.DirectionalLight(noite ? 0x9fb4ff : 0xfff1d6, noite ? 0.55 : 1.5); sol.position.set(-6, 12, 6); scene.add(sol);
  const luzP = new THREE.PointLight(noite ? 0xffd9a0 : 0xffffff, noite ? 14 : 0, 12, 1.6); scene.add(luzP);

  // céu: lua, estrelas ou sol
  const ceu = new THREE.Group(); scene.add(ceu);
  if (noite) {
    const lua = new THREE.Mesh(new THREE.CircleGeometry(7, 24), new THREE.MeshBasicMaterial({ color: 0xf6f1d6, fog: false })); lua.position.set(55, 92, -262); ceu.add(lua);
    const brilho = new THREE.Mesh(new THREE.CircleGeometry(16, 24), new THREE.MeshBasicMaterial({ color: 0xf6f1d6, transparent: true, opacity: 0.12, fog: false })); brilho.position.set(55, 92, -263); ceu.add(brilho);
    const pos = []; for (let i = 0; i < 400; i++) pos.push((Math.random() - .5) * 600, 20 + Math.random() * 140, -240 - Math.random() * 20);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    ceu.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, fog: false, transparent: true, opacity: .85 })));
  } else {
    const s = new THREE.Mesh(new THREE.CircleGeometry(9, 24), new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false })); s.position.set(-70, 95, -262); ceu.add(s);
    for (let i = 0; i < 9; i++) { const nv = new THREE.Group(); for (let j = 0; j < 4; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 2, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: .9 })); b.position.set(j * 4 - 6, Math.random() * 1.5, 0); b.scale.y = .55; nv.add(b); } nv.position.set(-200 + i * 50 + Math.random() * 20, 40 + Math.random() * 30, -230); ceu.add(nv); }
  }
  // serras ao fundo
  const serras = [];
  [[0, -245, 34, 300, 0.25, 0.46], [1, -205, 10, 300, 0.45, 0.26], [2, -170, 2, 260, 0.7, 0.22]].forEach(([cam_, z, y, w, par, hk]) => {
    const t = serra(noite, cam_); t.wrapS = THREE.RepeatWrapping; t.offset.x = cam_ === 0 ? -0.12 : 0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 2.2, w * hk), new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false, depthWrite: false }));
    m.position.set(0, y, z); m.renderOrder = -1; scene.add(m); serras.push({ m, par, y });
  });

  /* chão com curva: as tiras são deformadas a cada quadro */
  const LEN = 230, NZ = 90, Z0 = 14;
  const tiras = [];
  function tira(x0, x1, nx, material, y = 0) {
    const geo = new THREE.PlaneGeometry(x1 - x0, LEN, nx, NZ); geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, y, Z0 - LEN / 2);
    const base = Float32Array.from(geo.attributes.position.array); const m = new THREE.Mesh(geo, material); scene.add(m); tiras.push({ geo, base }); return m;
  }
  const texRua = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = noite ? '#2a2d30' : '#4b4f53'; g.fillRect(0, 0, w, h);
    ruido(g, w, h, 1400, noite ? ['#34383c', '#232629', '#3a3e42'] : ['#575b60', '#3f4347', '#5f6368']);
    g.fillStyle = noite ? '#d9d6c8' : '#f4f1e6'; for (const x of [w / 3, w * 2 / 3]) g.fillRect(x - 3, 40, 6, 180);
    g.fillStyle = '#e8c547'; g.fillRect(6, 0, 6, h); g.fillRect(w - 12, 0, 6, h);
  }, [1, LEN / 12]);
  const texCal = canvasTex(128, 128, (g, w, h) => { g.fillStyle = noite ? '#5a5d58' : '#b9b5aa'; g.fillRect(0, 0, w, h); g.strokeStyle = noite ? '#44463f' : '#98948a'; g.lineWidth = 3; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); }, [1, LEN / 3]);
  const texGrama = canvasTex(256, 256, (g, w, h) => { g.fillStyle = noite ? '#17331f' : '#5aa04f'; g.fillRect(0, 0, w, h); ruido(g, w, h, 2200, noite ? ['#1d3d26', '#122a19', '#21452b'] : ['#68b05a', '#4c8f44', '#77bb63', '#3f8040']); }, [10, LEN / 10]);
  tira(-4.3, 4.3, 3, new THREE.MeshLambertMaterial({ map: texRua }), 0);
  tira(-6.4, -4.3, 1, new THREE.MeshLambertMaterial({ map: texCal }), 0.12);
  tira(4.3, 6.4, 1, new THREE.MeshLambertMaterial({ map: texCal }), 0.12);
  tira(-70, -6.4, 4, new THREE.MeshLambertMaterial({ map: texGrama }), 0.05);
  tira(6.4, 70, 4, new THREE.MeshLambertMaterial({ map: texGrama }), 0.05);
  const texRuaRep = LEN / 12, texCalRep = LEN / 3, texGramaRep = LEN / 10;

  /* estado */
  const st = { estado: 'pronto', s: 0, vel: 14, t: 0, faixa: 1, px: 0, py: 0, vy: 0, chao: true, rolando: 0, tropeco: 0, ultTropeco: -9, folhas: 0, ima: 0, tenis: 0, curva: 0, curvaAlvo: 0, ph: 0, tremor: 0, fim: 0, proxLinha: 30, proxDeco: [0, 0], proxRio: 420, rio: null };
  const objs = []; // {m, s, x, y, tipo, len, h, vivo, mov}
  const C = () => st.curva;
  const offX = d => C() * d * d;
  const offY = d => -0.00075 * d * d;
  function colocar(o) {
    const d = o.s - st.s; const z = -d;
    o.m.position.set(o.x + offX(Math.max(0, d)), (o.y || 0) + offY(Math.max(0, d)), z);
    o.m.rotation.y = (o.rot || 0) - Math.atan(2 * C() * Math.max(0, d));
  }

  /* jogador */
  const jog = boneco(); scene.add(jog);
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); sombra.rotation.x = -Math.PI / 2; scene.add(sombra);

  /* peças reaproveitáveis */
  const G = {
    cone: new THREE.ConeGeometry(0.32, 0.8, 10), coneBase: new THREE.BoxGeometry(0.7, 0.08, 0.7), faixaCone: new THREE.CylinderGeometry(0.2, 0.25, 0.14, 10),
    folha: (() => { const s = new THREE.Shape(); s.moveTo(0, -0.42); s.quadraticCurveTo(0.36, -0.05, 0, 0.42); s.quadraticCurveTo(-0.36, -0.05, 0, -0.42); return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }); })(),
    tronco: new THREE.CylinderGeometry(0.18, 0.26, 2.4, 6), copa: new THREE.IcosahedronGeometry(1.5, 0), palmTronco: new THREE.CylinderGeometry(0.13, 0.2, 5, 6), palmFolha: new THREE.BoxGeometry(0.35, 0.05, 2.6),
    caixa: new THREE.BoxGeometry(1, 1, 1), poste: new THREE.CylinderGeometry(0.07, 0.09, 5.2, 6), lampada: new THREE.SphereGeometry(0.22, 8, 6), arbusto: new THREE.IcosahedronGeometry(0.8, 0)
  };
  const M = {
    cone: mat(0xff6a1a), branco: mat(0xffffff), folha: new THREE.MeshLambertMaterial({ color: 0x8fe05c, emissive: noite ? 0x4f8f20 : 0x2b5a10, side: THREE.DoubleSide }),
    tronco: mat(0x6b4a2f), copa: [mat(0x3f8c45), mat(0x2f7a3e), mat(0x58a24d)], palm: mat(0x3d9a4a), buraco: new THREE.MeshBasicMaterial({ color: noite ? 0x000000 : 0x0b0b0b }), borda: mat(noite ? 0x9a978c : 0x7a776e, noite ? { emissive: 0x2a2a26 } : {}), anel: new THREE.MeshBasicMaterial({ color: 0xf4c430 }),
    cav: mat(0xffffff), cavL: mat(0xe23b2e), van: [mat(0xf2f2f2), mat(0xf4c430), mat(0x2f6fd6), mat(0x1f8f5a)], vidro: mat(0x1d2a33), pneu: mat(0x111111),
    poste: mat(0x55595c), luz: new THREE.MeshBasicMaterial({ color: noite ? 0xffe2a0 : 0xdddddd }), agua: null, grade: mat(0xd8d8d0), casa: [0xf7d26a, 0xf29e8e, 0x9ed7c8, 0xf4f1e8, 0xb9d77c, 0x8fb6e6].map(c => mat(c)), telhado: mat(0xb3532f), porta: mat(0x6b3f25), janela: mat(noite ? 0xffd88a : 0x3c5566, noite ? { emissive: 0x8a6420 } : {}),
    ima: mat(0xe23b2e), imaP: mat(0xdddddd), tenis: mat(0xc8f560), arb: mat(0x3d8b44)
  };
  const texAgua = canvasTex(128, 128, (g, w, h) => { g.fillStyle = noite ? '#0f2a3a' : '#3b8fb5'; g.fillRect(0, 0, w, h); g.strokeStyle = noite ? 'rgba(160,200,255,.25)' : 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const y = Math.random() * h, x = Math.random() * w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 20, y); g.stroke(); } }, [8, 8]);
  M.agua = new THREE.MeshLambertMaterial({ map: texAgua });
  const texQueda = canvasTex(64, 256, (g, w, h) => { g.fillStyle = noite ? '#5f86a3' : '#bfe6f5'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = noite ? 'rgba(220,235,255,.55)' : 'rgba(255,255,255,.9)'; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 20 + Math.random() * 60); } }, [1, 1]);
  M.queda = new THREE.MeshBasicMaterial({ map: texQueda, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
  M.espuma = new THREE.MeshBasicMaterial({ color: noite ? 0xb9cde0 : 0xffffff, transparent: true, opacity: 0.8 });
  M.pedra = [mat(noite ? 0x3d4440 : 0x7d867a), mat(noite ? 0x353b37 : 0x6b7468), mat(noite ? 0x2c332f : 0x8a9386)];
  M.morro = [mat(noite ? 0x173524 : 0x3f7d4a), mat(noite ? 0x12301f : 0x4f8f55), mat(noite ? 0x1b3b28 : 0x35703f)];
  G.pedra = new THREE.IcosahedronGeometry(1, 0); G.morro = new THREE.IcosahedronGeometry(1, 1);
  const TX = {};
  const halo = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,220,150,.9)'); r.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });

  function add(m, s, x, extra = {}) { scene.add(m); const o = { m, s, x, y: 0, vivo: true, ...extra }; objs.push(o); colocar(o); return o; }

  function cone(s, x) {
    const g = new THREE.Group(); const c = new THREE.Mesh(G.cone, M.cone); c.position.y = 0.45; g.add(c);
    const f = new THREE.Mesh(G.faixaCone, M.branco); f.position.y = 0.42; g.add(f); const b = new THREE.Mesh(G.coneBase, M.cone); b.position.y = 0.04; g.add(b);
    if (Math.random() < .5) { const c2 = c.clone(); c2.position.x = 0.7; const b2 = b.clone(); b2.position.x = 0.7; const f2 = f.clone(); f2.position.x = 0.7; g.add(c2, b2, f2); g.position.x = -0.35; const gg = new THREE.Group(); gg.add(g); return add(gg, s, x, { tipo: 'baixo', h: 0.85, len: 0.7 }); }
    return add(g, s, x, { tipo: 'baixo', h: 0.85, len: 0.7 });
  }
  function buraco(s, x) {
    const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CircleGeometry(1, 12), M.buraco); b.rotation.x = -Math.PI / 2; b.scale.set(1, 1.3, 1); b.position.y = 0.03; g.add(b);
    const anel = new THREE.Mesh(new THREE.RingGeometry(1.02, 1.22, 24), M.anel); anel.rotation.x = -Math.PI / 2; anel.scale.set(1, 1.3, 1); anel.position.y = 0.035; g.add(anel);
    for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(G.caixa, M.borda); const a = i / 7 * 6.28; p.position.set(Math.cos(a) * 1.08, 0.06, Math.sin(a) * 1.38); p.scale.set(0.32, 0.12, 0.22); p.rotation.y = a; g.add(p); }
    for (const sx of [-1.15, 1.15]) { const c = new THREE.Mesh(G.cone, M.cone); c.scale.setScalar(0.55); c.position.set(sx, 0.25, -1.45); g.add(c); }
    return add(g, s, x, { tipo: 'buraco', h: 0.4, len: 2.2 });
  }
  function cavalete(s, x) { // barreira de obra alta: passa rolando
    const g = new THREE.Group();
    for (const sx of [-0.95, 0.95]) { const p = new THREE.Mesh(G.caixa, M.cav); p.scale.set(0.12, 2.4, 0.12); p.position.set(sx, 1.2, 0); g.add(p); }
    const tex = TX.obras ||= canvasTex(256, 64, (gc, w, h) => { for (let i = -2; i < 10; i++) { gc.fillStyle = i % 2 ? '#e23b2e' : '#ffffff'; gc.beginPath(); gc.moveTo(i * 32, 0); gc.lineTo(i * 32 + 32, 0); gc.lineTo(i * 32 + 16, h); gc.lineTo(i * 32 - 16, h); gc.fill(); } gc.fillStyle = '#111'; gc.font = '900 30px Arial'; gc.textAlign = 'center'; gc.fillText('OBRAS', w / 2, 42); });
    const placa = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.1), [M.cav, M.cav, M.cav, M.cav, new THREE.MeshLambertMaterial({ map: tex }), new THREE.MeshLambertMaterial({ map: tex })]); placa.position.y = 2.05; g.add(placa);
    const pl2 = placa.clone(); pl2.position.y = 1.45; pl2.scale.y = 0.6; g.add(pl2);
    return add(g, s, x, { tipo: 'alto', h: 2.4, len: 0.4 });
  }
  function barreira(s, x) { // barreira baixa listrada: pula
    const g = new THREE.Group();
    const tex = TX.listra ||= canvasTex(256, 64, (gc, w, h) => { for (let i = -2; i < 10; i++) { gc.fillStyle = i % 2 ? '#f4c430' : '#111'; gc.beginPath(); gc.moveTo(i * 32, 0); gc.lineTo(i * 32 + 32, 0); gc.lineTo(i * 32 + 16, h); gc.lineTo(i * 32 - 16, h); gc.fill(); } });
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 0.2), new THREE.MeshLambertMaterial({ map: tex })); b.position.y = 0.75; g.add(b);
    for (const sx of [-0.9, 0.9]) { const p = new THREE.Mesh(G.caixa, M.borda); p.scale.set(0.1, 0.8, 0.5); p.position.set(sx, 0.4, 0); g.add(p); }
    return add(g, s, x, { tipo: 'baixo', h: 1.0, len: 0.5 });
  }
  function van(s, x, mov) {
    const g = new THREE.Group(); const cor = M.van[Math.floor(Math.random() * M.van.length)];
    const corpo = new THREE.Mesh(G.caixa, cor); corpo.scale.set(2.0, 2.0, 5.2); corpo.position.y = 1.35; g.add(corpo);
    const cabine = new THREE.Mesh(G.caixa, cor); cabine.scale.set(2.0, 1.1, 1.4); cabine.position.set(0, 0.95, -3.2); g.add(cabine);
    const vf = new THREE.Mesh(G.caixa, M.vidro); vf.scale.set(1.8, 0.75, 0.1); vf.position.set(0, 1.85, -2.62); vf.rotation.x = 0.35; g.add(vf);
    for (const sx of [-1, 1]) { const vl = new THREE.Mesh(G.caixa, M.vidro); vl.scale.set(0.05, 0.7, 3.6); vl.position.set(sx * 1.01, 1.85, 0.2); g.add(vl); }
    for (const [sx, sz] of [[-1, -2.9], [1, -2.9], [-1, 1.8], [1, 1.8]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), M.pneu); r.rotation.z = Math.PI / 2; r.position.set(sx * 0.95, 0.42, sz); g.add(r); }
    if (noite || mov) for (const sx of [-0.7, 0.7]) { const f = new THREE.Mesh(new THREE.CircleGeometry(0.16, 8), new THREE.MeshBasicMaterial({ color: 0xfff3c4 })); f.position.set(sx, 0.95, -3.91); f.rotation.y = Math.PI; g.add(f); }
    const mv = mov ? 7 + Math.random() * 3 : 0; const s2 = mv ? s + mv * Math.max(0, s - st.s) / Math.max(10, st.vel) : s;
    return add(g, s2, x, { tipo: 'bloco', h: 2.4, len: 6.5, desloc: -3.9, mov: mv, rot: Math.PI });
  }
  function folha(s, x, y = 1) { const m = new THREE.Mesh(G.folha, M.folha); return add(m, s, x, { tipo: 'folha', y, len: 0.6, giro: Math.random() * 6 }); }
  function bonus(s, x, k) {
    const g = new THREE.Group();
    if (k === 'ima') { const u = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.12, 6, 12, Math.PI), M.ima); u.rotation.z = Math.PI; g.add(u); for (const sx of [-0.35, 0.35]) { const p = new THREE.Mesh(G.caixa, M.imaP); p.scale.set(0.24, 0.18, 0.24); p.position.set(sx, 0.05, 0); g.add(p); } }
    else { const t = new THREE.Mesh(G.caixa, M.tenis); t.scale.set(0.34, 0.24, 0.7); g.add(t); const so = new THREE.Mesh(G.caixa, M.branco); so.scale.set(0.36, 0.1, 0.72); so.position.y = -0.15; g.add(so); }
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: k === 'ima' ? 0xff8080 : 0xc8f560, transparent: true, depthWrite: false })); h.scale.set(2, 2, 1); g.add(h);
    return add(g, s, x, { tipo: 'bonus', k, y: 1.2, len: 0.8, giro: 0 });
  }
  /* cenário */
  function arvore(s, x) { const g = new THREE.Group(); const t = new THREE.Mesh(G.tronco, M.tronco); t.position.y = 1.2; g.add(t); const c = new THREE.Mesh(G.copa, M.copa[Math.floor(Math.random() * 3)]); c.position.y = 3.1; c.scale.setScalar(0.9 + Math.random() * .6); g.add(c); return add(g, s, x, { tipo: 'deco', rot: Math.random() * 6 }); }
  function palmeira(s, x) { const g = new THREE.Group(); const t = new THREE.Mesh(G.palmTronco, M.tronco); t.position.y = 2.5; t.rotation.z = (Math.random() - .5) * .25; g.add(t); for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(G.palmFolha, M.palm); const a = i / 7 * 6.28; f.position.set(Math.cos(a) * 1.1, 5, Math.sin(a) * 1.1); f.rotation.set(0.5, -a + Math.PI / 2, 0); f.rotation.order = 'YXZ'; f.rotation.y = -a + Math.PI / 2; f.rotation.x = 0.45; g.add(f); } return add(g, s, x, { tipo: 'deco', rot: Math.random() * 6 }); }
  function casa(s, x) {
    const g = new THREE.Group(); const w = 4 + Math.random() * 3, h = 3 + Math.random() * 2.5, dp = 5; const lado = Math.sign(x);
    const p = new THREE.Mesh(G.caixa, M.casa[Math.floor(Math.random() * M.casa.length)]); p.scale.set(w, h, dp); p.position.y = h / 2; g.add(p);
    const tl = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, dp) * 0.75, 1.6, 4), M.telhado); tl.rotation.y = Math.PI / 4; tl.position.y = h + 0.8; tl.scale.set(w / Math.max(w, dp) * 1.05, 1, dp / Math.max(w, dp) * 1.05); g.add(tl);
    const fx = -lado * (w / 2 + 0.01);
    const porta = new THREE.Mesh(G.caixa, M.porta); porta.scale.set(0.05, 2, 1); porta.position.set(fx, 1, 0); g.add(porta);
    for (const z of [-1.5, 1.5]) { const j = new THREE.Mesh(G.caixa, M.janela); j.scale.set(0.05, 0.9, 0.9); j.position.set(fx, h * 0.6, z); g.add(j); }
    return add(g, s, x, { tipo: 'deco' });
  }
  function poste(s, x) {
    const g = new THREE.Group(); const p = new THREE.Mesh(G.poste, M.poste); p.position.y = 2.6; g.add(p);
    const br = new THREE.Mesh(G.caixa, M.poste); br.scale.set(1.3, 0.08, 0.08); br.position.set(-Math.sign(x) * 0.6, 5.1, 0); g.add(br);
    const l = new THREE.Mesh(G.lampada, M.luz); l.position.set(-Math.sign(x) * 1.2, 4.95, 0); g.add(l);
    if (noite) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); h.scale.set(2.6, 2.6, 1); h.position.copy(l.position); g.add(h);
      const poça = new THREE.Mesh(new THREE.CircleGeometry(2.6, 16), new THREE.MeshBasicMaterial({ map: halo, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })); poça.rotation.x = -Math.PI / 2; poça.position.set(-Math.sign(x) * 1.6, 0.2, 0); g.add(poça); }
    return add(g, s, x, { tipo: 'deco' });
  }
  function arbusto(s, x) { const m = new THREE.Mesh(G.arbusto, M.arb); m.scale.set(1 + Math.random(), 0.7 + Math.random() * .5, 1 + Math.random()); return add(m, s, x, { tipo: 'deco', y: 0.3 }); }
  function trechoRio(s0, len) {
    st.rio = { a: s0, b: s0 + len };
    for (let z = 0; z < len; z += 5) for (const lado of [-1, 1]) {
      const g = new THREE.Group();
      const agua = new THREE.Mesh(new THREE.PlaneGeometry(64, 5.2), M.agua); agua.rotation.x = -Math.PI / 2; agua.position.set(lado * 38.5, 0.15, -2.5); g.add(agua);
      const muro = new THREE.Mesh(G.caixa, M.grade); muro.scale.set(0.3, 0.9, 5.05); muro.position.set(lado * 6.55, 0.55, -2.5); g.add(muro);
      for (const zz of [0, -2.5]) { const b = new THREE.Mesh(G.caixa, M.grade); b.scale.set(0.12, 1.1, 0.12); b.position.set(lado * 6.55, 1.2, zz); g.add(b); }
      const cor = new THREE.Mesh(G.caixa, M.grade); cor.scale.set(0.16, 0.12, 5.05); cor.position.set(lado * 6.55, 1.75, -2.5); g.add(cor);
      add(g, s0 + z, 0, { tipo: 'deco', len: 5 });
    }
    const placa = new THREE.Group(); const pp = new THREE.Mesh(G.caixa, M.poste); pp.scale.set(0.1, 2.6, 0.1); pp.position.y = 1.3; placa.add(pp);
    const tx = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#1f6b3b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#fff'; g.font = '900 40px Arial'; g.textAlign = 'center'; g.fillText('RIO MAGÉ', w / 2, 62); });
    const pl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.08), new THREE.MeshLambertMaterial({ map: tx })); pl.position.y = 2.9; pl.rotation.y = Math.PI; placa.add(pl);
    add(placa, s0 - 6, 7.4, { tipo: 'deco' });
  }

  function rocha(s, x, k) { const m = new THREE.Mesh(G.pedra, M.pedra[Math.floor(Math.random() * 3)]); m.scale.set(k * (1 + Math.random() * .5), k * (0.8 + Math.random() * .7), k * (1 + Math.random() * .5)); return add(m, s, x, { tipo: 'deco', y: k * 0.35, rot: Math.random() * 6 }); }
  function morro(s, lado) { const k = 16 + Math.random() * 22; const x = lado * (k * 1.8 + 16 + Math.random() * 25); const m = new THREE.Mesh(G.morro, M.morro[Math.floor(Math.random() * 3)]); m.scale.set(k * (1.2 + Math.random() * .6), k * (0.55 + Math.random() * .45), k); return add(m, s, x, { tipo: 'deco', y: -k * 0.15, len: k }); }
  function cachoeira(s, lado) {
    const g = new THREE.Group(); const x = lado * (13 + Math.random() * 3); const alt = 11 + Math.random() * 6;
    // paredão de pedra atrás da queda
    for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(G.pedra, M.pedra[i % 3]); const k = 3 + Math.random() * 3.5; p.scale.set(k, k * (1.2 + Math.random()), k); p.position.set(lado * (3 + Math.random() * 3), alt * (0.2 + Math.random() * 0.75), (Math.random() - .5) * 14); p.rotation.set(Math.random(), Math.random() * 6, Math.random()); g.add(p); }
    const topo = new THREE.Mesh(G.morro, M.morro[0]); topo.scale.set(9, 4, 9); topo.position.set(lado * 5, alt + 1, 0); g.add(topo);
    // a queda d'água
    const q = new THREE.Mesh(new THREE.PlaneGeometry(4.6, alt, 1, 6), M.queda); q.position.set(-lado * 0.4, alt / 2, 0); q.rotation.y = -lado * 0.45; g.add(q);
    const q2 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, alt * 0.75, 1, 4), M.queda); q2.position.set(lado * 1.2, alt * 0.38, 3.2); q2.rotation.y = -lado * 0.3; g.add(q2);
    // poço e espuma
    const poco = new THREE.Mesh(new THREE.CircleGeometry(4.5, 18), M.agua); poco.rotation.x = -Math.PI / 2; poco.position.set(-lado * 1, 0.12, 0); g.add(poco);
    for (let i = 0; i < 6; i++) { const e = new THREE.Mesh(G.pedra, M.espuma); e.scale.set(0.9 + Math.random(), 0.25, 0.9 + Math.random()); e.position.set(lado * 0.2 + (Math.random() - .5) * 2.4, 0.2, (Math.random() - .5) * 3); g.add(e); }
    for (let i = 0; i < 5; i++) { const a = new THREE.Mesh(G.arbusto, M.arb); a.scale.setScalar(1 + Math.random()); a.position.set(-lado * (3 + Math.random() * 2), 0.4, (Math.random() - .5) * 10); g.add(a); }
    return add(g, s, x, { tipo: 'deco', len: 8 });
  }
  function trechoSerra(s0, len) {
    st.serra = { a: s0, b: s0 + len };
    const placa = new THREE.Group(); const pp = new THREE.Mesh(G.caixa, M.poste); pp.scale.set(0.1, 2.6, 0.1); pp.position.y = 1.3; placa.add(pp);
    const tx = TX.serra ||= canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#7a4a22'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4e3c0'; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#f4e3c0'; g.font = '900 30px Arial'; g.textAlign = 'center'; g.fillText('CACHOEIRAS', w / 2, 42); g.font = '700 22px Arial'; g.fillText('SANTO ALEIXO', w / 2, 74); });
    const pl = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.08), new THREE.MeshLambertMaterial({ map: tx })); pl.position.y = 2.9; pl.rotation.y = Math.PI; placa.add(pl);
    add(placa, s0 - 8, -7.4, { tipo: 'deco' });
    let lado = Math.random() < .5 ? -1 : 1;
    for (let z = 12; z < len - 8; z += 30 + Math.random() * 18) { cachoeira(s0 + z, lado); lado = -lado; }
    for (let z = 0; z < len; z += 6) for (const l of [-1, 1]) if (Math.random() < .7) rocha(s0 + z + Math.random() * 4, l * (7.5 + Math.random() * 3), 0.8 + Math.random() * 1.4);
  }

  /* geração da pista */
  function linhaFolhas(s, faixa, n, arco) { for (let i = 0; i < n; i++) { const y = arco ? 1 + Math.sin(i / (n - 1) * Math.PI) * 2.3 : 1; folha(s + i * 2.2, LANES[faixa], y); } }
  function gerarLinha() {
    const s = st.proxLinha; const dif = Math.min(1, st.s / 3500);
    const r = Math.random(); const livres = [0, 1, 2];
    const tira = () => livres.splice(Math.floor(Math.random() * livres.length), 1)[0];
    const tipoBaixo = () => [cone, buraco, barreira][Math.floor(Math.random() * 3)];
    let gap = Math.max(15, st.vel * (1.22 - dif * 0.3));
    if (st.s > 60 && Math.random() < 0.06) { bonus(s, LANES[Math.floor(Math.random() * 3)], Math.random() < .5 ? 'ima' : 'tenis'); st.proxLinha = s + gap * 0.6; return; }
    if (r < 0.32) { // um obstáculo baixo + folhas em arco por cima
      const f = tira(); tipoBaixo()(s, LANES[f]); linhaFolhas(s - 5, f, 5, true);
      if (Math.random() < 0.5) linhaFolhas(s - 4, livres[Math.floor(Math.random() * livres.length)], 4);
    } else if (r < 0.52) { // cavalete alto
      const f = tira(); cavalete(s, LANES[f]);
      if (dif > 0.25 && Math.random() < .6) { const f2 = tira(); tipoBaixo()(s, LANES[f2]); }
      linhaFolhas(s - 3, livres[0], 4);
    } else if (r < 0.8) { // van parada ou vindo
      const f = tira(); const mov = st.s > 700 && Math.random() < 0.35 + dif * 0.25; van(s + 4, LANES[f], mov);
      if (dif > 0.15 && Math.random() < .55) { const f2 = tira(); if (Math.random() < .5) van(s + 10, LANES[f2], false); else tipoBaixo()(s + 4, LANES[f2]); }
      linhaFolhas(s - 2, livres[0], 6);
      gap += mov ? 14 : 8;
    } else { // dois baixos, um livre
      const f = tira(), f2 = tira(); tipoBaixo()(s, LANES[f]); tipoBaixo()(s, LANES[f2]); linhaFolhas(s - 5, f, 5, true); linhaFolhas(s - 3, livres[0], 4);
    }
    st.proxLinha = s + gap;
  }
  function gerarDeco(lado) {
    const s = st.proxDeco[lado]; const sg = lado ? 1 : -1;
    const noRio = st.rio && s > st.rio.a - 4 && s < st.rio.b + 4;
    const naSerra = st.serra && s > st.serra.a - 6 && s < st.serra.b + 6;
    if (Math.random() < 0.09) morro(s, sg);
    if (naSerra) { if (Math.random() < .6) arvore(s, sg * (24 + Math.random() * 20)); }
    else if (!noRio) {
      const r = Math.random();
      if (r < 0.28) palmeira(s, sg * (8 + Math.random() * 4));
      else if (r < 0.55) arvore(s, sg * (8 + Math.random() * 10));
      else if (r < 0.78) casa(s, sg * (13 + Math.random() * 6));
      else arbusto(s, sg * (7.5 + Math.random() * 2));
      if (Math.random() < 0.5) arvore(s + 3, sg * (22 + Math.random() * 25));
    }
    st.proxDeco[lado] = s + 6 + Math.random() * 7;
  }
  let proxPoste = 10;

  /* entrada: deslizar */
  let toque = null;
  const acao = a => {
    if (st.estado === 'pronto') { comecar(); if (a === 'tap') return; }
    if (st.estado !== 'jogo') return;
    if (a === 'esq' && st.faixa > 0) { st.faixaAnt = st.faixa; st.faixa--; }
    else if (a === 'dir' && st.faixa < 2) { st.faixaAnt = st.faixa; st.faixa++; }
    else if (a === 'cima' || a === 'tap') { if (st.chao) { const kv = 1 + Math.max(0, st.vel - 14) / 30; st.vy = (st.tenis > 0 ? 15.5 : 11.2) * Math.sqrt(kv); st.chao = false; st.rolando = 0; } }
    else if (a === 'baixo') { if (!st.chao) st.vy = -28; st.rolando = Math.max(0.45, 0.7 - Math.max(0, st.vel - 14) * 0.008); }
  };
  const pd = e => { e.preventDefault(); toque = { x: e.clientX, y: e.clientY, t: performance.now(), feito: false }; };
  const pm = e => { if (!toque || toque.feito) return; const dx = e.clientX - toque.x, dy = e.clientY - toque.y; if (Math.hypot(dx, dy) > 28) { toque.feito = true; acao(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dir' : 'esq') : (dy > 0 ? 'baixo' : 'cima')); } };
  const pu = e => { if (toque && !toque.feito && performance.now() - toque.t < 300) acao('tap'); toque = null; };
  cv.addEventListener('pointerdown', pd); cv.addEventListener('pointermove', pm); cv.addEventListener('pointerup', pu); cv.addEventListener('pointercancel', () => { toque = null; });
  const kd = e => { const m = { ArrowLeft: 'esq', a: 'esq', ArrowRight: 'dir', d: 'dir', ArrowUp: 'cima', w: 'cima', ' ': 'cima', ArrowDown: 'baixo', s: 'baixo' }[e.key]; if (m) { e.preventDefault(); if (!e.repeat) acao(m); } };
  window.addEventListener('keydown', kd);

  /* placar na tela */
  const hud = document.createElement('div'); hud.className = 'g3hud';
  hud.innerHTML = `<div class="g3c"><b class="g3m">0,00 km</b><span class="g3ps"><span class="g3tm">00:00</span> · <span class="g3pc">--:--</span>/km</span><span class="g3f">🍃 0</span></div><div class="g3r"></div><div class="g3pw"></div><div class="g3km" hidden></div>`;
  el.appendChild(hud);
  const dica = document.createElement('div'); dica.className = 'g3dica';
  dica.innerHTML = `<b>Deslize para correr</b><div class="g3setas"><span>← →<i>trocar de pista</i></span><span>↑<i>pular</i></span><span>↓<i>rolar</i></span></div><small>Pule cones, buracos e barreiras · role sob as placas de OBRAS · desvie das vans</small>`;
  el.appendChild(dica);
  const hm = hud.querySelector('.g3m'), hf = hud.querySelector('.g3f'), hr = hud.querySelector('.g3r'), hp = hud.querySelector('.g3pw'), htm = hud.querySelector('.g3tm'), hpc = hud.querySelector('.g3pc'), hkm = hud.querySelector('.g3km');
  const mmss = sg => { sg = Math.max(0, Math.round(sg)); return String(Math.floor(sg / 60)).padStart(2, '0') + ':' + String(sg % 60).padStart(2, '0'); };
  const ritmo = v => 1000 / (2.56 + Math.max(0, v - 14) / 22 * 3.0); // segundos por km: 6:30 no início, até ~3:00 no máximo
  hr.textContent = opt.recorde ? 'Recorde ' + Number(opt.recorde).toLocaleString('pt-BR') : '';

  function limparObjs() { for (const o of objs) scene.remove(o.m); objs.length = 0; }
  function reiniciar() {
    limparObjs(); Object.assign(st, { estado: 'pronto', s: 0, vel: 14, t: 0, faixa: 1, faixaAnt: 1, px: 0, py: 0, vy: 0, chao: true, rolando: 0, tropeco: 0, ultTropeco: -9, folhas: 0, ima: 0, tenis: 0, curva: 0, curvaAlvo: 0, ph: 0, tremor: 0, fim: 0, proxLinha: 34, proxDeco: [-10, -10], proxRio: 380 + Math.random() * 200, rio: null, proxSerra: 180, serra: null, tv: 0, proxKm: 1000, tKm: 0 }); hkm.hidden = true;
    proxPoste = 4; jog.userData.corpo.rotation.set(0, 0, 0); jog.userData.corpo.position.set(0, 1, 0);
    while (st.proxDeco[0] < 170) gerarDeco(0); while (st.proxDeco[1] < 170) gerarDeco(1);
    while (proxPoste < 170) { poste(proxPoste, (proxPoste / 32 | 0) % 2 ? 5.9 : -5.9); proxPoste += 32; }
    dica.hidden = false; hp.textContent = ''; atualizarHud();
  }
  function comecar() { st.estado = 'jogo'; dica.hidden = true; }
  function atualizarHud() { hm.textContent = (st.s / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km'; htm.textContent = mmss(st.tv); hpc.textContent = st.estado === 'jogo' ? mmss(ritmo(st.vel)).replace(/^0/, '') : '--:--'; hf.textContent = '🍃 ' + st.folhas; hp.textContent = st.ima > 0 ? `🧲 ${Math.ceil(st.ima)}s` : st.tenis > 0 ? `👟 ${Math.ceil(st.tenis)}s` : ''; }
  function bater() {
    st.estado = 'caiu'; st.tremor = 0.5; try { navigator.vibrate && navigator.vibrate(140); } catch (e) {}
    setTimeout(() => { if (st.estado === 'caiu') { st.estado = 'fim'; opt.onOver && opt.onOver({ metros: Math.floor(st.s), folhas: st.folhas, tempo: st.tv, pace: st.s > 1 ? st.tv / (st.s / 1000) : 0 }); } }, 900);
  }

  /* laço */
  let raf = 0, ult = performance.now(), vivo = true, hudT = 0;
  function quadro(agora) {
    if (!vivo) return; raf = requestAnimationFrame(quadro);
    const dt = Math.min(0.033, (agora - ult) / 1000); ult = agora;
    const jogo = st.estado === 'jogo';
    if (jogo) {
      st.t += dt; st.vel = 14 + 22 * (1 - Math.exp(-st.t / 90)); st.s += st.vel * dt; st.tv += st.vel * dt * ritmo(st.vel) / 1000; // relógio da corrida: tempo real que levaria nesse pace
      if (st.s >= st.proxKm) { const kmT = st.tv - st.tKm; st.tKm = st.tv; hkm.innerHTML = `<b>${Math.round(st.proxKm / 1000)} km</b><span>${mmss(kmT)} · pace ${mmss(ritmo(st.vel)).replace(/^0/, '')}/km</span>`; hkm.hidden = false; hkm.style.animation = 'none'; void hkm.offsetWidth; hkm.style.animation = ''; clearTimeout(st.kmTo); st.kmTo = setTimeout(() => { hkm.hidden = true; }, 2200); st.proxKm += 1000; try { navigator.vibrate && navigator.vibrate([40, 60, 40]); } catch (e) {} }
      if (st.ima > 0) st.ima -= dt; if (st.tenis > 0) st.tenis -= dt;
      // curvas suaves que mudam de tempos em tempos
      if (Math.random() < dt * 0.12) st.curvaAlvo = (Math.random() - 0.5) * 0.0042;
    }
    st.curva += (st.curvaAlvo - st.curva) * Math.min(1, dt * 0.6);
    // pulo e rolamento
    const kv = 1 + Math.max(0, st.vel - 14) / 30;
    if (!st.chao) { st.vy -= (st.tenis > 0 ? 26 : 32) * kv * dt; st.py += st.vy * dt; if (st.py <= 0) { st.py = 0; st.vy = 0; st.chao = true; } }
    if (st.rolando > 0) st.rolando -= dt;
    const alvoX = LANES[st.faixa]; st.px += (alvoX - st.px) * Math.min(1, dt * (14 + Math.max(0, st.vel - 14) * 0.3));
    if (jogo || st.estado === 'pronto') st.ph += dt * (st.estado === 'pronto' ? 7 : 7 + st.vel * 0.42);
    // gerar
    if (jogo) {
      while (st.proxLinha < st.s + 150) gerarLinha();
      if (st.s + 160 > st.proxRio) { trechoRio(st.proxRio, 70); st.proxRio += 650 + Math.random() * 450; }
      if (st.s + 165 > st.proxSerra) { trechoSerra(st.proxSerra, 140); st.proxSerra += 700 + Math.random() * 400; if (Math.abs(st.proxSerra - st.proxRio) < 220) st.proxSerra += 260; }
    }
    while (st.proxDeco[0] < st.s + 170) gerarDeco(0); while (st.proxDeco[1] < st.s + 170) gerarDeco(1);
    while (proxPoste < st.s + 170) { if (!(st.rio && proxPoste > st.rio.a - 3 && proxPoste < st.rio.b + 3) && !(st.serra && proxPoste > st.serra.a - 3 && proxPoste < st.serra.b + 3)) poste(proxPoste, (proxPoste / 32 | 0) % 2 ? 5.9 : -5.9); proxPoste += 32; }
    // objetos
    const rolando = st.rolando > 0 && st.chao;
    for (const o of objs) {
      if (!o.vivo) continue;
      if (o.mov && jogo) o.s -= o.mov * dt;
      const fim = o.s + (o.len || 0) - (o.desloc || 0);
      if (fim < st.s - 12) { o.vivo = false; scene.remove(o.m); continue; }
      colocar(o); if (o.desloc) o.m.position.z += 0;
      if (o.tipo === 'folha' || o.tipo === 'bonus') { o.giro += dt * 3; o.m.rotation.y += o.giro; o.m.position.y += Math.sin(st.t * 4 + o.s) * 0.08; }
      if (!jogo) continue;
      // ímã puxa folhas
      if (o.tipo === 'folha' && st.ima > 0 && o.s - st.s < 14 && o.s > st.s - 1) { o.x += (st.px - o.x) * Math.min(1, dt * 8); o.y += (st.py + 1 - o.y) * Math.min(1, dt * 8); if (o.s - st.s > 0.5) o.s -= dt * 20; }
      const a0 = o.s + (o.desloc || 0) - (o.tipo === 'bloco' ? 0 : o.len / 2), a1 = a0 + (o.tipo === 'bloco' ? o.len : o.len);
      if (st.s + 0.35 < a0 || st.s - 0.35 > a1) continue;
      const dx = Math.abs(o.x - st.px);
      if (o.tipo === 'folha') { if (dx < 1.1 && Math.abs((o.y) - (st.py + 1)) < 1.3) { o.vivo = false; scene.remove(o.m); st.folhas++; } continue; }
      if (o.tipo === 'bonus') { if (dx < 1.2) { o.vivo = false; scene.remove(o.m); if (o.k === 'ima') st.ima = 10; else st.tenis = 10; } continue; }
      if (o.tipo === 'deco') continue;
      if (dx > 1.05) continue;
      let ok = false;
      if (o.tipo === 'baixo') ok = st.py > o.h - 0.15;
      else if (o.tipo === 'buraco') ok = st.py > 0.25;
      else if (o.tipo === 'alto') ok = rolando || st.py > 2.6;
      else if (o.tipo === 'bloco') ok = st.py > o.h + 0.1;
      if (ok || o.ignorar) continue;
      const trocando = Math.abs(st.px - LANES[st.faixa]) > 0.35 && st.faixaAnt !== undefined && LANES[st.faixaAnt] !== o.x && st.s > a0 + 0.3;
      if (trocando) { // bateu de lado: volta e tropeça
        st.faixa = st.faixaAnt; st.tremor = 0.25; o.ignorar = true;
        if (st.t - st.ultTropeco < 4) { bater(); break; }
        st.ultTropeco = st.t; try { navigator.vibrate && navigator.vibrate(60); } catch (e) {}
      } else { bater(); break; }
    }
    for (let i = objs.length - 1; i >= 0; i--) if (!objs[i].vivo) objs.splice(i, 1);
    // chão curvo
    for (const t of tiras) {
      const p = t.geo.attributes.position.array, b = t.base;
      for (let i = 0; i < p.length; i += 3) { const d = Math.max(0, -b[i + 2]); p[i] = b[i] + offX(d); p[i + 1] = b[i + 1] + offY(d); }
      t.geo.attributes.position.needsUpdate = true;
    }
    texRua.offset.y = (st.s / 12) % 1; texCal.offset.y = (st.s / 3) % 1; texGrama.offset.y = (st.s / 10) % 1; texAgua.offset.x += dt * 0.03; texQueda.offset.y += dt * 1.6;
    // serras acompanham a curva
    for (const sr of serras) { sr.m.position.x = -st.curva * 9000 * sr.par; sr.m.material.map.offset.x = (sr.m.material.map.userData.o0 ??= sr.m.material.map.offset.x) + (st.s * 0.00002 * sr.par) % 1; }
    // jogador
    jog.position.set(st.px, st.py, 0);
    jog.rotation.y = (LANES[st.faixa] - st.px) * 0.12; // de costas para a câmera
    const um = jog.userData;
    if (st.estado === 'caiu' || st.estado === 'fim') pose(jog, st.ph, 'caiu');
    else if (!st.chao && !(st.rolando > 0)) pose(jog, st.ph, 'pulo');
    else pose(jog, st.ph, 'corre', st.estado === 'pronto' ? 0.5 : 1);
    if (rolando && st.estado === 'jogo') { pose(jog, st.ph, 'pulo'); um.corpo.scale.setScalar(0.6); um.corpo.rotation.set(-(0.7 - st.rolando) * 13, 0, 0); um.corpo.position.y = 0.62; }
    sombra.position.set(st.px, 0.06, 0); sombra.scale.setScalar(Math.max(0.4, 1 - st.py * 0.15));
    luzP.position.set(st.px, 3.2, 1.5);
    // câmera
    const sh = st.tremor > 0 ? (Math.random() - .5) * st.tremor : 0; if (st.tremor > 0) st.tremor -= dt;
    const cy = 4.0 + st.py * 0.35, cz = 7.2;
    const fovA = cam.userData.fov0 + Math.max(0, st.vel - 14) * 0.35; if (Math.abs(cam.fov - fovA) > 0.05) { cam.fov += (fovA - cam.fov) * Math.min(1, dt * 2); cam.updateProjectionMatrix(); }
    cam.position.set(st.px * 0.65 + sh, cy + sh, cz); cam.lookAt(st.px * 0.65 + offX(18) * 0.5, 1.2 + st.py * 0.2 + offY(18), -18);
    renderer.render(scene, cam);
    hudT -= dt; if (hudT <= 0) { hudT = 0.1; atualizarHud(); }
  }
  function ajustar() { renderer.setSize(W(), H()); cam.aspect = W() / H(); cam.fov = cam.userData.fov0 = W() / H() < 0.7 ? 64 : 56; cam.updateProjectionMatrix(); }
  window.addEventListener('resize', ajustar); ajustar();
  const vis = () => { ult = performance.now(); }; document.addEventListener('visibilitychange', vis);
  reiniciar(); raf = requestAnimationFrame(quadro);
  if (opt.debug) window.__g3 = { st, objs, buraco, cachoeira };

  return {
    reiniciar,
    recorde(v) { hr.textContent = v ? 'Recorde ' + Number(v).toLocaleString('pt-BR') : ''; },
    destruir() {
      vivo = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('resize', ajustar); document.removeEventListener('visibilitychange', vis);
      limparObjs(); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {} cv.remove(); hud.remove(); dica.remove();
    }
  };
}

