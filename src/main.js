import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import './style.css';
import { createGame } from './game/scene.js';

const icons = {
  cross: '<path d="m5 4 7 5 7-5-5 8 5 8-7-5-7 5 5-8Z" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M5 17 18 4M5 4h13v13"/>',
  volume: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 6 6m0-6-6 6"/>',
  fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.3c-.8.5-1.1 1-1.1 2.2m0 3h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  refresh: '<path d="M20 8a9 9 0 1 0 .4 7M20 3v6h-6"/>',
};
const svg = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const key = (text) => `<kbd>${text}</kbd>`;

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="brand" href="./" aria-label="Alphabet War home"><span class="brand-mark">${svg('cross')}</span><span>ALPHABET<span class="brand-second">WAR<span class="brand-dot">®</span></span></span></a>
    <nav class="main-nav" aria-label="Main navigation">
      <button class="nav-item active" id="arena-nav">THE ARENA<span>01</span></button>
      <button class="nav-item" data-dialog="fighters">FIGHTERS<span>02</span></button>
      <button class="nav-item" data-dialog="guide">HOW TO PLAY<span>03</span></button>
    </nav>
    <div class="header-right"><span class="alpha-tag"><i></i> ALPHA BUILD 0.1</span><button class="sound-button" id="sound-toggle" aria-label="Enable sound" aria-pressed="false">${svg('mute')}<span>SOUND OFF</span></button></div>
  </header>
  <main>
    <section class="page-heading" aria-labelledby="page-title">
      <div><div class="eyebrow"><span class="red-line"></span>THE LAST TWO STANDING</div><h1 id="page-title">TWO LETTERS. <span>ONE SURVIVOR.</span></h1></div>
      <div class="heading-aside"><span class="outlined-label">1 PLAYER vs AI</span><p>Pick a side. Make your mark.</p></div>
    </section>
    <section class="arena-shell" aria-label="Alphabet War fighting arena">
      <div class="arena-topline"><div class="location"><span class="live-dot"></span> THE FRACTURE <span class="location-divider">/</span> <span class="location-desc">FLOATING ISLAND</span></div><div class="arena-meta"><span>DUEL MODE</span><span class="meta-separator">·</span><span id="match-status">AWAITING FIGHTERS</span></div></div>
      <div class="stage" id="stage">
        <div id="game" aria-label="X-MAN versus Y-MAN. Use A and D to move, W to jump, J to strike, K for heavy attack, L to guard, Shift to dash. Press Enter to begin."></div>
        <div class="stage-vignette"></div>
        <div class="hud" aria-label="Match status">
          <div class="fighter-hud player-hud"><div class="fighter-heading"><span class="player-tag">P1</span><h2>X-MAN</h2><span class="fighter-subtitle">THE CRIMSON CROSS</span></div><div class="health-track"><div id="player-damage" class="damage-fill"></div><div id="player-health" class="health-fill"></div></div><div class="fighter-vitals"><span><i class="red-diamond"></i> YOU</span><div class="stamina-track" aria-label="X-MAN stamina"><div id="player-stamina"></div></div><span id="player-hp">100 <span>/ 100</span></span></div></div>
          <div class="round-hud"><span>ROUND <b id="round-number">01</b></span><strong id="timer">99</strong><span class="timer-line"></span></div>
          <div class="fighter-hud enemy-hud"><div class="fighter-heading"><span class="fighter-subtitle">THE GOLDEN DIVIDE</span><h2>Y-MAN</h2><span class="player-tag ai-tag">AI</span></div><div class="health-track"><div id="enemy-damage" class="damage-fill"></div><div id="enemy-health" class="health-fill"></div></div><div class="fighter-vitals"><span id="enemy-hp">100 <span>/ 100</span></span><div class="stamina-track" aria-label="Y-MAN stamina"><div id="enemy-stamina"></div></div><span>CPU <i class="green-diamond"></i></span></div></div>
        </div>
        <div class="intro-overlay" id="intro"><div class="intro-kicker"><span></span>ALPHABET WAR<span></span></div><div class="versus-title"><span class="letter-x">X</span><em>VS</em><span class="letter-y">Y</span></div><p>ONLY ONE LETTER LEAVES.</p><button class="primary-button" id="start-button">START FIGHT ${svg('arrow')}</button><span class="enter-hint">PRESS ${key('ENTER')} TO BEGIN</span></div>
        <div class="announcement" id="announcement" aria-live="polite"></div>
        <div class="pause-overlay" id="pause-overlay" hidden><span class="eyebrow">TAKE A BREATH</span><h2>FIGHT PAUSED</h2><button class="primary-button" id="resume-button">BACK TO THE FIGHT ${svg('arrow')}</button><button class="text-button" id="restart-button">RESTART MATCH</button></div>
        <div class="result-overlay" id="result-overlay" hidden><span class="eyebrow" id="result-eyebrow">THE FRACTURE HAS A WINNER</span><h2 id="result-title">VICTORY</h2><p id="result-description"></p><button class="primary-button" id="rematch-button">FIGHT AGAIN ${svg('refresh')}</button></div>
        <div class="stage-bottom"><div class="arena-coordinate"><span class="coordinate-mark">⌖</span> <span>SECTOR 07 <span class="coordinate-divider">/</span> 4,800 M ABOVE</span></div><div class="stage-actions"><button class="icon-button" id="pause-button" title="Pause (Esc)" aria-label="Pause match" disabled>${svg('pause')}</button><button class="icon-button" id="fullscreen-button" title="Fullscreen" aria-label="Enter fullscreen">${svg('fullscreen')}</button></div></div>
        <div class="touch-controls" aria-label="Touch controls"><div class="touch-movement"><button data-input="left" aria-label="Move left">←</button><button data-input="right" aria-label="Move right">→</button><button data-input="jump" aria-label="Jump">↑</button></div><div class="touch-attacks"><button data-input="dash" aria-label="Dash">DASH</button><button data-input="block" aria-label="Guard">GUARD</button><button data-input="light" aria-label="Light attack">J</button><button data-input="heavy" aria-label="Heavy attack">K</button></div></div>
      </div>
      <div class="controls-bar"><div class="controls-label">KNOW YOUR MOVES<span>MAKE EVERY HIT COUNT.</span></div><div class="control-item"><div>${key('A')}${key('D')}<span class="or-key">/</span>${key('←')}${key('→')}</div><span>MOVE</span></div><div class="control-item"><div>${key('W')}<span class="or-key">/</span>${key('↑')}</div><span>JUMP</span></div><div class="control-item"><div>${key('J')}</div><span>STRIKE</span></div><div class="control-item"><div>${key('K')}</div><span>HEAVY</span></div><div class="control-item"><div>${key('L')}</div><span>GUARD</span></div><div class="control-item"><div>${key('SHIFT')}</div><span>DASH</span></div><button class="guide-link" data-dialog="guide">FULL GUIDE ${svg('arrow')}</button></div>
    </section>
    <footer class="page-footer"><span><i class="live-dot"></i> BROWSER-BASED. BATTLE-READY.</span><p>A conflict written in the stars.</p><span>© ${new Date().getFullYear()} ALPHABET WAR<span class="footer-cross">✕</span></span></footer>
  </main>
  <dialog id="info-dialog" aria-labelledby="dialog-title"><div class="dialog-topline"><span>ALPHABET WAR / FIELD MANUAL</span><button id="close-dialog" class="icon-button" aria-label="Close dialog">${svg('close')}</button></div><div id="dialog-content"></div></dialog>
  <div class="toast" id="toast" role="status" hidden></div>
