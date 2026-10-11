// Animated teal network background (shared by all pages)
const canvas = document.getElementById('network-bg');
const ctx = canvas.getContext('2d');
// Colour is set per page with data-rgb="r, g, b" on the canvas (default: teal)
const RGB = canvas.dataset.rgb || '94, 234, 212';
const STILL = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const nodes = [];
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };

// Shape mode: the nodes leave their drift and fly into a shape (a sheet of paper for the CV, the
// LinkedIn mark and an envelope for Contact), drawn with the shape's own edges instead of the
// usual nearby-node lines. `form` blends between the two: 0 = normal network, 1 = fully formed. Used by dial.js via window.networkBg.
const shape = { on: false, form: 0, edges: [] };
// Slow enough to watch the network gather: each node travels for TRAVEL_MS, setting off up to
// STAGGER_MS after the first, and the shape's edges fade in over FORM_MS as they arrive.
const TRAVEL_MS = 1100, STAGGER_MS = 350, FORM_MS = 1300;
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let lastFrame = 0;

// Points along a sheet of paper inside rect {x, y, w, h}: the outline with a folded top-right
// corner, a heading row, then rows of "text lines". Returns { points, edges } for n nodes.
function paperShape(r, n) {
  const pts = [], edges = [];
  const f = r.w * 0.13; // folded corner size
  const outline = [[r.x, r.y], [r.x + r.w - f, r.y], [r.x + r.w, r.y + f], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
  const perimeter = outline.reduce((sum, p, i) => {
    const q = outline[(i + 1) % outline.length];
    return sum + Math.hypot(q[0] - p[0], q[1] - p[1]);
  }, 0);
  const nOutline = Math.max(12, Math.round(n * 0.42));
  // walk the outline, dropping evenly spaced points (corners always included)
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const k = Math.max(1, Math.round(nOutline * len / perimeter));
    for (let j = 0; j < k; j++) pts.push([p[0] + (q[0] - p[0]) * j / k, p[1] + (q[1] - p[1]) * j / k]);
  });
  for (let i = 0; i < pts.length; i++) edges.push([i, (i + 1) % pts.length]);
  // the fold: a small inner corner joined to the two ends of the diagonal
  const fold = pts.length;
  pts.push([r.x + r.w - f, r.y + f]);
  const a = pts.findIndex(p => p[0] === r.x + r.w - f && p[1] === r.y);
  const b = pts.findIndex(p => p[0] === r.x + r.w && p[1] === r.y + f);
  if (a >= 0) edges.push([a, fold]);
  if (b >= 0) edges.push([fold, b]);
  // text rows, three points each, of varying length; the first one is a short heading
  const rowStart = pts.length;
  const rows = Math.max(1, Math.floor((n - pts.length) / 3));
  const left = r.x + r.w * 0.12, top = r.y + r.h * 0.14, bottom = r.y + r.h * 0.9;
  const lengths = [0.5, 0.76, 0.7, 0.76, 0.58, 0.76, 0.72, 0.66, 0.76, 0.5, 0.74, 0.68];
  for (let i = 0; i < rows; i++) {
    const y = rows === 1 ? top : top + (bottom - top) * i / (rows - 1);
    const len = r.w * lengths[i % lengths.length];
    const s = pts.length;
    for (let j = 0; j < 3; j++) pts.push([left + len * j / 2, y]);
    edges.push([s, s + 1], [s + 1, s + 2]);
  }
  return { points: pts.slice(0, n), edges: edges.filter(e => e[0] < n && e[1] < n), rowStart };
}

