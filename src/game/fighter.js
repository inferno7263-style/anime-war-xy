// The warriors are drawn in local coordinates, so their armor, weapons and
// silhouettes stay crisp at any canvas resolution. No remote art is required.
const PALETTES = {
  x: {
    black: 0x0b101b,
    dark: 0x181923,
    mid: 0x541d2a,
    armor: 0xb62a38,
    bright: 0xf04b58,
    edge: 0xff858b,
    light: 0xffc8c6,
    energy: 0xff384f,
    metal: 0x647482,
    trim: 0xa92a3b,
  },
  y: {
    black: 0x0a1717,
    dark: 0x142b29,
    mid: 0x1b5144,
    armor: 0x287a56,
    bright: 0x65b17b,
    edge: 0xd8c37c,
    light: 0xe7f7bc,
    energy: 0x99ec9e,
    metal: 0x6f9986,
    trim: 0xb8a15a,
  },
};

function polygon(g, points, color, alpha = 1, edge = 0x080e16, width = 1) {
  g.fillStyle(color, alpha);
  g.lineStyle(width, edge, alpha);
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
  g.closePath();
  g.fillPath();
  if (width) g.strokePath();
}

function line(g, points, color, width = 1, alpha = 1) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
  g.strokePath();
}

function plate(g, a, b, widthA, widthB, color, highlight, accent = 0) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const points = [
    [a[0] + nx * widthA, a[1] + ny * widthA],
    [a[0] - nx * widthA, a[1] - ny * widthA],
    [b[0] - nx * widthB, b[1] - ny * widthB],
    [b[0] + nx * widthB, b[1] + ny * widthB],
  ];
  polygon(g, points, color, 1, 0x080d15, 1.5);
  polygon(g, [points[0], a, b, points[3]], highlight, 0.85, 0, 0);
  if (accent)
    line(
      g,
      [
        [a[0] + nx * widthA * 0.75, a[1] + ny * widthA * 0.75],
        [b[0] + nx * widthB * 0.75, b[1] + ny * widthB * 0.75],
      ],
      accent,
      1.2,
      0.8,
    );
}

function joint(g, x, y, radius, color) {
  g.fillStyle(0x080d14).fillCircle(x, y, radius + 1.5);
  g.fillStyle(color).fillCircle(x, y, radius);
  g.lineStyle(1, 0xadc6c7, 0.2).strokeCircle(x, y, radius - 2);
}

const mix = (a, b, f) => a + (b - a) * f;

export class FighterVisual {
  constructor(scene, kind = 'x') {
    this.scene = scene;
    this.kind = kind;
    this.palette = PALETTES[kind] || PALETTES.x;
    this.shadow = scene.add.graphics().setDepth(12);
    this.root = scene.add.container(0, 0).setDepth(20);
    this.glow = scene.add.graphics();
    this.graphics = scene.add.graphics();
    this.root.add([this.glow, this.graphics]);
    this.hitUntil = 0;
  }

  playHit() {
    this.hitUntil = (this.lastTime || 0) + 150;
  }

