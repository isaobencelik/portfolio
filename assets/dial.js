// Radial homepage menu.
// Levels: closed -> projects (Case studies | My apps) -> cases / apps (items on the outer ring)
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
    ab: { name: 'About me', st: 'info', a: [60, 140], href: 'about.html', text: 'Product Manager based in Lisbon.', meta: 'MSc in progress · SAFe POPM 6.0' },
    cv: { name: 'CV', st: 'info', a: [140, 220], href: 'Oben_Celik_CV.pdf', download: true, text: 'My CV, on one page.', meta: 'PDF download' },
    ct: { name: 'Contact', st: 'info', a: [220, 300], toggle: 'contact', text: 'LinkedIn or email, whichever you prefer.', meta: 'Select to open' }
  };
  var HALVES = {
    hc: { name: 'Case studies', st: 'case', a: [300, 360], cat: 'cases', text: 'How I worked through real product problems.', meta: 'Problem · decisions · outcome' },
    ha: { name: 'My apps', st: 'live', a: [0, 60], cat: 'apps', text: 'Small tools I designed, built and shipped.', meta: 'Running on obencelik.com' }
  };
  var ITEMS = {
    cases: {
      c1: { name: 'CX consolidation', st: 'case', a: [315, 360], href: 'case-studies.html#cx-consolidation', text: 'Unified fragmented CX systems and legacy robotics workflows into one scalable strategy.', meta: 'CX platform strategy · Europe' },
      c2: { name: 'Omnichannel', st: 'case', a: [270, 315], href: 'case-studies.html#omnichannel', text: 'Standardised Salesforce case distribution across EMEA.', meta: '70% more automation · 50% less wait' },
      c3: { name: 'Platform redesign', st: 'case', a: [225, 270], href: 'case-studies.html#platform-redesign', text: 'Redesigned a global helpdesk platform used in 70+ countries.', meta: '95% session success · 30% faster' },
      c4: { name: 'Prioritisation', st: 'case', a: [180, 225], href: 'case-studies.html#prioritisation', text: 'Turned enterprise pain points into clear product problems and priorities.', meta: 'Roadmap alignment' }
    },
    apps: {
      a1: { name: 'Job Analyser', st: 'live', a: [0, 60], href: 'apps.html#job-analyser', text: 'Searches LinkedIn jobs and uses AI to break down each role, its requirements and salary.', meta: 'Python · Flask · Gemini · Cloud Run' },
      a2: { name: 'Coming soon', st: 'soon', a: [60, 120], href: 'apps.html', text: 'The next tool in the pipeline, including AI agents.', meta: 'In the works' }
    }
  };
  var CONTACT = {
    li: { name: 'LinkedIn', st: 'info', a: [220, 260], href: 'https://www.linkedin.com/in/isa-oben-celik/', external: true, text: 'See my career so far and message me there.', meta: 'linkedin.com/in/isa-oben-celik' },
    em: { name: 'Email', st: 'info', a: [260, 300], href: 'mailto:isaobencelik@gmail.com', text: 'Write to me directly.', meta: 'isaobencelik@gmail.com' }
  };

  // DOM order = tab order
  var ORDER = [
    ['pr', MAIN.pr, 'main'], ['hc', HALVES.hc, 'half'],
    ['c1', ITEMS.cases.c1, 'item:cases'], ['c2', ITEMS.cases.c2, 'item:cases'], ['c3', ITEMS.cases.c3, 'item:cases'], ['c4', ITEMS.cases.c4, 'item:cases'],
    ['ha', HALVES.ha, 'half'], ['a1', ITEMS.apps.a1, 'item:apps'], ['a2', ITEMS.apps.a2, 'item:apps'],
    ['ab', MAIN.ab, 'main'], ['cv', MAIN.cv, 'main'], ['ct', MAIN.ct, 'main'],
    ['li', CONTACT.li, 'contact'], ['em', CONTACT.em, 'contact']
  ];

  // ---------- State ----------
  var TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var STILL = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TURN_MS = 650;  // how long to wait for the turn before following a link
  var turn = 0;       // current rotation of the dial, in degrees
  var level = 'closed'; // closed | projects | cases | apps | contact
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
    el.appendChild(edge);
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
    if (!d.href) el.addEventListener('click', function () { onToggle(id, d); });
    else el.addEventListener('click', function (ev) { followAfterTurn(ev, d); });
    nav.appendChild(el);
    els[id] = { el: el, edge: edge, path: path, text: text };
  });

  dial.addEventListener('mouseleave', function () { setActive(null); });
  document.getElementById('core-back').addEventListener('click', back);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && level !== 'closed') back(); });

  function go(l) {
    level = l; active = null;
    labelLayer.style.opacity = 0;
    clearTimeout(pendingLabels);
    pendingLabels = setTimeout(function () { pendingLabels = null; render(); labelLayer.style.opacity = 1; }, 420);
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
  function onToggle(id, d) {
    var cat = level === 'cases' || level === 'apps' ? level : null;
    if (d.toggle === 'projects') { var openP = level === 'closed' || level === 'contact'; turnTo(openP ? midOf(d) : 0); go(openP ? 'projects' : 'closed'); }
    else if (d.toggle === 'contact') { var openC = level !== 'contact'; turnTo(openC ? midOf(d) : 0); go(openC ? 'contact' : 'closed'); }
    else if (d.cat) { var into = cat !== d.cat; turnTo(into ? midOf(d) : 0); go(into ? d.cat : 'projects'); }
  }

  // ---------- Render ----------
  function render() {
    var cat = level === 'cases' || level === 'apps' ? level : null;
    var projOpen = level === 'projects' || !!cat;
    var contactOpen = level === 'contact';
    var open = level !== 'closed';

    var g = cat
      ? { in0: 24.5, in1: 34.5, inL: 29.6, disk: 20, ticks: 23.8 }
      : { in0: 31.5, in1: 49.5, inL: 40.5, disk: 26, ticks: 30.8 };
    var OUT0 = 35.5, OUT1 = 49.5, OUTL = 42.5;

    // label sizes in px (shrunk further per label if the text is longer than its arc)
    var W = dial.clientWidth || 600;
    var px = function (lo, hi, k) { return Math.max(lo, Math.min(hi, W * k)); };
    var big = { fs: px(10, 13, 0.021) };
    var split = { fs: px(9.5, 12, 0.019) };
    var small = { fs: px(9, 11, 0.017) };
    var outer = { fs: px(9.5, 12, 0.019) };
    unit = W / 100; // px per viewBox unit

    var visible = {};

    ORDER.forEach(function (row) {
      var id = row[0], d = row[1], kind = row[2], o;
      if (kind === 'main') {
        var hide = (id === 'pr' && projOpen) || (id === 'ct' && contactOpen);
        o = Object.assign({ shown: !hide, r0: g.in0, r1: g.in1, rl: g.inL, hideR: g.in1, gap: 1.1 }, cat ? small : big);
        if (d.toggle) els[id].el.setAttribute('aria-expanded', String(d.toggle === 'projects' ? projOpen : contactOpen));
      } else if (kind === 'half') {
        o = Object.assign({ shown: projOpen, r0: g.in0, r1: g.in1, rl: g.inL, hideR: g.in0, gap: 1.1, sel: cat === d.cat }, cat ? small : split);
        els[id].el.setAttribute('aria-expanded', String(cat === d.cat));
      } else if (kind === 'contact') {
        o = Object.assign({ shown: contactOpen, r0: g.in0, r1: g.in1, rl: g.inL, hideR: g.in0, gap: 1.1 }, split);
      } else {
        o = Object.assign({ shown: cat === kind.split(':')[1], r0: OUT0, r1: OUT1, rl: OUTL, hideR: OUT0, gap: 0.8 }, outer);
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
    if (cur && active !== 'pr' && active !== 'ct') c = { dot: DOT[cur.st], status: LABEL[cur.st], title: cur.name, text: cur.text, meta: cur.meta };
    else if (contactOpen) c = { dot: '#6EE7A8', status: 'Contact', title: 'Get in touch', text: 'LinkedIn or email, whichever you prefer.', meta: 'Choose one' };
    else if (cur) c = { dot: ACCENT, status: 'Section', title: cur.name, text: cur.text, meta: cur.meta };
    else if (cat) { var h = cat === 'cases' ? HALVES.hc : HALVES.ha; c = { dot: DOT[h.st], status: 'Projects', title: h.name, text: h.text, meta: h.meta }; }
    else if (open) c = { dot: ACCENT, status: 'Projects', title: 'Two ways in', text: 'Case studies on the left. My apps on the right.', meta: 'Choose a side' };
    else c = { dot: '#6EE7A8', status: 'Available', title: 'Oben Celik', text: 'Product Manager who builds. Start with Projects.', meta: 'obencelik.com' };

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

    document.getElementById('hint').textContent = cat ? 'Choose one, or switch sides'
      : contactOpen ? 'LinkedIn or email'
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
    var hov = active === id, sel = !!o.sel;

    var m = ((mid % 360) + 360) % 360;

    e.el.style.clipPath = arc(a0, a1, r0, r1);
    e.el.style.webkitClipPath = e.el.style.clipPath;
    e.el.style.pointerEvents = o.shown ? 'auto' : 'none';
    e.el.tabIndex = o.shown ? 0 : -1;
    e.el.setAttribute('aria-hidden', String(!o.shown));
    e.el.style.backgroundColor = sel ? SEL_BG : (hov ? HOVER : (d.st === 'soon' ? GLASS_DIM : GLASS));
    e.el.style.color = (hov || sel) ? ACCENT : (d.st === 'soon' ? '#5A6069' : '#E6E1D8');

    e.edge.style.clipPath = arc(a0, a1, Math.max(r0, r1 - 0.45), r1);
    e.edge.style.webkitClipPath = e.edge.style.clipPath;
    e.edge.style.opacity = (hov || sel) ? 1 : (o.shown ? 0.22 : 0); // faint rim always, full on hover/selected

    if (pendingLabels) return; // labels are redrawn once the rings have finished moving
    var r = o.shown ? o.rl : o.hideR;
    var bottom = false; // every label runs clockwise around the dial
    var la0 = a0 + 1.5, la1 = a1 - 1.5;
    var p0 = pt(bottom ? la1 : la0, r), p1 = pt(bottom ? la0 : la1, r);
    var large = (la1 - la0) > 180 ? 1 : 0;
    e.path.setAttribute('d', 'M ' + p0.x.toFixed(3) + ' ' + p0.y.toFixed(3) + ' A ' + r + ' ' + r + ' 0 ' + large + ' ' + (bottom ? 0 : 1) + ' ' + p1.x.toFixed(3) + ' ' + p1.y.toFixed(3));
    var fsU = o.fs / unit;
    e.text.style.fontSize = fsU + 'px';
    e.text.style.letterSpacing = (fsU * 0.18) + 'px';
    e.text.style.opacity = o.shown ? 1 : 0;
    e.text.style.fill = (hov || sel) ? ACCENT : (d.st === 'soon' ? '#5A6069' : '#E6E1D8');
    if (o.shown) {
      var avail = (r * Math.PI * (la1 - la0) / 180) * 0.9;
      var len = e.text.getComputedTextLength();
      if (len > avail && len > 0) {
        var k = avail / len;
        e.text.style.fontSize = (fsU * k) + 'px';
        e.text.style.letterSpacing = (fsU * k * 0.18) + 'px';
      }
    }
  }

  window.addEventListener('resize', render);
  render();
})();
