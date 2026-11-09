// Corre, Verde! 3D — corrida de frente pelas ruas de Magé.
// Carregado só quando alguém abre o jogo. Usa three.js pelo CDN.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

/* ---------- o corredor Passos Verdes ---------- */
const LANES = [-2.4, 0, 2.4];
const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
let GRAD = null;
function toon(c) {
  if (!GRAD) { GRAD = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 140, 140, 140, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 4, 1); GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.needsUpdate = true; }
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

function texPeito(num, cor) { // número de peito dos adversários
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = cor; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff'; g.fillRect(14, 24, 100, 80); g.fillStyle = '#111'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 46px Archivo, "Arial Narrow", Arial, sans-serif'; g.fillText(String(num), 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function boneco(o = {}) {
  const NEON = o.det ?? 0xc8f560, PRETO = o.cam ?? 0x161816, PELE = o.pele ?? 0xb57650, CABELO = o.cab ?? 0x141010;
  const root = new THREE.Group(); const piv = new THREE.Group(); piv.position.y = 1; root.add(piv); const corpo = new THREE.Group(); corpo.position.y = -1; piv.add(corpo);
  const pele = toon(PELE), camisa = toon(PRETO), neon = toon(NEON), short = toon(PRETO), branco = toon(0xf4f4f0), cabelo = toon(CABELO);
  const cap = (r, l, m, seg = 10) => contorno(new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, seg), m));
  const esf = (r, m, w = 16, h = 12) => contorno(new THREE.Mesh(new THREE.SphereGeometry(r, w, h), m));
  // tronco: camisa preta com detalhes neon
  const tronco = cap(0.27, 0.38, camisa, 14); tronco.scale.set(1.15, 1, 0.8); tronco.position.y = 1.38; corpo.add(tronco);
  const gola = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 16), neon); gola.rotation.x = Math.PI / 2; gola.position.y = 1.73; corpo.add(gola);
  for (const sx of [-1, 1]) { const lt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.36), neon); lt.position.set(0.305 * sx, 1.38, 0); corpo.add(lt); }
  const costas = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: o.num ? texPeito(o.num, '#' + PRETO.toString(16).padStart(6, '0')) : texCostas() })); costas.position.set(0, 1.42, 0.222); corpo.add(costas);
  if (!o.num) { const pv = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: NEON })); pv.position.set(-0.12, 1.55, -0.222); pv.rotation.y = Math.PI; corpo.add(pv); }
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
    const cores = noite ? [['#22384a', '#1b2c3a'], ['#1d3328', '#172a22'], ['#132a1e', '#10221a']] : [['#7f9fb8', '#c9d7d6'], ['#5f8f73', '#a9c2a4'], ['#3f7a50', '#6f9a68']];
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, cores[camada][0]); gr.addColorStop(1, cores[camada][1]); g.fillStyle = gr;
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
  const PROVA = opt.modo === 'prova';
  const RIO = opt.percurso === 'rio' && !PROVA; // percurso do rio: pedras, lixo pra recolher, cobras
  const W = () => el.clientWidth || 360, H = () => el.clientHeight || 600;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.setSize(W(), H()); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = noite ? 1.25 : 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  const cv = renderer.domElement; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block';

  const scene = new THREE.Scene();
  const ceuCor = noite ? 0x0e1c2a : 0xeedcbc;
  scene.background = canvasTex(4, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    if (noite) { gr.addColorStop(0, '#02050b'); gr.addColorStop(.55, '#0b1a2c'); gr.addColorStop(1, '#1d3b3a'); }
    else { gr.addColorStop(0, '#2f78c0'); gr.addColorStop(.45, '#7fbfe6'); gr.addColorStop(.78, '#f6dcb4'); gr.addColorStop(1, '#ffc98a'); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.fog = new THREE.Fog(ceuCor, 40, noite ? 150 : 170);
  const cam = new THREE.PerspectiveCamera(62, W() / H(), 0.1, 400);

  scene.add(new THREE.HemisphereLight(noite ? 0x6f86b0 : 0xcfe6ff, noite ? 0x16201a : 0x6a7a45, noite ? 0.8 : 1.0));
  const sol = new THREE.DirectionalLight(noite ? 0x9fb4ff : 0xffe0b0, noite ? 0.6 : 2.3); sol.position.set(-10, 16, -14); scene.add(sol); scene.add(sol.target);
  sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024); sol.shadow.bias = -0.0008; sol.shadow.normalBias = 0.02;
  Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 26, bottom: -14, near: 1, far: 70 }); sol.shadow.camera.updateProjectionMatrix();
  const contra = new THREE.DirectionalLight(noite ? 0x6f8fd0 : 0xfff0d8, noite ? 0.35 : 0.7); contra.position.set(4, 7, -12); scene.add(contra); // luz de recorte no corredor
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
    const s = new THREE.Mesh(new THREE.CircleGeometry(8, 24), new THREE.MeshBasicMaterial({ color: 0xfff3d0, fog: false, toneMapped: false })); s.position.set(-62, 52, -262); ceu.add(s);
    const glowT = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,236,190,.9)'); r.addColorStop(.25, 'rgba(255,210,140,.35)'); r.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, fog: false, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })); glow.scale.set(110, 110, 1); glow.position.set(-62, 52, -261); ceu.add(glow);
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
  const texRua = RIO ? canvasTex(256, 512, (g, w, h) => {
    const ag = g.createLinearGradient(0, 0, w, 0);
    ag.addColorStop(0, noite ? '#0d2633' : '#2f7fa3'); ag.addColorStop(0.5, noite ? '#123445' : '#3c95bb'); ag.addColorStop(1, noite ? '#0d2633' : '#2f7fa3');
    g.fillStyle = ag; g.fillRect(0, 0, w, h);
    g.strokeStyle = noite ? 'rgba(150,200,255,.18)' : 'rgba(255,255,255,.35)'; g.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y + 8, x, y + 18); g.stroke(); }
    [57, 128, 199].forEach((cx, k) => {
      for (let j = 0; j < 4; j++) {
        const cy = j * 128 + 64 + (k % 2 ? 40 : 0), rx = 24 + Math.random() * 5, ry = 30 + Math.random() * 6;
        g.fillStyle = noite ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(cx, cy % h + 4, rx + 6, ry + 6, 0, 0, 7); g.fill();
        g.fillStyle = noite ? '#4a4f4a' : '#8d9289'; g.beginPath(); g.ellipse(cx, cy % h, rx, ry, (Math.random() - .5) * .5, 0, 7); g.fill();
        g.fillStyle = noite ? '#5b615a' : '#a7ab9f'; g.beginPath(); g.ellipse(cx - 5, (cy % h) - 6, rx * .6, ry * .55, 0, 0, 7); g.fill();
      }
    });
  }, [1, LEN / 12]) : canvasTex(512, 1024, (g, w, h) => {
    const base = g.createLinearGradient(0, 0, w, 0); base.addColorStop(0, noite ? '#26292c' : '#3e4246'); base.addColorStop(.5, noite ? '#2e3236' : '#4b5055'); base.addColorStop(1, noite ? '#26292c' : '#3e4246');
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    { const cs = noite ? ['#33373b', '#202326', '#3a3e42', '#2a2d31'] : ['#555a60', '#3a3e42', '#62676c', '#45494e', '#6a6f74']; for (let i = 0; i < 26000; i++) { g.fillStyle = cs[i % cs.length]; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5); } }
    g.fillStyle = noite ? 'rgba(0,0,0,.18)' : 'rgba(20,22,25,.18)'; for (const x of [w / 6, w / 2, w * 5 / 6]) { g.fillRect(x - 46, 0, 22, h); g.fillRect(x + 24, 0, 22, h); } // marcas de pneu
    for (let i = 0; i < 4; i++) { g.fillStyle = noite ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.12)'; const x = Math.random() * w * .8, y = Math.random() * h; g.fillRect(x, y, 60 + Math.random() * 90, 40 + Math.random() * 90); } // remendos
    g.strokeStyle = noite ? 'rgba(0,0,0,.45)' : 'rgba(20,20,20,.5)'; g.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) { let x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - .5) * 30; y += 8 + Math.random() * 14; g.lineTo(x, y); } g.stroke(); } // rachaduras
    g.fillStyle = noite ? '#d9d6c8' : '#f1eee2';
    for (const x of [w / 3, w * 2 / 3]) for (let y = 60; y < h; y += 512) { g.globalAlpha = .9; g.fillRect(x - 5, y, 10, 300); g.globalAlpha = .25; for (let k = 0; k < 40; k++) g.clearRect ? g.fillRect(x - 5 + Math.random() * 10, y + Math.random() * 300, 2, 2) : 0; }
    g.globalAlpha = 1; g.fillStyle = '#e2b93b'; g.fillRect(10, 0, 10, h); g.fillRect(w - 20, 0, 10, h);
    g.fillStyle = noite ? 'rgba(0,0,0,.25)' : 'rgba(60,60,60,.25)'; for (let y = 0; y < h; y += 14) { g.fillRect(10, y, 10, 3); g.fillRect(w - 20, y + 7, 10, 3); }
  }, [1, LEN / 24]);
  const texCal = RIO ? canvasTex(128, 128, (g, w, h) => { g.fillStyle = noite ? '#3a3a32' : '#8a7a5c'; g.fillRect(0, 0, w, h); ruido(g, w, h, 500, noite ? ['#4a4a40', '#2c2c26', '#55554a'] : ['#9a8a6a', '#6f6248', '#b0a27e', '#7d8a86']); }, [1, LEN / 3]) : canvasTex(256, 256, (g, w, h) => { // pedra portuguesa
    g.fillStyle = noite ? '#7d7a72' : '#e6e0d3'; g.fillRect(0, 0, w, h);
    ruido(g, w, h, 1500, noite ? ['#6f6c65', '#8a877f'] : ['#d6cfc0', '#f2ede2', '#cfc8b8']);
    g.fillStyle = noite ? 'rgba(30,30,28,.55)' : 'rgba(55,55,52,.42)';
    for (let y = -32; y < h + 32; y += 64) { g.beginPath(); for (let x = 0; x <= w; x += 4) g.lineTo(x, y + Math.sin(x / w * Math.PI * 2) * 16); for (let x = w; x >= 0; x -= 4) g.lineTo(x, y + 14 + Math.sin(x / w * Math.PI * 2) * 16); g.closePath(); g.fill(); }
    g.strokeStyle = noite ? 'rgba(0,0,0,.18)' : 'rgba(120,112,98,.22)'; g.lineWidth = 1; for (let x = 0; x < w; x += 8) for (let y = 0; y < h; y += 8) g.strokeRect(x + (y / 8 % 2) * 4, y, 8, 8);
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 0, 8, h);
  }, [1, LEN / 4]);
  const texGrama = canvasTex(256, 256, (g, w, h) => { g.fillStyle = RIO ? (noite ? '#10261a' : '#3f7f3c') : noite ? '#17331f' : '#5c9a48'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { g.fillStyle = noite ? 'rgba(0,0,0,.12)' : ['rgba(120,160,60,.35)', 'rgba(40,90,40,.35)', 'rgba(150,170,80,.3)'][i % 3]; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 20 + Math.random() * 40, 12 + Math.random() * 30, Math.random() * 3, 0, 7); g.fill(); }
    ruido(g, w, h, 2600, noite ? ['#1d3d26', '#122a19', '#21452b'] : ['#6aa857', '#4a8a40', '#7cb766', '#3f7a3c', '#8fbf6a']);
    if (!noite) for (let i = 0; i < 40; i++) { g.fillStyle = ['#f4e36b', '#ffffff', '#f2a2c0', '#ffb347'][i % 4]; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
  }, [10, LEN / 10]);
  const rua = tira(-4.3, 4.3, 3, new THREE.MeshLambertMaterial({ map: texRua }), 0); rua.receiveShadow = true;
  function parede(x, y0, y1, material) { // faixa vertical (meio-fio) que acompanha a curva
    const geo = new THREE.PlaneGeometry(LEN, y1 - y0, NZ, 1); geo.rotateY(x < 0 ? Math.PI / 2 : -Math.PI / 2); geo.translate(x, (y0 + y1) / 2, Z0 - LEN / 2);
    const base = Float32Array.from(geo.attributes.position.array); const m = new THREE.Mesh(geo, material); scene.add(m); tiras.push({ geo, base }); return m;
  }
  if (!RIO) { const mf = new THREE.MeshLambertMaterial({ color: noite ? 0x77756c : 0xd8d2c4 }); parede(-4.3, 0, 0.13, mf); parede(4.3, 0, 0.13, mf); }
  tira(-6.4, -4.3, 1, new THREE.MeshLambertMaterial({ map: texCal }), 0.13).receiveShadow = true;
  tira(4.3, 6.4, 1, new THREE.MeshLambertMaterial({ map: texCal }), 0.13).receiveShadow = true;
  tira(-70, -6.4, 4, new THREE.MeshLambertMaterial({ map: texGrama }), 0.05).receiveShadow = true;
  tira(6.4, 70, 4, new THREE.MeshLambertMaterial({ map: texGrama }), 0.05).receiveShadow = true;
  const texRuaRep = LEN / 24, texCalRep = LEN / 4, texGramaRep = LEN / 10;

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
  const jog = boneco(); scene.add(jog); jog.traverse(c => { if (c.isMesh) c.castShadow = true; });
  const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); sombra.rotation.x = -Math.PI / 2; sombra.material.opacity = 0.22; scene.add(sombra);

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
  if (RIO) {
    Object.assign(G, { bola: new THREE.SphereGeometry(0.2, 10, 8), tora: new THREE.CylinderGeometry(0.32, 0.34, 2.2, 10), anelTora: new THREE.CylinderGeometry(0.31, 0.31, 0.02, 12),
      garrafa: new THREE.CylinderGeometry(0.13, 0.15, 0.55, 10), tampa: new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), rotulo: new THREE.CylinderGeometry(0.152, 0.152, 0.16, 10, 1, true),
      lata: new THREE.CylinderGeometry(0.13, 0.13, 0.32, 12), lataT: new THREE.CylinderGeometry(0.125, 0.125, 0.02, 12), sacola: new THREE.IcosahedronGeometry(0.3, 0) });
    Object.assign(M, { cobra: toon(0x3d8f2a), cobraF: toon(0xe8c547), toraC: mat(0xc9a06a), musgo: mat(0x4f9a3c), cipo: mat(0x2f7a3e),
      pet: new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.8, emissive: noite ? 0x24506a : 0x000000 }), rotulo: mat(0xe23b2e), lata: mat(0xd8312a, noite ? { emissive: 0x5a1010 } : {}),
      sacola: new THREE.MeshLambertMaterial({ color: 0xf4f4ee, flatShading: true, emissive: noite ? 0x555555 : 0x000000 }) });
    const texC = canvasTex(64, 128, (g, w, h) => { g.fillStyle = noite ? '#123a4f' : '#4aa3c9'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; for (let i = 0; i < 18; i++) { const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y + 14); g.stroke(); } }, [1, 2]);
    M.correnteza = new THREE.MeshBasicMaterial({ map: texC });
  }
  const TX = {};
  const halo = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,220,150,.9)'); r.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });

  function add(m, s, x, extra = {}) {
    scene.add(m); const o = { m, s, x, y: 0, vivo: true, ...extra }; objs.push(o); colocar(o);
    if (!extra.semSombra && o.tipo !== 'folha') m.traverse(c => { if (c.isMesh && !c.material.transparent) c.castShadow = true; });
    return o;
  }

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
  /* ---------- sons (liga e desliga em Configurações) ---------- */
  let ac = null;
  function somFx(k) {
    if (!opt.som) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, out = ac.createGain(); out.connect(ac.destination);
      const osc = (tipo, f0, f1, dur, vol, atraso = 0) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = tipo; o.frequency.setValueAtTime(f0, t + atraso); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + atraso + dur); g.gain.setValueAtTime(0.0001, t + atraso); g.gain.exponentialRampToValueAtTime(vol, t + atraso + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + atraso + dur); o.connect(g).connect(out); o.start(t + atraso); o.stop(t + atraso + dur + 0.05); };
      const ruidoS = (dur, vol, fc) => { const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'lowpass'; f.frequency.value = fc; g.gain.value = vol; src.buffer = b; src.connect(f).connect(g).connect(out); src.start(t); };
      if (k === 'folha') { osc('sine', 880, 1320, 0.12, 0.12); osc('sine', 1320, 1760, 0.1, 0.08, 0.05); }
      else if (k === 'pulo') osc('triangle', 260, 520, 0.18, 0.14);
      else if (k === 'rola') ruidoS(0.22, 0.25, 900);
      else if (k === 'lado') ruidoS(0.08, 0.12, 2400);
      else if (k === 'passo') ruidoS(0.05, 0.08, 600);
      else if (k === 'bate') { ruidoS(0.4, 0.5, 400); osc('sawtooth', 140, 50, 0.35, 0.18); }
      else if (k === 'km') { osc('sine', 660, 0, 0.16, 0.14); osc('sine', 990, 0, 0.22, 0.12, 0.12); }
      else if (k === 'bonus') { [523, 659, 784, 1047].forEach((f, i) => osc('triangle', f, 0, 0.12, 0.1, i * 0.06)); }
      else if (k === 'toque') osc('triangle', 300 + Math.random() * 40, 180, 0.07, 0.07);
      else if (k === 'conta') osc('sine', 520, 0, 0.18, 0.15);
      else if (k === 'vai') { osc('sine', 880, 0, 0.35, 0.18); ruidoS(0.25, 0.3, 3000); }
      else if (k === 'chegada') { [523, 659, 784, 1047, 1319].forEach((f, i) => osc('triangle', f, 0, 0.2, 0.12, i * 0.09)); }
    } catch (e) {}
  }
  /* ---------- cenário caprichado ---------- */
  const MX = {
    folhas: [toon(0x3f8f3a), toon(0x2f7a34), toon(0x5aa346), toon(0x6fb24a)], tronco: toon(0x6b4a2f), palmT: toon(0x8a6a44), palmF: new THREE.MeshToonMaterial({ color: 0x3f9a45, gradientMap: GRAD, side: THREE.DoubleSide }),
    coco: toon(0x5a3a1a), flor: [toon(0xf2a2c0), toon(0xf4e36b), toon(0xffffff), toon(0xe2603a)],
    parede: [0xf7d26a, 0xf29e8e, 0x9ed7c8, 0xf4efe4, 0xb9d77c, 0x8fb6e6, 0xe9b3d6, 0xf6b26b].map(c => toon(c)),
    faixa: toon(0x6d6a63), moldura: toon(0xf7f5ee), vidro: new THREE.MeshLambertMaterial({ color: noite ? 0xffd88a : 0x35505f, emissive: noite ? 0xb07a20 : 0x0b1a22 }),
    telha: toon(0xb3532f), laje: toon(0xbdb7aa), caixa: toon(0x2f6fd6), porta: toon(0x6b3f25), grade: toon(0x2a2a2a), toldo: [toon(0xe23b2e), toon(0x2f7a3e), toon(0x2f6fd6), toon(0xf4c430)],
    concreto: toon(0x9a968c), fio: new THREE.LineBasicMaterial({ color: 0x1a1a1a })
  };
  const GX = { copa: new THREE.IcosahedronGeometry(1, 1), tronco: new THREE.CylinderGeometry(0.16, 0.3, 2.6, 7), galho: new THREE.CylinderGeometry(0.07, 0.11, 1.3, 5),
    palmSeg: new THREE.CylinderGeometry(0.15, 0.19, 1.4, 7), frond: (() => { const g = new THREE.PlaneGeometry(0.8, 3.2, 1, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 1.6; p.setZ(i, -0.09 * y * y); p.setX(i, p.getX(i) * (1 - y / 3.6)); p.setY(i, y); } g.computeVertexNormals(); return g; })(),
    bola: new THREE.SphereGeometry(0.16, 8, 6), caixa: new THREE.BoxGeometry(1, 1, 1), cil: new THREE.CylinderGeometry(1, 1, 1, 12), poste: new THREE.CylinderGeometry(0.09, 0.14, 7.5, 6) };
  const placas = ['AÇAÍ', 'PADARIA', 'MERCADINHO', 'SALÃO', 'LANCHONETE', 'BAZAR', 'BICICLETARIA', 'HORTIFRUTI'];
  function arvore(s, x) {
    const g = new THREE.Group(); const k = 0.85 + Math.random() * 0.6;
    const t = new THREE.Mesh(GX.tronco, MX.tronco); t.position.y = 1.3; g.add(t);
    for (const sx of [-1, 1]) { const b = new THREE.Mesh(GX.galho, MX.tronco); b.position.set(sx * 0.35, 2.3, 0); b.rotation.z = -sx * 0.7; g.add(b); }
    const n = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) { const c = new THREE.Mesh(GX.copa, MX.folhas[Math.floor(Math.random() * 4)]); const a = i / n * 6.28; const r = i ? 0.8 : 0; c.position.set(Math.cos(a) * r, 3.2 + Math.random() * 0.8 + (i ? 0 : 0.6), Math.sin(a) * r); c.scale.setScalar((i ? 0.9 : 1.2) + Math.random() * 0.35); g.add(c); }
    g.scale.setScalar(k);
    return add(g, s, x, { tipo: 'deco', rot: Math.random() * 6 });
  }
  function palmeira(s, x) {
    const g = new THREE.Group(); let px = 0, py = 0; const inc = (Math.random() - 0.5) * 0.18, lado = -Math.sign(x) * 0.12;
    for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(GX.palmSeg, MX.palmT); p.position.set(px, py + 0.7, 0); p.rotation.z = inc + lado * i * 0.4; g.add(p); px += Math.sin(-(inc + lado * i * 0.4)) * 1.35; py += 1.33; }
    const topo = new THREE.Group(); topo.position.set(px, py, 0); g.add(topo);
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(GX.frond, MX.palmF); f.rotation.order = 'YXZ'; f.rotation.y = i / 9 * 6.28; f.rotation.x = -1.0 - Math.random() * 0.35; topo.add(f); }
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(GX.bola, MX.coco); c.position.set(Math.cos(i * 2.1) * 0.2, -0.15, Math.sin(i * 2.1) * 0.2); topo.add(c); }
    return add(g, s, x, { tipo: 'deco', rot: Math.random() * 6 });
  }
  function arbusto(s, x) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(GX.copa, MX.folhas[(i + 1) % 4]); c.scale.set(0.6 + Math.random() * 0.4, 0.45 + Math.random() * 0.25, 0.6 + Math.random() * 0.4); c.position.set((i - 1) * 0.55, 0.35, (Math.random() - .5) * 0.4); g.add(c); }
    if (!noite && Math.random() < 0.7) { const fm = MX.flor[Math.floor(Math.random() * 4)]; for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(GX.bola, fm); f.scale.setScalar(0.5); f.position.set((Math.random() - .5) * 1.6, 0.65 + Math.random() * 0.25, (Math.random() - .5) * 0.8); g.add(f); } }
    return add(g, s, x, { tipo: 'deco' });
  }
  function caixa(g, mat, sx, sy, sz, x, y, z) { const m = new THREE.Mesh(GX.caixa, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; }
  function casa(s, x) {
    const g = new THREE.Group(); const lado = Math.sign(x); const andares = Math.random() < 0.45 ? 2 : 1;
    const w = 5 + Math.random() * 2.5, dp = 5.5, h = andares * 3 + 0.3; const fx = -lado * (w / 2 + 0.02);
    const cor = MX.parede[Math.floor(Math.random() * MX.parede.length)];
    caixa(g, cor, w, h, dp, 0, h / 2, 0);
    caixa(g, MX.faixa, w + 0.04, 0.5, dp + 0.04, 0, 0.25, 0); // rodapé
    // janelas com moldura
    for (let a = 0; a < andares; a++) for (const z of [-1.5, 1.5]) {
      const y = a * 3 + (a ? 1.7 : 1.6); if (a === 0 && z > 0 && andares === 1 && Math.random() < 0.5) continue;
      caixa(g, MX.moldura, 0.08, 1.2, 1.2, fx, y, z); caixa(g, MX.vidro, 0.1, 0.95, 0.95, fx - lado * 0.01, y, z);
      if (Math.random() < 0.5) for (let k = -2; k <= 2; k++) caixa(g, MX.grade, 0.12, 1.0, 0.05, fx - lado * 0.04, y, z + k * 0.2);
    }
    // porta e, às vezes, comércio com toldo e placa
    const loja = Math.random() < 0.4;
    if (loja) {
      caixa(g, MX.grade, 0.1, 2.3, 2.6, fx, 1.25, 0);
      const tld = MX.toldo[Math.floor(Math.random() * 4)]; const t = caixa(g, tld, 1.2, 0.12, 3.2, fx - lado * 0.55, 2.7, 0); t.rotation.z = lado * 0.25;
      const nome = placas[Math.floor(Math.random() * placas.length)];
      const tx = canvasTex(256, 64, (gc, W2, H2) => { gc.fillStyle = '#fff8e8'; gc.fillRect(0, 0, W2, H2); gc.fillStyle = '#1f2a1f'; gc.font = '900 34px Arial'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText(nome, W2 / 2, H2 / 2 + 2); });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshLambertMaterial({ map: tx })); pl.position.set(fx - lado * 0.03, 3.25, 0); pl.rotation.y = -lado * Math.PI / 2; g.add(pl);
    } else { caixa(g, MX.moldura, 0.08, 2.3, 1.2, fx, 1.15, 0); caixa(g, MX.porta, 0.1, 2.1, 1.0, fx - lado * 0.01, 1.05, 0); }
    // telhado: laje com caixa d'água ou telha
    if (Math.random() < 0.55) {
      caixa(g, MX.laje, w + 0.1, 0.25, dp + 0.1, 0, h + 0.12, 0); caixa(g, MX.laje, w + 0.1, 0.5, 0.15, 0, h + 0.4, dp / 2); caixa(g, MX.laje, w + 0.1, 0.5, 0.15, 0, h + 0.4, -dp / 2);
      const cx = new THREE.Mesh(GX.cil, MX.caixa); cx.scale.set(0.65, 0.9, 0.65); cx.position.set(lado * w * 0.2, h + 0.75, -1); g.add(cx);
      const tp = new THREE.Mesh(GX.cil, MX.caixa); tp.scale.set(0.7, 0.12, 0.7); tp.position.set(lado * w * 0.2, h + 1.25, -1); g.add(tp);
    } else {
      const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.01, Math.SQRT2 * 0.5, 1, 4, 1), MX.telha); tl.rotation.y = Math.PI / 4; tl.scale.set((w + 0.6), 1.7, (dp + 0.6)); tl.position.y = h + 0.85; g.add(tl);
    }
    // muro baixo com portão
    if (Math.random() < 0.5) { const mz = (Math.random() < .5 ? -1 : 1) * (dp / 2 + 1.4); caixa(g, cor, 0.25, 1.1, 2.4, fx - lado * 0.8, 0.55, mz); }
    return add(g, s, x, { tipo: 'deco' });
  }
  let postePrev = null;
  function poste(s, x) {
    const g = new THREE.Group(); const p = new THREE.Mesh(GX.poste, MX.concreto); p.position.y = 3.75; g.add(p);
    const cruz = caixa(g, MX.concreto, 0.14, 0.14, 1.8, 0, 6.9, 0); cruz.rotation.y = Math.PI / 2;
    if (Math.random() < 0.3) { const tr = new THREE.Mesh(GX.cil, MX.concreto); tr.scale.set(0.35, 0.8, 0.35); tr.position.set(0.3, 6.0, 0); g.add(tr); }
    const br = caixa(g, M.poste, 1.6, 0.08, 0.08, -Math.sign(x) * 0.8, 5.4, 0);
    const l = new THREE.Mesh(G.lampada, M.luz); l.position.set(-Math.sign(x) * 1.55, 5.25, 0); g.add(l);
    // fios até o poste anterior (curva de catenária)
    for (const dx of [-0.75, 0, 0.75]) {
      const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(dx, 6.95 - Math.sin(t * Math.PI) * 0.55, t * 32)); }
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), MX.fio));
    }
    if (noite) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); h.scale.set(2.8, 2.8, 1); h.position.copy(l.position); g.add(h);
      const poça = new THREE.Mesh(new THREE.CircleGeometry(2.8, 16), new THREE.MeshBasicMaterial({ map: halo, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending })); poça.rotation.x = -Math.PI / 2; poça.position.set(-Math.sign(x) * 1.8, 0.2, 0); g.add(poça); }
    return add(g, s, x, { tipo: 'deco' });
  }
  /* poeira e brilhos */
  const texPo = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.85)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const parts = [];
  function particula(x, y, z, cor, vx, vy, vz, vida, tam) {
    let p = parts.find(q => !q.vivo);
    if (!p) { if (parts.length > 60) return; p = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ map: texPo, transparent: true, depthWrite: false })) }; scene.add(p.sp); parts.push(p); }
    Object.assign(p, { vivo: true, x, y, z, vx, vy, vz, vida, t: 0, tam }); p.sp.material.color.set(cor); p.sp.visible = true;
  }
  function particulas(dt) {
    for (const p of parts) { if (!p.vivo) continue; p.t += dt; if (p.t >= p.vida) { p.vivo = false; p.sp.visible = false; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += (p.vz + st.vel) * dt; p.vy -= 3 * dt; const k = p.t / p.vida;
      p.sp.position.set(p.x, p.y, p.z); p.sp.scale.setScalar(p.tam * (0.6 + k)); p.sp.material.opacity = (1 - k) * 0.8; }
  }
  /* ---------- rio ---------- */
  function vao(s, x) { // trecho sem pedra: pula a correnteza
    const g = new THREE.Group(); const a = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.8), M.correnteza); a.rotation.x = -Math.PI / 2; a.position.y = 0.05; g.add(a);
    for (const z of [-1.4, 1.4]) { const e = new THREE.Mesh(G.caixa, M.espuma); e.scale.set(2.3, 0.08, 0.22); e.position.set(0, 0.08, z); g.add(e); }
    for (let i = 0; i < 4; i++) { const e = new THREE.Mesh(G.pedra, M.espuma); e.scale.set(0.25, 0.06, 0.15); e.position.set((Math.random() - .5) * 1.8, 0.09, (Math.random() - .5) * 2); g.add(e); }
    return add(g, s, x, { tipo: 'buraco', h: 0.4, len: 2.8, anim: (o, dt) => { a.material.map.offset.y -= dt * 0.8; } });
  }
  function cobra(s, x) {
    const g = new THREE.Group(); const seg = [];
    for (let i = 0; i < 11; i++) { const m = new THREE.Mesh(G.bola, i % 3 === 1 ? M.cobraF : M.cobra); const k = 0.17 - Math.abs(i - 4) * 0.008; m.scale.setScalar(k / 0.2); m.position.set(-0.95 + i * 0.19, 0.16, 0); g.add(m); seg.push(m); }
    const cab = new THREE.Group(); cab.position.set(1.15, 0.36, 0); g.add(cab);
    const c = new THREE.Mesh(G.bola, M.cobra); c.scale.set(1.25, 0.9, 1.05); cab.add(c);
    for (const sz of [-0.11, 0.11]) { const o = new THREE.Mesh(G.bola, M.branco); o.scale.setScalar(0.28); o.position.set(0.12, 0.08, sz); cab.add(o); const pu = new THREE.Mesh(G.bola, M.pneu); pu.scale.setScalar(0.14); pu.position.set(0.16, 0.09, sz); cab.add(pu); }
    const lg = new THREE.Mesh(G.caixa, M.ima); lg.scale.set(0.22, 0.02, 0.04); lg.position.set(0.32, -0.03, 0); cab.add(lg);
    return add(g, s, x, { tipo: 'baixo', h: 0.55, len: 1.4, rot: Math.PI / 2 * 0, anim: (o, dt) => { const t = st.t * 7 + o.s; seg.forEach((m, i) => { m.position.z = Math.sin(t - i * 0.7) * 0.22; }); cab.position.z = Math.sin(t - 11 * 0.7) * 0.22; cab.position.y = 0.36 + Math.sin(t * 1.3) * 0.05; lg.visible = Math.sin(t * 2.2) > 0.3; } });
  }
  function tronco(s, x) {
    const g = new THREE.Group(); const t = new THREE.Mesh(G.tora, M.tronco); t.rotation.z = Math.PI / 2; t.position.y = 0.33; t.rotation.y = (Math.random() - .5) * 0.25; g.add(t);
    for (const sx of [-1.12, 1.12]) { const c = new THREE.Mesh(G.anelTora, M.toraC); c.rotation.z = Math.PI / 2; c.position.set(sx, 0.33, 0); g.add(c); }
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(G.arbusto, M.musgo); m.scale.set(0.22, 0.12, 0.22); m.position.set(-0.8 + i * 0.5, 0.6, (Math.random() - .5) * 0.3); g.add(m); }
    return add(g, s, x, { tipo: 'baixo', h: 0.72, len: 0.7 });
  }
  function galho(s, x) { // galho baixo atravessado: passa rolando
    const g = new THREE.Group();
    for (const sx of [-1.15, 1.15]) { const p = new THREE.Mesh(G.tronco, M.tronco); p.scale.set(0.8, 1.15, 0.8); p.position.set(sx, 1.35, 0); g.add(p); }
    const h = new THREE.Mesh(G.tora, M.tronco); h.scale.set(0.65, 1.1, 0.65); h.rotation.z = Math.PI / 2 + 0.06; h.position.y = 1.85; g.add(h);
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(G.copa, M.copa[i % 3]); c.scale.setScalar(0.32 + Math.random() * 0.15); c.position.set(-1 + i * 0.4, 2.15 + Math.random() * 0.2, (Math.random() - .5) * 0.4); g.add(c); }
    for (let i = 0; i < 5; i++) { const v = new THREE.Mesh(G.caixa, M.cipo); const l = 0.4 + Math.random() * 0.4; v.scale.set(0.04, l, 0.04); v.position.set(-0.9 + i * 0.45, 1.75 - l / 2, 0); g.add(v); }
    return add(g, s, x, { tipo: 'alto', h: 2.4, len: 0.5 });
  }
  function pedrao(s, x) { // pedra grande: troca de lado
    const g = new THREE.Group();
    const p = new THREE.Mesh(G.pedra, M.pedra[Math.floor(Math.random() * 3)]); p.scale.set(1.15, 1.25, 1.05); p.position.y = 1.0; p.rotation.set(Math.random(), Math.random() * 6, Math.random() * .3); g.add(p);
    const p2 = new THREE.Mesh(G.pedra, M.pedra[(Math.floor(Math.random() * 3) + 1) % 3]); p2.scale.set(0.7, 0.6, 0.7); p2.position.set(0.55, 0.45, 0.5); g.add(p2);
    const ms = new THREE.Mesh(G.arbusto, M.musgo); ms.scale.set(0.6, 0.25, 0.6); ms.position.set(-0.1, 2.05, 0); g.add(ms);
    return add(g, s, x, { tipo: 'bloco', h: 2.3, len: 1.8, desloc: -0.9 });
  }
  function lixo(s, x, y = 1) {
    const k = Math.floor(Math.random() * 3); let m;
    if (k === 0) { m = new THREE.Group(); const c = new THREE.Mesh(G.garrafa, M.pet); m.add(c); const t = new THREE.Mesh(G.tampa, M.ima); t.position.y = 0.3; m.add(t); const r = new THREE.Mesh(G.rotulo, M.rotulo); m.add(r); m.rotation.z = 0.5; }
    else if (k === 1) { m = new THREE.Group(); const c = new THREE.Mesh(G.lata, M.lata); m.add(c); const t = new THREE.Mesh(G.lataT, M.imaP); t.position.y = 0.17; m.add(t); m.rotation.z = -0.4; }
    else { m = new THREE.Mesh(G.sacola, M.sacola); }
    return add(m, s, x, { tipo: 'folha', y, len: 0.6, giro: Math.random() * 6 });
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
  function arvoreVelha(s, x) { const g = new THREE.Group(); const t = new THREE.Mesh(G.tronco, M.tronco); t.position.y = 1.2; g.add(t); const c = new THREE.Mesh(G.copa, M.copa[Math.floor(Math.random() * 3)]); c.position.y = 3.1; c.scale.setScalar(0.9 + Math.random() * .6); g.add(c); return add(g, s, x, { tipo: 'deco', rot: Math.random() * 6 }); }
  function palmeiraVelha(s, x) { const g = new THREE.Group(); const t = new THREE.Mesh(G.palmTronco, M.tronco); t.position.y = 2.5; t.rotation.z = (Math.random() - .5) * .25; g.add(t); for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(G.palmFolha, M.palm); const a = i / 7 * 6.28; f.position.set(Math.cos(a) * 1.1, 5, Math.sin(a) * 1.1); f.rotation.set(0.5, -a + Math.PI / 2, 0); f.rotation.order = 'YXZ'; f.rotation.y = -a + Math.PI / 2; f.rotation.x = 0.45; g.add(f); } return add(g, s, x, { tipo: 'deco', rot: Math.random() * 6 }); }
  function casaVelha(s, x) {
    const g = new THREE.Group(); const w = 4 + Math.random() * 3, h = 3 + Math.random() * 2.5, dp = 5; const lado = Math.sign(x);
    const p = new THREE.Mesh(G.caixa, M.casa[Math.floor(Math.random() * M.casa.length)]); p.scale.set(w, h, dp); p.position.y = h / 2; g.add(p);
    const tl = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, dp) * 0.75, 1.6, 4), M.telhado); tl.rotation.y = Math.PI / 4; tl.position.y = h + 0.8; tl.scale.set(w / Math.max(w, dp) * 1.05, 1, dp / Math.max(w, dp) * 1.05); g.add(tl);
    const fx = -lado * (w / 2 + 0.01);
    const porta = new THREE.Mesh(G.caixa, M.porta); porta.scale.set(0.05, 2, 1); porta.position.set(fx, 1, 0); g.add(porta);
    for (const z of [-1.5, 1.5]) { const j = new THREE.Mesh(G.caixa, M.janela); j.scale.set(0.05, 0.9, 0.9); j.position.set(fx, h * 0.6, z); g.add(j); }
    return add(g, s, x, { tipo: 'deco' });
  }
  function posteVelho(s, x) {
    const g = new THREE.Group(); const p = new THREE.Mesh(G.poste, M.poste); p.position.y = 2.6; g.add(p);
    const br = new THREE.Mesh(G.caixa, M.poste); br.scale.set(1.3, 0.08, 0.08); br.position.set(-Math.sign(x) * 0.6, 5.1, 0); g.add(br);
    const l = new THREE.Mesh(G.lampada, M.luz); l.position.set(-Math.sign(x) * 1.2, 4.95, 0); g.add(l);
    if (noite) { const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); h.scale.set(2.6, 2.6, 1); h.position.copy(l.position); g.add(h);
      const poça = new THREE.Mesh(new THREE.CircleGeometry(2.6, 16), new THREE.MeshBasicMaterial({ map: halo, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending })); poça.rotation.x = -Math.PI / 2; poça.position.set(-Math.sign(x) * 1.6, 0.2, 0); g.add(poça); }
    return add(g, s, x, { tipo: 'deco' });
  }
  function arbustoVelho(s, x) { const m = new THREE.Mesh(G.arbusto, M.arb); m.scale.set(1 + Math.random(), 0.7 + Math.random() * .5, 1 + Math.random()); return add(m, s, x, { tipo: 'deco', y: 0.3 }); }
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
  function placaRio() {
    const placa = new THREE.Group(); const pp = new THREE.Mesh(G.caixa, M.tronco); pp.scale.set(0.14, 2.6, 0.14); pp.position.y = 1.3; placa.add(pp);
    const tx = TX.rio ||= canvasTex(256, 112, (g, w, h) => { g.fillStyle = '#1f6b3b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c8f560'; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = '#fff'; g.font = '900 30px Arial'; g.textAlign = 'center'; g.fillText('RIO SANTO ALEIXO', w / 2, 46); g.fillStyle = '#c8f560'; g.font = '800 20px Arial'; g.fillText('AÇÃO AMBIENTAL · PV', w / 2, 82); });
    const pl = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 0.08), new THREE.MeshLambertMaterial({ map: tx })); pl.position.y = 2.9; pl.rotation.y = Math.PI; placa.add(pl);
    add(placa, 16, -6.2, { tipo: 'deco' });
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
  function linhaLixo(s, faixa, n, arco) { for (let i = 0; i < n; i++) { const y = arco ? 1 + Math.sin(i / (n - 1) * Math.PI) * 2.3 : 1; lixo(s + i * 2.2, LANES[faixa], y); } }
  function gerarLinhaRio() {
    const s = st.proxLinha; const dif = Math.min(1, st.s / 2200);
    const r = Math.random(); const livres = [0, 1, 2];
    const tira = () => livres.splice(Math.floor(Math.random() * livres.length), 1)[0];
    const baixo = () => [vao, cobra, tronco, vao][Math.floor(Math.random() * 4)];
    let gap = Math.max(13, st.vel * (1.05 - dif * 0.32));
    if (st.s > 60 && Math.random() < 0.04) { bonus(s, LANES[Math.floor(Math.random() * 3)], Math.random() < .5 ? 'ima' : 'tenis'); st.proxLinha = s + gap * 0.6; return; }
    if (r < 0.32 - dif * 0.14) { const f = tira(); baixo()(s, LANES[f]); linhaLixo(s - 5, f, 5, true); if (Math.random() < 0.5) linhaLixo(s - 4, livres[Math.floor(Math.random() * livres.length)], 4); }
    else if (r < 0.52) { const f = tira(); galho(s, LANES[f]); if (dif > 0.12 && Math.random() < .5 + dif * .4) { const f2 = tira(); baixo()(s, LANES[f2]); } linhaLixo(s - 3, livres[0], 4); }
    else if (r < 0.8) { const f = tira(); pedrao(s + 2, LANES[f]); if (dif > 0.08 && Math.random() < .55 + dif * .35) { const f2 = tira(); if (Math.random() < .5) pedrao(s + 7, LANES[f2]); else baixo()(s + 3, LANES[f2]); } linhaLixo(s - 2, livres[0], 6); gap += 6; }
    else { const f = tira(), f2 = tira(); baixo()(s, LANES[f]); baixo()(s, LANES[f2]); linhaLixo(s - 5, f, 5, true); linhaLixo(s - 3, livres[0], 4); }
    st.proxLinha = s + gap;
  }
  function gerarLinha() {
    if (RIO) return gerarLinhaRio();
    const s = st.proxLinha; const dif = Math.min(1, st.s / 2200);
    const r = Math.random(); const livres = [0, 1, 2];
    const tira = () => livres.splice(Math.floor(Math.random() * livres.length), 1)[0];
    const tipoBaixo = () => [cone, buraco, barreira][Math.floor(Math.random() * 3)];
    let gap = Math.max(13, st.vel * (1.05 - dif * 0.32));
    if (st.s > 60 && Math.random() < 0.04) { bonus(s, LANES[Math.floor(Math.random() * 3)], Math.random() < .5 ? 'ima' : 'tenis'); st.proxLinha = s + gap * 0.6; return; }
    if (r < 0.32 - dif * 0.14) { // um obstáculo baixo + folhas em arco por cima
      const f = tira(); tipoBaixo()(s, LANES[f]); linhaFolhas(s - 5, f, 5, true);
      if (Math.random() < 0.5) linhaFolhas(s - 4, livres[Math.floor(Math.random() * livres.length)], 4);
    } else if (r < 0.52) { // cavalete alto
      const f = tira(); cavalete(s, LANES[f]);
      if (dif > 0.12 && Math.random() < .5 + dif * .4) { const f2 = tira(); tipoBaixo()(s, LANES[f2]); }
      linhaFolhas(s - 3, livres[0], 4);
    } else if (r < 0.8) { // van parada ou vindo
      const f = tira(); const mov = st.s > 350 && Math.random() < 0.4 + dif * 0.35; van(s + 4, LANES[f], mov);
      if (dif > 0.08 && Math.random() < .55 + dif * .35) { const f2 = tira(); if (Math.random() < .5) van(s + 10, LANES[f2], false); else tipoBaixo()(s + 4, LANES[f2]); }
      linhaFolhas(s - 2, livres[0], 6);
      gap += mov ? 14 : 8;
    } else { // dois baixos, um livre
      const f = tira(), f2 = tira(); tipoBaixo()(s, LANES[f]); tipoBaixo()(s, LANES[f2]); linhaFolhas(s - 5, f, 5, true); linhaFolhas(s - 3, livres[0], 4);
    }
    st.proxLinha = s + gap;
  }
  function gerarDeco(lado) {
    const s = st.proxDeco[lado]; const sg = lado ? 1 : -1;
    if (RIO) {
      if (Math.random() < 0.08) morro(s, sg);
      const r = Math.random();
      if (Math.random() < 0.65) rocha(s, sg * (6.6 + Math.random() * 1.6), 0.5 + Math.random() * 0.9);
      if (r < 0.06 && s > 40) cachoeira(s, sg);
      else if (r < 0.4) arvore(s, sg * (9 + Math.random() * 8));
      else if (r < 0.62) palmeira(s, sg * (9 + Math.random() * 5));
      else arbusto(s, sg * (7.8 + Math.random() * 2.5));
      if (Math.random() < 0.6) arvore(s + 3, sg * (16 + Math.random() * 22));
      st.proxDeco[lado] = s + 5 + Math.random() * 6; return;
    }
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
    if (a === 'esq' && st.faixa > 0) { st.faixaAnt = st.faixa; st.faixa--; somFx('lado'); }
    else if (a === 'dir' && st.faixa < 2) { st.faixaAnt = st.faixa; st.faixa++; somFx('lado'); }
    else if (a === 'cima' || a === 'tap') { if (st.chao) { const kv = 1 + Math.max(0, st.vel - 16) / 30; st.vy = (st.tenis > 0 ? 15.5 : 11.2) * Math.sqrt(kv); st.chao = false; st.rolando = 0; somFx('pulo'); } }
    else if (a === 'baixo') { somFx('rola'); if (!st.chao) st.vy = -28; st.rolando = Math.max(0.45, 0.7 - Math.max(0, st.vel - 16) * 0.007); }
  };
  const pd = e => { e.preventDefault(); if (PROVA) { provaToque(); return; } toque = { x: e.clientX, y: e.clientY, t: performance.now(), feito: false }; };
  const pm = e => { if (!toque || toque.feito) return; const dx = e.clientX - toque.x, dy = e.clientY - toque.y; if (Math.hypot(dx, dy) > 28) { toque.feito = true; acao(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'dir' : 'esq') : (dy > 0 ? 'baixo' : 'cima')); } };
  const pu = e => { if (toque && !toque.feito && performance.now() - toque.t < 300) acao('tap'); toque = null; };
  cv.addEventListener('pointerdown', pd); cv.addEventListener('pointermove', pm); cv.addEventListener('pointerup', pu); cv.addEventListener('pointercancel', () => { toque = null; });
  const kd = e => { if (PROVA) { if (!e.repeat && (e.key === ' ' || e.key.startsWith('Arrow'))) { e.preventDefault(); provaToque(); } return; } const m = { ArrowLeft: 'esq', a: 'esq', ArrowRight: 'dir', d: 'dir', ArrowUp: 'cima', w: 'cima', ' ': 'cima', ArrowDown: 'baixo', s: 'baixo' }[e.key]; if (m) { e.preventDefault(); if (!e.repeat) acao(m); } };
  window.addEventListener('keydown', kd);

  /* placar na tela */
  const hud = document.createElement('div'); hud.className = 'g3hud';
  hud.innerHTML = `<div class="g3c"><b class="g3m">0,00 km</b><span class="g3ps"><span class="g3tm">00:00</span> · <span class="g3pc">--:--</span>/km</span><span class="g3f">🍃 0</span></div><div class="g3r"></div><div class="g3pw"></div><div class="g3km" hidden></div>`;
  el.appendChild(hud);
  const vin = document.createElement('div'); vin.className = 'g3vin'; vin.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 50% 45%,rgba(0,0,0,0) 55%,rgba(0,0,0,' + (noite ? '.55' : '.32') + ') 100%)'; el.insertBefore(vin, hud);
  const dica = document.createElement('div'); dica.className = 'g3dica';
  dica.innerHTML = RIO ? `<b>Corrida no rio</b><div class="g3setas"><span>← →<i>trocar de pedra</i></span><span>↑<i>pular</i></span><span>↓<i>rolar</i></span></div><small>Recolha o lixo do rio · pule a correnteza, as cobras e os troncos · role sob os galhos · desvie das pedras grandes</small>` : `<b>Deslize para correr</b><div class="g3setas"><span>← →<i>trocar de pista</i></span><span>↑<i>pular</i></span><span>↓<i>rolar</i></span></div><small>Pule cones, buracos e barreiras · role sob as placas de OBRAS · desvie das vans</small>`;
  el.appendChild(dica);
  if (PROVA) {
    dica.innerHTML = `<b>${opt.titulo || 'Prova'}</b><div class="g3setas"><span>👆<i>toque pra correr</i></span><span>⚡<i>mais toques, mais rápido</i></span><span>🫁<i>cuide do fôlego</i></span></div><small>Toque na tela pra ir pra largada. Os adversários aceleram no fim, guarde energia!</small>`;
    hud.insertAdjacentHTML('beforeend', `<div class="g3fol"><span>fôlego</span><i><b></b></i></div><div class="g3go" hidden></div>`);
  }
  const hm = hud.querySelector('.g3m'), hf = hud.querySelector('.g3f'), hr = hud.querySelector('.g3r'), hp = hud.querySelector('.g3pw'), htm = hud.querySelector('.g3tm'), hpc = hud.querySelector('.g3pc'), hkm = hud.querySelector('.g3km');
  const mmss = sg => { sg = Math.max(0, Math.round(sg)); return String(Math.floor(sg / 60)).padStart(2, '0') + ':' + String(sg % 60).padStart(2, '0'); };
  const hms = sg => { sg = Math.max(0, Math.round(sg)); const h = Math.floor(sg / 3600), m = Math.floor(sg % 3600 / 60), x = sg % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(x).padStart(2, '0'); };
  const ritmo = v => 1000 / (2.56 + Math.max(0, v - 16) / 32 * 3.4); // segundos por km: 6:30 no início, perto de 2:50 no máximo
  hr.textContent = PROVA ? (opt.recorde ? 'Recorde ' + hms(opt.recorde) : '') : opt.recorde ? 'Recorde ' + Number(opt.recorde).toLocaleString('pt-BR') : '';
  const hfol = hud.querySelector('.g3fol') || document.createElement('div'), hfb = hfol.querySelector('b') || document.createElement('b'), hgo = hud.querySelector('.g3go') || document.createElement('div');

  /* ---------- modo prova (corrida de toque com adversários) ---------- */
  const DIST = Number(opt.distancia) || 5;
  const DUR = { 5: 55, 10: 80, 15: 100, 21: 125, 42: 180 }[DIST] || 60 + DIST * 3;
  const RT = DIST * 300 / DUR; // segundos de prova por segundo real (no pace 5:00)
  const SC = 450; // unidades do mundo por km de distância entre corredores
  const P = { v: 0, f: 100, km: 0, T: 0, ult: -1, quebrou: false, t0: 0, fimT: 0 };
  const paceDe = v => 300 * Math.pow(7.9 / Math.max(0.35, v), 1.6);
  const NIVEIS = {
    facil: [[400, 340], [385, 325], [370, 312], [355, 300], [340, 288]],
    dificil: [[300, 252], [292, 245], [284, 238], [276, 232], [268, 226]]
  };
  const CORES = [[0x2f6fd6, 0xffffff], [0xe23b2e, 0xffffff], [0xf28c28, 0x111111], [0x7b4fd6, 0xffffff], [0xf2f2f2, 0x2f6fd6]];
  const NOMES = ['Azul', 'Vermelho', 'Laranja', 'Roxo', 'Branco'];
  const XS = [-2.7, 2.7, -1.35, 1.35, -3.6];
  const npcs = [];
  function etiqueta(txt, cor) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.font = '800 30px Figtree, Arial, sans-serif'; const w = Math.min(248, g.measureText(txt).width + 28);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect ? g.roundRect(128 - w / 2, 8, w, 46, 23) : g.rect(128 - w / 2, 8, w, 46); g.fill();
    g.fillStyle = cor; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 32);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(2.4, 0.6, 1); sp.position.y = 2.75; sp.renderOrder = 5; return sp;
  }
  function montarNpcs() {
    for (const n of npcs) scene.remove(n.b); npcs.length = 0;
    const lista = (NIVEIS[opt.nivel] || NIVEIS.facil).map((p, i) => ({ p0: p[0], p1: p[1], nome: NOMES[i], cor: CORES[i], x: XS[i] }));
    if (opt.fantasma && opt.fantasma.tempo > 0) { const pf = opt.fantasma.tempo / DIST; lista[0] = { p0: pf, p1: pf, nome: '⚡ ' + (opt.fantasma.nome || 'Desafiante'), cor: [0xc8f560, 0x111111], x: 1.35, fant: true }; lista[3].x = 2.7; lista[1].x = -1.35; }
    lista.forEach((n, i) => {
      const b = boneco({ cam: n.cor[0], det: n.cor[1], pele: [0x8d5a3b, 0xd9a07a, 0x6e4429, 0xc68b62, 0xa86d47][i], cab: [0x141010, 0x3a2414, 0x141010, 0x5a3a1a, 0x141010][i], num: n.fant ? 0 : 100 + ((i * 137 + DIST * 7) % 800) });
      b.add(etiqueta(n.nome, n.fant ? '#c8f560' : '#ffffff')); b.traverse(c => { if (c.isMesh) c.castShadow = true; });
      scene.add(b); npcs.push({ ...n, b, km: 0, ph: Math.random() * 6, fimT: 0, osc: Math.random() * 6 });
    });
  }
  function provaToque() {
    if (st.estado === 'pronto') { comecar(); return; }
    if (st.estado !== 'jogo') return;
    const agora = st.t; if (agora - P.ult < 0.07) return; P.ult = agora;
    const imp = 1.25 * (P.quebrou ? 0.35 : 1);
    P.v += imp * (1 - P.v / 12.5); somFx('toque');
    hfol.classList.remove('pulso'); void hfol.offsetWidth; hfol.classList.add('pulso');
  }
  function posicao() { return 1 + npcs.filter(n => n.fimT ? (!P.fimT || n.fimT < P.fimT) : n.km > P.km).length; }
  function provaPasso(dt) {
    st.t += dt;
    if (st.estado === 'largada') {
      const k = Math.floor(st.t); const txt = ['3', '2', '1'][k];
      if (txt && hgo.textContent !== txt) { somFx('conta'); hgo.textContent = txt; hgo.hidden = false; hgo.style.animation = 'none'; void hgo.offsetWidth; hgo.style.animation = ''; try { navigator.vibrate && navigator.vibrate(30); } catch (e) {} }
      if (st.t >= 3) { st.estado = 'jogo'; st.t = 0; somFx('vai'); hgo.textContent = 'VAI!'; hgo.style.animation = 'none'; void hgo.offsetWidth; hgo.style.animation = ''; setTimeout(() => { hgo.hidden = true; }, 700); try { navigator.vibrate && navigator.vibrate(80); } catch (e) {} }
      return;
    }
    const corrida = st.estado === 'jogo';
    // jogador
    P.v = Math.max(0, P.v - 0.35 * P.v * dt) * (corrida ? 1 : Math.max(0, 1 - dt * 1.5));
    const pc = paceDe(P.v);
    if (corrida) {
      P.T += dt * RT; P.km = Math.min(DIST, P.km + dt * RT / pc);
      if (pc < 255) P.f -= (255 - pc) / 255 * 40 * dt; else if (pc > 300) P.f += 10 * dt; else P.f += 4 * dt;
      P.f = Math.max(0, Math.min(100, P.f));
      if (P.f <= 0 && !P.quebrou) { P.quebrou = true; st.tremor = 0.3; try { navigator.vibrate && navigator.vibrate([60, 40, 60]); } catch (e) {} }
      if (P.quebrou && P.f > 30) P.quebrou = false;
      if (P.km >= DIST) {
        P.fimT = P.T; st.estado = 'chegou'; somFx('chegada');
        hgo.textContent = posicao() + 'º lugar!'; hgo.hidden = false; hgo.style.animation = 'none'; void hgo.offsetWidth; hgo.style.animation = '';
        try { navigator.vibrate && navigator.vibrate([40, 40, 160]); } catch (e) {}
        setTimeout(() => { if (!vivo) return; st.estado = 'fim'; opt.onOver && opt.onOver({ prova: true, distancia: DIST, tempo: P.fimT, posicao: posicao(), total: npcs.length + 1, pace: P.fimT / DIST }); }, 1600);
      }
      if (st.t > DUR * 4) { st.estado = 'fim'; opt.onOver && opt.onOver({ prova: true, desistiu: true, distancia: DIST, tempo: 0, posicao: npcs.length + 1, total: npcs.length + 1 }); }
    } else if (st.estado === 'chegou' || st.estado === 'fim') { P.T += dt * RT; }
    st.vel = 5 + P.v * 2.6; st.s += st.vel * dt;
    // adversários: aceleram conforme a prova avança
    for (const n of npcs) {
      if (st.estado === 'jogo' || st.estado === 'chegou' || st.estado === 'fim') {
        if (!n.fimT) {
          const u = n.km / DIST; let p = n.p0 + (n.p1 - n.p0) * u; if (!n.fant && u > 0.9) p *= 0.95; if (!n.fant) p *= 1 + Math.sin(st.t * 0.5 + n.osc) * 0.025;
          n.km += dt * RT / p; if (n.km >= DIST) { n.km = DIST; n.fimT = P.T; }
          n.vis = Math.min(1.7, 300 / p);
        } else n.vis = Math.max(0, (n.vis || 1) - dt);
      }
      n.ph += dt * (st.estado === 'pronto' || st.estado === 'largada' ? 0 : 7 + n.vis * 7);
      const d = (n.km - P.km) * SC + (n.fimT ? 0 : 0);
      n.b.visible = d > -14 && d < 165;
      if (!n.b.visible) continue;
      const dd = Math.max(0, d);
      n.b.position.set(n.x + offX(dd), offY(dd), -d);
      n.b.rotation.y = -Math.atan(2 * C() * dd);
      pose(n.b, n.ph, 'corre', st.estado === 'pronto' || st.estado === 'largada' ? 0.15 : n.fimT ? 0.5 : 1);
    }
  }
  function hudProva() {
    hm.textContent = P.km.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' / ' + DIST + ' km';
    htm.textContent = hms(P.T); hpc.textContent = st.estado === 'jogo' && P.v > 0.5 ? mmss(paceDe(P.v)).replace(/^0/, '') : '--:--';
    hf.textContent = st.estado === 'pronto' || st.estado === 'largada' ? '🏁 largada' : '🏅 ' + posicao() + 'º de ' + (npcs.length + 1);
    hfb.style.width = P.f + '%'; hfol.classList.toggle('baixo', P.f < 25); hfol.classList.toggle('quebrou', P.quebrou);
    hp.textContent = P.quebrou ? '😮‍💨 Quebrou! Diminua um pouco' : '';
  }

  function limparObjs() { for (const o of objs) scene.remove(o.m); objs.length = 0; }
  function reiniciar() {
    limparObjs(); Object.assign(st, { estado: 'pronto', s: 0, vel: 16, t: 0, faixa: 1, faixaAnt: 1, px: 0, py: 0, vy: 0, chao: true, rolando: 0, tropeco: 0, ultTropeco: -9, folhas: 0, ima: 0, tenis: 0, curva: 0, curvaAlvo: 0, ph: 0, tremor: 0, fim: 0, proxLinha: 30, proxDeco: [-10, -10], proxRio: 380 + Math.random() * 200, rio: null, proxSerra: 180, serra: null, tv: 0, proxKm: 1000, tKm: 0 }); hkm.hidden = true;
    proxPoste = 4; jog.userData.corpo.rotation.set(0, 0, 0); jog.userData.corpo.position.set(0, 1, 0);
    while (st.proxDeco[0] < 170) gerarDeco(0); while (st.proxDeco[1] < 170) gerarDeco(1);
    if (!RIO) while (proxPoste < 170) { poste(proxPoste, 6.0); proxPoste += 32; }
    if (RIO) placaRio();
    dica.hidden = false; hp.textContent = '';
    if (PROVA) { Object.assign(P, { v: 0, f: 100, km: 0, T: 0, ult: -1, quebrou: false, fimT: 0 }); montarNpcs(); hgo.hidden = true; for (const n of npcs) { n.b.position.set(n.x, 0, 0); } }
    atualizarHud();
  }
  function comecar() { if (PROVA) { st.estado = 'largada'; st.t = 0; dica.hidden = true; return; } st.estado = 'jogo'; dica.hidden = true; }
  function atualizarHud() { if (PROVA) { hudProva(); return; } hm.textContent = (st.s / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km'; htm.textContent = mmss(st.tv); hpc.textContent = st.estado === 'jogo' ? mmss(ritmo(st.vel)).replace(/^0/, '') : '--:--'; hf.textContent = (RIO ? '🗑️ ' : '🍃 ') + st.folhas; hp.textContent = st.ima > 0 ? `🧲 ${Math.ceil(st.ima)}s` : st.tenis > 0 ? `👟 ${Math.ceil(st.tenis)}s` : ''; }
  function bater() {
    st.estado = 'caiu'; st.tremor = 0.5; somFx('bate'); for (let k = 0; k < 10; k++) particula(st.px, 1 + Math.random(), -0.5, 0xffffff, (Math.random() - .5) * 5, 1 + Math.random() * 3, -st.vel * 0.2, 0.5, 0.6); try { navigator.vibrate && navigator.vibrate(140); } catch (e) {}
    setTimeout(() => { if (st.estado === 'caiu') { st.estado = 'fim'; opt.onOver && opt.onOver({ metros: Math.floor(st.s), folhas: st.folhas, tempo: st.tv, pace: st.s > 1 ? st.tv / (st.s / 1000) : 0 }); } }, 900);
  }

  /* laço */
  let raf = 0, ult = performance.now(), vivo = true, hudT = 0;
  function quadro(agora) {
    if (!vivo) return; raf = requestAnimationFrame(quadro);
    const dt = Math.min(0.033, (agora - ult) / 1000); ult = agora;
    const jogo = st.estado === 'jogo' && !PROVA;
    if (PROVA) { provaPasso(dt); if (st.estado === 'jogo' && Math.random() < dt * 0.1) st.curvaAlvo = (Math.random() - 0.5) * 0.0036; }
    if (jogo) {
      st.t += dt; st.vel = Math.min(50, 16 + 24 * (1 - Math.exp(-st.t / 50)) + st.t * 0.04); st.s += st.vel * dt; st.tv += st.vel * dt * ritmo(st.vel) / 1000; // relógio da corrida: tempo real que levaria nesse pace
      if (st.s >= st.proxKm) { const kmT = st.tv - st.tKm; st.tKm = st.tv; hkm.innerHTML = `<b>${Math.round(st.proxKm / 1000)} km</b><span>${mmss(kmT)} · pace ${mmss(ritmo(st.vel)).replace(/^0/, '')}/km</span>`; hkm.hidden = false; hkm.style.animation = 'none'; void hkm.offsetWidth; hkm.style.animation = ''; clearTimeout(st.kmTo); st.kmTo = setTimeout(() => { hkm.hidden = true; }, 2200); st.proxKm += 1000; somFx('km'); try { navigator.vibrate && navigator.vibrate([40, 60, 40]); } catch (e) {} }
      if (st.ima > 0) st.ima -= dt; if (st.tenis > 0) st.tenis -= dt;
      // curvas suaves que mudam de tempos em tempos
      if (Math.random() < dt * 0.12) st.curvaAlvo = (Math.random() - 0.5) * 0.0042;
    }
    st.curva += (st.curvaAlvo - st.curva) * Math.min(1, dt * 0.6);
    // pulo e rolamento
    const kv = 1 + Math.max(0, st.vel - 16) / 30;
    if (!st.chao) { st.vy -= (st.tenis > 0 ? 26 : 32) * kv * dt; st.py += st.vy * dt; if (st.py <= 0) { st.py = 0; st.vy = 0; st.chao = true; } }
    if (st.rolando > 0) st.rolando -= dt;
    const alvoX = LANES[st.faixa]; st.px += (alvoX - st.px) * Math.min(1, dt * (14 + Math.max(0, st.vel - 16) * 0.3));
    if (PROVA) st.ph += dt * (st.estado === 'pronto' || st.estado === 'largada' ? 3 : 4 + st.vel * 0.42);
    else if (jogo || st.estado === 'pronto') st.ph += dt * (st.estado === 'pronto' ? 7 : 7 + st.vel * 0.42);
    // gerar
    if (jogo || (PROVA && st.estado !== 'pronto')) {
      if (!PROVA) 
while (st.proxLinha < st.s + 150) gerarLinha();
      if (!RIO && st.s + 160 > st.proxRio) { trechoRio(st.proxRio, 70); st.proxRio += 650 + Math.random() * 450; }
      if (st.s + 165 > st.proxSerra) { trechoSerra(st.proxSerra, 140); st.proxSerra += 700 + Math.random() * 400; if (Math.abs(st.proxSerra - st.proxRio) < 220) st.proxSerra += 260; }
    }
    while (st.proxDeco[0] < st.s + 170) gerarDeco(0); while (st.proxDeco[1] < st.s + 170) gerarDeco(1);
    while (!RIO && proxPoste < st.s + 170) { if (!(st.rio && proxPoste > st.rio.a - 3 && proxPoste < st.rio.b + 3) && !(st.serra && proxPoste > st.serra.a - 3 && proxPoste < st.serra.b + 3)) poste(proxPoste, 6.0); proxPoste += 32; }
    // objetos
    const rolando = st.rolando > 0 && st.chao;
    for (const o of objs) {
      if (!o.vivo) continue;
      if (o.mov && jogo) o.s -= o.mov * dt;
      const fim = o.s + (o.len || 0) - (o.desloc || 0);
      if (fim < st.s - 12) { o.vivo = false; scene.remove(o.m); continue; }
      colocar(o); if (o.anim) o.anim(o, dt);
      if (o.tipo === 'folha' || o.tipo === 'bonus') { o.giro += dt * 3; o.m.rotation.y += o.giro; o.m.position.y += Math.sin(st.t * 4 + o.s) * 0.08; }
      if (!jogo) continue;
      // ímã puxa folhas
      if (o.tipo === 'folha' && st.ima > 0 && o.s - st.s < 14 && o.s > st.s - 1) { o.x += (st.px - o.x) * Math.min(1, dt * 8); o.y += (st.py + 1 - o.y) * Math.min(1, dt * 8); if (o.s - st.s > 0.5) o.s -= dt * 20; }
      const a0 = o.s + (o.desloc || 0) - (o.tipo === 'bloco' ? 0 : o.len / 2), a1 = a0 + (o.tipo === 'bloco' ? o.len : o.len);
      if (st.s + 0.35 < a0 || st.s - 0.35 > a1) continue;
      const dx = Math.abs(o.x - st.px);
      if (o.tipo === 'folha') { if (dx < 1.1 && Math.abs((o.y) - (st.py + 1)) < 1.3) { o.vivo = false; scene.remove(o.m); st.folhas++; somFx('folha'); for (let k = 0; k < 6; k++) particula(o.x, o.y + 0.2, 0.3, RIO ? 0x9fd8ff : 0xc8f560, (Math.random() - .5) * 4, 2 + Math.random() * 2, -st.vel * 0.6, 0.45, 0.45); } continue; }
      if (o.tipo === 'bonus') { if (dx < 1.2) { o.vivo = false; scene.remove(o.m); somFx('bonus'); if (o.k === 'ima') st.ima = 10; else st.tenis = 10; } continue; }
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
        if (st.t - st.ultTropeco < 6) { bater(); break; }
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
    texRua.offset.y = (st.s / (RIO ? 12 : 24)) % 1; texCal.offset.y = (st.s / (RIO ? 3 : 4)) % 1; texGrama.offset.y = (st.s / 10) % 1; texAgua.offset.x += dt * 0.03; texQueda.offset.y += dt * 1.6;
    // serras acompanham a curva
    for (const sr of serras) { sr.m.position.x = -st.curva * 9000 * sr.par; sr.m.material.map.offset.x = (sr.m.material.map.userData.o0 ??= sr.m.material.map.offset.x) + (st.s * 0.00002 * sr.par) % 1; }
    // jogador
    jog.position.set(st.px, st.py, 0);
    jog.rotation.y = (LANES[st.faixa] - st.px) * 0.12; // de costas para a câmera
    const um = jog.userData;
    if (PROVA) pose(jog, st.ph, 'corre', st.estado === 'pronto' || st.estado === 'largada' ? 0.15 : Math.min(1, 0.35 + P.v / 10));
    else if (st.estado === 'caiu' || st.estado === 'fim') pose(jog, st.ph, 'caiu');
    else if (!st.chao && !(st.rolando > 0)) pose(jog, st.ph, 'pulo');
    else pose(jog, st.ph, 'corre', st.estado === 'pronto' ? 0.5 : 1);
    if (!PROVA && rolando && st.estado === 'jogo') { pose(jog, st.ph, 'pulo'); um.corpo.scale.setScalar(0.6); um.corpo.rotation.set(-(0.7 - st.rolando) * 13, 0, 0); um.corpo.position.y = 0.62; }
    sombra.position.set(st.px, 0.06, 0); sombra.scale.setScalar(Math.max(0.4, 1 - st.py * 0.15));
    const passo = Math.floor(st.ph / Math.PI);
    if (passo !== st.ultPasso) { st.ultPasso = passo; if (st.chao && (st.estado === 'jogo') && !(st.rolando > 0)) { particula(st.px + (passo % 2 ? 0.15 : -0.15), 0.15, 0.4, noite ? 0x8a8f96 : 0xd8cdb8, (Math.random() - .5) * 0.6, 0.5, -st.vel * 0.85, 0.5, 0.55); if (passo % 2) somFx('passo'); } }
    particulas(dt);
    luzP.position.set(st.px, 3.2, 1.5); sol.position.set(st.px - 10, 16, -14); sol.target.position.set(st.px, 0, -4);
    // câmera
    const sh = st.tremor > 0 ? (Math.random() - .5) * st.tremor : 0; if (st.tremor > 0) st.tremor -= dt;
    const cy = 3.55 + st.py * 0.35 + (st.estado === 'jogo' && st.chao ? Math.abs(Math.sin(st.ph)) * 0.05 : 0), cz = 6.7;
    const fovA = cam.userData.fov0 + (PROVA ? P.v * 0.8 : Math.max(0, st.vel - 16) * 0.35); if (Math.abs(cam.fov - fovA) > 0.05) { cam.fov += (fovA - cam.fov) * Math.min(1, dt * 2); cam.updateProjectionMatrix(); }
    cam.position.set(st.px * 0.65 + sh, cy + sh, cz); cam.lookAt(st.px * 0.65 + offX(20) * 0.5, 1.45 + st.py * 0.2 + offY(20), -20);
    renderer.render(scene, cam);
    hudT -= dt; if (hudT <= 0) { hudT = 0.1; atualizarHud(); }
  }
  function ajustar() { renderer.setSize(W(), H()); cam.aspect = W() / H(); cam.fov = cam.userData.fov0 = W() / H() < 0.7 ? 64 : 56; cam.updateProjectionMatrix(); }
  window.addEventListener('resize', ajustar); ajustar();
  const vis = () => { ult = performance.now(); }; document.addEventListener('visibilitychange', vis);
  reiniciar(); raf = requestAnimationFrame(quadro);
  if (opt.debug) window.__g3 = { st, objs, buraco, cachoeira, P, npcs, toque: () => provaToque() };

  return {
    reiniciar,
    recorde(v) { hr.textContent = v ? 'Recorde ' + (PROVA ? hms(v) : Number(v).toLocaleString('pt-BR')) : ''; },
    destruir() {
      vivo = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('resize', ajustar); document.removeEventListener('visibilitychange', vis);
      limparObjs(); for (const n of npcs) scene.remove(n.b); renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) {} cv.remove(); hud.remove(); dica.remove(); vin.remove(); try { ac && ac.close(); } catch (e) {}
    }
  };
}