  update(state, time = 0) {
    this.lastTime = time;
    const p = this.palette;
    const action = state.action || 'idle';
    const phase = Math.max(0, Math.min(1, state.phase || 0));
    const facing = state.facing < 0 ? -1 : 1;
    const isX = this.kind === 'x';
    const attacking = action === 'light' || action === 'heavy';
    const guarding = state.guarding || action === 'block';
    const walking = action === 'walk';
    const jumping = action === 'jump' || state.grounded === false;
    const defeated = action === 'defeat';
    const victory = action === 'victory';
    const swing = Math.sin(phase * Math.PI);
    const stride = walking ? Math.sin(time * 0.013) : 0;
    const breath = Math.sin(time * 0.0028 + (isX ? 0 : 1.4));
    let bob = walking ? -Math.abs(stride) * 2.8 : breath * 1.3;
    if (jumping) bob = -4;
    if (attacking) bob -= swing * 2;
    if (guarding) bob += 3;
    const bodyLean = attacking ? swing * (action === 'heavy' ? 8 : 5) : guarding ? -3 : 0;
    const hit = time < this.hitUntil;

    this.root.setPosition(state.x, state.y);
    this.root.setScale(facing, 1);
    this.root.setAlpha(defeated ? 0.7 : 1);
    this.root.setRotation(
      defeated
        ? -Math.min(1.3, phase * 1.4) * facing
        : action === 'hurt'
          ? -0.08 * swing * facing
          : 0,
    );
    if (defeated) this.root.y -= Math.min(18, phase * 20);

    const shadow = this.shadow;
    shadow.clear();
    const air = Math.max(0, 540 - state.y);
    const shadowY = Math.max(540, state.y) + 3;
    shadow.fillStyle(0x030910, 0.1).fillEllipse(state.x, shadowY, 118 - air * 0.12, 24);
    shadow.fillStyle(0x03070d, 0.27).fillEllipse(state.x, shadowY, 84 - air * 0.1, 15);
    shadow.fillStyle(0x02050a, 0.38).fillEllipse(state.x, shadowY, 53, 7);
    shadow.lineStyle(1, p.energy, 0.16).strokeEllipse(state.x, shadowY, 91, 17);

    const glow = this.glow;
    const g = this.graphics;
    glow.clear();
    g.clear();

    // A very faint luminous envelope separates the black armor from the sky.
    glow.fillStyle(p.energy, 0.025 + (attacking ? swing * 0.035 : 0));
    glow.fillEllipse(bodyLean, -76 + bob, 114, 154);
    glow.fillStyle(p.energy, 0.025).fillEllipse(bodyLean, -80 + bob, 92, 132);

    const hip = [bodyLean, -55 + bob];
    const backKnee = [-17 - stride * 12, -29 + Math.max(0, stride) * 7];
    const frontKnee = [19 + stride * 10, -29 + Math.max(0, -stride) * 7];
    const backFoot = [-27 - stride * 15, -3 - Math.max(0, stride) * 7];
    const frontFoot = [28 + stride * 15, -3 - Math.max(0, -stride) * 7];
    if (jumping) {
      backKnee[0] = -24;
      backKnee[1] = -41;
      frontKnee[0] = 24;
      frontKnee[1] = -42;
      backFoot[0] = -20;
      backFoot[1] = -20;
      frontFoot[0] = 25;
      frontFoot[1] = -18;
    }

    // Four back-mounted vanes make the red warrior read as X even in silhouette.
    if (isX) {
      polygon(
        g,
        [
          [-13 + bodyLean, -85 + bob],
          [-54 + bodyLean, -150 + bob],
          [-42 + bodyLean, -143 + bob],
          [9 + bodyLean, -90 + bob],
        ],
        p.black,
      );
      polygon(
        g,
        [
          [-43 + bodyLean, -141 + bob],
          [-55 + bodyLean, -156 + bob],
          [-46 + bodyLean, -151 + bob],
          [1 + bodyLean, -93 + bob],
        ],
        p.armor,
      );
      line(
        g,
        [
          [-52 + bodyLean, -150 + bob],
          [-10 + bodyLean, -98 + bob],
        ],
        p.edge,
        1,
        0.8,
      );
      polygon(
        g,
        [
          [-17 + bodyLean, -101 + bob],
          [-50 + bodyLean, -39 + bob],
          [-40 + bodyLean, -42 + bob],
          [5 + bodyLean, -91 + bob],
        ],
        p.dark,
      );
      line(
        g,
        [
          [-44 + bodyLean, -45 + bob],
          [-13 + bodyLean, -95 + bob],
        ],
        p.armor,
        3,
        0.9,
      );
      polygon(
        g,
        [
          [3 + bodyLean, -98 + bob],
          [43 + bodyLean, -146 + bob],
          [47 + bodyLean, -158 + bob],
          [10 + bodyLean, -125 + bob],
        ],
        p.mid,
      );
      line(
        g,
        [
          [12 + bodyLean, -119 + bob],
          [44 + bodyLean, -153 + bob],
        ],
        p.bright,
        1.4,
        0.7,
      );
    } else {
      // Split upper back armor and two long gold crests form the Y silhouette.
      polygon(
        g,
        [
          [-17 + bodyLean, -80 + bob],
          [-53 + bodyLean, -132 + bob],
          [-41 + bodyLean, -127 + bob],
          [0 + bodyLean, -98 + bob],
        ],
        p.black,
      );
      polygon(
        g,
        [
          [-47 + bodyLean, -128 + bob],
          [-57 + bodyLean, -146 + bob],
          [-45 + bodyLean, -139 + bob],
          [-12 + bodyLean, -99 + bob],
        ],
        p.trim,
      );
      line(
        g,
        [
          [-52 + bodyLean, -141 + bob],
          [-21 + bodyLean, -105 + bob],
        ],
        p.edge,
        1.2,
        0.8,
      );
      polygon(
        g,
        [
          [7 + bodyLean, -99 + bob],
          [38 + bodyLean, -141 + bob],
          [47 + bodyLean, -148 + bob],
          [42 + bodyLean, -129 + bob],
          [23 + bodyLean, -93 + bob],
        ],
        p.trim,
      );
      polygon(
        g,
        [
          [-8 + bodyLean, -84 + bob],
          [-14 + bodyLean, -37 + bob],
          [-3 + bodyLean, -46 + bob],
          [8 + bodyLean, -82 + bob],
        ],
        p.dark,
      );
    }

    // Far leg, pelvis and near leg have individually articulated plates.
    plate(g, [hip[0] - 11, hip[1]], backKnee, 10, 8, p.dark, p.mid, p.trim);
    joint(g, ...backKnee, 8, p.dark);
    plate(g, backKnee, backFoot, 8.5, 6.5, p.black, p.mid, p.trim);
    polygon(
      g,
      [
        [backFoot[0] - 8, backFoot[1] - 6],
        [backFoot[0] + 5, backFoot[1] - 6],
        [backFoot[0] + 13, backFoot[1] + 1],
        [backFoot[0] - 11, backFoot[1] + 2],
      ],
      p.dark,
    );
    line(
      g,
      [
        [backFoot[0] - 9, backFoot[1] + 1],
        [backFoot[0] + 12, backFoot[1] + 1],
      ],
      p.metal,
      1,
      0.55,
    );

    polygon(
      g,
      [
        [-19 + bodyLean, -65 + bob],
        [18 + bodyLean, -65 + bob],
        [22 + bodyLean, -50 + bob],
        [11 + bodyLean, -42 + bob],
        [-12 + bodyLean, -45 + bob],
        [-23 + bodyLean, -53 + bob],
      ],
      p.black,
    );
    polygon(
      g,
      [
        [-21 + bodyLean, -62 + bob],
        [-5 + bodyLean, -60 + bob],
        [-7 + bodyLean, -45 + bob],
        [-25 + bodyLean, -39 + bob],
      ],
      p.mid,
    );
    polygon(
      g,
      [
        [5 + bodyLean, -60 + bob],
        [22 + bodyLean, -62 + bob],
        [25 + bodyLean, -42 + bob],
        [10 + bodyLean, -46 + bob],
      ],
      p.armor,
    );
    line(
      g,
      [
        [11 + bodyLean, -57 + bob],
        [21 + bodyLean, -55 + bob],
        [22 + bodyLean, -46 + bob],
      ],
      p.trim,
      1.4,
      0.9,
    );

    plate(g, [hip[0] + 9, hip[1] + 1], frontKnee, 11, 8.5, p.mid, p.armor, p.trim);
    joint(g, ...frontKnee, 8.5, p.black);
    polygon(
      g,
      [
        [frontKnee[0] - 7, frontKnee[1] - 7],
        [frontKnee[0] + 7, frontKnee[1] - 5],
        [frontKnee[0] + 8, frontKnee[1] + 2],
        [frontKnee[0], frontKnee[1] + 8],
        [frontKnee[0] - 7, frontKnee[1] + 2],
      ],
      p.armor,
    );
    plate(g, [frontKnee[0], frontKnee[1] + 3], frontFoot, 8.5, 7, p.dark, p.armor, p.edge);
    polygon(
      g,
      [
        [frontFoot[0] - 8, frontFoot[1] - 7],
        [frontFoot[0] + 6, frontFoot[1] - 7],
        [frontFoot[0] + 17, frontFoot[1]],
        [frontFoot[0] + 15, frontFoot[1] + 3],
        [frontFoot[0] - 10, frontFoot[1] + 3],
      ],
      p.black,
    );
    polygon(
      g,
      [
        [frontFoot[0] - 6, frontFoot[1] - 7],
        [frontFoot[0] + 5, frontFoot[1] - 6],
        [frontFoot[0] + 13, frontFoot[1] - 1],
        [frontFoot[0] - 7, frontFoot[1] - 1],
      ],
      p.armor,
    );
    line(
      g,
      [
        [frontFoot[0] - 9, frontFoot[1] + 2],
        [frontFoot[0] + 14, frontFoot[1] + 2],
      ],
      p.edge,
      1,
      0.7,
    );

    const chestY = -94 + bob;
    const backShoulder = [-26 + bodyLean, chestY - 7];
    let backElbow = [-38 + bodyLean, chestY + 16];
    let backHand = [-28 + bodyLean, chestY + 32];
    if (guarding) {
      backElbow = [-26 + bodyLean, chestY + 16];
      backHand = [13 + bodyLean, chestY + 8];
    }
    if (walking) {
      backHand[0] -= stride * 12;
      backElbow[0] -= stride * 7;
    }
    if (attacking) {
      backElbow[0] -= 9 * swing;
      backHand[0] -= 15 * swing;
      backHand[1] -= 10 * swing;
    }
    if (victory) {
      backElbow = [-42, -126];
      backHand = [-37, -155];
    }
    plate(g, backShoulder, backElbow, 9, 7, p.dark, p.mid, p.trim);
    joint(g, ...backElbow, 6.5, p.black);
    plate(g, backElbow, backHand, 8, 6, p.dark, p.armor, p.trim);
    joint(g, ...backHand, 6, p.dark);
    polygon(
      g,
      [
        [backShoulder[0] - 13, backShoulder[1] - 8],
        [backShoulder[0] + 7, backShoulder[1] - 11],
        [backShoulder[0] + 12, backShoulder[1] + 3],
        [backShoulder[0] - 13, backShoulder[1] + 9],
        [backShoulder[0] - 19, backShoulder[1] + 1],
      ],
      p.mid,
    );
    line(
      g,
      [
        [backShoulder[0] - 15, backShoulder[1] - 3],
        [backShoulder[0] + 5, backShoulder[1] - 8],
      ],
      p.trim,
      1.6,
      0.85,
    );

    // Ribbed undersuit and the broad, beveled breastplate.
    polygon(
      g,
      [
        [-19 + bodyLean, chestY - 12],
        [19 + bodyLean, chestY - 12],
        [22 + bodyLean, chestY + 8],
        [13 + bodyLean, -58 + bob],
        [-14 + bodyLean, -58 + bob],
        [-25 + bodyLean, chestY + 6],
      ],
      p.black,
    );
    for (let i = 0; i < 4; i++) {
      line(
        g,
        [
          [-16 + bodyLean, -78 + bob + i * 5],
          [0 + bodyLean, -75 + bob + i * 5],
          [15 + bodyLean, -78 + bob + i * 5],
        ],
        p.metal,
        1.3,
        0.35,
      );
    }
    polygon(
      g,
      [
        [-24 + bodyLean, chestY - 12],
        [-8 + bodyLean, chestY - 18],
        [11 + bodyLean, chestY - 18],
        [28 + bodyLean, chestY - 7],
        [20 + bodyLean, chestY + 14],
        [1 + bodyLean, chestY + 20],
        [-20 + bodyLean, chestY + 9],
      ],
      p.mid,
    );
    polygon(
      g,
      [
        [-21 + bodyLean, chestY - 10],
        [-5 + bodyLean, chestY - 14],
        [0 + bodyLean, chestY + 16],
        [-18 + bodyLean, chestY + 8],
      ],
      p.armor,
    );
    polygon(
      g,
      [
        [3 + bodyLean, chestY - 14],
        [20 + bodyLean, chestY - 10],
        [25 + bodyLean, chestY - 5],
        [18 + bodyLean, chestY + 10],
        [3 + bodyLean, chestY + 16],
      ],
      p.dark,
    );
    line(
      g,
      [
        [-20 + bodyLean, chestY - 10],
        [-6 + bodyLean, chestY - 15],
        [12 + bodyLean, chestY - 15],
        [23 + bodyLean, chestY - 7],
      ],
      p.edge,
      1.1,
      0.6,
    );
    if (isX) {
      polygon(
        g,
        [
          [-18 + bodyLean, chestY - 8],
          [-11 + bodyLean, chestY - 12],
          [19 + bodyLean, chestY + 10],
          [11 + bodyLean, chestY + 15],
        ],
        p.bright,
      );
      polygon(
        g,
        [
          [17 + bodyLean, chestY - 10],
          [23 + bodyLean, chestY - 5],
          [-13 + bodyLean, chestY + 15],
          [-20 + bodyLean, chestY + 10],
        ],
        p.armor,
      );
      line(
        g,
        [
          [-13 + bodyLean, chestY - 8],
          [15 + bodyLean, chestY + 11],
        ],
        p.light,
        1.5,
        0.75,
      );
      line(
        g,
        [
          [17 + bodyLean, chestY - 6],
          [-14 + bodyLean, chestY + 11],
        ],
        p.edge,
        1,
        0.9,
      );
    } else {
      polygon(
        g,
        [
          [-19 + bodyLean, chestY - 10],
          [-11 + bodyLean, chestY - 13],
          [1 + bodyLean, chestY - 2],
          [13 + bodyLean, chestY - 13],
          [21 + bodyLean, chestY - 8],
          [6 + bodyLean, chestY + 5],
          [6 + bodyLean, chestY + 17],
          [-2 + bodyLean, chestY + 18],
          [-2 + bodyLean, chestY + 4],
        ],
        p.trim,
      );
      line(
        g,
        [
          [-13 + bodyLean, chestY - 10],
          [2 + bodyLean, chestY + 2],
          [16 + bodyLean, chestY - 9],
        ],
        p.light,
        1.2,
        0.8,
      );
      line(
        g,
        [
          [2 + bodyLean, chestY + 2],
          [2 + bodyLean, chestY + 15],
        ],
        p.edge,
        1.4,
        0.8,
      );
    }
    g.fillStyle(p.energy, 0.08).fillCircle(bodyLean + 2, chestY + 2, 11);
    g.fillStyle(hit ? 0xffffff : p.light, 1).fillCircle(bodyLean + 2, chestY + 2, 2.1);
    polygon(
      g,
      [
        [-17 + bodyLean, -65 + bob],
        [16 + bodyLean, -65 + bob],
        [17 + bodyLean, -59 + bob],
        [-16 + bodyLean, -58 + bob],
      ],
      p.dark,
    );
    polygon(
      g,
      [
        [-4 + bodyLean, -65 + bob],
        [6 + bodyLean, -65 + bob],
        [9 + bodyLean, -60 + bob],
        [1 + bodyLean, -56 + bob],
        [-6 + bodyLean, -61 + bob],
      ],
      p.trim,
    );

    // Helmet: X has crossed red blade horns, Y a branching gold crown.
    const hx = 3 + bodyLean;
    const hy = -129 + bob;
    polygon(
      g,
      [
        [hx - 8, hy + 11],
        [hx + 7, hy + 10],
        [hx + 10, hy + 20],
        [hx - 11, hy + 20],
      ],
      p.black,
    );
    if (isX) {
      polygon(
        g,
        [
          [hx - 4, hy - 4],
          [hx - 26, hy - 27],
          [hx - 23, hy - 13],
          [hx - 7, hy + 8],
        ],
        p.armor,
      );
      polygon(
        g,
        [
          [hx + 3, hy - 4],
          [hx + 22, hy - 28],
          [hx + 20, hy - 13],
          [hx + 8, hy + 7],
        ],
        p.bright,
      );
      line(
        g,
        [
          [hx - 23, hy - 23],
          [hx - 5, hy - 3],
        ],
        p.edge,
        1,
        0.7,
      );
      line(
        g,
        [
          [hx + 19, hy - 22],
          [hx + 5, hy - 3],
        ],
        p.light,
        1,
        0.6,
      );
    } else {
      polygon(
        g,
        [
          [hx - 12, hy + 1],
          [hx - 29, hy - 31],
          [hx - 20, hy - 26],
          [hx - 4, hy - 5],
        ],
        p.trim,
      );
      polygon(
        g,
        [
          [hx + 6, hy - 3],
          [hx + 25, hy - 31],
          [hx + 21, hy - 15],
          [hx + 14, hy + 3],
        ],
        p.trim,
      );
      line(
        g,
        [
          [hx - 25, hy - 27],
          [hx - 8, hy - 2],
        ],
        p.light,
        1.2,
        0.7,
      );
      line(
        g,
        [
          [hx + 21, hy - 25],
          [hx + 9, hy - 2],
        ],
        p.light,
        1.1,
        0.8,
      );
    }
    polygon(
      g,
      [
        [hx - 13, hy - 10],
        [hx + 5, hy - 15],
        [hx + 16, hy - 6],
        [hx + 17, hy + 9],
        [hx + 7, hy + 20],
        [hx - 7, hy + 18],
        [hx - 15, hy + 6],
      ],
      p.black,
    );
    polygon(
      g,
      [
        [hx - 12, hy - 8],
        [hx + 2, hy - 12],
        [hx + 4, hy - 2],
        [hx - 10, hy + 4],
        [hx - 14, hy],
      ],
      p.armor,
    );
    polygon(
      g,
      [
        [hx + 3, hy - 12],
        [hx + 13, hy - 5],
        [hx + 15, hy + 8],
        [hx + 5, hy + 4],
      ],
      p.mid,
    );
    polygon(
      g,
      [
        [hx - 11, hy + 6],
        [hx - 2, hy + 9],
        [hx + 5, hy + 18],
        [hx - 5, hy + 16],
      ],
      p.dark,
    );
    polygon(
      g,
      [
        [hx + 4, hy + 7],
        [hx + 14, hy + 4],
        [hx + 13, hy + 10],
        [hx + 6, hy + 17],
      ],
      p.armor,
    );
    if (isX) {
      line(
        g,
        [
          [hx - 10, hy - 4],
          [hx + 10, hy + 14],
        ],
        p.bright,
        3.4,
      );
      line(
        g,
        [
          [hx + 12, hy - 3],
          [hx - 7, hy + 13],
        ],
        p.armor,
        3.4,
      );
    } else {
      line(
        g,
        [
          [hx - 10, hy - 5],
          [hx + 2, hy + 4],
          [hx + 12, hy - 4],
        ],
        p.trim,
        3,
      );
      line(
        g,
        [
          [hx + 2, hy + 4],
          [hx + 4, hy + 16],
        ],
        p.trim,
        3,
      );
    }
    line(
      g,
      [
        [hx - 10, hy + 1],
        [hx - 3, hy + 3],
      ],
      p.light,
      2.2,
    );
    line(
      g,
      [
        [hx + 6, hy + 2],
        [hx + 13, hy - 1],
      ],
      p.light,
      2.2,
    );
    line(
      g,
      [
        [hx - 12, hy - 9],
        [hx + 3, hy - 13],
        [hx + 13, hy - 5],
      ],
      p.edge,
      1,
      0.7,
    );

    // The near arm drives the weapon, with a broadening silhouette on attacks.
    const frontShoulder = [27 + bodyLean, chestY - 4];
    let frontElbow = [43 + bodyLean, chestY + 14];
    let frontHand = [57 + bodyLean, chestY + 2];
    let weaponAngle = -0.95;
    if (walking) {
      frontElbow[0] += stride * 5;
      frontHand[0] += stride * 9;
      frontHand[1] += stride * 3;
    }
    if (jumping) {
      frontElbow[1] -= 8;
      frontHand[1] -= 12;
      weaponAngle = -0.65;
    }
    if (guarding) {
      frontElbow = [42 + bodyLean, chestY + 7];
      frontHand = [38 + bodyLean, chestY - 15];
      weaponAngle = -1.5;
    }
    if (attacking) {
      const follow = Math.sin(Math.PI * Math.min(1, phase / 0.8));
      frontElbow = [mix(36, 58, follow) + bodyLean, chestY + mix(-7, 3, follow)];
      frontHand = [
        mix(42, action === 'heavy' ? 91 : 79, follow) + bodyLean,
        chestY + mix(-25, 12, phase),
      ];
      weaponAngle = action === 'heavy' ? -2.0 + phase * 3.7 : -1.65 + phase * 2.7;
    }
    if (victory) {
      frontElbow = [38, -128];
      frontHand = [28, -158];
      weaponAngle = -1.35;
    }
    plate(g, frontShoulder, frontElbow, 9.5, 8, p.dark, p.armor, p.trim);
    joint(g, ...frontElbow, 7.2, p.black);
    plate(g, frontElbow, frontHand, 9.5, 6, p.mid, p.armor, p.edge);
    polygon(
      g,
      [
        [frontShoulder[0] - 10, frontShoulder[1] - 10],
        [frontShoulder[0] + 5, frontShoulder[1] - 13],
        [frontShoulder[0] + 20, frontShoulder[1] - 3],
        [frontShoulder[0] + 12, frontShoulder[1] + 10],
        [frontShoulder[0] - 7, frontShoulder[1] + 7],
      ],
      p.armor,
    );
    polygon(
      g,
      [
        [frontShoulder[0] - 8, frontShoulder[1] - 10],
        [frontShoulder[0] + 5, frontShoulder[1] - 12],
        [frontShoulder[0] + 17, frontShoulder[1] - 4],
        [frontShoulder[0] + 4, frontShoulder[1] - 2],
      ],
      p.bright,
    );
    line(
      g,
      [
        [frontShoulder[0] + 16, frontShoulder[1] - 1],
        [frontShoulder[0] + 11, frontShoulder[1] + 7],
        [frontShoulder[0] - 4, frontShoulder[1] + 5],
      ],
      p.edge,
      1,
      0.8,
    );
    joint(g, ...frontHand, 6.5, p.black);
    g.fillStyle(p.trim).fillCircle(frontHand[0] - 1, frontHand[1] - 1, 2.2);

    this.drawWeapon(g, glow, frontHand, weaponAngle, attacking, swing, phase, guarding, time);

    if (guarding) {
      glow.lineStyle(1.2, p.energy, 0.32 + breath * 0.08);
      glow.beginPath();
      glow.arc(5 + bodyLean, -83, 76, -1.25, 1.14, false);
      glow.strokePath();
      glow.lineStyle(5, p.energy, 0.035);
      glow.beginPath();
      glow.arc(5 + bodyLean, -83, 76, -1.25, 1.14, false);
      glow.strokePath();
    }

    if (hit) {
      const fade = Math.max(0, (this.hitUntil - time) / 150);
      glow.lineStyle(2, 0xfff1d8, fade * 0.9);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const r = 20 + (1 - fade) * 25;
        line(
          glow,
          [
            [10 + Math.cos(a) * r, -93 + Math.sin(a) * r],
            [10 + Math.cos(a) * (r + 14), -93 + Math.sin(a) * (r + 14)],
          ],
          0xffedc4,
          1.7,
          fade,
        );
      }
    }
  }

  drawWeapon(g, glow, hand, angle, attacking, swing, phase, guarding, time) {
    const p = this.palette;
    const isX = this.kind === 'x';
    const length = isX ? 63 : 70;
    const dir = [Math.cos(angle), Math.sin(angle)];
    const normal = [-dir[1], dir[0]];
    const at = (d, side = 0) => [
      hand[0] + dir[0] * d + normal[0] * side,
      hand[1] + dir[1] * d + normal[1] * side,
    ];
    // Layered translucent sweeps leave a clear, energetic arc during a slash.
    if (attacking && phase > 0.12 && phase < 0.9) {
      const alpha = swing * 0.18;
      const center = [hand[0] - 28, hand[1] + 8];
      for (let i = 0; i < 3; i++) {
        const r = 86 + i * 6;
        glow.lineStyle(8 - i * 2, p.energy, alpha / (i + 1));
        glow.beginPath();
        glow.arc(center[0], center[1], r, angle - 0.85, angle + 0.08, false);
        glow.strokePath();
      }
      glow.lineStyle(1.5, p.light, swing * 0.8);
      glow.beginPath();
      glow.arc(center[0], center[1], 99, angle - 0.65, angle, false);
      glow.strokePath();
    }
    line(g, [at(-10), at(8)], p.black, 7);
    line(g, [at(-9), at(8)], p.trim, 3);
    line(g, [at(9, -10), at(9, 10)], p.black, 6);
    line(g, [at(9, -10), at(9, 10)], p.trim, 3);
    polygon(
      glow,
      [at(10, -8), at(length + 12), at(10, 8)],
      p.energy,
      attacking ? 0.12 + swing * 0.15 : 0.08,
      0,
      0,
    );
    polygon(
      g,
      [at(11, -5.5), at(length - 12, -4), at(length + 7), at(length - 12, 4), at(11, 5.5)],
      p.black,
    );
    polygon(
      g,
      [at(12, -4), at(length - 13, -2.8), at(length + 5), at(length - 13, 1), at(12, 1)],
      p.armor,
      1,
      0,
      0,
    );
    polygon(g, [at(12, 1), at(length + 5), at(length - 11, 4), at(12, 5)], p.energy, 1, 0, 0);
    line(g, [at(12, 5), at(length - 11, 4), at(length + 5)], p.light, 1.2, 0.95);
    line(g, [at(18, -2), at(length - 18, -1)], p.edge, 1, 0.6);
    if (!isX) {
      // A split point echoes the Y crown while keeping a useful blade profile.
      polygon(
        g,
        [at(length - 17, -2), at(length - 1, -14), at(length - 6, -3), at(length - 15, 3)],
        p.trim,
      );
      line(g, [at(length - 15, -2), at(length - 2, -12)], p.light, 1, 0.8);
    }
    // A slow traveling spark gives a living edge to the idle weapons.
    const spark = 16 + ((time * 0.025) % (length - 14));
    const sparkAt = at(spark, 3);
    glow.fillStyle(p.light, 0.75).fillCircle(sparkAt[0], sparkAt[1], 1);
  }

  destroy() {
    this.shadow.destroy();
    this.root.destroy(true);
  }
}
