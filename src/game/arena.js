// The Fracture: a self-contained, procedurally illustrated arena.
// All positions use the game's 1440 × 760 logical coordinate system.

const W = 1440;
const H = 760;

function seededRandom(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function texture(scene, name, width, height, paint) {
  const key = `alphabet-arena-${name}`;
  if (!scene.textures.exists(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    scene.textures.addCanvas(key, canvas);
  }
  return key;
}

function polygon(graphics, points, color, alpha = 1) {
  graphics.fillStyle(color, alpha);
  graphics.beginPath();
  graphics.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo(points[index][0], points[index][1]);
  }
  graphics.closePath();
  graphics.fillPath();
}

function lines(graphics, points, color, alpha = 1, width = 1) {
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    graphics.lineTo(points[index][0], points[index][1]);
  }
  graphics.strokePath();
}

function crystal(graphics, x, y, size, tint = 0x9273b6) {
  // Facets rather than large neon shapes keep crystals part of the landscape.
  polygon(
    graphics,
    [
      [x, y],
      [x - size * 0.34, y - size * 0.64],
      [x - size * 0.16, y - size],
      [x + size * 0.14, y - size * 0.68],
      [x + size * 0.18, y - size * 0.12],
    ],
    tint,
    0.9,
  );
  polygon(
    graphics,
    [
      [x - size * 0.16, y - size],
      [x - size * 0.09, y - size * 0.3],
      [x + size * 0.18, y - size * 0.12],
      [x + size * 0.14, y - size * 0.68],
    ],
    0x4f3e74,
  );
  polygon(
    graphics,
    [
      [x - size * 0.16, y - size],
      [x - size * 0.09, y - size * 0.3],
      [x - size * 0.34, y - size * 0.64],
    ],
    0xc1a2d9,
    0.75,
  );
  lines(
    graphics,
    [
      [x - size * 0.16, y - size],
      [x - size * 0.09, y - size * 0.3],
    ],
    0xd7bded,
    0.65,
  );
}

