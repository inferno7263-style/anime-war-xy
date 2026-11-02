const GROUND = 540;
const LEFT = 230;
const RIGHT = 1210;
const GRAVITY = 1720;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ATTACKS = {
  light: { duration: 0.43, windup: 0.14, range: 148, damage: 8, cost: 5, stun: 0.22 },
  heavy: { duration: 0.72, windup: 0.32, range: 194, damage: 17, cost: 14, stun: 0.38 },
};

function fighter(id, x, facing) {
  return {
    id,
    x,
    y: GROUND,
    facing,
    action: 'idle',
    phase: 0,
    health: 100,
    stamina: 100,
    guarding: false,
    grounded: true,
    velocityY: 0,
    impulse: 0,
    actionTime: 0,
    actionDuration: 0,
    attack: null,
    attackResolved: false,
    dashTime: 0,
    dashCooldown: 0,
    invulnerable: 0,
    stunTime: 0,
    combo: 0,
  };
}

/** A dependency-free simulation. All distances use the game's 1440 × 760 canvas. */
export class CombatEngine {
  constructor({ onEvent = () => {}, difficulty = 'normal', random = Math.random } = {}) {
    this.onEvent = onEvent;
    this.difficulty = difficulty;
    this.random = random;
    this.reset();
  }

  reset() {
    this.player = fighter('player', 480, 1);
    this.enemy = fighter('enemy', 960, -1);
    this.timeRemaining = 99;
    this.round = 1;
    this.state = 'ready';
    this.result = null;
    this.elapsed = 0;
    this.previousInput = {};
    this.ai = {
      decisionTime: 0.4,
      attackCooldown: 0.65,
      direction: 0,
      guardTime: 0,
      nextAttack: null,
    };
  }

  start() {
    if (this.state === 'ended') this.reset();
    this.state = 'playing';
  }

  update(dt, input = {}) {
    if (this.state !== 'playing') return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    if (!dt) return;
    this.elapsed += dt;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);

    const pressed = (name) => Boolean(input[name]) && !this.previousInput[name];
    this.advanceFighter(this.player, dt);
    this.advanceFighter(this.enemy, dt);
    this.faceEachOther();

    const p = this.player;
    const move = Number(Boolean(input.right)) - Number(Boolean(input.left));
    if (!this.locked(p)) {
      p.guarding = Boolean(input.block) && p.grounded && p.stamina > 2;
      if (p.guarding) {
        this.setAction(p, 'block');
      } else {
        if (pressed('jump') && p.grounded) this.jump(p);
        if (pressed('dash') && p.dashCooldown <= 0 && p.stamina >= 12) {
          p.stamina -= 12;
          p.dashTime = 0.14;
          p.dashCooldown = 0.55;
          p.dashDirection = move || p.facing;
          p.invulnerable = 0.09;
          this.onEvent({ type: 'dash', attacker: 'player', x: p.x, y: p.y });
        }
        if (pressed('heavy')) this.beginAttack(p, 'heavy');
        else if (pressed('light')) this.beginAttack(p, 'light');
        if (!this.locked(p)) {
          p.x += move * 300 * dt;
          this.setAction(p, p.grounded ? (move ? 'walk' : 'idle') : 'jump');
        }
      }
    } else {
      p.guarding = false;
      // A small amount of steering keeps airborne attacks responsive.
      if (!p.grounded && !p.stunTime) p.x += move * 90 * dt;
    }

    this.updateAI(dt);
    this.resolveAttack(this.player, this.enemy);
    this.resolveAttack(this.enemy, this.player);
    this.separateFighters();
    this.faceEachOther();
    this.previousInput = { ...input };

