// The name at the top of the homepage, drawn on a canvas that can break apart into gold dots.
// Every dot owns a small square of a letter. While a dot sits at home, that square shows as part
// of the solid letter; when a dot is away, its square is cut out of the letter and the dot is
// drawn where it is. So:
//  - on load, the dots fly in from a loose cloud and each square turns solid as its dot lands;
//  - clicking the name blows every dot far out across the page, then they drift back into it.
// The canvas covers the first screen of the page (above the dial, never catching clicks), so the
// dots have room to fly. The real link stays in the page (transparent) for screen readers.
(function () {
  'use strict';

  var brand = document.querySelector('.brand');
  if (!brand) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var COLOR = '212, 180, 131';
  var STEP = 2;                  // each dot owns a STEP x STEP square of a letter
  var DOT = 1.8;                 // dot size in px
  var CLOUD = 80;                // on load, dots start up to about this far from their letter
  var STAGGER_MS = 450;          // on load, dots set off up to this long after the first
  // springs pulling the dots home: soft while gathering (for gather.ms), firm after so they settle
  var ENTRANCE = { spring: 0.03, damp: 0.86, ms: 1800 };
  var RETURN = { spring: 0.012, damp: 0.9, ms: 3400 }; // after the click: a slower drift back
  var FIRM = { spring: 0.12, damp: 0.72 };
  var HOME = 0.6;                // closer than this (px) to its home, a dot counts as back in the letter
  var BLOW_MS = 650, BLOW_SPEED = [14, 34], BLOW_DAMP = 0.955; // the click: fly out for about this long
  var RETURN_STAGGER_MS = 900;   // and head back up to this long after the first

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'name-dots';
  var ctx = canvas.getContext('2d');
  var letters = document.createElement('canvas'); // the solid name, drawn once
  var dots = [], box = null, text = null, running = false, dpr = 1;
  var gather = ENTRANCE, gatherFrom = 0; // which soft spring is pulling them home, and since when

  // Draw the name exactly where the page draws it (same font, spacing, kerning and baseline),
  // in page coordinates.
  function drawName(o, scale) {
    var cs = getComputedStyle(brand);
    var range = document.createRange();
    range.selectNodeContents(brand);
    var tr = range.getBoundingClientRect(); // the text itself, inside the link's padding
    var str = (brand.textContent || '').trim();
    if (cs.textTransform === 'uppercase') str = str.toUpperCase();
    o.setTransform(scale, 0, 0, scale, 0, 0);
    o.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    o.textBaseline = 'alphabetic';
    o.fillStyle = 'rgb(' + COLOR + ')';
    var track = parseFloat(cs.letterSpacing) || 0;
    var x = tr.left + window.scrollX, top = tr.top + window.scrollY;
    var y = top + o.measureText(str).fontBoundingBoxAscent;
    if ('letterSpacing' in o) {
      o.letterSpacing = track + 'px';
      o.fillText(str, x, y);
    } else { // older browsers: letter by letter
      for (var i = 0; i < str.length; i++) { o.fillText(str[i], x, y); x += o.measureText(str[i]).width + track; }
    }
    text = { x0: tr.left + window.scrollX, y0: top, x1: tr.right + window.scrollX, y1: top + tr.height };
  }

  function build(entrance) {
    dpr = window.devicePixelRatio || 1;
    box = { w: document.documentElement.clientWidth, h: window.innerHeight };
    canvas.width = Math.round(box.w * dpr); canvas.height = Math.round(box.h * dpr);
    canvas.style.width = box.w + 'px'; canvas.style.height = box.h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // the solid name at screen resolution; the dots' squares are sampled from this same image
    letters.width = canvas.width; letters.height = canvas.height;
    var lc = letters.getContext('2d');
    drawName(lc, dpr);
    var LW = letters.width, LH = letters.height;
    var sx0 = Math.max(0, Math.floor(text.x0 - 4)), sy0 = Math.max(0, Math.floor(text.y0 - 4));
    var sx1 = Math.min(box.w, Math.ceil(text.x1 + 4)), sy1 = Math.min(box.h, Math.ceil(text.y1 + 4));
    var ox = Math.floor(sx0 * dpr), oy = Math.floor(sy0 * dpr);
    var data = lc.getImageData(ox, oy, Math.ceil(sx1 * dpr) - ox, Math.ceil(sy1 * dpr) - oy);
    var DW = data.width, DH = data.height, px8 = data.data;

    // a square becomes a dot if any screen pixel in it has any ink, so the soft edges of the
    // letters move too (instead of staying behind as a faint outline)
    function inked(px, py) {
      var y1 = Math.min(Math.ceil((py + STEP) * dpr) + 1 - oy, DH), x1 = Math.min(Math.ceil((px + STEP) * dpr) + 1 - ox, DW);
      for (var y = Math.max(0, Math.floor(py * dpr) - 1 - oy); y < y1; y++) {
        for (var x = Math.max(0, Math.floor(px * dpr) - 1 - ox); x < x1; x++) if (px8[(y * DW + x) * 4 + 3] > 6) return true;
      }
      return false;
    }

    var now = performance.now();
    dots = [];
    for (var py = sy0; py < sy1; py += STEP) {
      for (var px = sx0; px < sx1; px += STEP) {
        if (!inked(px, py)) continue;
        // on the entrance, start in a loose cloud around its letter and fade in on the way
        var ang = Math.random() * Math.PI * 2, far = 25 + Math.pow(Math.random(), 0.6) * CLOUD * 2;
        var hx = px + STEP / 2, hy = py + STEP / 2;
        dots.push({
          hx: hx, hy: hy,
          x: entrance ? hx + Math.cos(ang) * far * 1.6 : hx,
          y: entrance ? hy + Math.sin(ang) * far : hy,
          vx: 0, vy: 0,
          t0: entrance ? now + Math.random() * STAGGER_MS : 0, // held still (and faded) until then
          fly: 0,                                                // flying free (no spring) until then
          a: 0.85 + Math.random() * 0.15,
          out: entrance // away from home: its square is cut out of the letter
        });
      }
    }
    gather = ENTRANCE;
    gatherFrom = entrance ? now : now - ENTRANCE.ms;
    draw(now);
    if (entrance) wake();
  }

  // The click: every dot shoots off across the page (sideways and down, where it can be seen),
  // flies free for a moment, then they all drift slowly back into the name.
  function blow() {
    var now = performance.now();
    var cx = (text.x0 + text.x1) / 2, cy = (text.y0 + text.y1) / 2;
    dots.forEach(function (d) {
      var ang = Math.atan2(d.hy - cy, d.hx - cx) * 0.35 + (Math.random() - 0.5) * 2.6 + Math.PI / 2;
      var speed = BLOW_SPEED[0] + Math.random() * (BLOW_SPEED[1] - BLOW_SPEED[0]);
      d.vx = Math.cos(ang) * speed * (d.hx < cx ? -1 : 1) * (0.6 + Math.random());
      d.vy = Math.abs(Math.sin(ang)) * speed;
      d.out = true;
      d.t0 = 0;
      d.fly = now + BLOW_MS + Math.random() * RETURN_STAGGER_MS;
    });
    gather = RETURN;
    gatherFrom = now + BLOW_MS;
    wake();
  }

  function draw(now) {
    ctx.clearRect(0, 0, box.w, box.h);
    ctx.drawImage(letters, 0, 0, box.w, box.h);
    // cut out the squares whose dots are away, then draw those dots where they are
    var i, d;
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      if (d.out) ctx.clearRect(d.hx - STEP / 2 - 1, d.hy - STEP / 2 - 1, STEP + 2, STEP + 2);
    }
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      if (!d.out) continue;
      var fade = d.t0 ? Math.max(0, Math.min(1, (now - d.t0 + 150) / 700)) : 1;
      ctx.fillStyle = 'rgba(' + COLOR + ',' + (d.a * fade) + ')';
      ctx.fillRect(d.x - DOT / 2, d.y - DOT / 2, DOT, DOT);
    }
  }

  function frame(now) {
    var k = now - gatherFrom < gather.ms ? gather : FIRM;
    var any = false;
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (now < d.t0) { any = true; continue; }
      if (now < d.fly) { // blown: flying free, slowing down
        d.vx *= BLOW_DAMP; d.vy *= BLOW_DAMP;
        d.x += d.vx; d.y += d.vy;
        any = true;
        continue;
      }
      if (!d.out) continue; // at home: part of the solid letter
      d.vx += (d.hx - d.x) * k.spring;
      d.vy += (d.hy - d.y) * k.spring;
      d.vx *= k.damp; d.vy *= k.damp;
      d.x += d.vx; d.y += d.vy;
      var home = Math.abs(d.hx - d.x) + Math.abs(d.hy - d.y) < HOME && Math.abs(d.vx) + Math.abs(d.vy) < 0.1;
      if (home) { d.x = d.hx; d.y = d.hy; d.vx = d.vy = 0; d.out = false; }
      else { d.out = true; any = true; }
    }
    draw(now);
    if (any) requestAnimationFrame(frame);
    else running = false; // everything is home: nothing to animate until the next click
  }
  function wake() { if (!running) { running = true; requestAnimationFrame(frame); } }

  window.addEventListener('resize', function () { if (box) build(false); });

  // On the homepage the name links to the page you're already on: a plain click plays the
  // blow instead of reloading. (Ctrl/Cmd/Shift-click still opens it as a link.)
  brand.addEventListener('click', function (ev) {
    if (!box || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    ev.preventDefault();
    blow();
  });

  // Hide the plain text straight away (no flash of it), then wait for the web font so the
  // canvas draws the real letters.
  brand.classList.add('as-dots');
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
    document.body.appendChild(canvas);
    build(true);
  });
})();
