'use strict';
// Procedurally painted textures and sprites. Each asset is drawn with the
// 2D canvas API and baked into a Uint32Array (ABGR little-endian pixels)
// that the raycaster samples directly.
const TS = 64;

function mulberry(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function bake(draw, w = TS, h = TS) {
  const c = newCanvas(w, h);
  const g = c.getContext('2d');
  draw(g, w, h);
  const img = g.getImageData(0, 0, w, h);
  return { w, h, data: new Uint32Array(img.data.buffer), canvas: c };
}

function R(g, color, x, y, w, h) { g.fillStyle = color; g.fillRect(x, y, w, h); }
function circle(g, color, x, y, r) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function bevel(g, x, y, w, h, light, dark) {
  R(g, light, x, y, w, 1); R(g, light, x, y, 1, h);
  R(g, dark, x, y + h - 1, w, 1); R(g, dark, x + w - 1, y, 1, h);
}
function grain(g, amt, seed, w = TS, h = TS) {
  const r = mulberry(seed);
  const img = g.getImageData(0, 0, w, h), p = img.data;
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const n = (r() - 0.5) * amt;
    p[i] = Math.max(0, Math.min(255, p[i] + n));
    p[i + 1] = Math.max(0, Math.min(255, p[i + 1] + n));
    p[i + 2] = Math.max(0, Math.min(255, p[i + 2] + n));
  }
  g.putImageData(img, 0, 0);
}
function tint(g, color) {
  g.globalCompositeOperation = 'source-atop';
  R(g, color, 0, 0, TS, TS);
  g.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- textures
function paintBlastDoor(g, accent) {
  R(g, '#737982', 0, 0, 64, 64);
  bevel(g, 0, 0, 64, 64, '#9aa1aa', '#40444a');
  R(g, '#5d626a', 5, 5, 22, 16); bevel(g, 5, 5, 22, 16, '#8b919a', '#474b52');
  R(g, '#5d626a', 37, 5, 22, 16); bevel(g, 37, 5, 22, 16, '#8b919a', '#474b52');
  R(g, '#5d626a', 5, 42, 22, 16); bevel(g, 5, 42, 22, 16, '#8b919a', '#474b52');
  R(g, '#5d626a', 37, 42, 22, 16); bevel(g, 37, 42, 22, 16, '#8b919a', '#474b52');
  g.save();
  g.beginPath(); g.rect(1, 26, 62, 12); g.clip();
  R(g, '#e8c21a', 0, 26, 64, 12);
  g.fillStyle = '#1b1b1b';
  for (let x = -16; x < 72; x += 10) {
    g.beginPath(); g.moveTo(x, 38); g.lineTo(x + 5, 38); g.lineTo(x + 17, 26); g.lineTo(x + 12, 26); g.fill();
  }
  g.restore();
  R(g, '#33373c', 31, 0, 2, 64);
  if (accent) {
    R(g, accent, 2, 2, 60, 3); R(g, accent, 2, 59, 60, 3);
    circle(g, '#111', 32, 48, 5); circle(g, accent, 32, 48, 3.5); circle(g, '#fff', 31, 47, 1);
  }
  grain(g, 12, accent ? 7 : 3);
}

function makeTextures() {
  const T = {};
  T.grey = bake(g => {
    R(g, '#7d828a', 0, 0, 64, 64);
    for (const y of [0, 32]) {
      bevel(g, 0, y, 64, 32, '#a6abb3', '#484c53');
      R(g, '#5c6068', 3, y + 10, 58, 2); R(g, '#9aa0a8', 3, y + 12, 58, 1);
      R(g, '#5c6068', 3, y + 20, 58, 2); R(g, '#9aa0a8', 3, y + 22, 58, 1);
      for (const x of [3, 59]) { R(g, '#c8ccd3', x, y + 3, 2, 2); R(g, '#c8ccd3', x, y + 27, 2, 2); }
    }
    R(g, '#484c53', 40, 33, 1, 30); R(g, '#a6abb3', 41, 33, 1, 30);
    grain(g, 14, 1);
  });
  T.dark = bake(g => {
    R(g, '#2a2d33', 0, 0, 64, 64);
    bevel(g, 0, 0, 64, 64, '#40444c', '#131519');
    for (let y = 6; y < 34; y += 4) R(g, '#1b1d22', 4, y, 56, 2);
    R(g, '#0c0f14', 4, 39, 56, 12);
    R(g, '#9fd8ff', 6, 41, 52, 8);
    R(g, '#f2fbff', 8, 43, 48, 3);
    R(g, '#22252b', 4, 54, 56, 6);
    grain(g, 10, 2);
  });
  T.detention = bake(g => {
    R(g, '#0d0f13', 0, 0, 64, 64);
    for (const y of [6, 44]) { R(g, '#3a3f46', 2, y - 2, 60, 12); R(g, '#e6ecf0', 4, y, 56, 8); R(g, '#ffffff', 6, y + 2, 52, 3); }
    for (let x = 4; x < 64; x += 12) R(g, '#1c1f25', x, 20, 3, 22);
    R(g, '#050608', 0, 31, 64, 1);
    grain(g, 8, 3);
  });
  T.console = bake(g => {
    const r = mulberry(4);
    R(g, '#3b3f47', 0, 0, 64, 64);
    bevel(g, 0, 0, 64, 64, '#5b606a', '#1f2126');
    R(g, '#050a07', 6, 6, 52, 24);
    for (let i = 0; i < 5; i++) R(g, '#27d35a', 8, 8 + i * 4, 8 + (r() * 22 | 0), 1);
    g.strokeStyle = '#27d35a'; g.lineWidth = 1;
    g.beginPath(); g.arc(46, 18, 9, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(46, 18); g.lineTo(53, 13); g.stroke();
    R(g, '#ff4040', 43, 20, 2, 2);
    const cols = ['#e33', '#fd3', '#3af', '#3e5', '#777', '#f80'];
    for (let y = 34; y < 54; y += 6) for (let x = 7; x < 57; x += 7) R(g, cols[r() * cols.length | 0], x, y, 5, 3);
    R(g, '#2b2e34', 0, 57, 64, 7);
    grain(g, 8, 5);
  });
  T.window = bake(g => {
    const r = mulberry(6);
    R(g, '#010104', 0, 0, 64, 64);
    for (let i = 0; i < 45; i++) {
      const c = ['#fff', '#9cf', '#ffd', '#aaa'][r() * 4 | 0];
      R(g, c, r() * 64 | 0, r() * 64 | 0, 1, 1);
    }
    circle(g, '#2b4c7e', 50, 52, 14); circle(g, '#3f6aa8', 47, 49, 11); circle(g, '#6d95d0', 44, 45, 4);
    R(g, '#5b6068', 0, 0, 64, 5); R(g, '#5b6068', 0, 59, 64, 5);
    R(g, '#5b6068', 0, 0, 4, 64); R(g, '#5b6068', 60, 0, 4, 64);
    R(g, '#5b6068', 30, 0, 4, 64);
    R(g, '#8a9099', 0, 4, 64, 1); R(g, '#8a9099', 33, 0, 1, 64);
  });
  T.reactor = bake(g => {
    R(g, '#15171c', 0, 0, 64, 64);
    for (const x of [3, 19, 35, 51]) {
      const gr = g.createLinearGradient(x, 0, x + 10, 0);
      gr.addColorStop(0, '#34373d'); gr.addColorStop(0.45, '#b4b9c3'); gr.addColorStop(1, '#25272c');
      R(g, gr, x, 0, 10, 64);
    }
    R(g, '#ff8a1e', 0, 18, 64, 4); R(g, '#ffd28a', 0, 19, 64, 1);
    R(g, '#3fc4ff', 0, 44, 64, 4); R(g, '#c9f0ff', 0, 45, 64, 1);
    grain(g, 10, 6);
  });
  T.exit = bake(g => {
    R(g, '#23262c', 0, 0, 64, 64);
    bevel(g, 0, 0, 64, 64, '#40444c', '#0e1013');
    R(g, '#0c0e10', 8, 6, 48, 52);
    R(g, '#10c040', 12, 10, 40, 24); R(g, '#8dffb0', 14, 12, 36, 3);
    g.fillStyle = '#012'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText('EXIT', 32, 29);
    R(g, '#555', 22, 40, 20, 14); R(g, '#c33', 26, 42, 12, 10); R(g, '#ff6', 30, 44, 4, 6);
  });
  T.core = bake(g => {
    R(g, '#23262c', 0, 0, 64, 64);
    bevel(g, 0, 0, 64, 64, '#40444c', '#0e1013');
    R(g, '#0c0e10', 8, 6, 48, 52);
    R(g, '#d02a10', 12, 10, 40, 24); R(g, '#ffae8a', 14, 12, 36, 3);
    g.fillStyle = '#200'; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.fillText('CORE', 32, 29);
    circle(g, '#555', 32, 47, 8); circle(g, '#f22', 32, 47, 6); circle(g, '#faa', 30, 45, 2);
  });
  T.door = bake(g => paintBlastDoor(g, null));
  T.doorRed = bake(g => paintBlastDoor(g, '#e0262b'));
  T.doorBlue = bake(g => paintBlastDoor(g, '#2b7cff'));

  T.floorPolish = bake(g => {
    R(g, '#17191d', 0, 0, 64, 64);
    R(g, '#0a0b0d', 0, 0, 64, 1); R(g, '#0a0b0d', 0, 0, 1, 64);
    R(g, '#0a0b0d', 0, 32, 64, 1); R(g, '#0a0b0d', 32, 0, 1, 64);
    R(g, '#24272d', 4, 4, 10, 2); R(g, '#24272d', 36, 36, 10, 2);
    grain(g, 8, 7);
  });
  T.floorGrate = bake(g => {
    R(g, '#3a3d42', 0, 0, 64, 64);
    for (let i = 0; i < 64; i += 8) { R(g, '#22252a', i, 0, 2, 64); R(g, '#22252a', 0, i, 64, 2); }
    bevel(g, 0, 0, 64, 64, '#55595f', '#1a1c20');
    grain(g, 14, 8);
  });
  T.floorHangar = bake(g => {
    R(g, '#4b4f55', 0, 0, 64, 64);
    bevel(g, 1, 1, 62, 62, '#63676e', '#33363b');
    R(g, '#c9a227', 0, 0, 64, 2);
    for (const [x, y] of [[6, 6], [56, 6], [6, 56], [56, 56]]) R(g, '#2d3035', x, y, 2, 2);
    grain(g, 12, 9);
  });
  T.ceilLights = bake(g => {
    R(g, '#2b2e34', 0, 0, 64, 64);
    bevel(g, 0, 0, 64, 64, '#3c4048', '#15171a');
    R(g, '#4b4f57', 18, 18, 28, 28);
    R(g, '#e8f4ff', 21, 21, 22, 22);
    R(g, '#ffffff', 25, 25, 14, 14);
    grain(g, 8, 10);
  });
  T.ceilDark = bake(g => {
    R(g, '#1c1e23', 0, 0, 64, 64);
    for (let i = 4; i < 64; i += 10) R(g, '#111317', i, 0, 3, 64);
    R(g, '#2c3037', 0, 30, 64, 4);
    R(g, '#ff9c3a', 30, 31, 4, 2);
    grain(g, 10, 11);
  });
  return T;
}

// ----------------------------------------------------------------- sprites
function drawTrooper(g, o) {
  const A = o.armor, D = o.shade, S = o.suit, V = o.visor;
  const ph = o.phase || 0;
  const liftL = ph === 1 ? 3 : 0, liftR = ph === 2 ? 3 : 0;
  // legs
  R(g, S, 24, 40, 16, 4);
  R(g, A, 24, 42, 7, 20 - liftL); R(g, A, 33, 42, 7, 20 - liftR);
  R(g, S, 24, 50 - liftL, 7, 2); R(g, S, 33, 50 - liftR, 7, 2);
  R(g, D, 24, 58 - liftL, 7, 4); R(g, D, 33, 58 - liftR, 7, 4);
  R(g, D, 30, 42, 1, 18);
  // torso
  R(g, S, 23, 21, 18, 20);
  R(g, A, 24, 22, 16, 9); R(g, D, 24, 30, 16, 1); R(g, D, 31, 22, 2, 8);
  R(g, A, 26, 32, 12, 6); R(g, D, 26, 35, 12, 1);
  R(g, A, 24, 38, 16, 3); R(g, S, 27, 39, 3, 1); R(g, S, 34, 39, 3, 1);
  // arms
  R(g, A, 17, 22, 7, 5); R(g, A, 40, 22, 7, 5);
  R(g, A, 18, 27, 5, 8); R(g, A, 41, 27, 5, 8);
  R(g, S, 18, 35, 5, 2); R(g, S, 41, 35, 5, 2);
  R(g, S, 21, 32, 6, 4); R(g, S, 37, 32, 6, 4);
  // blaster pointed at the player
  R(g, '#1b1c1f', 22, 30, 20, 4);
  R(g, '#2c2e33', 36, 28, 9, 9); R(g, '#000', 38, 30, 5, 5);
  // helmet
  g.fillStyle = A; g.beginPath(); g.arc(32, 12, 8, Math.PI, 0); g.fill();
  R(g, A, 24, 12, 16, 8); R(g, D, 24, 18, 16, 2); R(g, D, 25, 5, 14, 1);
  R(g, V, 26, 11, 5, 3); R(g, V, 33, 11, 5, 3);
  R(g, V, 27, 14, 3, 1); R(g, V, 34, 14, 3, 1);
  R(g, D, 30, 15, 4, 4); R(g, V, 31, 16, 2, 2);
  R(g, V, 27, 17, 2, 1); R(g, V, 35, 17, 2, 1);
  if (o.flash) { circle(g, '#ff4020', 40, 32, 7); circle(g, '#ffc0a0', 40, 32, 4); circle(g, '#fff', 40, 32, 2); }
}

function drawProbe(g, o) {
  const bob = o.bob || 0;
  g.strokeStyle = '#2e2e30'; g.lineWidth = 1.6;
  const legs = [[18, 58], [25, 62], [32, 57], [39, 62], [46, 58]];
  for (const [x, y] of legs) {
    g.beginPath(); g.moveTo(32, 30 + bob); g.lineTo((32 + x) / 2 + (x < 32 ? -3 : 3), 44 + bob); g.lineTo(x, y + bob); g.stroke();
  }
  g.strokeStyle = '#444'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(28, 9 + bob); g.lineTo(21, 0); g.stroke();
  g.beginPath(); g.moveTo(36, 9 + bob); g.lineTo(43, 1); g.stroke();
  circle(g, '#19191c', 32, 20 + bob, 13);
  circle(g, '#34343a', 28, 15 + bob, 5);
  R(g, '#2d2d30', 22, 29 + bob, 20, 3);
  circle(g, '#000', 26, 22 + bob, 3.5); circle(g, '#ff3322', 26, 22 + bob, 2.2);
  circle(g, '#000', 38, 22 + bob, 3.5); circle(g, '#ff3322', 38, 22 + bob, 2.2);
  circle(g, '#ff7755', 32, 26 + bob, 1.6);
  if (o.flash) { circle(g, '#ff3020', 32, 30 + bob, 7); circle(g, '#fff', 32, 30 + bob, 3); }
}

function drawVader(g, o) {
  const ph = o.phase || 0;
  g.fillStyle = '#08080b';
  g.beginPath(); g.moveTo(32, 12); g.lineTo(9, 63); g.lineTo(55, 63); g.fill();
  R(g, '#131316', 23, 22, 18, 32);
  R(g, '#0d0d10', 24, 50, 7, 13 - (ph === 1 ? 2 : 0)); R(g, '#0d0d10', 33, 50, 7, 13 - (ph === 2 ? 2 : 0));
  R(g, '#101013', 16, 23, 7, 20); R(g, '#101013', 41, 23, 7, 20);
  R(g, '#2a2a30', 27, 27, 10, 7);
  R(g, '#e22', 28, 28, 2, 2); R(g, '#2e4', 31, 28, 2, 2); R(g, '#28f', 34, 28, 2, 2); R(g, '#999', 28, 31, 8, 1);
  R(g, '#555', 24, 40, 16, 3); R(g, '#aaa', 26, 40, 3, 3); R(g, '#aaa', 35, 40, 3, 3);
  // helmet
  g.fillStyle = '#0e0e11';
  g.beginPath(); g.arc(32, 12, 9, Math.PI, 0); g.fill();
  g.beginPath(); g.moveTo(23, 11); g.lineTo(41, 11); g.lineTo(46, 22); g.lineTo(18, 22); g.fill();
  R(g, '#3a3a44', 26, 8, 12, 1);
  g.fillStyle = '#2d2d36';
  g.beginPath(); g.moveTo(25, 12); g.lineTo(31, 13); g.lineTo(29, 16); g.fill();
  g.beginPath(); g.moveTo(39, 12); g.lineTo(33, 13); g.lineTo(35, 16); g.fill();
  g.fillStyle = '#48484f';
  g.beginPath(); g.moveTo(29, 17); g.lineTo(35, 17); g.lineTo(32, 21); g.fill();
  // lightsaber
  let hx, hy, tx, ty;
  if (o.attack) { hx = 40; hy = 16; tx = 6; ty = 1; } else { hx = 45; hy = 40; tx = 61; ty = 4; }
  g.lineCap = 'round';
  g.strokeStyle = '#ff1a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
  g.strokeStyle = '#ffd6d6'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx, ty); g.stroke();
  R(g, '#bbb', hx - 2, hy - 1, 4, 4);
  R(g, '#070707', hx - 3, hy + 1, 5, 4);
}

function drawDeadVader(g) {
  g.fillStyle = '#08080b';
  g.beginPath(); g.moveTo(6, 63); g.lineTo(20, 50); g.lineTo(46, 52); g.lineTo(60, 63); g.fill();
  g.fillStyle = '#0e0e11';
  g.beginPath(); g.arc(40, 55, 8, Math.PI, 0); g.fill();
  R(g, '#2a2a30', 34, 55, 12, 4);
  R(g, '#bbb', 14, 60, 8, 3);
}

function makeFallen(src, angle, px, py) {
  return bake(g => {
    g.translate(px, py); g.rotate(angle);
    g.drawImage(src.canvas, -32, -62);
  });
}

function makeSprites() {
  const S = {};
  function humanoid(opts) {
    const set = {};
    set.stand = bake(g => drawTrooper(g, opts));
    set.walk0 = bake(g => drawTrooper(g, { ...opts, phase: 1 }));
    set.walk1 = bake(g => drawTrooper(g, { ...opts, phase: 2 }));
    set.shoot = bake(g => drawTrooper(g, { ...opts, flash: true }));
    set.pain = bake(g => { drawTrooper(g, opts); tint(g, 'rgba(255,40,40,0.45)'); });
    set.die0 = makeFallen(set.stand, -Math.PI / 4, 54, 54);
    set.die1 = makeFallen(set.stand, -Math.PI / 2, 60, 48);
    return set;
  }
  S.trooper = humanoid({ armor: '#eceef0', shade: '#a9adb3', suit: '#15161a', visor: '#0d0d10' });
  S.deathtrooper = humanoid({ armor: '#23252a', shade: '#121316', suit: '#050505', visor: '#e0282b' });
  S.probe = {
    stand: bake(g => drawProbe(g, {})),
    walk0: bake(g => drawProbe(g, { bob: -1 })),
    walk1: bake(g => drawProbe(g, { bob: 1 })),
    shoot: bake(g => drawProbe(g, { flash: true })),
    pain: bake(g => { drawProbe(g, {}); tint(g, 'rgba(255,60,40,0.5)'); }),
    die0: bake(g => { g.translate(0, 20); drawProbe(g, {}); tint(g, 'rgba(255,140,40,0.5)'); }),
    die1: bake(g => {
      const r = mulberry(12);
      for (let i = 0; i < 14; i++) R(g, ['#19191c', '#2e2e30', '#444'][i % 3], 12 + r() * 40 | 0, 52 + r() * 10 | 0, 2 + r() * 6 | 0, 2 + r() * 3 | 0);
    }),
  };
  S.vader = {
    walk0: bake(g => drawVader(g, { phase: 1 })),
    walk1: bake(g => drawVader(g, { phase: 2 })),
    stand: bake(g => drawVader(g, {})),
    attack: bake(g => drawVader(g, { attack: true })),
    pain: bake(g => { drawVader(g, {}); tint(g, 'rgba(255,40,40,0.35)'); }),
    die0: bake(g => { g.translate(0, 18); drawVader(g, {}); }),
    die1: bake(g => drawDeadVader(g)),
  };
  S.vader.shoot = S.vader.attack;

  // pickups
  S.bacta = bake(g => {
    R(g, '#777', 25, 30, 14, 5); R(g, '#9ad9ff', 24, 35, 16, 23);
    R(g, '#5fb8f0', 24, 46, 16, 12); R(g, '#e6f7ff', 26, 37, 3, 19);
    R(g, '#555', 24, 58, 16, 5); R(g, '#e33', 30, 39, 4, 10); R(g, '#e33', 27, 42, 10, 4);
  });
  S.bactaTank = bake(g => {
    R(g, '#666', 16, 6, 32, 7); R(g, '#555', 16, 55, 32, 8);
    R(g, '#8fd3ff', 18, 13, 28, 42); R(g, '#4aa7e8', 18, 25, 28, 30);
    R(g, '#e6f7ff', 21, 15, 4, 38);
    circle(g, '#d6f2ff', 34, 44, 2); circle(g, '#d6f2ff', 38, 34, 1.5); circle(g, '#d6f2ff', 31, 29, 1.2);
    R(g, '#e33', 30, 58, 4, 3);
  });
  S.cell = bake(g => {
    R(g, '#333', 24, 32, 5, 4); R(g, '#333', 35, 32, 5, 4);
    R(g, '#e3a21a', 18, 36, 28, 26); R(g, '#ffd35a', 18, 36, 28, 3);
    R(g, '#1a1a1a', 18, 45, 28, 3); R(g, '#1a1a1a', 18, 53, 28, 3);
    R(g, '#8a5d08', 44, 36, 2, 26);
  });
  S.shield = bake(g => {
    circle(g, '#1a4fe0', 32, 42, 17); circle(g, '#3f88ff', 32, 42, 13);
    circle(g, '#9cc6ff', 32, 42, 8); circle(g, '#ffffff', 29, 39, 3);
  });
  function card(color) {
    return bake(g => {
      R(g, '#111', 16, 38, 32, 22); R(g, color, 17, 39, 30, 20);
      R(g, '#e0c050', 21, 44, 7, 6); R(g, '#222', 17, 53, 30, 3);
      R(g, '#fff', 33, 43, 10, 2);
    });
  }
  S.keyRed = card('#e0262b');
  S.keyBlue = card('#2b7cff');
  S.detonator = bake(g => {
    circle(g, '#5e6268', 32, 48, 14); circle(g, '#a4a9b0', 32, 48, 12); circle(g, '#d8dce2', 28, 44, 4);
    R(g, '#444', 20, 46, 24, 3); R(g, '#f22', 29, 38, 6, 3); R(g, '#fd3', 36, 50, 3, 3);
  });
  S.rifle = bake(g => {
    R(g, '#151515', 6, 42, 46, 7); R(g, '#2a2a2a', 6, 42, 46, 1);
    for (let x = 10; x < 30; x += 4) R(g, '#333', x, 44, 2, 3);
    R(g, '#0a0a0a', 20, 35, 20, 5); R(g, '#555', 20, 36, 3, 3);
    R(g, '#151515', 32, 49, 6, 12); R(g, '#151515', 22, 49, 4, 7);
    R(g, '#222', 50, 40, 10, 2); R(g, '#222', 58, 40, 2, 10);
  });
  S.kyber = bake(g => {
    g.fillStyle = '#1fbf4a';
    g.beginPath(); g.moveTo(32, 26); g.lineTo(42, 44); g.lineTo(32, 62); g.lineTo(22, 44); g.fill();
    g.fillStyle = '#62ff8c';
    g.beginPath(); g.moveTo(32, 30); g.lineTo(38, 44); g.lineTo(32, 58); g.lineTo(26, 44); g.fill();
    R(g, '#e0ffe8', 30, 36, 3, 12);
  });
  // decorations
  S.crate = bake(g => {
    R(g, '#4d5158', 2, 4, 60, 60); bevel(g, 2, 4, 60, 60, '#7b8089', '#2a2d31');
    R(g, '#3d4046', 6, 8, 52, 52); bevel(g, 6, 8, 52, 52, '#2a2d31', '#6a6f78');
    R(g, '#c9a227', 10, 14, 18, 8); R(g, '#222', 12, 16, 14, 1); R(g, '#222', 12, 19, 10, 1);
    R(g, '#2a2d31', 6, 33, 52, 3);
    grain(g, 12, 13);
  });
  S.astromech = bake(g => {
    R(g, '#d8dbe0', 12, 26, 6, 34); R(g, '#d8dbe0', 46, 26, 6, 34);
    R(g, '#2753b8', 13, 32, 4, 12); R(g, '#2753b8', 47, 32, 4, 12);
    R(g, '#bfc3c9', 8, 58, 12, 5); R(g, '#bfc3c9', 44, 58, 12, 5);
    R(g, '#eef0f3', 20, 22, 24, 34); R(g, '#c6c9cf', 38, 22, 6, 34);
    R(g, '#2753b8', 24, 28, 16, 4); R(g, '#2753b8', 24, 36, 6, 10); R(g, '#2753b8', 33, 36, 7, 4);
    R(g, '#8a8f97', 24, 50, 16, 3);
    g.fillStyle = '#c3c8d0'; g.beginPath(); g.arc(32, 22, 12, Math.PI, 0); g.fill();
    R(g, '#2753b8', 24, 14, 5, 5); R(g, '#2753b8', 34, 12, 6, 4);
    circle(g, '#111', 31, 17, 3); circle(g, '#444', 31, 17, 1.5); R(g, '#e22', 38, 18, 2, 2);
  });

  // effects
  function bolt(outer, inner) {
    return bake(g => { circle(g, outer, 32, 32, 9); circle(g, inner, 32, 32, 6); circle(g, '#fff', 32, 32, 3); });
  }
  S.boltRed = bolt('#ff2a1a', '#ff9d8a');
  S.boltGreen = bolt('#1fe050', '#aaffc0');
  S.explosion = [0, 1, 2, 3, 4].map(i => bake(g => {
    const r = mulberry(20 + i);
    const rad = [10, 18, 24, 27, 28][i];
    const cols = [['#fff', '#ffe98a', '#ffb030'], ['#ffe98a', '#ffb030', '#ff6010'], ['#ffb030', '#ff6010', '#b02808'], ['#ff6010', '#8a2a10', '#4a3a30'], ['#6a4a38', '#3a3430', '#2a2624']][i];
    for (let k = 0; k < 3; k++) {
      for (let j = 0; j < 7; j++) {
        const a = r() * Math.PI * 2, d = r() * rad * 0.5;
        circle(g, cols[k], 32 + Math.cos(a) * d, 34 + Math.sin(a) * d, rad * (0.55 - k * 0.15));
      }
    }
  }));
  S.spark = [0, 1].map(i => bake(g => {
    const r = mulberry(40 + i);
    for (let j = 0; j < 9; j++) R(g, j % 2 ? '#fff6a0' : '#ffb030', 22 + r() * 20 | 0, 22 + r() * 20 | 0, 3, 3);
  }));
  S.saberThrow = [0, 1].map(i => bake(g => {
    g.translate(32, 32); g.rotate(i * Math.PI / 2 + Math.PI / 4); g.lineCap = 'round';
    g.strokeStyle = '#ff1a1a'; g.lineWidth = 5; g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.stroke();
    g.strokeStyle = '#ffe0e0'; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.stroke();
    R(g, '#bbb', -4, -3, 8, 6);
  }));
  return S;
}
