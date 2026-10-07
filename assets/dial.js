// Radial homepage menu.
// Levels: closed -> projects (Case studies | My apps) -> cases / apps (items on the outer ring)
//         closed -> contact (LinkedIn | Email)
(function () {
  'use strict';

  var ACCENT = '#D4B483';
  var SEL_BG = 'rgba(212,180,131,0.12)';
  var GLASS = 'rgba(255,255,255,0.035)';
  var HOVER = 'rgba(255,255,255,0.075)';
  var DOT = { live: '#6EE7A8', soon: '#5A6069', info: ACCENT, case: ACCENT };
  var LABEL = { live: 'Live', soon: 'Coming soon', info: 'Section', case: 'Case study' };

  // ---------- Content ----------
  // a: [startDeg, endDeg], clockwise from 12 o'clock.
  var MAIN = {
    pr: { name: 'Projects', st: 'info', a: [-60, 60], toggle: 'projects', text: 'Case studies of my product work, and the apps I build.', meta: 'Select to open' },
    ab: { name: 'About me', st: 'info', a: [60, 140], href: 'about.html', text: 'Product Owner in Lisbon. Moved from IT support into product.', meta: 'SAFe POPM 6.0' },
    cv: { name: 'CV', st: 'info', a: [140, 220], href: 'Oben_Celik_CV.pdf', download: true, text: 'The short version, on one page.', meta: 'PDF download' },
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
    var edge = document.createElement('span'); edge.className = 'edge';
    var lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = d.name;
    el.appendChild(edge); el.appendChild(lbl);
    el.addEventListener('mouseenter', function () { setActive(id); });
    el.addEventListener('focus', function () { setActive(id); });
    if (!d.href) el.addEventListener('click', function () { onToggle(id, d); });
    nav.appendChild(el);
    els[id] = { el: el, edge: edge, lbl: lbl };
  });

  dial.addEventListener('mouseleave', function () { setActive(null); });
  document.getElementById('core-back').addEventListener('click', back);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && level !== 'closed') back(); });

  function go(l) { level = l; active = null; render(); }
  function back() { go(level === 'cases' || level === 'apps' ? 'projects' : 'closed'); }
  function setActive(id) { if (active !== id) { active = id; render(); } }
  function onToggle(id, d) {
    var cat = level === 'cases' || level === 'apps' ? level : null;
    if (d.toggle === 'projects') go(level === 'closed' || level === 'contact' ? 'projects' : 'closed');
    else if (d.toggle === 'contact') go(level === 'contact' ? 'closed' : 'contact');
    else if (d.cat) go(cat === d.cat ? 'projects' : d.cat);
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

    // On narrow screens the straight labels don't fit the side wedges, so they follow the arc instead.
    var narrow = dial.clientWidth < 480;
    var big = narrow ? { lw: 'auto', fs: '11px', tangent: true } : { lw: '22%', fs: 'clamp(10px, 1.5vw, 13px)' };
    var split = { lw: '18%', fs: 'clamp(9px, 1.35vw, 12px)' };
    var small = { lw: 'auto', fs: 'clamp(9px, 1.25vw, 11px)', tangent: true };
    var outer = { lw: 'auto', fs: 'clamp(9px, 1.3vw, 12px)', tangent: true };

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
    else c = { dot: '#6EE7A8', status: 'Available', title: 'Oben Celik', text: 'Product Owner who also builds. Start with Projects.', meta: 'obencelik.com' };

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

    document.getElementById('hint').textContent = cat ? 'Choose one, or switch sides'
      : contactOpen ? 'LinkedIn or email'
      : open ? 'Case studies on the left · My apps on the right'
      : (TOUCH ? 'Tap a section to explore' : 'Hover to explore');
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
    var rot = o.tangent ? ((m > 90 && m < 270) ? m - 180 : m) : 0;

    e.el.style.clipPath = arc(a0, a1, r0, r1);
    e.el.style.webkitClipPath = e.el.style.clipPath;
    e.el.style.pointerEvents = o.shown ? 'auto' : 'none';
    e.el.tabIndex = o.shown ? 0 : -1;
    e.el.setAttribute('aria-hidden', String(!o.shown));
    e.el.style.backgroundColor = sel ? SEL_BG : (hov ? HOVER : GLASS);
    e.el.style.color = (hov || sel) ? ACCENT : (d.st === 'soon' ? '#5A6069' : '#E6E1D8');

    e.edge.style.clipPath = arc(a0, a1, Math.max(r0, r1 - 0.45), r1);
    e.edge.style.webkitClipPath = e.edge.style.clipPath;
    e.edge.style.opacity = (hov || sel) ? 1 : 0;

    e.lbl.style.left = l.x.toFixed(2) + '%';
    e.lbl.style.top = l.y.toFixed(2) + '%';
    e.lbl.style.width = o.lw;
    e.lbl.style.whiteSpace = o.tangent ? 'nowrap' : 'normal';
    e.lbl.style.letterSpacing = o.tangent ? '0.16em' : '0.2em';
    e.lbl.style.fontSize = o.fs;
    e.lbl.style.opacity = o.shown ? 1 : 0;
    e.lbl.style.transform = 'translate(-50%, -50%) rotate(' + rot.toFixed(1) + 'deg)';
  }

  window.addEventListener('resize', render);
  render();
})();
