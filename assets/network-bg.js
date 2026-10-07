// Animated teal network background (shared by all pages)
const canvas = document.getElementById('network-bg');
const ctx = canvas.getContext('2d');
// Colour is set per page with data-rgb="r, g, b" on the canvas (default: teal)
const RGB = canvas.dataset.rgb || '94, 234, 212';
const STILL = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const nodes = [];
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };

// Shape mode: the nodes leave their drift and fly into a shape (a sheet of paper for the CV),
// drawn with the shape's own edges instead of the usual nearby-node lines. `form` blends
// between the two: 0 = normal network, 1 = fully formed. Used by dial.js via window.networkBg.
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

// Give each target point the nearest free node, so every node takes a short path.
function formShape(rect) {
  const s = paperShape(rect, nodes.length);
  const free = nodes.slice();
  const order = [];
  const now = performance.now();
  s.points.forEach(p => {
    let best = 0, bestD = Infinity;
    free.forEach((nd, i) => { const d = (nd.x - p[0]) ** 2 + (nd.y - p[1]) ** 2; if (d < bestD) { bestD = d; best = i; } });
    const nd = free.splice(best, 1)[0];
    nd.tx = p[0]; nd.ty = p[1];
    nd.hx = p[0]; nd.hy = p[1]; // its home in the paper
    nd.sx = nd.x; nd.sy = nd.y; // where it sets off from
    nd.t0 = now + Math.random() * STAGGER_MS;
    nd.dur = TRAVEL_MS;
    nd.blow = null; // reopened mid blow-out: gather from wherever it is
    order.push(nd);
  });
  free.forEach(nd => { nd.tx = undefined; });
  shape.edges = s.edges.map(e => [order[e[0]], order[e[1]]]);
  shape.inner = order.slice(s.rowStart); // the "text line" nodes, which can form symbols
  shape.rect = rect;
  shape.on = true;
}

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
  shape.icon = null; shape.iconEdges = [];
  const now = performance.now();
  nodes.forEach(nd => {
    nd.away = false; nd.inIcon = false;
    if (nd.tx === undefined) return;
    nd.tx = undefined;
    nd.blow = { sx: nd.x, sy: nd.y, tx: Math.random() * canvas.width, ty: Math.random() * canvas.height,
                t0: now + Math.random() * 120, dur: BLOW_MS * (0.8 + Math.random() * 0.4) };
  });
}
window.networkBg = { formPaper: formShape, formIcon: formIcon, release: releaseShape };

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
      if (raw >= 1) node.blow = null;
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
    ctx.arc(node.x, node.y, node.inIcon ? node.radius + 0.6 : node.radius, 0, Math.PI * 2);
    ctx.fill();
  }

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

  // the shape's own edges fade in as it forms (and out as it scatters)
  if (formed > 0) {
    ctx.strokeStyle = `rgba(${RGB}, ${0.6 * formed})`;
    ctx.lineWidth = 1.2;
    shape.edges.forEach(([a, b]) => {
      if (a.away || b.away) return; // off forming a symbol
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
  
