// Radial homepage menu.
// Levels: closed -> projects (Case studies | My apps) -> apps (items on the outer ring)
// Case studies is a direct link: all of them live on one page.
//         closed -> contact (LinkedIn | Email)
(function () {
  'use strict';

  var ACCENT = '#D4B483';
  var SEL_BG = 'rgba(212,180,131,0.16)';
  var GLASS = 'rgba(255,255,255,0.075)';
  var GLASS_DIM = 'rgba(255,255,255,0.045)';
  var HOVER = 'rgba(255,255,255,0.13)';
  var DOT = { live: '#6EE7A8', soon: '#5A6069', info: ACCENT, case: ACCENT };
  var LABEL = { live: 'Live', soon: 'Coming soon', info: 'Section', case: 'Case study' };

  // ---------- Content ----------
  // a: [startDeg, endDeg], clockwise from 12 o'clock.
  var MAIN = {
    pr: { name: 'Projects', st: 'info', a: [-60, 60], toggle: 'projects', text: 'Case studies of my product work, and the apps I build.', meta: 'Select to open' },
    ab: { name: 'About me', st: 'info', a: [60, 140], toggle: 'about', text: 'Product Manager based in Lisbon.', meta: 'MSc in progress · SAFe POPM 6.0' },
    cv: { name: 'CV', st: 'info', a: [140, 220], toggle: 'cv', text: 'My CV, on one page.', meta: 'Select to open' },
    ct: { name: 'Contact', st: 'info', a: [220, 300], toggle: 'contact', text: 'LinkedIn or email, whichever you prefer.', meta: 'Select to open' }
  };
  var HALVES = {
    hc: { name: 'Case studies', st: 'case', a: [300, 360], href: 'case-studies.html', text: 'How I worked through real product problems.', meta: 'Problem · decisions · outcome' },
    ha: { name: 'My apps', st: 'live', a: [0, 60], cat: 'apps', text: 'Small tools I designed, built and shipped.', meta: 'Running on obencelik.com' }
  };
  var ITEMS = {
    apps: {
      a1: { name: 'Job Analyser', st: 'live', a: [0, 60], href: 'apps.html#job-analyser', text: 'Searches LinkedIn jobs and uses AI to break down each role, its requirements and salary.', meta: 'Python · Flask · Gemini · Cloud Run' },
      a2: { name: 'Coming soon', st: 'soon', a: [60, 120], href: 'apps.html', text: 'The next tool in the pipeline, including AI agents.', meta: 'In the works' }
    }
  };
  var ABOUT = {
    ca: { name: 'Career', st: 'info', a: [60, 100], href: 'career.html', text: 'My career, year by year: from data centres to product.', meta: 'Work · education · certification' },
    pe: { name: 'Personal', st: 'info', a: [100, 140], href: 'personal.html', text: 'Off the clock: where I come from and what I do for fun.', meta: 'Istanbul → Lisbon · hobbies' }
  };
  var CVSUB = {
    vw: { name: 'View', st: 'info', a: [140, 180], href: 'Oben_Celik_CV.pdf', external: true, text: 'Open the PDF in a new tab.', meta: 'PDF · one page' },
    dl: { name: 'Download', st: 'info', a: [180, 220], href: 'Oben_Celik_CV.pdf', download: true, text: 'Save the PDF to your device.', meta: 'Oben_Celik_CV.pdf' }
  };
  var CONTACT = {
    li: { name: 'LinkedIn', st: 'info', a: [220, 260], href: 'https://www.linkedin.com/in/isa-oben-celik/', external: true, text: 'See my career so far and message me there.', meta: 'linkedin.com/in/isa-oben-celik' },
    em: { name: 'Email', st: 'info', a: [260, 300], href: 'mailto:isaobencelik@gmail.com', text: 'Write to me directly.', meta: 'isaobencelik@gmail.com' }
  };

  // Outer-ring items fan out around their category's centre, each `w` degrees wide.
  function fan(list, centre, w) {
    var keys = Object.keys(list), start = centre - keys.length * w / 2;
    keys.forEach(function (k, i) { list[k].a = [start + i * w, start + (i + 1) * w]; });
  }
  fan(ITEMS.apps, 30, 30); // both items sit exactly above My apps (0-60deg)

  // DOM order = tab order
  var ORDER = [
    ['pr', MAIN.pr, 'main'], ['hc', HALVES.hc, 'half'],
    ['ha', HALVES.ha, 'half'], ['a1', ITEMS.apps.a1, 'item:apps'], ['a2', ITEMS.apps.a2, 'item:apps'],
    ['ab', MAIN.ab, 'main'], ['ca', ABOUT.ca, 'sub:about'], ['pe', ABOUT.pe, 'sub:about'],
    ['cv', MAIN.cv, 'main'], ['vw', CVSUB.vw, 'sub:cv'], ['dl', CVSUB.dl, 'sub:cv'],
    ['ct', MAIN.ct, 'main'], ['li', CONTACT.li, 'sub:contact'], ['em', CONTACT.em, 'sub:contact']
  ];

  // ---------- State ----------
  var TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var STILL = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TURN_MS = 420;  // how long to wait for the turn before following a link
  var DWELL_MS = 1000;  // how long to rest on a section before it opens by itself
  var turn = 0;       // current rotation of the dial, in degrees
  var level = 'closed'; // closed | projects | cases | apps | contact
  var CURRENT = null;   // id of the wedge for the page you're on (null on the homepage)
  var active = null;

  // ---------- Geometry ----------
  function pt(deg, r) {
    var t = deg * Math.PI / 180;
    return { x: 50 + r * Math.sin(t), y: 50 - r * Math.cos(t) };
  }
  function arc(a0, a1, r0, r1) {
    var pts = [], n = Math.max(6, Math.round((a1 - a0) / 3)), i, p;
    for (i = 0; i <= n; i++) { p = pt(a0 + (a1 - a0) * i / n, r1); pts.push(p.x.toFixed(2) + '% ' + p.y.toFixed(2) + '%'); }
    for (i = n; i >= 0; i--) { p = pt(a0 + (a1 - a0) * i / n, r0); pts.push(p.x.toFixed(2) + '% ' + p.y.toFixed(2) + '%'); }
    return 'polygon(' + pts.join(', ') + ')';
  }

  // ---------- Build DOM once ----------
  var nav = document.getElementById('dial-nav');
  var dial = document.getElementById('dial');
  var els = {};
  var SVGNS = 'http://www.w3.org/2000/svg';
  var labelLayer = document.createElementNS(SVGNS, 'svg');
  labelLayer.setAttribute('viewBox', '0 0 100 100');
  labelLayer.setAttribute('class', 'labels');
  labelLayer.setAttribute('aria-hidden', 'true');
  var defs = document.createElementNS(SVGNS, 'defs');
  defs.innerHTML = '<linearGradient id="lbl-gold" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#F7E8C8"/><stop offset="0.55" stop-color="#D9B98A"/><stop offset="1" stop-color="#A9834E"/></linearGradient>';

  // Label look, set with data-label on #dial: "bezel" (default), "gold" or "serif"
  var LABEL_STYLES = {
    bezel: { size: 1.25, track: 0.22, base: '#F3EFE7', on: ACCENT },
    gold:  { size: 1.25, track: 0.22, base: 'url(#lbl-gold)', on: '#FFF6E4' },
    serif: { size: 1.5,  track: 0.14, base: '#F3EFE7', on: ACCENT }
  };
  function labelStyle() { return LABEL_STYLES[dial.getAttribute('data-label')] || LABEL_STYLES.bezel; }
  labelLayer.appendChild(defs);
  // Wedges and their labels sit in a rotor that turns as one piece; the centre circle stays still.
  var rotor = document.createElement('div');
  rotor.className = 'rotor';
  nav.parentNode.insertBefore(rotor, nav);
  rotor.appendChild(nav);
  rotor.appendChild(labelLayer);
  var pendingLabels = null;
  var unit = 6;

  ORDER.forEach(function (row) {
    var id = row[0], d = row[1];
    var el = document.createElement(d.href ? 'a' : 'button');
    el.className = 'wedge';
    if (d.href) {
      el.href = d.href;
      if (d.download) el.setAttribute('download', '');
      if (d.external) { el.target = '_blank'; el.rel = 'noopener'; }
    } else {
      el.type = 'button';
    }
    el.setAttribute('aria-label', d.name);
    var edge = document.createElement('span'); edge.className = 'edge';
    var edgeIn = document.createElement('span'); edgeIn.className = 'edge';
    var sweep = null;
    if (!d.href) { sweep = document.createElement('span'); sweep.className = 'sweep'; el.appendChild(sweep); }
    el.appendChild(edge); el.appendChild(edgeIn);
    // curved label: an arc path + text on that path, in the shared SVG layer
    var path = document.createElementNS(SVGNS, 'path');
    path.id = 'lp-' + id; path.setAttribute('fill', 'none');
    defs.appendChild(path);
    var text = document.createElementNS(SVGNS, 'text');
    text.setAttribute('class', 'curved');
    var tp = document.createElementNS(SVGNS, 'textPath');
    tp.setAttribute('href', '#lp-' + id); tp.setAttribute('startOffset', '50%');
    tp.textContent = d.name.toUpperCase();
    text.appendChild(tp); labelLayer.appendChild(text);
    el.addEventListener('mouseenter', function () { setActive(id); });
    el.addEventListener('focus', function () { setActive(id); });
    if (!d.href) {
      el.addEventListener('mousemove', function (ev) { onDwellMove(id, d, ev); });
      el.addEventListener('mouseleave', function () { cancelDwell(); clearTimeout(settle); lastMove = null; });
    }
    if (!d.href) el.addEventListener('click', function () { cancelDwell(); onToggle(id, d); });
    else el.addEventListener('click', function (ev) { followAfterTurn(ev, d); });
    nav.appendChild(el);
    els[id] = { el: el, edge: edge, edgeIn: edgeIn, sweep: sweep, path: path, text: text, geo: null };
  });

  dial.addEventListener('mouseleave', function () { setActive(null); });
  document.getElementById('core-back').addEventListener('click', back);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && level !== 'closed') back(); });

  function go(l) {
    level = l; active = null;
    labelLayer.style.opacity = 0;
    clearTimeout(pendingLabels);
    pendingLabels = setTimeout(function () { pendingLabels = null; render(); labelLayer.style.opacity = 1; }, 280);
    render();
  }
  function back() { turnTo(0); go(level === 'cases' || level === 'apps' ? 'projects' : 'closed'); }

  // Turn the dial the short way round so the given angle ends up at 12 o'clock.
  function turnTo(deg) {
    var delta = ((((-deg - turn) % 360) + 540) % 360) - 180;
    turn += delta;
    rotor.style.transform = 'rotate(' + turn + 'deg)';
  }
  function midOf(d) { return (d.a[0] + d.a[1]) / 2; }

  // Links: turn the wedge to the top first, then follow it.
  function followAfterTurn(ev, d) {
    if (STILL || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    turnTo(midOf(d));
    setTimeout(function () {
      var a = document.createElement('a');
      a.href = d.href;
      if (d.download) a.setAttribute('download', '');
      if (d.external) { a.target = '_blank'; a.rel = 'noopener'; }
      document.body.appendChild(a); a.click(); a.remove();
    }, TURN_MS);
  }
  function setActive(id) { if (active !== id) { active = id; render(); } }

  // Hover-to-open: resting on a section for DWELL_MS opens its sub-options, as a click would.
  // The countdown starts once the mouse settles (not while it sweeps across), and gold
  // fills the section from its inner edge outward as it runs, so you can see it coming and move away to cancel.
  // Only real mouse movement arms it: opening turns the dial, which slides a different wedge
  // under a still cursor, and that must not open it too.
  var SETTLE_SPEED = 0.35; // px per ms; slower than this counts as resting
  var dwell = null, settle = null, lastMove = null, still = null;
  function onDwellMove(id, d, ev) {
    if (TOUCH) return;
    if (still && Math.abs(ev.clientX - still.x) + Math.abs(ev.clientY - still.y) < 6) return;
    still = null;
    var pos = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp };
    var speed = lastMove && pos.t > lastMove.t
      ? Math.hypot(pos.x - lastMove.x, pos.y - lastMove.y) / (pos.t - lastMove.t) : 0;
    lastMove = pos;
    clearTimeout(settle);
    if (isOpen(d)) { cancelDwell(); return; } // already showing its sub-options
    if (speed > SETTLE_SPEED) {
      cancelDwell(); // still travelling: start over once it slows down or stops
      settle = setTimeout(function () { startDwell(id, d, pos); }, 120);
      return;
    }
    if (!dwell || dwell.id !== id) startDwell(id, d, pos);
  }
  function startDwell(id, d, pos) {
    cancelDwell();
    var e = els[id];
    if (!e.geo || !e.geo.shown) return;
    dwell = { id: id, start: performance.now(), raf: 0 };
    var g = e.geo;
    e.sweep.style.opacity = 1;
    (function step(now) {
      if (!dwell || dwell.id !== id) return;
      var p = Math.min(1, (now - dwell.start) / DWELL_MS);
      var ease = 1 - Math.pow(1 - p, 2);
      // fills outward, from the inner edge of the wedge to its outer edge
      e.sweep.style.clipPath = e.sweep.style.webkitClipPath = arc(g.a0, g.a1, g.r0, g.r0 + Math.max(0.2, (g.r1 - g.r0) * ease));
      if (p < 1) { dwell.raf = requestAnimationFrame(step); return; }
      cancelDwell();
      still = { x: pos.x, y: pos.y };
      onToggle(id, d);
    })(dwell.start);
  }
  function cancelDwell() {
    if (!dwell) return;
    cancelAnimationFrame(dwell.raf);
    var s = els[dwell.id].sweep;
    s.style.opacity = 0;
    dwell = null;
  }
  function isOpen(d) {
    if (d.toggle === 'projects') return level === 'projects' || level === 'cases' || level === 'apps';
    if (d.toggle) return level === d.toggle;
    return level === d.cat;
  }
  function onToggle(id, d) {
    var cat = level === 'cases' || level === 'apps' ? level : null;
    if (d.toggle === 'projects') { var openP = !(level === 'projects' || cat); turnTo(openP ? midOf(d) : 0); go(openP ? 'projects' : 'closed'); }
    else if (d.toggle) { var openX = level !== d.toggle; turnTo(openX ? midOf(d) : 0); go(openX ? d.toggle : 'closed'); } // Contact, CV
    else if (d.cat) { var into = cat !== d.cat; turnTo(into ? midOf(d) : 0); go(into ? d.cat : 'projects'); }
  }

  // ---------- Render ----------
  function render() {
    var cat = level === 'cases' || level === 'apps' ? level : null;
    var projOpen = level === 'projects' || !!cat;
    var contactOpen = level === 'contact';
    var cvOpen = level === 'cv';
    var aboutOpen = level === 'about';
    var subOpen = contactOpen || cvOpen || aboutOpen;
    var open = level !== 'closed';

    // Rings, from the inside out. Every level keeps the rings below it visible:
    //   ring 1: Projects · About me · CV · Contact   (always)
    //   ring 2: Case studies | My apps, or LinkedIn | Email
    //   ring 3: the items of the chosen category
    var depth = cat ? 2 : (projOpen || subOpen ? 1 : 0);
    var G = [
      { disk: 26, r1: [31.5, 49.5] },
      { disk: 22, r1: [23.5, 35], r2: [36, 49.5] },
      { disk: 17.5, r1: [19, 28], r2: [29, 38.5], r3: [39.5, 49.5] }
    ][depth];
    var g = { disk: G.disk, ticks: G.r1[0] - 0.6 };
    var band = function (r) { return { r0: r[0], r1: r[1], rl: (r[0] + r[1]) / 2 }; };
    var r2Hide = G.r2 ? G.r2[0] : G.r1[1];
    var r3Hide = G.r3 ? G.r3[0] : (G.r2 ? G.r2[1] : G.r1[1]);

    // label sizes in px (shrunk further per label if the text is longer than its arc)
    var W = dial.clientWidth || 600;
    var px = function (lo, hi, k) { return Math.max(lo, Math.min(hi, W * k)); };
    var size = [{ fs: px(10, 13, 0.021) }, { fs: px(9.5, 12, 0.019) }, { fs: px(9, 11, 0.017) }][depth];
    unit = W / 100; // px per viewBox unit

    var visible = {};

    ORDER.forEach(function (row) {
      var id = row[0], d = row[1], kind = row[2], o;
      if (kind === 'main') {
        var openHere = (id === 'pr' && projOpen) || (!!d.toggle && d.toggle !== 'projects' && level === d.toggle);
        o = Object.assign({ shown: true, hideR: G.r1[1], gap: 1.1, sel: openHere }, band(G.r1), size);
        if (d.toggle) els[id].el.setAttribute('aria-expanded', String(openHere));
      } else if (kind === 'half') {
        o = Object.assign({ shown: projOpen, hideR: r2Hide, gap: 1.1, sel: cat === d.cat }, G.r2 ? band(G.r2) : {}, size);
        if (d.cat) els[id].el.setAttribute('aria-expanded', String(cat === d.cat));
      } else if (kind.indexOf('sub:') === 0) {
        o = Object.assign({ shown: level === kind.slice(4), hideR: r2Hide, gap: 1.1 }, G.r2 ? band(G.r2) : {}, size);
      } else {
        o = Object.assign({ shown: cat === kind.split(':')[1], hideR: r3Hide, gap: 0.8 }, G.r3 ? band(G.r3) : {}, size);
      }
      visible[id] = o.shown;
      paint(id, d, o);
    });

    // centre
    var core = document.getElementById('core');
    core.style.left = core.style.top = (50 - g.disk) + '%';
    core.style.width = core.style.height = (g.disk * 2) + '%';
    var ticks = document.getElementById('ticks');
    ticks.style.left = ticks.style.top = (50 - g.ticks) + '%';
    ticks.style.width = ticks.style.height = (g.ticks * 2) + '%';

    var cur = active && visible[active] ? findDef(active) : null;
    var c;
    var here = CURRENT && level === levelFor(CURRENT) ? findDef(CURRENT) : null;
    if (here && !(cur && !cur.toggle)) {
      c = { dot: ACCENT, status: 'You are here', title: here.name,
            text: crumbsFor(CURRENT).length > 1 ? crumbsFor(CURRENT).map(function (x) { return x.name; }).join('  /  ') : here.text,
            meta: here.meta };
    }
    else if (cur && !cur.toggle) c = { dot: DOT[cur.st], status: LABEL[cur.st], title: cur.name, text: cur.text, meta: cur.meta };
    else if (contactOpen) c = { dot: '#6EE7A8', status: 'Contact', title: 'Get in touch', text: 'LinkedIn or email, whichever you prefer.', meta: 'Choose one' };
    else if (aboutOpen) c = { dot: ACCENT, status: 'About me', title: 'About me', text: 'My career so far, and a bit about me outside work.', meta: 'Choose one' };
    else if (cvOpen) c = { dot: ACCENT, status: 'CV', title: 'My CV', text: 'View it in your browser, or download the PDF.', meta: 'Choose one' };
    else if (cur) c = { dot: ACCENT, status: 'Section', title: cur.name, text: cur.text, meta: cur.meta };
    else if (cat) { var h = cat === 'cases' ? HALVES.hc : HALVES.ha; c = { dot: DOT[h.st], status: 'Projects', title: h.name, text: h.text, meta: h.meta }; }
    else if (open) c = { dot: ACCENT, status: 'Projects', title: 'Two ways in', text: 'Case studies on the left. My apps on the right.', meta: 'Choose a side' };
    else c = { dot: '#6EE7A8', status: 'Live', title: 'Portfolio', text: 'Oben Celik', meta: 'obencelik.com' };

    var dot = document.getElementById('core-dot');
    dot.style.background = c.dot; dot.style.boxShadow = '0 0 8px ' + c.dot;
    document.getElementById('core-status').textContent = c.status;
    document.getElementById('core-title').textContent = c.title;
    document.getElementById('core-text').textContent = c.text;
    document.getElementById('core-meta').textContent = c.meta;
    core.style.borderColor = cur || open ? 'rgba(212,180,131,0.55)' : 'rgba(243,239,231,0.12)';
    var backBtn = document.getElementById('core-back');
    backBtn.hidden = !open;
    backBtn.textContent = cat ? 'Back' : 'Close';

    fitCore(g.disk * 2 / 100 * W);

    var hintEl = document.getElementById('hint');
    if (hintEl) hintEl.textContent = cat ? 'Choose one, or switch sides'
      : contactOpen ? 'LinkedIn or email'
      : cvOpen ? 'View or download'
      : aboutOpen ? 'Career or personal'
      : open ? 'Case studies on the left · My apps on the right'
      : (TOUCH ? 'Tap a section to explore' : 'Hover to explore');
  }

  // Size the centre content to the circle's final diameter (not mid-animation), then shrink until it fits.
  function fitCore(D) {
    var inner = document.getElementById('core-inner');
    var s = Math.max(0.55, Math.min(1, D / 300));
    inner.style.width = Math.round(D * 0.7) + 'px';
    inner.style.setProperty('--s', s.toFixed(3));
    var limit = D * 0.72, guard = 0;
    while (inner.offsetHeight > limit && s > 0.5 && guard++ < 12) {
      s *= 0.93;
      inner.style.setProperty('--s', s.toFixed(3));
    }
  }

  function findDef(id) {
    for (var i = 0; i < ORDER.length; i++) if (ORDER[i][0] === id) return ORDER[i][1];
    return null;
  }

  function paint(id, d, o) {
    var e = els[id];
    var a0 = d.a[0] + o.gap, a1 = d.a[1] - o.gap;
    var r0 = o.shown ? o.r0 : o.hideR, r1 = o.shown ? o.r1 : o.hideR;
    var mid = (a0 + a1) / 2;
    var l = pt(mid, o.shown ? o.rl : o.hideR);
    var hov = active === id, sel = !!o.sel || (id === CURRENT && o.shown);

    var m = ((mid % 360) + 360) % 360;
    e.geo = { a0: a0, a1: a1, r0: r0, r1: r1, shown: o.shown };

    e.el.style.clipPath = arc(a0, a1, r0, r1);
    e.el.style.webkitClipPath = e.el.style.clipPath;
    e.el.style.pointerEvents = o.shown ? 'auto' : 'none';
    e.el.tabIndex = o.shown ? 0 : -1;
    e.el.setAttribute('aria-hidden', String(!o.shown));
    e.el.style.backgroundColor = sel ? SEL_BG : (hov ? HOVER : (d.st === 'soon' ? GLASS_DIM : GLASS));
    e.el.style.color = (hov || sel) ? ACCENT : (d.st === 'soon' ? '#5A6069' : '#E6E1D8');

    // Gold rim on every wedge; hover/selected gets a thicker, brighter rim so it still stands out
    var rim = (hov || sel) ? 0.6 : 0.28;
    e.edge.style.clipPath = arc(a0, a1, Math.max(r0, r1 - rim), r1);
    e.edge.style.webkitClipPath = e.edge.style.clipPath;
    e.edge.style.opacity = (hov || sel) ? 1 : (o.shown ? 0.38 : 0);
    // and the same rim along the inner edge of the wedge
    var rimIn = (hov || sel) ? 0.45 : 0.22;
    e.edgeIn.style.clipPath = arc(a0, a1, r0, Math.min(r1, r0 + rimIn));
    e.edgeIn.style.webkitClipPath = e.edgeIn.style.clipPath;
    e.edgeIn.style.opacity = e.edge.style.opacity;

    if (pendingLabels) return; // labels are redrawn once the rings have finished moving
    var r = o.shown ? o.rl : o.hideR;
    // Labels run clockwise, except in the lower part of the dial (where it has turned to now),
    // which run the other way so they read upright instead of upside down.
    var onScreen = (((mid + turn) % 360) + 360) % 360;
    var bottom = onScreen > 110 && onScreen < 250;
    var la0 = a0 + 1.5, la1 = a1 - 1.5;
    var p0 = pt(bottom ? la1 : la0, r), p1 = pt(bottom ? la0 : la1, r);
    var large = (la1 - la0) > 180 ? 1 : 0;
    e.path.setAttribute('d', 'M ' + p0.x.toFixed(3) + ' ' + p0.y.toFixed(3) + ' A ' + r + ' ' + r + ' 0 ' + large + ' ' + (bottom ? 0 : 1) + ' ' + p1.x.toFixed(3) + ' ' + p1.y.toFixed(3));
    var LS = labelStyle();
    var fsU = o.fs * LS.size / unit;
    e.text.style.fontSize = fsU + 'px';
    e.text.style.letterSpacing = (fsU * LS.track) + 'px';
    e.text.style.opacity = o.shown ? 1 : 0;
    e.text.style.fill = (hov || sel) ? LS.on : (d.st === 'soon' ? '#6E747D' : LS.base);
    if (o.shown) {
      var avail = (r * Math.PI * (la1 - la0) / 180) * 0.9;
      var len = e.text.getComputedTextLength();
      if (len > avail && len > 0) {
        var k = avail / len;
        e.text.style.fontSize = (fsU * k) + 'px';
        e.text.style.letterSpacing = (fsU * k * LS.track) + 'px';
      }
    }
  }

  // ---------- Where am I? (breadcrumbs) ----------
  // A page says which wedge it is with data-current on <body> (e.g. "ha" for My apps);
  // a #hash that matches a wedge's link (e.g. apps.html#job-analyser) narrows it to that item.
  function kindOf(id) { for (var i = 0; i < ORDER.length; i++) if (ORDER[i][0] === id) return ORDER[i][2]; return null; }
  function levelFor(id) {
    var k = kindOf(id);
    if (id === 'hc') return 'projects'; // the Case studies page: Projects open, Case studies highlighted
    if (k === 'item:apps' || id === 'ha') return 'apps';
    if (k && k.indexOf('sub:') === 0) return k.slice(4);
    var d = findDef(id);
    if (d && d.toggle && d.toggle !== 'projects') return d.toggle; // e.g. the About page opens the About ring
    return 'closed';
  }
  function crumbsFor(id) {
    var k = kindOf(id), chain = [];
    if (k === 'item:apps') chain = ['pr', 'ha', id];
    else if (k === 'half') chain = ['pr', id];
    else if (k && k.indexOf('sub:') === 0) chain = [{ contact: 'ct', cv: 'cv', about: 'ab' }[k.slice(4)], id];
    else if (k) chain = [id];
    var pages = { hc: 'case-studies.html', ha: 'apps.html', ab: 'about.html' };
    return chain.map(function (c) { var d = findDef(c); return { id: c, name: d.name, href: pages[c] || d.href || null }; });
  }
  function currentFromPage() {
    var file = (location.pathname.split('/').pop() || 'index.html') + location.hash;
    for (var i = 0; i < ORDER.length; i++) {
      var h = ORDER[i][1].href;
      if (h && h.indexOf('#') > 0 && h === file) return ORDER[i][0];
    }
    return document.body.getAttribute('data-current') || null;
  }
  // Put the dial back at "you are here": that level open, that wedge turned to the top, no animation.
  function resetToCurrent() {
    CURRENT = currentFromPage();
    level = CURRENT ? levelFor(CURRENT) : 'closed';
    active = null;
    rotor.style.transition = 'none';
    turnTo(CURRENT ? midOf(findDef(CURRENT)) : 0);
    void rotor.offsetWidth; // apply the jump before turning transitions back on
    rotor.style.transition = '';
    render();
  }
  window.dialReset = resetToCurrent;
  window.dialCrumbs = function () { var id = currentFromPage(); return id ? crumbsFor(id) : []; };
  window.addEventListener('hashchange', resetToCurrent);

  window.addEventListener('resize', render);
  resetToCurrent();
})();