`;

const fighterContent = `
  <span class="eyebrow">MEET YOUR ALPHABET</span><h2 id="dialog-title">BORN TO COLLIDE.</h2><p class="dialog-intro">Two warriors. Opposing forces. A rivalry that broke the world.</p>
  <div class="fighter-cards"><article class="fighter-card red"><span class="card-letter">X</span><span class="card-tag">YOUR FIGHTER · BALANCED</span><h3>X-MAN</h3><h4>THE CRIMSON CROSS</h4><p>Forged in red and black. X-MAN turns relentless movement into devastating close-range power. Close the gap and make it count.</p><div class="fighter-stat"><span>POWER</span><b>▰▰▰▰▱</b></div><div class="fighter-stat"><span>SPEED</span><b>▰▰▰▰▱</b></div></article><article class="fighter-card green"><span class="card-letter">Y</span><span class="card-tag">AI OPPONENT · TACTICAL</span><h3>Y-MAN</h3><h4>THE GOLDEN DIVIDE</h4><p>Clad in emerald and gold. Y-MAN reads your distance, guards your strikes, and punishes hesitation. Watch for the heavy windup.</p><div class="fighter-stat"><span>POWER</span><b>▰▰▰▰▱</b></div><div class="fighter-stat"><span>DEFENSE</span><b>▰▰▰▰▰</b></div></article></div>`;
const guideContent = `
  <span class="eyebrow">A LITTLE KNOWLEDGE. A LOT OF DAMAGE.</span><h2 id="dialog-title">ENTER. FIGHT. SURVIVE.</h2><p class="dialog-intro">You are X-MAN. Defeat the AI-controlled Y-MAN before 99 seconds run out. When time expires, the fighter with more health wins.</p>
  <div class="guide-grid"><div><div class="guide-row"><span>${key('A')}${key('D')} or ${key('←')}${key('→')}</span><strong>Move</strong><p>Control the distance.</p></div><div class="guide-row"><span>${key('W')} or ${key('↑')}</span><strong>Jump</strong><p>Take the fight into the air.</p></div><div class="guide-row"><span>${key('J')}</span><strong>Quick strike</strong><p>Fast, close-range pressure.</p></div></div><div><div class="guide-row"><span>${key('K')}</span><strong>Heavy attack</strong><p>More reach. More damage. Longer recovery.</p></div><div class="guide-row"><span>${key('L')}</span><strong>Guard</strong><p>Hold to absorb damage. Uses stamina.</p></div><div class="guide-row"><span>${key('SHIFT')}</span><strong>Dash</strong><p>Burst forward or dash in your movement direction.</p></div></div></div><div class="guide-tip"><span>FIELD NOTE 01</span><p>Watch your stamina. Give yourself room to recover, then dash in and strike.</p></div><p class="guide-shortcuts">${key('ENTER')} Start / rematch <span>·</span> ${key('ESC')} Pause <span>·</span> ${key('R')} Restart</p>`;

const dialog = document.querySelector('#info-dialog');
let dialogPaused = false;
let controller;
function openDialog(type) {
  document.querySelector('#dialog-content').innerHTML =
    type === 'fighters' ? fighterContent : guideContent;
  dialogPaused = controller?.isPlaying() && !controller?.isPaused();
  if (dialogPaused) controller.pause();
  dialog.showModal();
}
document
  .querySelectorAll('[data-dialog]')
  .forEach((el) => el.addEventListener('click', () => openDialog(el.dataset.dialog)));
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});
dialog.addEventListener('close', () => {
  if (dialogPaused) controller?.resume();
  dialogPaused = false;
});
document.querySelector('#arena-nav').addEventListener('click', () => {
  document.querySelector('.arena-shell').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

const toast = (message) => {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => {
    el.hidden = true;
  }, 3500);
};

controller = createGame({ toast, isDialogOpen: () => dialog.open, svg });
document.querySelector('#start-button').addEventListener('click', () => controller.start());
document.querySelector('#rematch-button').addEventListener('click', () => controller.start());
document.querySelector('#resume-button').addEventListener('click', () => controller.resume());
document.querySelector('#restart-button').addEventListener('click', () => controller.restart());
document.querySelector('#pause-button').addEventListener('click', () => controller.togglePause());
document.querySelector('#sound-toggle').addEventListener('click', () => {
  const enabled = controller.toggleSound();
  const button = document.querySelector('#sound-toggle');
  button.innerHTML = `${svg(enabled ? 'volume' : 'mute')}<span>SOUND ${enabled ? 'ON' : 'OFF'}</span>`;
  button.setAttribute('aria-label', enabled ? 'Mute sound' : 'Enable sound');
  button.setAttribute('aria-pressed', String(enabled));
});
document.querySelector('#fullscreen-button').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector('#stage').requestFullscreen();
  } catch {
    toast('Fullscreen is unavailable in this browser.');
  }
});
document.addEventListener('fullscreenchange', () => {
  document
    .querySelector('#fullscreen-button')
    .setAttribute(
      'aria-label',
      document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen',
    );
});
