import Phaser from 'phaser';
import { createArena } from './arena.js';
import { FighterVisual } from './fighter.js';
import { CombatEngine } from './combat.js';
import { CombatAudio } from './audio.js';

const $ = (selector) => document.querySelector(selector);
const KEY_MAP = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'jump',
  ArrowUp: 'jump',
  Space: 'jump',
  KeyJ: 'light',
  KeyK: 'heavy',
  KeyL: 'block',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
};
const ACTIONS = ['jump', 'light', 'heavy', 'dash'];

export function createGame({ toast, isDialogOpen }) {
  const keys = new Set();
  const touch = new Set();
  const pressBuffer = new Map();
  const audio = new CombatAudio();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let scene;
  let paused = false;
  let starting = false;
  let countdownTimers = [];
  let renderedTime = 0;
  let endTime = 0;
  let announcementTimer;

  const elements = Object.fromEntries(
    [
      'intro',
      'pause-overlay',
      'result-overlay',
      'timer',
      'match-status',
      'announcement',
      'player-health',
      'enemy-health',
      'player-damage',
      'enemy-damage',
      'player-stamina',
      'enemy-stamina',
      'player-hp',
      'enemy-hp',
      'pause-button',
    ].map((id) => [id, $(`#${id}`)]),
  );

  const engine = new CombatEngine({
    onEvent: (event) => {
      audio.play(event);
      if (event.type === 'hit' && scene) {
        (event.attacker === 'player' ? scene.enemyVisual : scene.playerVisual).playHit();
        scene.impact(event);
        if (!reducedMotion && !event.blocked)
          scene.cameras.main.shake(event.heavy ? 110 : 65, event.heavy ? 0.003 : 0.0015);
      }
      if (event.type === 'end') {
        endTime = 0;
        elements['match-status'].textContent = 'MATCH COMPLETE';
        elements['pause-button'].disabled = true;
        announce(event.reason === 'ko' ? 'K.O.' : 'TIME UP', 1000);
        audio.tone(
          event.winner === 'player' ? 280 : 160,
          0.8,
          'triangle',
          0.09,
          event.winner === 'player' ? 560 : 60,
        );
      }
      if ((event.type === 'land' || event.type === 'dash') && scene) scene.dust(event);
    },
  });

  function announce(message, duration = 700) {
    const element = elements.announcement;
    clearTimeout(announcementTimer);
    element.textContent = message;
    element.classList.remove('animate');
    void element.offsetWidth;
    element.classList.add('animate');
    announcementTimer = setTimeout(() => {
      element.textContent = '';
      element.classList.remove('animate');
    }, duration);
  }

  let lastHUD = '';
  function updateHUD() {
    const p = engine.player;
    const e = engine.enemy;
    const stamp = `${p.health}/${e.health}/${Math.floor(p.stamina)}/${Math.floor(e.stamina)}/${Math.ceil(engine.timeRemaining)}`;
    if (stamp === lastHUD) return;
    lastHUD = stamp;
    for (const [id, fighter] of [
      ['player', p],
      ['enemy', e],
    ]) {
      elements[`${id}-health`].style.transform = `scaleX(${fighter.health / 100})`;
      elements[`${id}-damage`].style.transform = `scaleX(${fighter.health / 100})`;
      elements[`${id}-stamina`].style.transform = `scaleX(${fighter.stamina / 100})`;
      elements[`${id}-hp`].innerHTML = `${fighter.health} <span>/ 100</span>`;
      elements[`${id}-health`].parentElement.setAttribute(
        'aria-label',
        `${id === 'player' ? 'X-MAN' : 'Y-MAN'} health ${fighter.health} of 100`,
      );
    }
    elements.timer.textContent = String(Math.ceil(engine.timeRemaining)).padStart(2, '0');
    elements.timer.style.color = engine.timeRemaining < 20 ? '#ff575c' : '';
  }

  function showResult() {
    const { winner, reason } = engine.result;
    $('#result-title').textContent =
      winner === 'player' ? 'VICTORY' : winner === 'enemy' ? 'DEFEAT' : 'DEADLOCK';
    $('#result-eyebrow').textContent =
      winner === 'draw'
        ? 'THE RIVALRY CONTINUES'
        : winner === 'player'
          ? 'X MARKS THE VICTORY'
          : 'THE GOLDEN DIVIDE PREVAILS';
    $('#result-description').textContent =
      winner === 'player'
        ? `Y-MAN has fallen. The Fracture belongs to you.${reason === 'timeout' ? ' Victory by remaining health.' : ''}`
        : winner === 'enemy'
          ? 'You lost the battle. The war is far from over.'
          : 'Evenly matched. Settle the score in the next fight.';
    elements['result-overlay'].hidden = false;
  }

  class ArenaScene extends Phaser.Scene {
    constructor() {
      super('Arena');
    }
    create() {
      scene = this;
      this.arena = createArena(this);
      this.playerVisual = new FighterVisual(this, 'x');
      this.enemyVisual = new FighterVisual(this, 'y');
      this.transients = this.add.group();
      updateHUD();
    }

    impact({ x, y, blocked, heavy, damage, attacker }) {
      const color = blocked ? 0xb9d5e7 : attacker === 'player' ? 0xff8b80 : 0xd6df9a;
      const burst = this.add.graphics().setPosition(x, y).setDepth(40);
      this.transients.add(burst);
      burst.lineStyle(blocked ? 2 : 3, color, 0.95);
      const rays = heavy ? 13 : 8;
      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2 + Math.random() * 0.4;
        const radius = 12 + Math.random() * (heavy ? 35 : 20);
        burst.lineBetween(
          Math.cos(angle) * 5,
          Math.sin(angle) * 5,
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
        );
      }
      burst.fillStyle(color, 0.9).fillCircle(0, 0, heavy ? 7 : 4);
      burst.lineStyle(1, color, 0.5).strokeCircle(0, 0, blocked ? 23 : 16);
      this.tweens.add({
        targets: burst,
        scale: heavy ? 1.8 : 1.4,
        alpha: 0,
        duration: 230,
        onComplete: () => burst.destroy(),
      });
      const text = this.add
        .text(x, y - 45, blocked ? 'GUARD' : `−${damage}`, {
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: blocked ? '19px' : heavy ? '36px' : '28px',
          fontStyle: 'bold',
          color: blocked ? '#c8d4e5' : attacker === 'player' ? '#ff8185' : '#d8e5ab',
          stroke: '#111b27',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(41);
      this.transients.add(text);
      this.tweens.add({
        targets: text,
        y: y - 92,
        alpha: 0,
        duration: 650,
        ease: 'Cubic.Out',
        onComplete: () => text.destroy(),
      });
    }

    dust({ x, y }) {
      const g = this.add.graphics().setDepth(15).setPosition(x, Math.min(y, 540));
      this.transients.add(g);
      g.fillStyle(0x71869a, 0.2);
      for (let i = 0; i < 6; i++)
        g.fillEllipse(
          (Math.random() - 0.5) * 44,
          (Math.random() - 0.5) * 8,
          8 + Math.random() * 12,
          3 + Math.random() * 5,
        );
      this.tweens.add({
        targets: g,
        scaleX: 2.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 400,
        onComplete: () => g.destroy(),
      });
    }

    update(time, delta) {
      if (!paused) renderedTime += delta;
      this.arena.update(reducedMotion ? 0 : renderedTime, delta);
      if (!paused && engine.state === 'playing') {
        const input = {};
        for (const code of keys) input[KEY_MAP[code]] = true;
        for (const action of touch) input[action] = true;
        // Keep quick taps between render frames, with a short recovery buffer.
        for (const action of ACTIONS) {
          const expires = pressBuffer.get(action) || 0;
          input[action] =
            expires > performance.now() &&
            !engine.previousInput[action] &&
            !engine.locked(engine.player);
          if (input[action] || expires < performance.now()) pressBuffer.delete(action);
        }
        engine.update(delta / 1000, input);
      }
      if (engine.state === 'ended') {
        endTime += delta;
        const phase = Math.min(1, endTime / 750);
        this.playerVisual.update({ ...engine.player, phase }, renderedTime);
        this.enemyVisual.update({ ...engine.enemy, phase }, renderedTime);
        if (endTime > 1200 && elements['result-overlay'].hidden) showResult();
      } else {
        this.playerVisual.update(engine.player, renderedTime);
        this.enemyVisual.update(engine.enemy, renderedTime);
      }
      updateHUD();
    }
  }

  const game = new Phaser.Game({
    // This arena uses vector art throughout; Canvas avoids unnecessary GPU work
    // and stays responsive on browsers using software graphics.
    type: Phaser.CANVAS,
    parent: 'game',
    width: 1440,
    height: 760,
    backgroundColor: '#0b1421',
    transparent: false,
    antialias: true,
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: ArenaScene,
    input: { keyboard: false },
    render: { powerPreference: 'high-performance', roundPixels: false },
  });

  function start() {
    if (!scene || starting || isDialogOpen()) return;
    clearTimeout(announcementTimer);
    countdownTimers.forEach((timer) => timer.remove());
    countdownTimers = [];
    keys.clear();
    touch.clear();
    pressBuffer.clear();
    audio.unlock();
    paused = false;
    scene.time.paused = false;
    starting = true;
    engine.reset();
    scene.tweens.killAll();
    scene.transients.clear(true, true);
    lastHUD = '';
    elements.intro.hidden = true;
    elements['pause-overlay'].hidden = true;
    elements['result-overlay'].hidden = true;
    elements['pause-button'].disabled = false;
    elements['match-status'].textContent = 'PREPARE TO FIGHT';
    announce('3');
    audio.tone(260, 0.12, 'sine', 0.07);
    ['2', '1', 'FIGHT'].forEach((text, i) => {
      countdownTimers.push(
        scene.time.delayedCall((i + 1) * 680, () => {
          announce(text);
          audio.tone(text === 'FIGHT' ? 520 : 260, 0.15, 'sine', 0.07);
          if (text === 'FIGHT') {
            engine.start();
            starting = false;
            elements['pause-button'].disabled = false;
            elements['match-status'].textContent = 'FIGHT IN PROGRESS';
          }
        }),
      );
    });
  }

  function pause() {
    if ((engine.state !== 'playing' && !starting) || paused) return;
    paused = true;
    scene.time.paused = true;
    keys.clear();
    touch.clear();
    pressBuffer.clear();
    elements['pause-overlay'].hidden = false;
    elements['match-status'].textContent = 'MATCH PAUSED';
    elements['pause-button'].setAttribute('aria-label', 'Resume match');
  }
  function resume() {
    if (!paused) return;
    paused = false;
    scene.time.paused = false;
    elements['pause-overlay'].hidden = true;
    elements['match-status'].textContent = starting ? 'PREPARE TO FIGHT' : 'FIGHT IN PROGRESS';
    elements['pause-button'].setAttribute('aria-label', 'Pause match');
  }
  const controller = {
    start,
    pause,
    resume,
    restart: () => {
      if (!starting) start();
    },
    togglePause: () => (paused ? resume() : pause()),
    toggleSound: () => audio.toggle(),
    isPlaying: () => engine.state === 'playing' || starting,
    isPaused: () => paused,
  };

  window.addEventListener('keydown', (event) => {
    if (
      isDialogOpen() ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)
    )
      return;
    if (KEY_MAP[event.code]) {
      if (engine.state === 'playing') event.preventDefault();
      keys.add(event.code);
      if (!event.repeat && ACTIONS.includes(KEY_MAP[event.code])) {
        pressBuffer.set(KEY_MAP[event.code], performance.now() + 200);
      }
    }
    if (event.repeat) return;
    if (event.code === 'Enter' && engine.state !== 'playing' && event.target.tagName !== 'BUTTON') {
      event.preventDefault();
      start();
    }
    if (event.code === 'Escape') controller.togglePause();
    if (event.code === 'KeyR' && (engine.state === 'playing' || engine.state === 'ended'))
      controller.restart();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    touch.clear();
    pause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
  document.querySelectorAll('[data-input]').forEach((button) => {
    const release = () => {
      touch.delete(button.dataset.input);
      button.classList.remove('held');
    };
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      if (engine.state !== 'playing' || paused) return;
      button.setPointerCapture(event.pointerId);
      touch.add(button.dataset.input);
      if (ACTIONS.includes(button.dataset.input))
        pressBuffer.set(button.dataset.input, performance.now() + 200);
      button.classList.add('held');
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });

  game.events.on('destroy', () => {
    clearTimeout(announcementTimer);
    countdownTimers.forEach((timer) => timer.remove());
  });
  if (import.meta.env.DEV) window.__ALPHABET_WAR__ = { game, engine, controller };
  return controller;
}