    if (this.player.health <= 0 || this.enemy.health <= 0) {
      this.finish(
        this.player.health === this.enemy.health
          ? 'draw'
          : this.player.health > this.enemy.health
            ? 'player'
            : 'enemy',
        'ko',
      );
    } else if (this.timeRemaining <= 0) {
      this.finish(
        this.player.health === this.enemy.health
          ? 'draw'
          : this.player.health > this.enemy.health
            ? 'player'
            : 'enemy',
        'timeout',
      );
    }
  }

  locked(f) {
    return f.stunTime > 0 || Boolean(f.attack);
  }

  setAction(f, action) {
    if (f.action !== action) {
      f.action = action;
      f.actionTime = 0;
      f.phase = 0;
    }
  }

  faceEachOther() {
    if (Math.abs(this.player.x - this.enemy.x) < 2) return;
    this.player.facing = this.player.x < this.enemy.x ? 1 : -1;
    this.enemy.facing = -this.player.facing;
  }

  advanceFighter(f, dt) {
    f.actionTime += dt;
    f.dashCooldown = Math.max(0, f.dashCooldown - dt);
    f.invulnerable = Math.max(0, f.invulnerable - dt);
    f.stunTime = Math.max(0, f.stunTime - dt);
    if (f.dashTime > 0) {
      f.x += f.dashDirection * 730 * Math.min(dt, f.dashTime);
      f.dashTime = Math.max(0, f.dashTime - dt);
    }
    if (!f.grounded) {
      f.velocityY += GRAVITY * dt;
      f.y += f.velocityY * dt;
      if (f.y >= GROUND) {
        f.y = GROUND;
        f.velocityY = 0;
        f.grounded = true;
        this.onEvent({ type: 'land', attacker: f.id, x: f.x, y: f.y });
      }
    }
    f.x += f.impulse * dt;
    f.impulse *= Math.exp(-10 * dt);
    f.x = clamp(f.x, LEFT, RIGHT);

    if (f.attack) {
      f.phase = clamp(f.actionTime / f.actionDuration, 0, 1);
      // Do not discard an attack before its active frame is checked.
      if (f.actionTime >= f.actionDuration && f.attackResolved) {
        f.attack = null;
        this.setAction(f, f.grounded ? 'idle' : 'jump');
      }
    } else if (f.stunTime > 0) {
      f.phase = clamp(f.actionTime / (f.actionDuration || 0.3), 0, 1);
    } else {
      if (f.action === 'hurt') this.setAction(f, f.grounded ? 'idle' : 'jump');
      f.phase = (f.actionTime % 0.6) / 0.6;
    }

    const regen = f.guarding ? -8 : f.attack ? 3 : 20;
    f.stamina = clamp(f.stamina + regen * dt, 0, 100);
    if (f.stamina <= 1) f.guarding = false;
  }

  jump(f) {
    f.grounded = false;
    f.velocityY = -665;
    this.setAction(f, 'jump');
    this.onEvent({ type: 'jump', attacker: f.id, x: f.x, y: f.y });
  }

  beginAttack(f, kind) {
    const spec = ATTACKS[kind];
    if (this.locked(f) || f.stamina < spec.cost || f.dashTime > 0) return false;
    f.stamina -= spec.cost;
    f.guarding = false;
    f.attack = kind;
    f.attackResolved = false;
    f.actionDuration = spec.duration + (f.id === 'enemy' ? 0.1 : 0);
    this.setAction(f, kind);
    // Repeated attacks of the same kind must restart their timeline as well.
    f.actionTime = 0;
    f.phase = 0;
    this.onEvent({ type: 'attack', attacker: f.id, heavy: kind === 'heavy', x: f.x, y: f.y });
    return true;
  }

  resolveAttack(attacker, defender) {
    if (!attacker.attack || attacker.attackResolved) return;
    const kind = attacker.attack;
    const spec = ATTACKS[kind];
    const windup = spec.windup + (attacker.id === 'enemy' ? 0.1 : 0);
    if (attacker.actionTime < windup) return;
    attacker.attackResolved = true;
    const distance = Math.abs(attacker.x - defender.x);
    const inFront = (defender.x - attacker.x) * attacker.facing >= -20;
    if (
      distance > spec.range ||
      Math.abs(attacker.y - defender.y) > 105 ||
      !inFront ||
      defender.invulnerable > 0 ||
      defender.health <= 0
    )
      return;

    const canBlock =
      defender.guarding &&
      defender.stamina >= (kind === 'heavy' ? 25 : 13) &&
      (attacker.x - defender.x) * defender.facing > 0;
    const damage = canBlock ? (kind === 'heavy' ? 3 : 1) : spec.damage;
    defender.health = Math.max(0, defender.health - damage);
    defender.impulse = attacker.facing * (canBlock ? 85 : kind === 'heavy' ? 290 : 165);
    if (canBlock) {
      defender.stamina = Math.max(0, defender.stamina - (kind === 'heavy' ? 25 : 13));
    } else {
      defender.attack = null;
      defender.guarding = false;
      defender.stunTime = spec.stun;
      defender.actionDuration = spec.stun;
      this.setAction(defender, 'hurt');
      defender.actionTime = 0;
    }
    this.onEvent({
      type: 'hit',
      x: defender.x - attacker.facing * 20,
      y: defender.y - 78,
      damage,
      blocked: canBlock,
      attacker: attacker.id,
      heavy: kind === 'heavy',
    });
  }

  updateAI(dt) {
    const f = this.enemy;
    const p = this.player;
    const ai = this.ai;
    ai.attackCooldown = Math.max(0, ai.attackCooldown - dt);
    ai.guardTime = Math.max(0, ai.guardTime - dt);
    ai.decisionTime -= dt;
    if (this.locked(f)) {
      f.guarding = false;
      return;
    }
    const gap = Math.abs(p.x - f.x);
    const aggressive = this.difficulty === 'hard';
    if (ai.decisionTime <= 0) {
      ai.decisionTime = 0.12 + this.random() * 0.13;
      const incoming = p.attack && gap < 210 && p.actionTime < 0.25;
      if (incoming && f.stamina > 30 && this.random() < (aggressive ? 0.7 : 0.4)) {
        ai.guardTime = 0.3 + this.random() * 0.3;
      }
      const preferredGap = 112 + this.random() * 35;
      ai.direction = gap > preferredGap ? f.facing : gap < 77 ? -f.facing : 0;
      if (gap < 180 && ai.attackCooldown <= 0 && !ai.guardTime) {
        const kind = gap > 145 || this.random() < 0.32 ? 'heavy' : 'light';
        if (this.beginAttack(f, kind)) {
          ai.attackCooldown = (aggressive ? 0.55 : 0.85) + this.random() * 0.7;
          return;
        }
      }
      if (!p.grounded && f.grounded && gap < 200 && this.random() < 0.16) this.jump(f);
    }
    f.guarding = ai.guardTime > 0 && f.grounded && f.stamina > 8;
    if (f.guarding) {
      this.setAction(f, 'block');
    } else {
      f.x += ai.direction * (aggressive ? 250 : 215) * dt;
      this.setAction(f, f.grounded ? (ai.direction ? 'walk' : 'idle') : 'jump');
    }
  }

  separateFighters() {
    const p = this.player;
    const e = this.enemy;
    if (Math.abs(p.y - e.y) < 95 && Math.abs(p.x - e.x) < 62) {
      const direction = p.x <= e.x ? 1 : -1;
      const overlap = (62 - Math.abs(p.x - e.x)) / 2;
      p.x -= direction * overlap;
      e.x += direction * overlap;
    }
    p.x = clamp(p.x, LEFT, RIGHT);
    e.x = clamp(e.x, LEFT, RIGHT);
  }

  finish(winner, reason) {
    this.state = 'ended';
    this.result = { winner, reason };
    for (const f of [this.player, this.enemy]) {
      f.attack = null;
      f.guarding = false;
      f.dashTime = 0;
      this.setAction(f, winner === 'draw' ? 'idle' : f.id === winner ? 'victory' : 'defeat');
    }
    this.onEvent({ type: 'end', winner, reason });
  }
}
