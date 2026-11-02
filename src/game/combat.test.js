import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatEngine } from './combat.js';

function step(engine, seconds, input = {}) {
  for (let t = 0; t < seconds; t += 1 / 60) engine.update(1 / 60, input);
}

function closeCombat() {
  const events = [];
  const engine = new CombatEngine({ random: () => 0.99, onEvent: (e) => events.push(e) });
  engine.start();
  engine.enemy.x = 600;
  engine.ai.decisionTime = 100;
  engine.ai.attackCooldown = 100;
  return { engine, events };
}

test('light attack hits once after its windup; holding the key cannot auto-repeat', () => {
  const { engine, events } = closeCombat();
  step(engine, 0.1, { light: true });
  assert.equal(engine.enemy.health, 100);
  step(engine, 0.7, { light: true });
  assert.equal(engine.enemy.health, 92);
  assert.equal(events.filter((e) => e.type === 'hit').length, 1);
});

test('guard reduces an incoming heavy attack and consumes stamina', () => {
  const { engine, events } = closeCombat();
  engine.ai.guardTime = 2;
  step(engine, 0.5, { heavy: true });
  assert.equal(engine.enemy.health, 97);
  const hit = events.find((e) => e.type === 'hit');
  assert.equal(hit.blocked, true);
  assert.ok(engine.enemy.stamina < 80);
});

test('jump leaves the ground and returns; movement remains inside arena', () => {
  const { engine } = closeCombat();
  step(engine, 0.2, { jump: true, left: true });
  assert.equal(engine.player.grounded, false);
  assert.ok(engine.player.y < 540);
  step(engine, 2, { left: true });
  assert.equal(engine.player.grounded, true);
  assert.equal(engine.player.y, 540);
  assert.equal(engine.player.x, 230);
});

test('AI approaches and damages a passive player', () => {
  const engine = new CombatEngine({ random: () => 0.5 });
  engine.start();
  step(engine, 7);
  assert.ok(engine.enemy.x < 960);
  assert.ok(engine.player.health < 100);
});

test('knockout ends the round once and reset clears match state', () => {
  const { engine, events } = closeCombat();
  engine.enemy.health = 8;
  step(engine, 0.3, { light: true });
  assert.equal(engine.state, 'ended');
  assert.deepEqual(engine.result, { winner: 'player', reason: 'ko' });
  assert.equal(engine.player.action, 'victory');
  step(engine, 3, { light: true });
  assert.equal(events.filter((e) => e.type === 'end').length, 1);
  engine.reset();
  assert.equal(engine.state, 'ready');
  assert.equal(engine.enemy.health, 100);
  assert.equal(engine.timeRemaining, 99);
});

test('time expires by remaining health and frozen or invalid dt cannot progress play', () => {
  const { engine } = closeCombat();
  engine.timeRemaining = 0.02;
  engine.enemy.health = 75;
  engine.update(NaN, {});
  assert.equal(engine.timeRemaining, 0.02);
  engine.update(100, {});
  assert.equal(engine.state, 'ended');
  assert.deepEqual(engine.result, { winner: 'player', reason: 'timeout' });
});