// Symbols made by the paper's "text line" nodes (see formIcon): a magnifying glass for View,
// a download arrow over a tray for Download, centred in area r. Returns { points, edges } using
// at most max points.
function iconShape(kind, r, max) {
  const pts = [], edges = [];
  const s = Math.min(r.w * 0.8, r.h) * 0.95; // symbol size
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const chain = (from, to) => { for (let i = from; i < to; i++) edges.push([i, i + 1]); };
  if (kind === 'view') {
    // a lens (a ring starting at its lower-right, where the handle joins) and a handle
    const R = s * 0.3, lx = cx - s * 0.1, ly = cy - s * 0.1, k = 12, a0 = Math.PI / 4;
    for (let i = 0; i < k; i++) pts.push([lx + R * Math.cos(a0 + i * 2 * Math.PI / k), ly + R * Math.sin(a0 + i * 2 * Math.PI / k)]);
    chain(0, k - 1); edges.push([k - 1, 0]);
    [1.35, 1.75, 2.15].forEach(m => pts.push([lx + R * m * Math.cos(a0), ly + R * m * Math.sin(a0)]));
    edges.push([0, k]); chain(k, k + 2);
  } else if (kind === 'download') {
    // a shaft ending in an arrowhead, above an open tray
    const top = cy - s * 0.42, tip = cy + s * 0.14;
    for (let i = 0; i < 4; i++) pts.push([cx, top + (tip - top) * i / 3]);
    chain(0, 3);
    const arm = s * 0.2;
    pts.push([cx - arm, tip - arm], [cx - arm / 2, tip - arm / 2], [cx + arm / 2, tip - arm / 2], [cx + arm, tip - arm]);
    edges.push([4, 5], [5, 3], [3, 6], [6, 7]);
    const tl = cx - s * 0.36, tr = cx + s * 0.36, ty = cy + s * 0.26, tb = cy + s * 0.4;
    const t0 = pts.length;
    pts.push([tl, ty], [tl, tb], [cx - s * 0.12, tb], [cx + s * 0.12, tb], [tr, tb], [tr, ty]);
    chain(t0, t0 + 5);
  }
  return { points: pts.slice(0, max), edges: edges.filter(e => e[0] < max && e[1] < max) };
}

// Walk a closed outline, dropping k evenly spaced points (every corner included).
function walkOutline(outline, k) {
  const pts = [];
  const perimeter = outline.reduce((sum, p, i) => {
    const q = outline[(i + 1) % outline.length];
    return sum + Math.hypot(q[0] - p[0], q[1] - p[1]);
  }, 0);
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const m = Math.max(1, Math.round(k * len / perimeter));
    for (let j = 0; j < m; j++) pts.push([p[0] + (q[0] - p[0]) * j / m, p[1] + (q[1] - p[1]) * j / m]);
  });
  return pts;
}
// Exactly k points, evenly spaced along a closed outline (corners not kept: for rounded shapes).
function sampleOutline(outline, k) {
  const segs = outline.map((p, i) => { const q = outline[(i + 1) % outline.length]; return [p, q, Math.hypot(q[0] - p[0], q[1] - p[1])]; });
  const total = segs.reduce((sum, g) => sum + g[2], 0), pts = [];
  let si = 0, before = 0;
  for (let j = 0; j < k; j++) {
    const d = total * j / k;
    while (before + segs[si][2] < d) { before += segs[si][2]; si++; }
    const [p, q, len] = segs[si], t = len ? (d - before) / len : 0;
    pts.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
  }
  return pts;
}
const loopEdges = (from, count) => Array.from({ length: count }, (_, i) => [from + i, from + (i + 1) % count]);

// The LinkedIn mark in square r: a rounded square with "in" inside, its outline in k points.
function linkedinShape(r, k) {
  const s = r.w, c = s * 0.18, x = r.x, y = r.y;
  const corner = (cx, cy, a0) => [0, 1, 2].map(i => {
    const a = (a0 + i * 45) * Math.PI / 180;
    return [cx + c * Math.cos(a), cy + c * Math.sin(a)];
  });
  const outline = [].concat(corner(x + c, y + c, 180), corner(x + s - c, y + c, 270),
                            corner(x + s - c, y + s - c, 0), corner(x + c, y + s - c, 90));
  const pts = sampleOutline(outline, k);
  const edges = loopEdges(0, pts.length);
  const at = (u, v) => [x + s * u, y + s * v];
  const chain = list => { const f = pts.length; list.forEach(p => pts.push(p)); for (let i = f; i < pts.length - 1; i++) edges.push([i, i + 1]); };
  pts.push(at(0.29, 0.27));                                            // the dot of the i
  chain([at(0.29, 0.42), at(0.29, 0.6), at(0.29, 0.78)]);              // its stem
  chain([at(0.45, 0.78), at(0.45, 0.6), at(0.45, 0.42),                // the n: up the left stem,
         at(0.56, 0.4), at(0.68, 0.43), at(0.74, 0.55), at(0.74, 0.78)]); // over the arch, down the right
  return { points: pts, edges };
}

