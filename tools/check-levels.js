// Sanity-checks every map: rectangular, sealed borders, one player start,
// and the exit is reachable when keys are collected in a legal order.
// Run with: node tools/check-levels.js
const LEVELS = require('../js/levels.js');
const WALLS = '#=%CW@XDRB';
let ok = true;
const fail = (l, msg) => { ok = false; console.error(`[${l.name}] ${msg}`); };

for (const L of LEVELS) {
  const m = L.map, h = m.length, w = m[0].length;
  m.forEach((row, y) => { if (row.length !== w) fail(L, `row ${y} has length ${row.length}, expected ${w}`); });
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (!WALLS.includes(m[y][x])) fail(L, `open border at ${x},${y}`);
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (!WALLS.includes(m[y][x])) fail(L, `open border at ${x},${y}`);
  const starts = [];
  m.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'P') starts.push([x, y]); }));
  if (starts.length !== 1) { fail(L, `expected 1 player start, found ${starts.length}`); continue; }

  const keys = { r: false, b: false };
  let seen;
  for (let pass = 0; pass < 4; pass++) {
    seen = new Set();
    const q = [starts[0]];
    seen.add(starts[0].join());
    while (q.length) {
      const [x, y] = q.shift();
      const c = m[y][x];
      if (c === 'r') keys.r = true;
      if (c === 'b') keys.b = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (seen.has(k) || ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
        const n = m[ny][nx];
        const pass = !'#=%CW@X'.includes(n) && !(n === 'R' && !keys.r) && !(n === 'B' && !keys.b);
        if (pass) { seen.add(k); q.push([nx, ny]); }
      }
    }
  }
  let exitOk = false;
  m.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === 'X' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has((x + dx) + ',' + (y + dy)))) exitOk = true;
  }));
  if (!exitOk) fail(L, 'exit is not reachable');
  for (const d of 'RB') if (m.some(r => r.includes(d)) && !keys[d.toLowerCase()]) fail(L, `door ${d} present but key unreachable`);
  let enemies = 0;
  m.forEach(r => { for (const c of r) if ('tToV'.includes(c)) enemies++; });
  console.log(`${L.name}: ${w}x${h}, ${enemies} enemies, keys r=${keys.r} b=${keys.b}, exit reachable=${exitOk}`);
}
process.exit(ok ? 0 : 1);
