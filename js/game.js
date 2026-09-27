'use strict';
(() => {
  // ------------------------------------------------------------ constants
  const W = 480, H = 270, HALF = H / 2;
  const PLANE = 0.66, FOCAL = (W / 2) / PLANE;
  const WALLS = { '#': 'grey', '=': 'dark', '%': 'detention', 'C': 'console', 'W': 'window', '@': 'reactor', 'X': 'exit', 'D': 'door', 'R': 'doorRed', 'B': 'doorBlue' };
  const DOOR_CHARS = 'DRB';

  const WEAPONS = [
    { id: 'saber', name: 'Lightsaber', key: '1' },
    { id: 'blaster', name: 'DL-44 Blaster', key: '2' },
    { id: 'rifle', name: 'E-11 Blaster Rifle', key: '3' },
    { id: 'det', name: 'Thermal Detonator', key: '4' },
  ];

  const ETYPES = {
    trooper: { sprites: 'trooper', hp: 30, speed: 1.5, radius: 0.3, scale: 0.9, dmg: 7, cd: [1.1, 2.2], spread: 0.1, sight: 18, range: 14, pref: 5, drop: 0.35, bolt: 11 },
    heavy: { sprites: 'deathtrooper', hp: 80, speed: 1.8, radius: 0.32, scale: 0.95, dmg: 9, cd: [0.45, 1.0], spread: 0.08, sight: 20, range: 16, pref: 4, drop: 0.7, bolt: 13 },
    probe: { sprites: 'probe', hp: 25, speed: 1.3, radius: 0.3, scale: 0.6, z: 0.38, dmg: 6, cd: [1.3, 2.4], spread: 0.12, sight: 16, range: 12, pref: 4, drop: 0.25, bolt: 10, fly: true },
    vader: { sprites: 'vader', hp: 700, speed: 1.35, radius: 0.35, scale: 1.0, dmg: 22, cd: [3, 5], spread: 0, sight: 24, range: 12, pref: 1.1, drop: 0, bolt: 9, boss: true },
  };
  const ENEMY_CHARS = { t: 'trooper', T: 'heavy', o: 'probe', V: 'vader' };

  const ITEMS = {
    '+': { spr: 'bacta', scale: 0.45, name: 'Bacta vial', apply: p => heal(p, 15, 100) },
    'h': { spr: 'bactaTank', scale: 0.6, name: 'Bacta tank', apply: p => heal(p, 40, 100) },
    'a': { spr: 'cell', scale: 0.42, name: 'Power cells', apply: p => { if (p.cells >= 200) return false; p.cells = Math.min(200, p.cells + 25); return true; } },
    's': { spr: 'shield', scale: 0.45, bright: true, name: 'Deflector shield', apply: p => { if (p.shield >= 100) return false; p.shield = Math.min(100, p.shield + 50); return true; } },
    'r': { spr: 'keyRed', scale: 0.42, name: 'Red keycard', apply: p => { p.keys.red = true; return true; }, big: true },
    'b': { spr: 'keyBlue', scale: 0.42, name: 'Blue keycard', apply: p => { p.keys.blue = true; return true; }, big: true },
    'g': { spr: 'detonator', scale: 0.4, name: 'Thermal detonators', apply: p => { if (p.dets >= 12 && p.weapons.det) return false; const first = !p.weapons.det; p.weapons.det = true; p.dets = Math.min(12, p.dets + 3); if (first) quip("Let's rock."); return true; }, big: true },
    'e': { spr: 'rifle', scale: 0.55, name: 'E-11 blaster rifle', apply: p => { const first = !p.weapons.rifle; p.weapons.rifle = true; p.cells = Math.min(200, p.cells + 30); if (first) { selectWeapon(2); quip('Groovy.'); } return true; }, big: true },
    'k': { spr: 'kyber', scale: 0.4, bright: true, name: 'Kyber crystal (+Force)', apply: p => { if (p.force >= 100) return false; p.force = 100; return true; }, big: true },
  };
  const DECOR = { c: { spr: 'crate', scale: 0.8 }, y: { spr: 'astromech', scale: 0.62 } };

  const KILL_QUIPS = [
    'Shake it, bucket-head!', "Damn, I'm good.", 'Who is scruffy-looking now?', 'Come get some!',
    "I've got a bad feeling about you. Oh wait, you're dead.", 'These are not the droids you are looking for. They are scrap.',
    'Blast it!', 'Hail to the Jedi, baby!', 'Aim for the head? You guys can not aim at all.', 'Rest in pieces.',
    'Another one bites the space dust.', "That's what I call a hyperspace jump.",
  ];

  // ------------------------------------------------------------ DOM
  const $ = id => document.getElementById(id);
  const canvas = $('view'), ctx = canvas.getContext('2d');
  const frame = ctx.createImageData(W, H);
  const buf = new Uint32Array(frame.data.buffer);
  const zbuf = new Float32Array(W);
  const mini = $('minimap'), mctx = mini.getContext('2d');

  const T = makeTextures();
  const S = makeSprites();

  // ------------------------------------------------------------ state
  let mode = 'title';
  let levelIndex = 0, level = null;
  let grid, mapW, mapH, wallTex;
  let doors, enemies, items, decors, projectiles, effects;
  let player, snapshot = null;
  let stats, bossDead = false, boss = null;
  let showMap = false, quipCd = 0, time = 0;
  let shake = 0, hurtFlash = 0, pickupFlash = 0, forceFlash = 0;
  const keys = {};
  let mouseDown = false;

  function newPlayer() {
    return {
      x: 2, y: 2, a: 0, hp: 100, shield: 0, cells: 40, dets: 0, force: 100,
      weapons: { saber: true, blaster: true, rifle: false, det: false },
      weapon: 1, keys: { red: false, blue: false },
      fireCd: 0, swingT: 0, muzzleT: 0, switchT: 0, bob: 0, moveAmt: 0, turnRate: 0,
      dead: false, deadT: 0, lowQuip: false,
    };
  }

  function persistent(p) {
    return { hp: p.hp, shield: p.shield, cells: p.cells, dets: p.dets, force: p.force, weapons: { ...p.weapons }, weapon: p.weapon };
  }

  function heal(p, n, max) { if (p.hp >= max) return false; p.hp = Math.min(max, p.hp + n); return true; }
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

  // ------------------------------------------------------------ level
  function loadLevel(i) {
    levelIndex = i;
    level = LEVELS[i];
    const carry = snapshot;
    player = newPlayer();
    if (carry) Object.assign(player, JSON.parse(JSON.stringify(carry)));
    player.keys = { red: false, blue: false };
    snapshot = persistent(player);

    grid = level.map.map(r => r.split(''));
    mapH = grid.length; mapW = grid[0].length;
    doors = new Map(); enemies = []; items = []; decors = []; projectiles = []; effects = [];
    bossDead = !level.boss; boss = null;
    for (let y = 0; y < mapH; y++) for (let x = 0; x < mapW; x++) {
      const c = grid[y][x];
      if (c === 'P') { player.x = x + 0.5; player.y = y + 0.5; player.a = level.startAngle || 0; grid[y][x] = '.'; }
      else if (ENEMY_CHARS[c]) { spawnEnemy(ENEMY_CHARS[c], x + 0.5, y + 0.5); grid[y][x] = '.'; }
      else if (ITEMS[c]) { items.push({ x: x + 0.5, y: y + 0.5, kind: c }); grid[y][x] = '.'; }
      else if (DECOR[c]) { decors.push({ x: x + 0.5, y: y + 0.5, ...DECOR[c] }); grid[y][x] = '.'; }
    }
    wallTex = grid.map(row => row.map(c => c === 'X' ? T[level.exitTex] : WALLS[c] ? T[WALLS[c]] : null));
    for (let y = 0; y < mapH; y++) for (let x = 0; x < mapW; x++) {
      const c = grid[y][x];
      if (DOOR_CHARS.includes(c)) {
        doors.set(y * mapW + x, {
          x, y, open: 0, state: 'closed', timer: 0,
          lock: c === 'R' ? 'red' : c === 'B' ? 'blue' : null,
          horiz: isWallChar(x - 1, y) && isWallChar(x + 1, y),
        });
      }
    }
    stats = { kills: 0, total: enemies.length, time: 0, items: 0, totalItems: items.length };
    $('bossbar').style.display = 'none';
    showLevelTitle();
    quipCd = 0;
    setTimeout(() => { if (mode === 'play') quip(level.quip); }, 900);
  }

  function spawnEnemy(type, x, y) {
    const def = ETYPES[type];
    const e = {
      type, def, x, y, hp: def.hp, state: 'idle', cd: rand(0.5, 1.5), painT: 0, shootT: 0, stunT: 0,
      kvx: 0, kvy: 0, dead: false, deathT: 0, walkT: Math.random(), moving: false, sees: false, seeT: 0,
      lastX: x, lastY: y, strafe: 0, strafeT: 0, alerted: false, swing: 0, meleeCd: 0, throwCd: 3,
    };
    if (def.boss) boss = e;
    enemies.push(e);
    return e;
  }

  function isWallChar(x, y) {
    if (x < 0 || y < 0 || x >= mapW || y >= mapH) return true;
    return !!WALLS[grid[y][x]];
  }
  function doorAt(x, y) { return doors.get(y * mapW + x); }
  function cellBlocks(x, y) {
    if (x < 0 || y < 0 || x >= mapW || y >= mapH) return true;
    const c = grid[y][x];
    if (!WALLS[c]) return false;
    if (DOOR_CHARS.includes(c)) return doorAt(x, y).open < 0.85;
    return true;
  }
  function blockedAt(x, y, r, self) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) if (cellBlocks(xx, yy)) return { x: xx, y: yy };
    for (const d of decors) if (Math.abs(d.x - x) < r + 0.3 && Math.abs(d.y - y) < r + 0.3) return { deco: d };
    return null;
  }
  function tryMove(ent, nx, ny, r) {
    let hit = null;
    const bx = blockedAt(nx, ent.y, r);
    if (!bx) ent.x = nx; else hit = bx;
    const by = blockedAt(ent.x, ny, r);
    if (!by) ent.y = ny; else hit = hit || by;
    return hit;
  }
  function lineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, dist = Math.hypot(dx, dy);
    const n = Math.ceil(dist / 0.2);
    for (let i = 1; i < n; i++) {
      const x = Math.floor(x0 + dx * i / n), y = Math.floor(y0 + dy * i / n);
      if (x < 0 || y < 0 || x >= mapW || y >= mapH) return false;
      const c = grid[y][x];
      if (WALLS[c]) {
        if (DOOR_CHARS.includes(c)) { if (doorAt(x, y).open < 0.7) return false; }
        else return false;
      }
    }
    return true;
  }

  // ------------------------------------------------------------ doors / use
  function activateDoor(d, byPlayer) {
    if (d.lock && !player.keys[d.lock]) {
      if (byPlayer && !(d.deniedT > 0)) {
        message(`You need the ${d.lock} keycard.`);
        Sfx.denied();
        d.deniedT = 1.2;
        if (Math.random() < 0.4) quip("Locked. Figures. The Empire never leaves the key under the mat.");
      }
      return;
    }
    if (d.state === 'closed' || d.state === 'closing') { d.state = 'opening'; if (distTo(d.x + 0.5, d.y + 0.5) < 12) Sfx.door(); }
    else if (d.state === 'open') d.timer = 4;
  }
  function distTo(x, y) { return Math.hypot(x - player.x, y - player.y); }

  function use() {
    const dx = Math.cos(player.a), dy = Math.sin(player.a);
    for (let t = 0.1; t < 1.6; t += 0.05) {
      const cx = Math.floor(player.x + dx * t), cy = Math.floor(player.y + dy * t);
      if (!isWallChar(cx, cy)) continue;
      const c = grid[cy][cx];
      if (DOOR_CHARS.includes(c)) { const d = doorAt(cx, cy); if (d.open < 0.85) { activateDoor(d, true); return; } continue; }
      if (c === 'X') { hitExit(); return; }
      return;
    }
  }

  function hitExit() {
    if (!bossDead) {
      message('The reactor controls are locked while Vader lives!');
      Sfx.denied();
      return;
    }
    Sfx.explosion(1);
    shake = 0.6;
    if (levelIndex === LEVELS.length - 1) {
      quip('Hail to the Jedi, baby!', true);
      endLevel(true);
    } else {
      quip(['Nobody steals our gum and gets away with it.', 'Next!', "That's one small step for Luke..."][levelIndex % 3], true);
      endLevel(false);
    }
  }

  function updateDoors(dt) {
    for (const d of doors.values()) {
      if (d.deniedT > 0) d.deniedT -= dt;
      if (d.state === 'opening') { d.open += dt * 1.6; if (d.open >= 1) { d.open = 1; d.state = 'open'; d.timer = 4; } }
      else if (d.state === 'open') {
        d.timer -= dt;
        if (d.timer <= 0) {
          const occupied = (Math.floor(player.x) === d.x && Math.floor(player.y) === d.y) ||
            enemies.some(e => !e.dead && Math.floor(e.x) === d.x && Math.floor(e.y) === d.y) ||
            Math.hypot(player.x - d.x - 0.5, player.y - d.y - 0.5) < 0.9;
          if (occupied) d.timer = 1; else { d.state = 'closing'; if (distTo(d.x + 0.5, d.y + 0.5) < 12) Sfx.door(); }
        }
      } else if (d.state === 'closing') {
        const occupied = Math.hypot(player.x - d.x - 0.5, player.y - d.y - 0.5) < 0.9 ||
          enemies.some(e => !e.dead && Math.hypot(e.x - d.x - 0.5, e.y - d.y - 0.5) < 0.9);
        if (occupied) d.state = 'opening';
        else { d.open -= dt * 1.6; if (d.open <= 0) { d.open = 0; d.state = 'closed'; } }
      }
    }
  }

  // ------------------------------------------------------------ messages
  function message(text) {
    const box = $('messages');
    const el = document.createElement('div');
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add('fade'), 2500);
    setTimeout(() => el.remove(), 3200);
  }
  let quipTimer = null;
  function quip(text, force, voice) {
    if (!force && quipCd > 0) return;
    quipCd = 5;
    const el = $('quip');
    el.textContent = text;
    el.classList.remove('vader');
    if (voice === 'vader') el.classList.add('vader');
    el.style.opacity = 1;
    clearTimeout(quipTimer);
    quipTimer = setTimeout(() => { el.style.opacity = 0; }, 3500);
    if (voice === 'vader') Voice.say(text, { pitch: 0.1, rate: 0.75 });
    else Voice.say(text, { queue: voice === 'queue' });
  }
  function showLevelTitle() {
    const el = $('leveltitle');
    el.innerHTML = `<small>Mission ${levelIndex + 1} of ${LEVELS.length}</small>${level.name}`;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 3000);
  }

  // ------------------------------------------------------------ weapons
  function weaponAvailable(i) {
    const w = WEAPONS[i];
    return player.weapons[w.id];
  }
  function selectWeapon(i) {
    if (!weaponAvailable(i) || player.weapon === i) return;
    const wasSaber = WEAPONS[player.weapon].id === 'saber';
    player.weapon = i;
    player.switchT = 0.25;
    if (WEAPONS[i].id === 'saber') { Sfx.saberOn(); Sfx.humStart(); }
    else if (wasSaber) Sfx.humStop();
  }
  function cycleWeapon(dir) {
    for (let k = 1; k <= WEAPONS.length; k++) {
      const i = (player.weapon + dir * k + WEAPONS.length * 4) % WEAPONS.length;
      if (weaponAvailable(i)) { selectWeapon(i); return; }
    }
  }

  function alertNearby(radius) {
    for (const e of enemies) if (!e.dead && distTo(e.x, e.y) < radius) e.alerted = true;
  }

  function fire() {
    if (player.fireCd > 0 || player.switchT > 0.1) return;
    const w = WEAPONS[player.weapon];
    const dx = Math.cos(player.a), dy = Math.sin(player.a);
    if (w.id === 'saber') {
      player.fireCd = 0.42; player.swingT = 0.35;
      Sfx.saberSwing();
      let hit = false;
      for (const e of enemies) {
        if (e.dead) continue;
        const ex = e.x - player.x, ey = e.y - player.y, d = Math.hypot(ex, ey);
        if (d > 1.7) continue;
        if (Math.abs(angDiff(Math.atan2(ey, ex), player.a)) > 0.8) continue;
        damageEnemy(e, e.def.boss ? 40 : 55, ex / d, ey / d, 3);
        spawnEffect('spark', e.x - ex / d * 0.2, e.y - ey / d * 0.2, 0.45, 0.35);
        hit = true;
      }
      if (hit) { Sfx.saberHit(); shake = Math.max(shake, 0.12); }
      alertNearby(4);
      return;
    }
    if (w.id === 'blaster' || w.id === 'rifle') {
      if (player.cells <= 0) { Sfx.empty(); player.fireCd = 0.3; autoSwitch(); return; }
      player.cells--;
      const rifle = w.id === 'rifle';
      player.fireCd = rifle ? 0.11 : 0.32;
      player.muzzleT = 0.07;
      const a = player.a + (rifle ? rand(-0.035, 0.035) : 0);
      projectiles.push({
        x: player.x + dx * 0.3, y: player.y + dy * 0.3, z: 0.42, vx: Math.cos(a) * 24, vy: Math.sin(a) * 24,
        owner: 'player', dmg: rifle ? 12 : 20, spr: 'boltGreen', life: 2,
      });
      rifle ? Sfx.rifle() : Sfx.blaster();
      alertNearby(12);
      return;
    }
    if (w.id === 'det') {
      if (player.dets <= 0) { Sfx.empty(); player.fireCd = 0.3; autoSwitch(); return; }
      player.dets--;
      player.fireCd = 0.9; player.swingT = 0.35;
      projectiles.push({
        x: player.x + dx * 0.3, y: player.y + dy * 0.3, z: 0.4, vx: dx * 8, vy: dy * 8,
        owner: 'player', det: true, fuse: 1.6, spr: 'detonator', life: 10,
      });
      Sfx.saberSwing();
      if (player.dets === 0) setTimeout(autoSwitch, 900);
    }
  }
  function autoSwitch() {
    const w = WEAPONS[player.weapon].id;
    if (w === 'det' && player.dets > 0) return;
    if ((w === 'blaster' || w === 'rifle') && player.cells > 0) return;
    if (player.cells > 0 && player.weapons.rifle) selectWeapon(2);
    else if (player.cells > 0) selectWeapon(1);
    else selectWeapon(0);
  }

  function forcePush() {
    if (player.force < 35) { message('Not enough Force.'); Sfx.empty(); return; }
    player.force -= 35;
    forceFlash = 0.4; shake = 0.25;
    Sfx.force();
    let n = 0;
    for (const e of enemies) {
      if (e.dead) continue;
      const ex = e.x - player.x, ey = e.y - player.y, d = Math.hypot(ex, ey);
      if (d > 5.5 || Math.abs(angDiff(Math.atan2(ey, ex), player.a)) > 0.7) continue;
      if (!lineOfSight(player.x, player.y, e.x, e.y)) continue;
      const power = e.def.boss ? 2.5 : 9;
      e.kvx = ex / d * power; e.kvy = ey / d * power;
      e.stunT = e.def.boss ? 0.3 : 1.0;
      damageEnemy(e, e.def.boss ? 10 : 22, ex / d, ey / d, 0);
      n++;
    }
    for (const p of projectiles) {
      if (p.owner !== 'enemy') continue;
      const ex = p.x - player.x, ey = p.y - player.y, d = Math.hypot(ex, ey);
      if (d > 5.5 || Math.abs(angDiff(Math.atan2(ey, ex), player.a)) > 0.8) continue;
      p.vx = -p.vx; p.vy = -p.vy; p.owner = 'player'; p.dmg *= 2;
    }
    alertNearby(8);
    if (n >= 2) quip('Use the Force, Luke. Oh, I did.');
    else if (n === 1 && Math.random() < 0.3) quip('Push it. Push it real good.');
  }

  // ------------------------------------------------------------ combat
  function damageEnemy(e, dmg, nx, ny, knock) {
    if (e.dead) return;
    e.hp -= dmg;
    e.alerted = true;
    if (knock) { e.kvx += nx * knock; e.kvy += ny * knock; }
    if (e.hp <= 0) { killEnemy(e); return; }
    if (Math.random() < (e.def.boss ? 0.15 : 0.6)) e.painT = 0.2;
  }

  function killEnemy(e) {
    e.dead = true; e.deathT = 0;
    stats.kills++;
    const v = clamp(1 - distTo(e.x, e.y) / 20, 0.1, 1);
    if (e.type === 'probe') { Sfx.droidDie(v); spawnEffect('explosion', e.x, e.y, 0.9, 0.2); Sfx.explosion(v * 0.5); }
    else Sfx.death(v);
    if (Math.random() < e.def.drop) items.push({ x: e.x + rand(-0.1, 0.1), y: e.y + rand(-0.1, 0.1), kind: e.type === 'heavy' && Math.random() < 0.4 ? 'g' : 'a', dropped: true });
    if (e.def.boss) {
      bossDead = true;
      $('bossbar').style.display = 'none';
      spawnEffect('explosion', e.x, e.y, 1.3, 0.1);
      quip("Sorry, Dad. You should've gone to therapy. Now, where's that reactor?", true);
      return;
    }
    if (Math.random() < 0.35) quip(KILL_QUIPS[Math.random() * KILL_QUIPS.length | 0]);
  }

  function damagePlayer(dmg, fromX, fromY) {
    if (player.dead) return;
    const absorb = Math.min(player.shield, dmg * 0.66);
    player.shield -= absorb;
    player.hp -= dmg - absorb;
    hurtFlash = Math.min(0.7, hurtFlash + 0.35);
    shake = Math.max(shake, 0.15);
    Sfx.hurt();
    if (player.hp <= 0) {
      player.hp = 0; player.dead = true; player.deadT = 0;
      Sfx.humStop(); Sfx.playerDie();
      quip('Nooooooooo!', true);
    } else if (player.hp < 25 && !player.lowQuip) {
      player.lowQuip = true;
      quip("I need a bacta tank. And a nap.", true);
    }
  }

  function explode(x, y) {
    spawnEffect('explosion', x, y, 1.4, 0.1);
    const v = clamp(1 - distTo(x, y) / 25, 0.15, 1);
    Sfx.explosion(v);
    shake = Math.max(shake, 0.5 * v);
    const R = 2.8;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < R && lineOfSight(x, y, e.x, e.y)) {
        const k = 1 - d / R;
        damageEnemy(e, 100 * k + 15, (e.x - x) / (d || 1), (e.y - y) / (d || 1), 6 * k);
      }
    }
    const pd = distTo(x, y);
    if (pd < R && lineOfSight(x, y, player.x, player.y)) damagePlayer(45 * (1 - pd / R), x, y);
    alertNearby(14);
  }

  function spawnEffect(kind, x, y, scale, z = 0.1) {
    effects.push({ kind, x, y, z, scale, t: 0, dur: kind === 'explosion' ? 0.6 : 0.2 });
  }

  // ------------------------------------------------------------ update
  function update(dt) {
    time += dt;
    stats.time += dt;
    quipCd -= dt;
    shake = Math.max(0, shake - dt);
    hurtFlash = Math.max(0, hurtFlash - dt * 1.2);
    pickupFlash = Math.max(0, pickupFlash - dt * 2);
    forceFlash = Math.max(0, forceFlash - dt);

    updatePlayer(dt);
    updateDoors(dt);
    for (const e of enemies) updateEnemy(e, dt);
    updateProjectiles(dt);
    for (const f of effects) f.t += dt;
    effects = effects.filter(f => f.t < f.dur);

    if (player.dead) {
      player.deadT += dt;
      if (player.deadT > 1.8 && mode === 'play') setMode('dead');
    }
  }

  function updatePlayer(dt) {
    const p = player;
    p.fireCd -= dt; p.swingT = Math.max(0, p.swingT - dt); p.muzzleT = Math.max(0, p.muzzleT - dt);
    p.switchT = Math.max(0, p.switchT - dt);
    p.force = Math.min(100, p.force + dt * 4);
    if (p.dead) return;

    let turn = 0;
    if (keys.ArrowLeft) turn -= 1;
    if (keys.ArrowRight) turn += 1;
    p.a += turn * 2.6 * dt;
    p.turnRate = p.turnRate * 0.8 + Math.abs(turn * 2.6 + mouseTurn / Math.max(dt, 0.001)) * 0.2;
    mouseTurn = 0;

    let fwd = 0, str = 0;
    if (keys.KeyW || keys.ArrowUp) fwd += 1;
    if (keys.KeyS || keys.ArrowDown) fwd -= 1;
    if (keys.KeyD) str += 1;
    if (keys.KeyA) str -= 1;
    const run = keys.ShiftLeft || keys.ShiftRight;
    const speed = run ? 5.2 : 3.3;
    const dx = Math.cos(p.a), dy = Math.sin(p.a);
    let mx = dx * fwd - dy * str, my = dy * fwd + dx * str;
    const ml = Math.hypot(mx, my);
    if (ml > 0) {
      mx /= ml; my /= ml;
      const hit = tryMove(p, p.x + mx * speed * dt, p.y + my * speed * dt, 0.25);
      if (hit && hit.x !== undefined) {
        const d = doorAt(hit.x, hit.y);
        if (d) activateDoor(d, true);
      }
      p.bob += dt * (run ? 13 : 9);
    }
    p.moveAmt += ((ml > 0 ? 1 : 0) - p.moveAmt) * Math.min(1, dt * 8);

    if (mouseDown || keys.ControlLeft) fire();

    // pickups
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (Math.abs(it.x - p.x) > 0.55 || Math.abs(it.y - p.y) > 0.55) continue;
      const def = ITEMS[it.kind];
      if (def.apply(p)) {
        items.splice(i, 1);
        if (!it.dropped) stats.items++;
        message(`Picked up ${def.name}`);
        pickupFlash = 0.35;
        def.big ? Sfx.powerup() : Sfx.pickup();
      }
    }

    if (WEAPONS[p.weapon].id === 'saber') Sfx.humSet(clamp(p.turnRate / 12 + (p.swingT > 0 ? 0.8 : 0), 0, 1));
  }
  let mouseTurn = 0;

  function updateEnemy(e, dt) {
    if (e.dead) { e.deathT += dt; return; }
    const def = e.def;
    e.cd -= dt; e.painT -= dt; e.shootT -= dt; e.meleeCd -= dt; e.throwCd -= dt;
    if (e.kvx || e.kvy) {
      const hit = tryMove(e, e.x + e.kvx * dt, e.y + e.kvy * dt, def.radius);
      if (hit && Math.hypot(e.kvx, e.kvy) > 5) damageEnemy(e, 10, 0, 0, 0);
      if (hit) { e.kvx *= -0.3; e.kvy *= -0.3; }
      const decay = Math.pow(0.02, dt);
      e.kvx *= decay; e.kvy *= decay;
      if (Math.abs(e.kvx) + Math.abs(e.kvy) < 0.05) e.kvx = e.kvy = 0;
      if (e.dead) return;
    }
    const dx = player.x - e.x, dy = player.y - e.y, dist = Math.hypot(dx, dy) || 0.001;
    e.seeT -= dt;
    if (e.seeT <= 0) {
      e.seeT = 0.15 + Math.random() * 0.1;
      e.sees = !player.dead && dist < def.sight && lineOfSight(e.x, e.y, player.x, player.y);
      if (e.sees) { e.lastX = player.x; e.lastY = player.y; }
    }
    if (e.state === 'idle') {
      if (e.sees || e.alerted) {
        e.state = 'chase';
        e.cd = rand(0.4, 1.2);
        if (e.sees) Sfx.alert(clamp(1 - dist / 20, 0.1, 1));
        if (def.boss && !e.greeted) bossIntro(e);
      } else return;
    }
    if (e.stunT > 0) { e.stunT -= dt; e.moving = false; return; }
    if (e.painT > 0) { e.moving = false; return; }
    if (player.dead) { e.moving = false; return; }

    if (def.boss) { updateBoss(e, dt, dx, dy, dist); return; }

    if (e.sees && e.cd <= 0 && dist < def.range) {
      enemyShoot(e, dx, dy, dist);
      e.cd = rand(def.cd[0], def.cd[1]);
      e.shootT = 0.25;
    }
    if (e.shootT > 0) { e.moving = false; return; }

    let mx = 0, my = 0;
    if (e.sees) {
      if (dist > def.pref) { mx = dx / dist; my = dy / dist; }
      else if (dist < 2) { mx = -dx / dist * 0.6; my = -dy / dist * 0.6; }
      e.strafeT -= dt;
      if (e.strafeT <= 0) { e.strafe = [-1, 0, 1][Math.random() * 3 | 0]; e.strafeT = rand(0.6, 1.6); }
      mx += -dy / dist * e.strafe * 0.7; my += dx / dist * e.strafe * 0.7;
    } else {
      const lx = e.lastX - e.x, ly = e.lastY - e.y, ld = Math.hypot(lx, ly);
      if (ld > 0.3) { mx = lx / ld; my = ly / ld; }
      else if (e.alerted) { e.lastX = player.x; e.lastY = player.y; }
    }
    moveEnemy(e, mx, my, def.speed, dt);
  }

  function moveEnemy(e, mx, my, speed, dt) {
    for (const o of enemies) {
      if (o === e || o.dead) continue;
      const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy);
      if (od < 0.6 && od > 0.001) { mx += ox / od * 0.8; my += oy / od * 0.8; }
    }
    const ml = Math.hypot(mx, my);
    e.moving = ml > 0.05;
    if (!e.moving) return;
    mx /= ml; my /= ml;
    const ox = e.x, oy = e.y;
    const hit = tryMove(e, e.x + mx * speed * dt, e.y + my * speed * dt, e.def.radius);
    if (hit && hit.x !== undefined) { const d = doorAt(hit.x, hit.y); if (d && !d.lock) activateDoor(d, false); }
    if (Math.hypot(e.x - ox, e.y - oy) < speed * dt * 0.2) { e.strafe = -e.strafe || 1; e.strafeT = 0.5; }
    e.walkT += dt;
  }

  function enemyShoot(e, dx, dy, dist) {
    const def = e.def;
    const a = Math.atan2(dy, dx) + rand(-def.spread, def.spread) * (1 + player.moveAmt * 0.6);
    projectiles.push({
      x: e.x + Math.cos(a) * 0.35, y: e.y + Math.sin(a) * 0.35, z: def.fly ? 0.55 : 0.45,
      vx: Math.cos(a) * def.bolt, vy: Math.sin(a) * def.bolt, owner: 'enemy', dmg: def.dmg, spr: 'boltRed', life: 3, src: e,
    });
    Sfx.enemyShot(clamp(1 - dist / 22, 0.1, 1));
  }

  function bossIntro(e) {
    e.greeted = true;
    $('bossbar').style.display = 'block';
    quip('Luke. I am your father.', true, 'vader');
    setTimeout(() => { if (!e.dead && mode === 'play') quip("Yeah? Well I'm your worst nightmare, Dad. Come get some!", true, 'queue'); }, 2800);
  }

  function updateBoss(e, dt, dx, dy, dist) {
    const def = e.def;
    if (e.swing > 0) {
      e.swing -= dt;
      e.moving = false;
      if (e.swing <= 0) {
        e.meleeCd = 1.1;
        if (dist < 1.9) { damagePlayer(def.dmg, e.x, e.y); Sfx.saberHit(); }
        else Sfx.saberSwing();
      }
      return;
    }
    if (dist < 1.5 && e.meleeCd <= 0) { e.swing = 0.45; Sfx.saberSwing(); return; }
    if (e.sees && dist > 3 && dist < def.range && e.throwCd <= 0) {
      e.throwCd = rand(def.cd[0], def.cd[1]);
      e.shootT = 0.4;
      const a = Math.atan2(dy, dx);
      projectiles.push({ x: e.x + Math.cos(a) * 0.4, y: e.y + Math.sin(a) * 0.4, z: 0.4, vx: Math.cos(a) * def.bolt, vy: Math.sin(a) * def.bolt, owner: 'enemy', dmg: 18, spr: 'saberThrow', life: 3, saber: true, src: e, scale: 0.7 });
      Sfx.saberSwing();
      if (Math.random() < 0.3) quip(['Your lack of gum disturbs me.', 'The Force is weak with this one.', 'Join me, and we can rule the gum supply together.'][Math.random() * 3 | 0], true, 'vader');
    }
    if (e.shootT > 0) { e.moving = false; return; }
    let mx = 0, my = 0;
    const tx = e.sees ? dx : e.lastX - e.x, ty = e.sees ? dy : e.lastY - e.y, td = Math.hypot(tx, ty);
    if (td > def.pref) { mx = tx / td; my = ty / td; }
    moveEnemy(e, mx, my, def.speed * (e.hp < def.hp / 2 ? 1.35 : 1), dt);
  }

  function updateProjectiles(dt) {
    for (const p of projectiles) {
      p.life -= dt;
      if (p.det) {
        p.fuse -= dt;
        if (p.fuse <= 0) { explode(p.x, p.y); p.dead = true; continue; }
      }
      const sp = Math.hypot(p.vx, p.vy);
      const steps = Math.max(1, Math.ceil(sp * dt / 0.12));
      const sdt = dt / steps;
      for (let s = 0; s < steps && !p.dead; s++) {
        const nx = p.x + p.vx * sdt, ny = p.y + p.vy * sdt;
        if (cellBlocks(Math.floor(nx), Math.floor(ny))) {
          if (p.det) {
            if (cellBlocks(Math.floor(nx), Math.floor(p.y))) p.vx = -p.vx * 0.6;
            if (cellBlocks(Math.floor(p.x), Math.floor(ny))) p.vy = -p.vy * 0.6;
            continue;
          }
          spawnEffect('spark', p.x, p.y, 0.3, p.z - 0.15);
          p.dead = true; break;
        }
        p.x = nx; p.y = ny;
        if (p.det) {
          for (const e of enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < e.def.radius + 0.15) { explode(p.x, p.y); p.dead = true; break; }
          continue;
        }
        if (p.owner === 'player') {
          for (const e of enemies) {
            if (e.dead || Math.hypot(e.x - p.x, e.y - p.y) > e.def.radius + 0.1) continue;
            if (e.def.boss && Math.random() < 0.55) {
              // Vader bats the bolt right back
              const a = Math.atan2(player.y - p.y, player.x - p.x) + rand(-0.08, 0.08);
              p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.owner = 'enemy'; p.dmg = 8; p.spr = 'boltRed';
              Sfx.deflect();
              break;
            }
            damageEnemy(e, p.dmg, p.vx / sp, p.vy / sp, 0.8);
            spawnEffect('spark', p.x, p.y, 0.3, p.z - 0.15);
            p.dead = true; break;
          }
        } else {
          const d = Math.hypot(player.x - p.x, player.y - p.y);
          if (d < 0.65 && !p.checked && WEAPONS[player.weapon].id === 'saber' && !player.dead && !p.saber) {
            p.checked = true;
            const facing = Math.abs(angDiff(Math.atan2(p.y - player.y, p.x - player.x), player.a)) < 1.0;
            if (facing && (player.swingT > 0 || Math.random() < 0.5)) {
              const tgt = p.src && !p.src.dead ? p.src : null;
              const a = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) + rand(-0.05, 0.05) : player.a + rand(-0.3, 0.3);
              p.vx = Math.cos(a) * sp * 1.3; p.vy = Math.sin(a) * sp * 1.3;
              p.owner = 'player'; p.dmg *= 3; p.spr = 'boltGreen';
              Sfx.deflect();
              Sfx.humSet(1);
              if (Math.random() < 0.15) quip('Return to sender, bucket-head!');
              break;
            }
          }
          if (d < 0.32) {
            damagePlayer(p.dmg, p.x - p.vx, p.y - p.vy);
            p.dead = true; break;
          }
        }
      }
      if (p.life <= 0) p.dead = true;
    }
    projectiles = projectiles.filter(p => !p.dead);
  }

  // ------------------------------------------------------------ rendering
  function shadeFor(d) { return clamp((1.3 - d * 0.08) * 256, 46, 256) | 0; }
  function sh(c, s) {
    return 0xff000000 | (((c >>> 16 & 255) * s >> 8) << 16) | (((c >>> 8 & 255) * s >> 8) << 8) | ((c & 255) * s >> 8);
  }

  function render() {
    const p = player;
    const dirX = Math.cos(p.a), dirY = Math.sin(p.a);
    const plX = -dirY * PLANE, plY = dirX * PLANE;
    const camZ = p.dead ? Math.max(0.12, 0.5 - p.deadT * 0.3) : 0.5 + Math.sin(p.bob * 2) * 0.012 * p.moveAmt;
    const light = p.muzzleT > 0 ? 40 : 0;

    // floor & ceiling
    const ft = T[level.floor].data, ct = T[level.ceil].data;
    const rx0 = dirX - plX, ry0 = dirY - plY, rx1 = dirX + plX, ry1 = dirY + plY;
    for (let y = HALF; y < H; y++) {
      const rd = camZ * FOCAL / (y - HALF + 0.5);
      const sx = rd * (rx1 - rx0) / W, sy = rd * (ry1 - ry0) / W;
      let fx = p.x + rd * rx0, fy = p.y + rd * ry0;
      const s = Math.min(256, shadeFor(rd) + light);
      let o = y * W;
      for (let x = 0; x < W; x++) {
        buf[o++] = sh(ft[((fy * 64) & 63) * 64 + ((fx * 64) & 63)], s);
        fx += sx; fy += sy;
      }
    }
    for (let y = 0; y < HALF; y++) {
      const rd = (1 - camZ) * FOCAL / (HALF - y - 0.5);
      const sx = rd * (rx1 - rx0) / W, sy = rd * (ry1 - ry0) / W;
      let fx = p.x + rd * rx0, fy = p.y + rd * ry0;
      const s = Math.min(256, shadeFor(rd) + light);
      let o = y * W;
      for (let x = 0; x < W; x++) {
        buf[o++] = sh(ct[((fy * 64) & 63) * 64 + ((fx * 64) & 63)], s);
        fx += sx; fy += sy;
      }
    }

    // walls
    for (let x = 0; x < W; x++) {
      const cam = 2 * x / W - 1;
      const rdx = dirX + plX * cam, rdy = dirY + plY * cam;
      let mx = Math.floor(p.x), my = Math.floor(p.y);
      const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
      const stepX = rdx < 0 ? -1 : 1, stepY = rdy < 0 ? -1 : 1;
      let sdx = rdx < 0 ? (p.x - mx) * ddx : (mx + 1 - p.x) * ddx;
      let sdy = rdy < 0 ? (p.y - my) * ddy : (my + 1 - p.y) * ddy;
      let side = 0, perp = 30, tex = null, u = 0;
      for (let i = 0; i < 80; i++) {
        if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
        if (mx < 0 || my < 0 || mx >= mapW || my >= mapH) break;
        const t = wallTex[my][mx];
        if (!t) continue;
        const c = grid[my][mx];
        if (DOOR_CHARS.includes(c)) {
          const d = doorAt(mx, my);
          if (d.horiz) {
            if (Math.abs(rdy) < 1e-6) continue;
            const tt = (my + 0.5 - p.y) / rdy;
            if (tt <= 0) continue;
            const hx = p.x + tt * rdx;
            if (Math.floor(hx) !== mx) continue;
            const f = hx - mx;
            if (f < d.open) continue;
            perp = tt; tex = t; u = f - d.open; side = 1;
          } else {
            if (Math.abs(rdx) < 1e-6) continue;
            const tt = (mx + 0.5 - p.x) / rdx;
            if (tt <= 0) continue;
            const hy = p.y + tt * rdy;
            if (Math.floor(hy) !== my) continue;
            const f = hy - my;
            if (f < d.open) continue;
            perp = tt; tex = t; u = f - d.open; side = 0;
          }
          break;
        }
        perp = side === 0 ? sdx - ddx : sdy - ddy;
        let wx = side === 0 ? p.y + perp * rdy : p.x + perp * rdx;
        wx -= Math.floor(wx);
        if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) wx = 1 - wx;
        u = wx; tex = t;
        break;
      }
      zbuf[x] = perp;
      if (!tex) continue;
      const lh = FOCAL / perp;
      const top = HALF - (1 - camZ) * lh, bot = HALF + camZ * lh;
      const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H, Math.ceil(bot));
      const tx = Math.min(63, (u * 64) | 0);
      const step = 64 / (bot - top);
      let tp = (y0 - top) * step;
      let s = shadeFor(perp);
      if (side === 1) s = s * 0.8 | 0;
      s = Math.min(256, s + light);
      const td = tex.data;
      let o = y0 * W + x;
      for (let y = y0; y < y1; y++) {
        buf[o] = sh(td[((tp | 0) & 63) * 64 + tx], s);
        tp += step; o += W;
      }
    }

    // sprites
    const list = [];
    const add = (x, y, z, scale, spr, bright) => {
      const dx = x - p.x, dy = y - p.y;
      const depth = dx * dirX + dy * dirY;
      if (depth < 0.15) return;
      list.push({ depth, lat: (dx * plX + dy * plY) / PLANE, z, scale, spr, bright });
    };
    for (const d of decors) add(d.x, d.y, 0, d.scale, S[d.spr], false);
    for (const it of items) {
      const def = ITEMS[it.kind];
      const hover = def.big || def.bright ? 0.04 + Math.sin(time * 3 + it.x) * 0.03 : 0;
      add(it.x, it.y, hover, def.scale, S[def.spr], def.bright);
    }
    for (const e of enemies) {
      const set = S[e.def.sprites];
      let spr;
      if (e.dead) spr = e.deathT < 0.18 ? set.die0 : set.die1;
      else if (e.swing > 0) spr = set.attack;
      else if (e.painT > 0) spr = set.pain;
      else if (e.shootT > 0) spr = set.shoot;
      else if (e.moving) spr = (e.walkT * 5 | 0) % 2 ? set.walk0 : set.walk1;
      else spr = set.stand;
      const z = e.def.fly && !e.dead ? e.def.z + Math.sin(time * 2 + e.x) * 0.04 : 0;
      add(e.x, e.y, z, e.def.scale, spr, false);
    }
    for (const pr of projectiles) {
      const sc = pr.scale || (pr.det ? 0.25 : 0.22);
      const spr = pr.spr === 'saberThrow' ? S.saberThrow[(time * 12 | 0) % 2] : S[pr.spr];
      add(pr.x, pr.y, pr.det ? Math.max(0, pr.z - 0.2) : pr.z - sc / 2, sc, spr, !pr.det);
    }
    for (const f of effects) {
      const frames = S[f.kind];
      const spr = frames[Math.min(frames.length - 1, (f.t / f.dur * frames.length) | 0)];
      add(f.x, f.y, f.z, f.scale, spr, true);
    }
    list.sort((a, b) => b.depth - a.depth);
    for (const s of list) drawSprite(s, camZ, light);

    ctx.putImageData(frame, 0, 0);
    drawWeapon();
    if (showMap) drawMinimap();
  }

  function drawSprite(s, camZ, light) {
    const size = FOCAL * s.scale / s.depth;
    if (size < 1) return;
    const cx = W / 2 + FOCAL * s.lat / s.depth;
    const bottom = HALF + (camZ - s.z) * FOCAL / s.depth;
    const top = bottom - size, left = cx - size / 2;
    const x0 = Math.max(0, Math.ceil(left)), x1 = Math.min(W, Math.ceil(left + size));
    const y0 = Math.max(0, Math.ceil(top)), y1 = Math.min(H, Math.ceil(bottom));
    if (x0 >= x1 || y0 >= y1) return;
    const shade = s.bright ? 256 : Math.min(256, shadeFor(s.depth) + light);
    const data = s.spr.data, k = 64 / size;
    for (let x = x0; x < x1; x++) {
      if (s.depth >= zbuf[x]) continue;
      const tx = Math.min(63, ((x - left) * k) | 0);
      let o = y0 * W + x;
      for (let y = y0; y < y1; y++, o += W) {
        const c = data[Math.min(63, ((y - top) * k) | 0) * 64 + tx];
        if ((c >>> 24) < 128) continue;
        buf[o] = shade === 256 ? c : sh(c, shade);
      }
    }
  }

  function drawWeapon() {
    const p = player;
    if (p.dead) return;
    const w = WEAPONS[p.weapon].id;
    const bx = Math.sin(p.bob) * 7 * p.moveAmt;
    const by = Math.abs(Math.cos(p.bob)) * 6 * p.moveAmt + p.switchT * 400;
    ctx.save();
    if (w === 'saber') drawSaber(bx, by);
    else if (w === 'blaster') drawBlaster(bx, by, false);
    else if (w === 'rifle') drawBlaster(bx, by, true);
    else drawDetonatorHand(bx, by);
    ctx.restore();
  }

  function drawGlove(x, y, r) {
    ctx.fillStyle = '#141212';
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.2, r, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2624';
    ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.3, -0.3, 0, Math.PI * 2); ctx.fill();
  }

  function drawSaber(bx, by) {
    const p = player;
    let hx = 350 + bx, hy = 250 + by, ang = -1.95 + Math.sin(time * 1.5) * 0.03;
    if (p.swingT > 0) {
      const t = 1 - p.swingT / 0.35;
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      ang = -1.95 - e * 1.5 - Math.sin(t * Math.PI) * 0.1;
      hx = 350 - Math.sin(t * Math.PI) * 120 + bx;
      hy = 250 - Math.sin(t * Math.PI) * 30 + by;
    }
    const len = 230;
    const tx = hx + Math.cos(ang) * len, ty = hy + Math.sin(ang) * len;
    const sx = hx + Math.cos(ang) * 34, sy = hy + Math.sin(ang) * 34;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (const [wd, col] of [[26, 'rgba(40,255,90,0.12)'], [16, 'rgba(60,255,110,0.25)'], [9, 'rgba(90,255,130,0.6)']]) {
      ctx.strokeStyle = col; ctx.lineWidth = wd;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#e8ffee'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
    // hilt
    ctx.save();
    ctx.translate(hx, hy); ctx.rotate(ang);
    ctx.fillStyle = '#9ca1a8'; ctx.fillRect(-10, -7, 46, 14);
    ctx.fillStyle = '#d4d8de'; ctx.fillRect(-10, -7, 46, 3);
    ctx.fillStyle = '#1a1a1a'; for (let i = 0; i < 5; i++) ctx.fillRect(-4 + i * 5, -7, 2, 14);
    ctx.fillStyle = '#5b5f66'; ctx.fillRect(30, -8, 6, 16);
    ctx.fillStyle = '#c22'; ctx.fillRect(20, -8, 4, 3);
    ctx.restore();
    drawGlove(hx + 4, hy + 6, 16);
    ctx.fillStyle = '#1c1a19';
    ctx.beginPath(); ctx.moveTo(hx - 6, hy + 14); ctx.lineTo(hx + 30, hy + 10); ctx.lineTo(hx + 70, H + 10); ctx.lineTo(hx + 10, H + 10); ctx.fill();
  }

  function drawBlaster(bx, by, rifle) {
    const p = player;
    const recoil = p.fireCd > 0 ? Math.max(0, p.fireCd) * (rifle ? 40 : 30) : 0;
    const x = (rifle ? 300 : 310) + bx, y = 190 + by + recoil;
    ctx.save();
    ctx.translate(x, y);
    // sleeve & hand
    ctx.fillStyle = '#d8ccb2';
    ctx.beginPath(); ctx.moveTo(10, 70); ctx.lineTo(60, 60); ctx.lineTo(120, 110); ctx.lineTo(40, 110); ctx.fill();
    if (rifle) {
      const g = ctx.createLinearGradient(-30, 0, 30, 0);
      g.addColorStop(0, '#0d0d0f'); g.addColorStop(0.5, '#34363b'); g.addColorStop(1, '#0d0d0f');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-8, -50); ctx.lineTo(16, -50); ctx.lineTo(40, 85); ctx.lineTo(-20, 85); ctx.fill();
      ctx.fillStyle = '#111';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(4 + i * 1.6, -30 + i * 14, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#1b1c20'; ctx.fillRect(-26, -12, 12, 50);
      ctx.fillStyle = '#444'; ctx.fillRect(-24, -12, 8, 4);
      ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.ellipse(4, -50, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a5e66'; ctx.fillRect(-6, -48, 20, 3);
    } else {
      const g = ctx.createLinearGradient(-10, 0, 30, 0);
      g.addColorStop(0, '#15161a'); g.addColorStop(0.5, '#4a4d54'); g.addColorStop(1, '#15161a');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(20, -38); ctx.lineTo(30, 40); ctx.lineTo(-8, 40); ctx.fill();
      ctx.fillStyle = '#0a0a0a'; ctx.beginPath(); ctx.ellipse(10, -38, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = '#26282d'; ctx.fillRect(-1 + i, -30 + i * 7, 22 - i * 0.5, 2); }
      ctx.fillStyle = '#1b1c20'; ctx.fillRect(-18, -4, 10, 34);
      ctx.fillStyle = '#6ab'; ctx.fillRect(-16, -2, 6, 4);
      ctx.fillStyle = '#5a3a22';
      ctx.beginPath(); ctx.moveTo(4, 36); ctx.lineTo(30, 36); ctx.lineTo(48, 90); ctx.lineTo(16, 92); ctx.fill();
    }
    drawGlove(28, 70, 22);
    ctx.restore();
    if (p.muzzleT > 0) {
      const mx = x + (rifle ? 4 : 10), my = y - (rifle ? 52 : 40);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(mx, my, 0, mx, my, 40);
      g.addColorStop(0, 'rgba(230,255,235,0.95)'); g.addColorStop(0.3, 'rgba(80,255,120,0.6)'); g.addColorStop(1, 'rgba(0,255,60,0)');
      ctx.fillStyle = g; ctx.fillRect(mx - 40, my - 40, 80, 80);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawDetonatorHand(bx, by) {
    const p = player;
    if (p.dets <= 0 && p.fireCd <= 0) return;
    const lift = p.swingT > 0 ? Math.sin((1 - p.swingT / 0.35) * Math.PI) * -90 : 0;
    const x = 340 + bx, y = 225 + by + lift;
    if (!(p.swingT > 0.1 && p.swingT < 0.3)) {
      const g = ctx.createRadialGradient(x - 10, y - 10, 2, x, y, 30);
      g.addColorStop(0, '#f0f3f7'); g.addColorStop(0.5, '#9ea3aa'); g.addColorStop(1, '#3d4046');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333'; ctx.fillRect(x - 30, y - 4, 60, 7);
      ctx.fillStyle = (time * 3 | 0) % 2 ? '#ff2020' : '#661010'; ctx.fillRect(x - 6, y - 20, 12, 6);
    }
    drawGlove(x + 10, y + 26, 22);
    ctx.fillStyle = '#d8ccb2';
    ctx.beginPath(); ctx.moveTo(x - 5, y + 40); ctx.lineTo(x + 35, y + 36); ctx.lineTo(x + 90, H + 10); ctx.lineTo(x + 20, H + 10); ctx.fill();
  }

  function drawMinimap() {
    const s = Math.floor(Math.min(200 / mapW, 200 / mapH));
    mctx.clearRect(0, 0, 200, 200);
    mctx.fillStyle = 'rgba(0,0,0,0.6)'; mctx.fillRect(0, 0, mapW * s, mapH * s);
    for (let y = 0; y < mapH; y++) for (let x = 0; x < mapW; x++) {
      const c = grid[y][x];
      if (!WALLS[c]) continue;
      mctx.fillStyle = c === 'R' ? '#e33' : c === 'B' ? '#38f' : c === 'D' ? '#db3' : c === 'X' ? '#3e5' : '#8a8f97';
      if (DOOR_CHARS.includes(c) && doorAt(x, y).open > 0.85) mctx.globalAlpha = 0.3;
      mctx.fillRect(x * s, y * s, s, s);
      mctx.globalAlpha = 1;
    }
    mctx.fillStyle = '#ffe14d';
    mctx.beginPath(); mctx.arc(player.x * s, player.y * s, s * 0.45, 0, Math.PI * 2); mctx.fill();
    mctx.strokeStyle = '#ffe14d'; mctx.lineWidth = 1.5;
    mctx.beginPath(); mctx.moveTo(player.x * s, player.y * s);
    mctx.lineTo((player.x + Math.cos(player.a) * 1.4) * s, (player.y + Math.sin(player.a) * 1.4) * s); mctx.stroke();
  }

  // ------------------------------------------------------------ HUD
  const hudCache = {};
  function setHud(id, v, prop = 'textContent') {
    if (hudCache[id + prop] === v) return;
    hudCache[id + prop] = v;
    const el = $(id);
    if (prop === 'width') el.style.width = v; else el[prop] = v;
  }
  function updateHud() {
    const p = player;
    setHud('h-hp', String(Math.ceil(p.hp)));
    setHud('h-sh', String(Math.ceil(p.shield)));
    const w = WEAPONS[p.weapon];
    setHud('h-wname', w.name.toUpperCase());
    setHud('h-ammo', w.id === 'saber' ? '∞' : w.id === 'det' ? String(p.dets) : String(p.cells));
    setHud('h-force', Math.floor(p.force) + '%', 'width');
    setHud('k-red', p.keys.red ? 'key red on' : 'key red', 'className');
    setHud('k-blue', p.keys.blue ? 'key blue on' : 'key blue', 'className');
    setHud('h-kills', `${stats.kills}/${stats.total}`);
    setHud('h-weps', WEAPONS.map((wp, i) => `<span class="${i === p.weapon ? 'sel' : p.weapons[wp.id] ? 'has' : ''}">${i + 1}</span>`).join(''), 'innerHTML');
    $('hud').classList.toggle('low', p.hp < 25);
    if (boss && !boss.dead && boss.greeted) setHud('bossfill', Math.max(0, boss.hp / boss.def.hp * 100) + '%', 'width');
    $('flash').style.background = hurtFlash > 0 ? `rgba(255,0,0,${hurtFlash * 0.6})`
      : pickupFlash > 0 ? `rgba(255,230,120,${pickupFlash * 0.4})`
        : forceFlash > 0 ? `rgba(120,180,255,${forceFlash * 0.5})` : 'transparent';
    canvas.style.transform = shake > 0 ? `translate(${rand(-1, 1) * shake * 8}px,${rand(-1, 1) * shake * 8}px) scale(1.02)` : '';
  }

  // ------------------------------------------------------------ flow
  function setMode(m) {
    mode = m;
    for (const el of document.querySelectorAll('.screen')) el.classList.remove('show');
    const show = id => $(id).classList.add('show');
    document.body.classList.toggle('playing', m === 'play');
    if (m === 'title') { show('screen-title'); Sfx.humStop(); }
    if (m === 'paused') show('screen-pause');
    if (m === 'dead') { show('screen-dead'); document.exitPointerLock?.(); }
    if (m === 'levelend') {
      const t = stats.time | 0;
      $('end-stats').innerHTML = `
        <div><span>Mission</span><b>${level.name}</b></div>
        <div><span>Kills</span><b>${stats.kills} / ${stats.total}</b></div>
        <div><span>Items</span><b>${stats.items} / ${stats.totalItems}</b></div>
        <div><span>Time</span><b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b></div>`;
      show('screen-levelend');
      document.exitPointerLock?.();
    }
    if (m === 'victory') { show('screen-victory'); document.exitPointerLock?.(); Sfx.humStop(); restartCrawl('victory-crawl'); }
  }

  function endLevel(final) {
    Sfx.humStop();
    snapshot = persistent(player);
    setTimeout(() => setMode(final ? 'victory' : 'levelend'), final ? 1500 : 400);
    mode = 'ending';
  }

  function startGame() {
    Sfx.init();
    snapshot = null;
    loadLevel(0);
    beginPlay();
  }
  function beginPlay() {
    setMode('play');
    if (WEAPONS[player.weapon].id === 'saber') { Sfx.humStart(); }
    lockPointer();
  }
  function lockPointer() {
    try { const r = canvas.requestPointerLock?.(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* ignore */ }
  }
  function restartCrawl(id) {
    const el = $(id);
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  // ------------------------------------------------------------ input
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'KeyV') { Voice.enabled = !Voice.enabled; if (mode === 'play') message(`Luke's voice ${Voice.enabled ? 'on' : 'off'}`); if (!Voice.enabled) speechSynthesis?.cancel(); }
    if (e.code === 'KeyN') { const m = Sfx.toggleMute(); if (mode === 'play') message(`Sound ${m ? 'off' : 'on'}`); }
    if (mode === 'title' && (e.code === 'Enter' || e.code === 'Space')) { startGame(); return; }
    if (mode !== 'play') return;
    if (e.code === 'KeyE' || e.code === 'Space') use();
    if (e.code === 'KeyF') forcePush();
    if (e.code === 'Tab' || e.code === 'KeyM') showMap = !showMap;
    if (e.code === 'KeyQ') cycleWeapon(-1);
    if (e.code === 'KeyP') { document.exitPointerLock?.(); setMode('paused'); }
    const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    if (n >= 0) {
      if (weaponAvailable(n)) selectWeapon(n); else message("You don't have that weapon yet.");
    }
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });
  document.addEventListener('mousemove', e => {
    if (mode !== 'play' || document.pointerLockElement !== canvas) return;
    const d = e.movementX * 0.0024;
    player.a += d;
    mouseTurn += Math.abs(d);
  });
  canvas.addEventListener('mousedown', e => {
    if (mode !== 'play') return;
    if (document.pointerLockElement !== canvas) { lockPointer(); return; }
    if (e.button === 0) mouseDown = true;
    if (e.button === 2) forcePush();
  });
  document.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('wheel', e => { if (mode === 'play') cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && mode === 'play' && !player.dead) { mouseDown = false; setMode('paused'); }
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });

  $('screen-title').addEventListener('click', startGame);
  $('screen-pause').addEventListener('click', () => { Sfx.init(); beginPlay(); });
  $('screen-dead').addEventListener('click', () => { loadLevel(levelIndex); beginPlay(); });
  $('screen-levelend').addEventListener('click', () => { loadLevel(levelIndex + 1); beginPlay(); });
  $('screen-victory').addEventListener('click', () => setMode('title'));

  // ------------------------------------------------------------ title starfield
  const stars = Array.from({ length: 300 }, () => ({ x: rand(-1, 1), y: rand(-1, 1), z: rand(0.05, 1) }));
  function renderStars(dt, speed) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      s.z -= dt * speed;
      if (s.z <= 0.02) { s.x = rand(-1, 1); s.y = rand(-1, 1); s.z = 1; }
      const sx = W / 2 + s.x / s.z * W * 0.3, sy = H / 2 + s.y / s.z * H * 0.3;
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) { s.z = 1; continue; }
      const b = Math.floor(255 * (1 - s.z));
      ctx.fillStyle = `rgb(${b},${b},${Math.min(255, b + 30)})`;
      const sz = s.z < 0.3 ? 2 : 1;
      ctx.fillRect(sx, sy, sz, sz);
    }
  }

  // ------------------------------------------------------------ main loop
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (mode === 'play' || mode === 'ending') {
      update(dt);
      render();
      updateHud();
    } else if (mode === 'title' || mode === 'victory') {
      renderStars(dt, mode === 'title' ? 0.08 : 0.3);
    }
    requestAnimationFrame(loop);
  }
  setMode('title');
  requestAnimationFrame(loop);

  // exposed for automated smoke tests
  window.__luke = { get mode() { return mode; }, get player() { return player; }, get enemies() { return enemies; }, startGame, loadLevel: i => { loadLevel(i); beginPlay(); }, fire, use, forcePush, selectWeapon };
})();
