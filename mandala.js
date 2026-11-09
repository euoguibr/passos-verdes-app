// Mandala PV — jogo de memória do app Passos Verdes.
// A mandala mostra uma sequência de medalhas; você repete na mesma ordem. A cada rodada entra mais uma.
// A partir da rodada 11 a mandala gira enquanto mostra a sequência; da 15 em diante ela continua girando na sua vez.
// criar(el,{recorde,alvo,alvoNome,onFim}) -> {reiniciar(), destruir()}

const MED = [
  { nome: 'Folha', cor: '#7ED957', escura: '#2f7a1f', freq: 329.63 },
  { nome: 'Sol', cor: '#F5A524', escura: '#a35f00', freq: 415.3 },
  { nome: 'Cachoeira', cor: '#3FA9F5', escura: '#135f96', freq: 493.88 },
  { nome: 'Serra', cor: '#B07CF2', escura: '#5a2f9a', freq: 659.25 }
];
// posições: cima, direita, baixo, esquerda
const POS = [[200, 118], [282, 200], [200, 282], [118, 200]];

const ICONES = [
  // folha
  `<path d="M0,-34 C26,-18 26,18 0,34 C-26,18 -26,-18 0,-34Z" fill="#7ED957"/><path d="M0,-28 L0,30" stroke="#2f7a1f" stroke-width="3" stroke-linecap="round"/><path d="M0,-6 L11,-15 M0,6 L12,-3 M0,-6 L-11,-15 M0,6 L-12,-3" stroke="#2f7a1f" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
  // sol
  `<g fill="#F5A524">${Array.from({ length: 12 }, (_, i) => `<path d="M-5,-36 L0,-46 L5,-36Z" transform="rotate(${i * 30})"/>`).join('')}</g><circle r="24" fill="#F5A524"/><circle r="17" fill="#FFC85A"/>`,
  // cachoeira
  `<path d="M-30,-30 Q-30,-36 -24,-36 L24,-36 Q30,-36 30,-30 L30,-24 L-30,-24Z" fill="#7a8a86"/><path d="M-20,-24 L-20,22 M-7,-24 L-7,26 M7,-24 L7,24 M20,-24 L20,20" stroke="#3FA9F5" stroke-width="8" stroke-linecap="round"/><path d="M-34,30 Q-17,22 0,30 Q17,38 34,30" stroke="#9fdcff" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  // serra com o Dedo de Deus
  `<path d="M-38,30 L-14,-6 L-4,6 L6,-24 L9,-36 L13,-24 L18,-8 L38,30Z" fill="#B07CF2"/><path d="M6,-24 L9,-36 L13,-24 L10,-18Z" fill="#e6d4ff"/><path d="M-14,-6 L-8,2 L-20,4Z" fill="#e6d4ff"/>`
];