// An envelope centred in square r: the outline in k points, and the flap's V.
function envelopeShape(r, k) {
  const w = r.w, h = w * 0.66, x = r.x, y = r.y + (r.w - h) / 2;
  const pts = walkOutline([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], k);
  const edges = loopEdges(0, pts.length);
  const tr = pts.findIndex(p => p[0] === x + w && p[1] === y);
  const v = pts.length;
  pts.push([x + w * 0.25, y + h * 0.3], [x + w / 2, y + h * 0.58], [x + w * 0.75, y + h * 0.3]);
  edges.push([0, v], [v, v + 1], [v + 1, v + 2]);
  if (tr >= 0) edges.push([v + 2, tr]);
  return { points: pts, edges };
}

// Contact: the LinkedIn mark in square li and an envelope in square em, sharing the n nodes.
// Each edge is tagged with its shape ('li' or 'em') so one can be lit up on its own (focusShape).
function contactShape(li, em, n) {
  const rest = Math.max(0, n - 15); // 12 nodes make the "in", 3 the flap
  const a = linkedinShape(li, Math.max(10, Math.round(rest * 0.55)));
  // the envelope gets whatever is left (its four corners at least), so the flap is never cut off
  const b = envelopeShape(em, Math.max(4, n - a.points.length - 3)), off = a.points.length;
  return {
    points: a.points.concat(b.points),
    edges: a.edges.map(e => [e[0], e[1], 'li']).concat(b.edges.map(e => [e[0] + off, e[1] + off, 'em']))
  };
}