export function createArena(scene) {
  const random = seededRandom(27182);
  const sky = texture(scene, 'sky', W, H, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, '#080d16');
    gradient.addColorStop(0.38, '#0d1b2a');
    gradient.addColorStop(0.68, '#183342');
    gradient.addColorStop(1, '#050a12');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    const light = ctx.createRadialGradient(810, 320, 10, 810, 320, 620);
    light.addColorStop(0, 'rgba(81,129,151,.18)');
    light.addColorStop(1, 'rgba(20,31,47,0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);
  });
  const fogTexture = texture(scene, 'mist', 800, 200, (ctx, width, height) => {
    ctx.scale(1, height / width);
    const fog = ctx.createRadialGradient(width / 2, width / 2, 0, width / 2, width / 2, width / 2);
    fog.addColorStop(0, 'rgba(97,153,177,.35)');
    fog.addColorStop(0.35, 'rgba(64,121,153,.23)');
    fog.addColorStop(0.72, 'rgba(45,88,120,.08)');
    fog.addColorStop(1, 'rgba(32,71,96,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, width, width);
  });
  const glowTexture = texture(scene, 'glow', 256, 256, (ctx) => {
    const glow = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    glow.addColorStop(0, 'rgba(197,180,235,.22)');
    glow.addColorStop(0.25, 'rgba(125,105,196,.1)');
    glow.addColorStop(1, 'rgba(83,70,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 256, 256);
  });
  const vignetteTexture = texture(scene, 'vignette', W, H, (ctx) => {
    const vignette = ctx.createRadialGradient(720, 340, 220, 720, 340, 800);
    vignette.addColorStop(0, 'rgba(2,5,10,0)');
    vignette.addColorStop(0.7, 'rgba(2,5,10,.1)');
    vignette.addColorStop(1, 'rgba(2,5,10,.75)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  });

  scene.add.image(0, 0, sky).setOrigin(0).setDepth(-20);

  const stars = scene.add.graphics().setDepth(-19);
  for (let i = 0; i < 105; i += 1) {
    const x = random() * W;
    const y = 60 + random() * 285;
    const radius = random() > 0.93 ? 1.25 : 0.55;
    stars.fillStyle(0x9cacbc, 0.12 + random() * 0.35);
    stars.fillCircle(x, y, radius);
  }

  // A veiled celestial disk catches the tops of the distant mountain ranges.
  const moonHalo = scene.add
    .image(1015, 173, glowTexture)
    .setDisplaySize(410, 410)
    .setTint(0x8db8c9)
    .setAlpha(0.6)
    .setDepth(-18);
  const moon = scene.add.graphics().setDepth(-17);
  moon.fillStyle(0x536876, 0.19);
  moon.fillCircle(1015, 173, 53);
  moon.lineStyle(1, 0x8a9da8, 0.13);
  moon.strokeCircle(1015, 173, 53);
  moon.fillStyle(0x152431, 0.35);
  moon.fillCircle(998, 159, 45);

  const farMountains = scene.add.graphics().setDepth(-16);
  polygon(
    farMountains,
    [
      [-50, 510],
      [0, 345],
      [83, 311],
      [173, 199],
      [203, 242],
      [230, 235],
      [322, 352],
      [378, 293],
      [465, 343],
      [552, 229],
      [594, 277],
      [633, 252],
      [733, 382],
      [812, 281],
      [870, 321],
      [934, 234],
      [984, 278],
      [1016, 260],
      [1125, 361],
      [1189, 204],
      [1220, 238],
      [1245, 229],
      [1345, 344],
      [1405, 298],
      [1480, 346],
      [1480, H],
      [-50, H],
    ],
    0x152b38,
  );
  polygon(
    farMountains,
    [
      [83, 311],
      [173, 199],
      [155, 287],
      [188, 277],
      [202, 338],
      [251, 371],
      [121, 372],
    ],
    0x203745,
    0.55,
  );
  polygon(
    farMountains,
    [
      [465, 343],
      [552, 229],
      [534, 316],
      [556, 300],
      [578, 376],
    ],
    0x2a3c48,
    0.35,
  );
  polygon(
    farMountains,
    [
      [1125, 361],
      [1189, 204],
      [1180, 295],
      [1211, 280],
      [1204, 354],
      [1250, 414],
    ],
    0x2a3b48,
    0.4,
  );
  lines(
    farMountains,
    [
      [167, 209],
      [173, 199],
      [202, 241],
      [219, 238],
    ],
    0x627581,
    0.15,
  );
  lines(
    farMountains,
    [
      [1181, 222],
      [1189, 204],
      [1220, 238],
      [1245, 229],
    ],
    0x627581,
    0.12,
  );

  const backgroundMist = [];
  [
    [270, 398, 1.55, 0.8],
    [940, 394, 1.6, 0.65],
    [1320, 460, 1.3, 0.5],
  ].forEach(([x, y, scale, alpha], index) => {
    const image = scene.add
      .image(x, y, fogTexture)
      .setScale(scale, 1.6)
      .setAlpha(alpha)
      .setDepth(-15);
    backgroundMist.push({ image, x, y, phase: index * 2.1, speed: 0.000075 });
  });

  const middleMountains = scene.add.graphics().setDepth(-14);
  polygon(
    middleMountains,
    [
      [-20, H],
      [-20, 320],
      [52, 344],
      [112, 282],
      [202, 427],
      [249, 404],
      [346, 496],
      [409, 433],
      [468, 478],
      [557, 367],
      [579, 403],
      [600, 397],
      [703, 504],
      [765, 437],
      [850, 486],
      [927, 381],
      [983, 452],
      [1031, 429],
      [1113, 485],
      [1203, 352],
      [1224, 369],
      [1299, 286],
      [1321, 330],
      [1351, 310],
      [1450, 385],
      [1450, H],
    ],
    0x0c1c29,
  );
  polygon(
    middleMountains,
    [
      [-20, 320],
      [52, 344],
      [112, 282],
      [94, 389],
      [138, 370],
      [182, 445],
      [152, 460],
    ],
    0x142b39,
    0.9,
  );
  polygon(
    middleMountains,
    [
      [468, 478],
      [557, 367],
      [531, 454],
      [548, 451],
      [574, 494],
    ],
    0x203340,
    0.45,
  );
  polygon(
    middleMountains,
    [
      [1203, 352],
      [1224, 369],
      [1299, 286],
      [1283, 383],
      [1311, 372],
      [1290, 450],
      [1240, 433],
    ],
    0x172d3a,
    0.8,
  );
  lines(
    middleMountains,
    [
      [112, 284],
      [92, 390],
      [137, 370],
    ],
    0x354b56,
    0.3,
  );
  lines(
    middleMountains,
    [
      [1299, 287],
      [1283, 383],
      [1311, 372],
    ],
    0x354b56,
    0.25,
  );

  // Broken satellites of the main island, suspended in the mist.
  const satellites = scene.add.graphics().setDepth(-12);
  polygon(
    satellites,
    [
      [62, 484],
      [135, 468],
      [201, 482],
      [157, 503],
      [135, 554],
      [110, 526],
    ],
    0x162936,
  );
  polygon(
    satellites,
    [
      [62, 484],
      [135, 468],
      [201, 482],
      [149, 490],
    ],
    0x2a414a,
    0.8,
  );
  polygon(
    satellites,
    [
      [1248, 445],
      [1303, 433],
      [1360, 451],
      [1331, 470],
      [1300, 518],
      [1285, 481],
    ],
    0x142735,
  );
  polygon(
    satellites,
    [
      [1248, 445],
      [1303, 433],
      [1360, 451],
      [1297, 453],
    ],
    0x2a414a,
    0.6,
  );
  polygon(
    satellites,
    [
      [100, 627],
      [134, 619],
      [148, 634],
      [128, 680],
    ],
    0x112331,
  );
  polygon(
    satellites,
    [
      [1304, 582],
      [1330, 571],
      [1352, 588],
      [1334, 631],
    ],
    0x152a37,
  );
  crystal(satellites, 1307, 441, 23, 0x76678f);

  [
    [200, 478, 1.5, 0.7],
    [890, 455, 1.85, 0.55],
    [1240, 514, 1.5, 0.8],
  ].forEach(([x, y, scale, alpha], index) => {
    const image = scene.add
      .image(x, y, fogTexture)
      .setScale(scale, 2.3)
      .setAlpha(alpha)
      .setDepth(-10);
    backgroundMist.push({ image, x, y, phase: index * 1.8 + 1, speed: 0.000055 });
  });

  const island = scene.add.graphics().setDepth(1);
  // The hanging basalt mass uses broad, irregular planar faces.
  polygon(
    island,
    [
      [177, 537],
      [1266, 537],
      [1205, 582],
      [1161, 584],
      [1130, 640],
      [1089, 628],
      [1032, 691],
      [968, 681],
      [901, 722],
      [848, 707],
      [766, 750],
      [726, 724],
      [671, 731],
      [629, 686],
      [564, 704],
      [512, 658],
      [452, 671],
      [411, 626],
      [358, 643],
      [310, 594],
      [257, 595],
      [218, 563],
    ],
    0x0a121c,
  );
  polygon(
    island,
    [
      [177, 537],
      [378, 538],
      [418, 581],
      [358, 643],
      [310, 594],
      [257, 595],
      [218, 563],
    ],
    0x1d2930,
  );
  polygon(
    island,
    [
      [378, 538],
      [568, 548],
      [561, 608],
      [512, 658],
      [452, 671],
      [411, 626],
      [418, 581],
    ],
    0x131e27,
  );
  polygon(
    island,
    [
      [568, 548],
      [709, 544],
      [726, 724],
      [671, 731],
      [629, 686],
      [564, 704],
      [512, 658],
      [561, 608],
    ],
    0x1b2730,
  );
  polygon(
    island,
    [
      [709, 544],
      [850, 543],
      [904, 609],
      [848, 707],
      [766, 750],
      [726, 724],
    ],
    0x111b25,
  );
  polygon(
    island,
    [
      [850, 543],
      [1074, 543],
      [1032, 691],
      [968, 681],
      [901, 722],
      [848, 707],
      [904, 609],
    ],
    0x18242e,
  );
  polygon(
    island,
    [
      [1074, 543],
      [1266, 537],
      [1205, 582],
      [1161, 584],
      [1130, 640],
      [1089, 628],
      [1032, 691],
    ],
    0x111d27,
  );
  polygon(
    island,
    [
      [268, 555],
      [343, 567],
      [358, 643],
      [316, 601],
    ],
    0x101922,
    0.8,
  );
  polygon(
    island,
    [
      [449, 564],
      [496, 568],
      [479, 646],
      [452, 671],
    ],
    0x24313a,
    0.45,
  );
  polygon(
    island,
    [
      [614, 561],
      [642, 579],
      [659, 677],
      [629, 686],
    ],
    0x31404b,
    0.25,
  );
  polygon(
    island,
    [
      [768, 575],
      [816, 586],
      [766, 750],
      [758, 679],
    ],
    0x080f18,
    0.8,
  );
  polygon(
    island,
    [
      [1019, 558],
      [1058, 564],
      [1032, 691],
      [1003, 658],
    ],
    0x080f18,
    0.65,
  );
  polygon(
    island,
    [
      [1149, 553],
      [1190, 554],
      [1161, 584],
      [1130, 640],
    ],
    0x2a3942,
    0.45,
  );

  // Layered broken seams and the occasional exposed amethyst vein.
  lines(
    island,
    [
      [236, 561],
      [345, 583],
      [416, 575],
      [446, 600],
      [551, 591],
    ],
    0x5a6871,
    0.16,
    1.5,
  );
  lines(
    island,
    [
      [575, 618],
      [638, 608],
      [670, 627],
      [718, 615],
    ],
    0x5a6871,
    0.15,
  );
  lines(
    island,
    [
      [887, 582],
      [932, 594],
      [1006, 577],
      [1052, 592],
      [1155, 567],
    ],
    0x5a6871,
    0.18,
  );
  lines(
    island,
    [
      [356, 574],
      [344, 598],
      [363, 607],
      [353, 623],
    ],
    0x080e17,
    0.9,
    2,
  );
  lines(
    island,
    [
      [818, 558],
      [797, 579],
      [813, 597],
      [786, 617],
    ],
    0x7c65a3,
    0.45,
    1.5,
  );
  lines(
    island,
    [
      [810, 597],
      [833, 605],
      [826, 631],
    ],
    0x584879,
    0.35,
  );
  lines(
    island,
    [
      [1007, 589],
      [985, 612],
      [997, 631],
    ],
    0x080e17,
    0.9,
    2,
  );

  const platform = scene.add.graphics().setDepth(3);
  polygon(
    platform,
    [
      [174, 532],
      [220, 519],
      [272, 521],
      [316, 509],
      [433, 515],
      [520, 506],
      [641, 510],
      [718, 505],
      [786, 511],
      [898, 507],
      [998, 513],
      [1082, 506],
      [1123, 518],
      [1196, 519],
      [1266, 532],
      [1218, 550],
      [1156, 547],
      [1080, 557],
      [1003, 550],
      [905, 555],
      [794, 550],
      [710, 555],
      [604, 550],
      [518, 556],
      [432, 549],
      [348, 554],
      [263, 546],
      [218, 547],
    ],
    0x34434a,
  );
  polygon(
    platform,
    [
      [174, 532],
      [293, 535],
      [347, 527],
      [447, 531],
      [520, 523],
      [610, 531],
      [720, 523],
      [810, 529],
      [903, 522],
      [997, 533],
      [1099, 523],
      [1182, 534],
      [1266, 532],
      [1218, 550],
      [1156, 547],
      [1080, 557],
      [1003, 550],
      [905, 555],
      [794, 550],
      [710, 555],
      [604, 550],
      [518, 556],
      [432, 549],
      [348, 554],
      [263, 546],
      [218, 547],
    ],
    0x233139,
  );
  lines(
    platform,
    [
      [203, 529],
      [272, 521],
      [316, 509],
      [433, 515],
      [520, 506],
    ],
    0x71818a,
    0.28,
    1,
  );
  lines(
    platform,
    [
      [641, 510],
      [718, 505],
      [786, 511],
      [898, 507],
    ],
    0x71818a,
    0.2,
  );
  lines(
    platform,
    [
      [998, 513],
      [1082, 506],
      [1123, 518],
      [1196, 519],
      [1236, 527],
    ],
    0x71818a,
    0.25,
  );
  for (let i = 0; i < 95; i += 1) {
    const x = 244 + random() * 950;
    const y = 518 + random() * 26;
    platform.lineStyle(
      random() * 1.2 + 0.5,
      random() > 0.5 ? 0x68777b : 0x111c25,
      0.14 + random() * 0.17,
    );
    platform.lineBetween(x, y, x + random() * 28 + 3, y - random() * 3);
  }
  // Low, asymmetric crystal outcrops frame rather than divide the fighting area.
  const crystals = scene.add.graphics().setDepth(4);
  [
    [281, 523, 35],
    [303, 522, 56],
    [322, 526, 27],
    [1108, 521, 30],
    [1131, 520, 63],
    [1150, 524, 39],
    [1166, 526, 20],
  ].forEach(([x, y, size]) => crystal(crystals, x, y, size));
  polygon(
    crystals,
    [
      [265, 525],
      [285, 514],
      [313, 516],
      [337, 530],
      [296, 534],
    ],
    0x2a303b,
  );
  polygon(
    crystals,
    [
      [1091, 525],
      [1111, 514],
      [1152, 521],
      [1180, 530],
      [1126, 534],
    ],
    0x2a303b,
  );
  crystal(crystals, 549, 554, 12, 0x756089);
  crystal(crystals, 866, 556, 8, 0x756089);

  const crystalGlows = [
    scene.add.image(300, 500, glowTexture).setDisplaySize(145, 145).setAlpha(0.6).setDepth(4),
    scene.add.image(1135, 499, glowTexture).setDisplaySize(160, 160).setAlpha(0.65).setDepth(4),
  ];

  const motes = [];
  for (let index = 0; index < 24; index += 1) {
    const x = 220 + random() * 1020;
    const y = 290 + random() * 235;
    const dot = scene.add
      .circle(
        x,
        y,
        0.6 + random() * 1.1,
        index % 4 === 0 ? 0xb09bce : 0x8babbb,
        0.15 + random() * 0.3,
      )
      .setDepth(5);
    motes.push({ dot, x, y, phase: random() * Math.PI * 2, speed: 0.4 + random() * 0.9 });
  }

  // Foreground blue haze stays beneath the combat plane.
  const foregroundMist = [];
  [
    [300, 687, 1.65, 0.6],
    [1030, 713, 1.8, 0.7],
    [770, 753, 2.2, 0.5],
  ].forEach(([x, y, scale, alpha], index) => {
    const image = scene.add
      .image(x, y, fogTexture)
      .setScale(scale, 2.8)
      .setAlpha(alpha)
      .setDepth(6);
    foregroundMist.push({ image, x, y, phase: index * 2.2, speed: 0.00006 });
  });
  scene.add.image(0, 0, vignetteTexture).setOrigin(0).setDepth(7);

  // Subtle drifting debris provides motion without competing with attacks.
  const debris = scene.add.graphics().setDepth(2);
  polygon(
    debris,
    [
      [264, 670],
      [279, 664],
      [288, 677],
      [276, 706],
    ],
    0x1c2a35,
  );
  polygon(
    debris,
    [
      [1168, 691],
      [1182, 680],
      [1195, 689],
      [1183, 719],
    ],
    0x15232f,
  );
  polygon(
    debris,
    [
      [548, 721],
      [560, 717],
      [569, 725],
      [555, 744],
    ],
    0x17232e,
  );

  return {
    groundY: 540,
    leftBound: 230,
    rightBound: 1210,
    update(time) {
      for (const fog of [...backgroundMist, ...foregroundMist]) {
        fog.image.x = fog.x + Math.sin(time * fog.speed + fog.phase) * 34;
        fog.image.y = fog.y + Math.cos(time * fog.speed * 1.3 + fog.phase) * 5;
      }
      for (const mote of motes) {
        mote.dot.x = mote.x + Math.sin(time * 0.00022 * mote.speed + mote.phase) * 13;
        mote.dot.y = mote.y + Math.cos(time * 0.0003 * mote.speed + mote.phase) * 11;
        mote.dot.alpha = 0.15 + (Math.sin(time * 0.0011 + mote.phase) + 1) * 0.1;
      }
      crystalGlows.forEach((glow, index) => {
        glow.alpha = 0.5 + Math.sin(time * 0.001 + index * 2) * 0.12;
      });
      moonHalo.alpha = 0.55 + Math.sin(time * 0.0003) * 0.05;
      debris.y = Math.sin(time * 0.0005) * 4;
    },
  };
}