export function criar(el, opt = {}) {
  const raiz = document.createElement('div');
  raiz.className = 'mdl';
  raiz.innerHTML = `
  <div class="mdl-top"><span class="mdl-r">Mandala PV</span><span class="mdl-rec">${opt.recorde ? 'Recorde ' + opt.recorde : ''}</span></div>
  ${opt.alvo ? `<div class="mdl-alvo">⚡ Duelo: passe de <b>${opt.alvo}</b> medalhas${opt.alvoNome ? ' de ' + opt.alvoNome : ''}</div>` : ''}
  <svg class="mdl-svg" viewBox="0 0 400 400" aria-label="Mandala com 4 medalhas">
    <defs>
      <linearGradient id="prata" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2f4f1"/><stop offset=".45" stop-color="#a9b0ab"/><stop offset=".55" stop-color="#d9ddd8"/><stop offset="1" stop-color="#7d847f"/></linearGradient>
      <radialGradient id="fundo" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#2b302c"/><stop offset="1" stop-color="#121513"/></radialGradient>
      ${POS.map((p, i) => `<path id="arc${i}" d="M ${p[0] - 53},${p[1]} a 53,53 0 1,1 106,0 a 53,53 0 1,1 -106,0"/>`).join('')}
    </defs>
    <g class="mdl-rot">
      <g class="mdl-placa">${POS.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="86" fill="#0b0d0b"/>`).join('')}
        <circle cx="200" cy="200" r="60" fill="#0b0d0b"/></g>
      <g class="mdl-linha" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.2">${POS.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="80"/>`).join('')}</g>
      ${POS.map((p, i) => `<g class="mdl-med" data-i="${i}" style="--c:${MED[i].cor}" transform="translate(${p[0]},${p[1]})" role="button" aria-label="${MED[i].nome}">
        <circle class="mdl-hit" r="70" fill="transparent"/>
        <circle r="66" fill="url(#fundo)"/>
        <circle class="mdl-anel" r="66" fill="none" stroke="url(#prata)" stroke-width="11"/>
        <circle class="mdl-brilho" r="66" fill="none" stroke="var(--c)" stroke-width="11"/>
        <text font-size="7.5" font-weight="700" letter-spacing="2" fill="rgba(255,255,255,.35)"><textPath href="#arc${i}" transform="translate(${-p[0]},${-p[1]})">PASSOS VERDES · MAGÉ · PASSOS VERDES · MAGÉ ·</textPath></text>
        <g class="mdl-ico"><g transform="scale(.88)">${ICONES[i]}</g></g>
      </g>`).join('')}
      <g class="mdl-hub"><circle cx="200" cy="200" r="34" fill="#0b1200" stroke="#C8F560" stroke-width="3"/><clipPath id="hubc"><circle cx="200" cy="200" r="31"/></clipPath><image href="/icons/logo.png" x="169" y="169" width="62" height="62" clip-path="url(#hubc)" preserveAspectRatio="xMidYMid slice"/></g>
    </g>
  </svg>
  <div class="mdl-st"><b class="mdl-msg">Toque em começar</b><small class="mdl-sub">Grave a sequência e repita na mesma ordem</small></div>
  <div class="mdl-dots"></div>
  <button class="btn primary mdl-go">Começar</button>`;
  el.appendChild(raiz);
  // o texto curvo precisa do caminho no lugar certo: usa o arco já posicionado
  raiz.querySelectorAll('textPath').forEach(t => t.removeAttribute('transform'));
  raiz.querySelectorAll('.mdl-med text').forEach((t, i) => { t.setAttribute('transform', `translate(${-POS[i][0]},${-POS[i][1]})`); });

  const svg = raiz.querySelector('svg'), rot = raiz.querySelector('.mdl-rot'), meds = [...raiz.querySelectorAll('.mdl-med')];
  const msg = raiz.querySelector('.mdl-msg'), sub = raiz.querySelector('.mdl-sub'), dots = raiz.querySelector('.mdl-dots'), go = raiz.querySelector('.mdl-go'), nHub = { set textContent(v) {} }, rTop = raiz.querySelector('.mdl-r');

  // som
  let ac = null;
  const tom = (f, dur = 0.28, tipo = 'triangle', vol = 0.22) => {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = tipo; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  };
  const vibra = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  let vivo = true, seq = [], idx = 0, rodada = 0, estado = 'pronto', ang = 0, vel = 0, raf = 0, ult = performance.now(), espera = 0, timers = [];
  const later = (fn, ms) => { const t = setTimeout(() => { if (vivo) fn(); }, ms); timers.push(t); return t; };
  const limparT = () => { timers.forEach(clearTimeout); timers = []; };

  function acende(i, ms) {
    const m = meds[i]; m.classList.add('on'); tom(MED[i].freq, Math.max(0.18, ms / 1000));
    later(() => m.classList.remove('on'), ms);
  }
  function pontos() { dots.innerHTML = seq.map((_, k) => `<i class="${k < idx ? 'ok' : k === idx && estado === 'vez' ? 'cur' : ''}"></i>`).join(''); }
  function proximaRodada() {
    rodada++; idx = 0; estado = 'mostra';
    let n; do { n = Math.floor(Math.random() * 4); } while (seq.length >= 2 && n === seq[seq.length - 1] && n === seq[seq.length - 2]);
    seq.push(n);
    nHub.textContent = rodada; rTop.textContent = 'Rodada ' + rodada;
    msg.textContent = 'Presta atenção…'; sub.textContent = rodada >= 11 ? 'A mandala tá girando: guarde a cor e o desenho' : 'A mandala mostra a sequência';
    raiz.classList.add('mostrando'); pontos();
    const dur = Math.max(210, 520 - rodada * 22), gap = Math.max(90, 230 - rodada * 9);
    vel = rodada >= 11 ? 38 + (rodada - 11) * 9 : 0;
    let t = 650;
    seq.forEach((m, k) => { later(() => { acende(m, dur); idx = k + 1; pontos(); }, t); t += dur + gap; });
    later(() => { idx = 0; estado = 'vez'; raiz.classList.remove('mostrando'); msg.textContent = 'Sua vez!'; sub.textContent = `Toque as medalhas na ordem · 0 de ${seq.length}`; vel = rodada >= 15 ? 14 + (rodada - 15) * 3 : 0; espera = 0; pontos(); }, t + 100);
  }
  function fim() {
    estado = 'fim'; vel = 0; limparT(); tom(110, 0.6, 'sawtooth', 0.18); vibra([80, 50, 120]);
    raiz.classList.add('erro'); later(() => raiz.classList.remove('erro'), 500);
    msg.textContent = 'Errou a sequência'; sub.textContent = '';
    const pts = rodada - 1;
    later(() => opt.onFim && opt.onFim({ pontos: pts }), 700);
  }
  function toque(i) {
    if (estado !== 'vez') return;
    espera = 0;
    if (seq[idx] !== i) { meds[i].classList.add('on'); later(() => meds[i].classList.remove('on'), 300); fim(); return; }
    acende(i, 220); vibra(12); idx++; pontos();
    sub.textContent = `Toque as medalhas na ordem · ${idx} de ${seq.length}`;
    if (idx >= seq.length) {
      estado = 'certo'; msg.textContent = rodada % 5 === 0 ? `🔥 ${rodada} seguidas!` : 'Boa!';
      later(() => { tom(880, 0.15, 'sine', 0.12); }, 180);
      later(proximaRodada, 800);
    }
  }
  meds.forEach((m, i) => m.addEventListener('pointerdown', e => { e.preventDefault(); toque(i); }));
  const kd = e => { const k = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 }[e.key]; if (k !== undefined) { e.preventDefault(); toque(k); } };
  window.addEventListener('keydown', kd);
  go.addEventListener('click', () => { go.hidden = true; if (ac && ac.state === 'suspended') ac.resume(); tom(523, 0.12, 'sine', 0.12); later(proximaRodada, 300); });

  function quadro(agora) {
    if (!vivo) return; raf = requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (agora - ult) / 1000); ult = agora;
    if (vel) { ang = (ang + vel * dt) % 360; rot.setAttribute('transform', `rotate(${ang} 200 200)`); }
    if (estado === 'vez') { espera += dt; if (espera > 8) { msg.textContent = 'Tempo esgotado'; fim(); } }
  }
  raf = requestAnimationFrame(quadro);

  function reiniciar() {
    limparT(); seq = []; idx = 0; rodada = 0; estado = 'pronto'; ang = 0; vel = 0; rot.removeAttribute('transform');
    nHub.textContent = 'PV'; rTop.textContent = 'Mandala PV'; msg.textContent = 'Toque em começar'; sub.textContent = 'Grave a sequência e repita na mesma ordem'; dots.innerHTML = ''; go.hidden = false;
    meds.forEach(m => m.classList.remove('on'));
  }
  return {
    reiniciar,
    recorde(v) { raiz.querySelector('.mdl-rec').textContent = v ? 'Recorde ' + v : ''; },
    destruir() { vivo = false; limparT(); cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); try { ac && ac.close(); } catch (e) {} raiz.remove(); }
  };
}