// Points along an open path: every corner, plus the rest of the k points shared out between the
// segments by length (so a bar keeps its square top and an arrow its point).
function samplePath(path, k) {
  if (path.length < 2) return path.slice();
  const lens = path.slice(1).map((q, i) => Math.hypot(q[0] - path[i][0], q[1] - path[i][1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1, extra = Math.max(0, k - path.length);
  const share = lens.map(l => extra * l / total), inner = share.map(Math.floor);
  let left = extra - inner.reduce((a, b) => a + b, 0);
  share.map((v, i) => [v - inner[i], i]).sort((x, y) => y[0] - x[0]).forEach(([, i]) => { if (left > 0) { inner[i]++; left--; } });
  const pts = [];
  lens.forEach((_, i) => {
    const p = path[i], q = path[i + 1], m = inner[i] + 1;
    for (let j = 0; j < m; j++) pts.push([p[0] + (q[0] - p[0]) * j / m, p[1] + (q[1] - p[1]) * j / m]);
  });
  pts.push(path[path.length - 1]);
  return pts;
}

// A small kit for line drawings in square r, in units of its side (0..1 across and down).
// Small drawings (phones) get fewer points, so they don't turn into a clump of dots.
function sceneKit(r) {
  const pts = [], edges = [];
  const f = Math.max(0.55, Math.min(1, r.w / 200)), fewer = (k, min) => Math.max(min, Math.round(k * f));
  const at = ([u, v]) => [r.x + r.w * u, r.y + r.w * v];
  const add = list => { const f = pts.length; list.forEach(p => pts.push(p)); return list.map((_, i) => f + i); };
  return {
    pts, edges,
    line(path, k) { const ids = add(samplePath(path.map(at), fewer(k, 2))); for (let i = 1; i < ids.length; i++) edges.push([ids[i - 1], ids[i]]); return ids; },
    loop(path, k) { const ids = add(sampleOutline(path.map(at), fewer(k, 4))); ids.forEach((id, i) => edges.push([id, ids[(i + 1) % ids.length]])); return ids; },
    circle(u, v, rad, k) {
      k = fewer(k, 5);
      const ring = Array.from({ length: k }, (_, i) => [u + rad * Math.cos(i * 2 * Math.PI / k), v + rad * Math.sin(i * 2 * Math.PI / k)]);
      const ids = add(ring.map(at)); ids.forEach((id, i) => edges.push([id, ids[(i + 1) % ids.length]]));
      return ids;
    },
    box(path, k) { const ids = add(walkOutline(path.map(at), fewer(k, 4))); ids.forEach((id, i) => edges.push([id, ids[(i + 1) % ids.length]])); return ids; }, // keeps its corners
    point(u, v) { return add([at([u, v])])[0]; },
    link(a, b) { edges.push([a, b]); },
    done() { return { points: pts, edges }; }
  };
}

// Career: someone at a desk, side on, working on an open laptop.
function careerShape(r) {
  const k = sceneKit(r);
  k.line([[0.42, 0.6], [0.98, 0.6]], 7);                                // the desk
  k.line([[0.92, 0.63], [0.92, 0.94]], 3);                              // its leg
  k.loop([[0.74, 0.59], [0.8, 0.33], [0.835, 0.335], [0.775, 0.59]], 8); // the laptop's open screen
  k.circle(0.3, 0.2, 0.075, 8);                                         // head
  k.line([[0.3, 0.29], [0.255, 0.44], [0.265, 0.6]], 5);                // back, leaning in a little
  k.line([[0.285, 0.35], [0.4, 0.49], [0.66, 0.565]], 5);               // arm, out to the keyboard
  k.line([[0.265, 0.6], [0.5, 0.62], [0.52, 0.93]], 6);                 // thigh and shin
  k.line([[0.13, 0.36], [0.16, 0.66], [0.36, 0.66]], 6);                // the chair's back and seat
  k.line([[0.24, 0.68], [0.24, 0.93]], 2);                              // and its stem
  return k.done();
}

// Personal: a day at the beach. The sun, an umbrella, someone stretched out on a lounger, the sea.
function personalShape(r) {
  const k = sceneKit(r);
  const sun = k.circle(0.8, 0.19, 0.085, 8);
  sun.forEach((id, i) => {                                              // a ray off every point of the sun
    const a = i * 2 * Math.PI / sun.length;
    k.link(id, k.point(0.8 + 0.15 * Math.cos(a), 0.19 + 0.15 * Math.sin(a)));
  });
  const canopy = Array.from({ length: 9 }, (_, i) => {                  // the umbrella's dome, closed by its rim
    const a = Math.PI + i * Math.PI / 8;
    return [0.3 + 0.22 * Math.cos(a), 0.42 + 0.15 * Math.sin(a)];
  });
  k.loop(canopy, 11);
  k.line([[0.3, 0.42], [0.34, 0.9]], 4);                                // its pole, into the sand
  k.line([[0.37, 0.6], [0.47, 0.74], [0.9, 0.74]], 7);                  // the lounger, back raised
  k.line([[0.52, 0.75], [0.5, 0.85]], 2);
  k.line([[0.85, 0.75], [0.87, 0.85]], 2);
  k.circle(0.43, 0.575, 0.042, 6);                                      // head, resting on the back
  k.line([[0.47, 0.65], [0.62, 0.7], [0.74, 0.64], [0.88, 0.69]], 6);   // body, one knee up
  k.line(Array.from({ length: 9 }, (_, i) => [0.02 + i * 0.12, 0.95 + (i % 2 ? -0.025 : 0.01)]), 9); // the sea
  return k.done();
}

// Case studies: a bar chart that climbs, with a trend arrow over it (problem, decisions, outcome).
function casesShape(r) {
  const k = sceneKit(r);
  k.line([[0.1, 0.08], [0.1, 0.9], [0.95, 0.9]], 9);                     // the axes
  [0.2, 0.32, 0.46, 0.62].forEach((h, i) => {                            // four bars, each taller
    const x = 0.2 + i * 0.18;
    k.line([[x, 0.9], [x, 0.9 - h], [x + 0.11, 0.9 - h], [x + 0.11, 0.9]], 5);
  });
  k.line([[0.25, 0.6], [0.44, 0.48], [0.62, 0.34], [0.84, 0.14]], 6);    // the trend
  k.line([[0.74, 0.14], [0.84, 0.14], [0.84, 0.24]], 3);                 // and its arrowhead
  return k.done();
}

// My apps: a browser window with </> in it.
function appsShape(r) {
  const k = sceneKit(r);
  k.box([[0.04, 0.14], [0.96, 0.14], [0.96, 0.86], [0.04, 0.86]], 18);    // the window
  k.line([[0.04, 0.28], [0.96, 0.28]], 6);                               // its toolbar
  [0.1, 0.16, 0.22].forEach(u => k.point(u, 0.21));                      // the three buttons
  k.line([[0.38, 0.44], [0.26, 0.57], [0.38, 0.7]], 3);                  // <
  k.line([[0.55, 0.42], [0.45, 0.72]], 3);                               // /
  k.line([[0.62, 0.44], [0.74, 0.57], [0.62, 0.7]], 3);                  // >
  return k.done();
}

// Two drawings side by side, each edge tagged with its group so one can be lit up on its own.
function pairShape(a, b, ga, gb) {
  const off = a.points.length;
  return {
    points: a.points.concat(b.points),
    edges: a.edges.map(e => [e[0], e[1], ga]).concat(b.edges.map(e => [e[0] + off, e[1] + off, gb]))
  };
}

// A drawing can need more points than the screen has nodes (phones have only 35): extra nodes
// drift in from just off the nearest edge for it, and leave the same way once it's let go.
function extraNode() {
  const W = canvas.width, H = canvas.height, side = Math.floor(Math.random() * 4);
  const x = side === 0 ? -20 : side === 1 ? W + 20 : Math.random() * W;
  const y = side === 2 ? -20 : side === 3 ? H + 20 : Math.random() * H;
  return { x, y, vx: 0, vy: 0, bvx: 0, bvy: 0, radius: Math.random() * 2 + 2, extra: true };
}
function sendOff(nd, now) {
  const W = canvas.width, H = canvas.height, d = [nd.x, W - nd.x, nd.y, H - nd.y], m = d.indexOf(Math.min(...d));
  const t = m === 0 ? [-30, nd.y] : m === 1 ? [W + 30, nd.y] : m === 2 ? [nd.x, -30] : [nd.x, H + 30];
  nd.blow = { sx: nd.x, sy: nd.y, tx: t[0], ty: t[1], t0: now + Math.random() * 120, dur: BLOW_MS };
}
const baseCount = () => nodes.filter(nd => !nd.extra).length;

// Give each target point the nearest free node, so every node takes a short path.
function gather(s, rect) {
  while (nodes.length < s.points.length) nodes.push(extraNode());
  const free = nodes.slice();
  const order = [];
  const now = performance.now();
  s.points.slice(0, nodes.length).forEach(p => {
    let best = 0, bestD = Infinity;
    free.forEach((nd, i) => { const d = (nd.x - p[0]) ** 2 + (nd.y - p[1]) ** 2; if (d < bestD) { bestD = d; best = i; } });
    const nd = free.splice(best, 1)[0];
    nd.tx = p[0]; nd.ty = p[1];
    nd.hx = p[0]; nd.hy = p[1]; // its home in the shape
    nd.sx = nd.x; nd.sy = nd.y; // where it sets off from
    nd.t0 = now + Math.random() * STAGGER_MS;
    nd.dur = TRAVEL_MS;
    nd.blow = null; // reopened mid blow-out: gather from wherever it is
    order.push(nd);
  });
  free.forEach(nd => { nd.tx = undefined; if (nd.extra && !nd.blow) sendOff(nd, now); });
  shape.edges = s.edges.filter(e => e[0] < order.length && e[1] < order.length)
    .map(e => [order[e[0]], order[e[1]], e[2]]);
  shape.inner = s.rowStart !== undefined ? order.slice(s.rowStart) : []; // the paper's "text line" nodes, which can form symbols
  shape.rect = rect;
  shape.focus = null;
  shape.dot = 1;
  shape.groups = [...new Set(s.edges.map(e => e[2]).filter(Boolean))];
  shape.on = true;
}
function formShape(rect) { gather(paperShape(rect, nodes.length), rect); }
function formContact(li, em) { gather(contactShape(li, em, baseCount()), null); }
function formProjects(hc, ha) {
  gather(pairShape(casesShape(hc), appsShape(ha), 'hc', 'ha'), null);
  shape.dot = Math.max(0.5, Math.min(0.7, hc.w / 320));
}
function formAbout(ca, pe) {
  gather(pairShape(careerShape(ca), personalShape(pe), 'ca', 'pe'), null);
  shape.dot = Math.max(0.4, Math.min(0.6, ca.w / 360)); // finer dots: these drawings have more detail
}
// Light up one of a pair of drawings (by its group: 'li', 'em', 'ca', 'pe', 'hc' or 'ha') and dim the other;
// null lights both evenly.
function focusShape(group) { shape.focus = group || null; }

// While the CV paper is up: some of its text-line nodes rise out from under the page into the
// empty space above it (or below, if that's bigger) and gather into a symbol (kind 'view' or
// 'download'); null sends them back into their rows.
const ICON_MS = 650;
function iconArea() {
  const r = shape.rect, M = 18;
  const above = r.y - 2 * M, below = canvas.height - (r.y + r.h) - 2 * M;
  return above >= below
    ? { x: r.x, y: M, w: r.w, h: above }
    : { x: r.x, y: r.y + r.h + M, w: r.w, h: below };
}
function formIcon(kind) {
  if (!shape.on || shape.icon === kind) return;
  shape.icon = kind;
  const now = performance.now();
  const s = kind ? iconShape(kind, iconArea(), shape.inner.length) : { points: [], edges: [] };
  const move = (nd, x, y) => { nd.sx = nd.x; nd.sy = nd.y; nd.tx = x; nd.ty = y; nd.t0 = now + Math.random() * 120; nd.dur = ICON_MS; };
  const free = shape.inner.slice();
  const order = s.points.map(p => {
    let best = 0, bestD = Infinity;
    free.forEach((nd, i) => { const d = (nd.x - p[0]) ** 2 + (nd.y - p[1]) ** 2; if (d < bestD) { bestD = d; best = i; } });
    const nd = free.splice(best, 1)[0];
    move(nd, p[0], p[1]);
    nd.away = true; nd.inIcon = true;
    return nd;
  });
  free.forEach(nd => { if (nd.inIcon) { move(nd, nd.hx, nd.hy); nd.inIcon = false; } }); // back to its row
  shape.iconEdges = s.edges.map(e => [order[e[0]], order[e[1]]]);
}

// Let go: the shape blows apart. Each node shoots off to its own random spot across the whole
// screen (fast, then slowing down) and drifts on from there, so the next shape gathers from
// every direction instead of from a clump next to where the last one was.
const BLOW_MS = 1400;
const easeOut = t => 1 - Math.pow(1 - t, 3);
function releaseShape() {
  if (!shape.on) return;
  shape.on = false;
  shape.focus = null;
  shape.icon = null; shape.iconEdges = [];
  const now = performance.now();
  nodes.forEach(nd => {
    nd.away = false; nd.inIcon = false;
    if (nd.extra) { nd.tx = undefined; sendOff(nd, now); return; }
    if (nd.tx === undefined) return;
    nd.tx = undefined;
    nd.blow = { sx: nd.x, sy: nd.y, tx: Math.random() * canvas.width, ty: Math.random() * canvas.height,
                t0: now + Math.random() * 120, dur: BLOW_MS * (0.8 + Math.random() * 0.4) };
  });
}
window.networkBg = { formPaper: formShape, formContact: formContact, formAbout: formAbout, formProjects: formProjects, focus: focusShape, formIcon: formIcon, release: releaseShape };

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createNodes() {
  const count = Math.min(70, Math.max(35, Math.floor(window.innerWidth / 18)));
  nodes.length = 0;

  for (let i = 0; i < count; i++) {
    const vx = (Math.random() - 0.5) * 0.35, vy = (Math.random() - 0.5) * 0.35;
    nodes.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx, vy,
      bvx: vx, bvy: vy, // its usual drift, which it settles back to after a push
      radius: Math.random() * 2 + 2
    });
  }
}

function drawNetwork(now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const dt = lastFrame ? Math.min(64, now - lastFrame) : 16;
  lastFrame = now;
  shape.form = Math.max(0, Math.min(1, shape.form + (shape.on ? 1 : -1) * dt / FORM_MS));
  const formed = shape.form;
  shape.iconForm = Math.max(0, Math.min(1, (shape.iconForm || 0) + (shape.icon ? 1 : -1) * dt / ICON_MS));

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (shape.on && node.tx !== undefined) {
      // travel to its place in the shape: a gentle start, a smooth glide, a soft arrival
      const raw = Math.max(0, Math.min(1, (now - node.t0) / node.dur));
      const t = easeInOut(raw);
      node.x = node.sx + (node.tx - node.sx) * t;
      node.y = node.sy + (node.ty - node.sy) * t;
      if (node.away && !node.inIcon && raw >= 1) node.away = false; // back in its row
    } else if (node.blow) {
      // blown out of a shape: fly to its spot, then carry on drifting from there
      const b = node.blow, raw = Math.max(0, Math.min(1, (now - b.t0) / b.dur)), t = easeOut(raw);
      node.x = b.sx + (b.tx - b.sx) * t;
      node.y = b.sy + (b.ty - b.sy) * t;
      if (raw >= 1) { node.blow = null; if (node.extra && node.tx === undefined) node.gone = true; }
    } else if (!STILL) {
      node.x += node.vx;
      node.y += node.vy;
      node.vx += (node.bvx - node.vx) * 0.03; // a push fades back into the usual drift
      node.vy += (node.bvy - node.vy) * 0.03;
    }

    if (node.x < 0 || node.x > canvas.width) { node.vx *= -1; node.bvx *= -1; }
    if (node.y < 0 || node.y > canvas.height) { node.vy *= -1; node.bvy *= -1; }

    if (mouse.active && !shape.on) {
      const dx = mouse.x - node.x;
      const dy = mouse.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Pull nearby nodes towards the cursor, but push back inside a small ring
      // so they gather around it instead of collapsing into one point.
      const REACH = 180, RING = 70;
      if (dist > 0 && dist < REACH) {
        const f = dist > RING
          ? ((REACH - dist) / REACH) * 0.03
          : -((RING - dist) / RING) * 0.12;
        node.x += dx * f;
        node.y += dy * f;
      }
    }

    ctx.beginPath();
    ctx.fillStyle = `rgba(${RGB}, 0.98)`;
    // in a fine drawing the dots shrink as they arrive, and grow back as they scatter
    const shrink = 1 - (1 - (shape.dot || 1)) * formed;
    ctx.arc(node.x, node.y, (node.inIcon ? node.radius + 0.6 : node.radius) * shrink, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = nodes.length - 1; i >= 0; i--) if (nodes[i].gone) nodes.splice(i, 1); // extras that have left

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      if (a.away || b.away) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 140 && formed < 1) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${RGB}, ${(0.38 - dist / 600) * (1 - formed)})`;
        ctx.lineWidth = 1;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  // the shape's own edges fade in as it forms (and out as it scatters); with a contact shape in
  // focus, its edges brighten and the other one's dim
  shape.glow = shape.glow || {};
  (shape.groups || []).forEach(g => {
    shape.glow[g] = shape.glow[g] || 0;
    const want = !shape.focus ? 0 : (shape.focus === g ? 1 : -1);
    shape.glow[g] += Math.max(-dt / 250, Math.min(dt / 250, want - shape.glow[g]));
  });
  if (formed > 0) {
    shape.edges.forEach(([a, b, g]) => {
      if (a.away || b.away) return; // off forming a symbol
      const glow = g ? shape.glow[g] : 0;
      ctx.strokeStyle = `rgba(${RGB}, ${(0.6 + 0.35 * glow) * formed})`;
      ctx.lineWidth = g ? 1.4 + 0.6 * Math.max(0, glow) : 1.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
  }

  // the symbol's edges
  if (shape.iconForm > 0 && shape.iconEdges) {
    ctx.strokeStyle = `rgba(${RGB}, ${0.9 * shape.iconForm})`;
    ctx.lineWidth = 1.8;
    shape.iconEdges.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
  }
}

function animate(now) {
  drawNetwork(now || 0);
  if (!STILL) requestAnimationFrame(animate);
}

window.addEventListener('pointermove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  mouse.active = true;
});

window.addEventListener('pointerleave', () => {
  mouse.active = false;
});

window.addEventListener('resize', () => {
  resizeCanvas();
  shape.on = false; shape.form = 0; shape.edges = []; // new nodes: any shape is gone
  shape.icon = null; shape.iconEdges = [];
  createNodes();
});

resizeCanvas();
createNodes();
animate();
  
