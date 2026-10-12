// The homepage greeting: a shooting star falls in from the top left, writes "Welcome to my
// portfolio" in gold as it sweeps across, and flies off. The words stay a moment, then fade, and
// the band they sat in folds away so the dial below grows into the space (--band, see index.html).
// Once per visit (sessionStorage, set by the inline script in index.html's <head>); a click, tap
// or key clears it straight away. With reduced motion it never runs.
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.classList.contains('welcome')) return;
  var band = document.querySelector('.site-header');
  if (!band) { root.classList.remove('welcome'); return; }

  var TEXT = 'Welcome to my portfolio';
  var GOLD = [[0, '#F1DFB8'], [0.5, '#D4B483'], [1, '#B08C58']]; // satin gold, top to bottom
  // the timeline, in ms from the start
  var FALL = 650;        // the star drops in to where the writing starts
  var WRITE = 1700;      // then sweeps across, writing
  var LEAVE = 500;       // then flies off up and to the right
  var HOLD = 1100;       // the words stay this long after the star has gone
  var FADE = 800;        // and fade
  var T_WRITE = FALL, T_LEAVE = FALL + WRITE, T_FADE = T_LEAVE + LEAVE + HOLD, T_END = T_FADE + FADE;

  var canvas = document.createElement('canvas');
  canvas.className = 'welcome-sky';
  canvas.setAttribute('aria-hidden', 'true');
  band.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var layer = document.createElement('canvas'); // the written words, before the reveal mask
  var lctx = layer.getContext('2d');

  var W, H, dpr, fs, x0, x1, midY, start = null, done = false;
  var trail = [], dust = [];

  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };

  function layout() {
    var r = band.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = layer.width = Math.round(W * dpr);
    canvas.height = layer.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    // as large as fits: about half the band's height, and the screen's width less a margin
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.font = '500 100px Cinzel, Georgia, serif';
    if ('letterSpacing' in lctx) lctx.letterSpacing = '6px';
    var w100 = lctx.measureText(TEXT).width;
    fs = Math.min(H * 0.48, 42, (W - 40) / w100 * 100);
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.clearRect(0, 0, W, H);
    lctx.font = '500 ' + fs + 'px Cinzel, Georgia, serif';
    if ('letterSpacing' in lctx) lctx.letterSpacing = (fs * 0.08) + 'px';
    lctx.textBaseline = 'middle';
    lctx.textAlign = 'center';
    var tw = lctx.measureText(TEXT).width;
    midY = H / 2;
    x0 = (W - tw) / 2; x1 = x0 + tw;
    var g = lctx.createLinearGradient(0, midY - fs / 2, 0, midY + fs / 2);
    GOLD.forEach(function (s) { g.addColorStop(s[0], s[1]); });
    lctx.shadowColor = 'rgba(0,0,0,0.6)'; lctx.shadowBlur = 3; lctx.shadowOffsetY = 2;
    lctx.fillStyle = g;
    lctx.fillText(TEXT, W / 2, midY);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Where the star is at time t: falling in along a curve, then writing (bobbing over the
  // letters the way a pen moves), then leaving.
  function starAt(t) {
    if (t < T_WRITE) {
      var k = ease(clamp(t / FALL));
      var sx = x0 - Math.min(160, W * 0.15), sy = -12;
      return { x: sx + (x0 - sx) * k, y: sy + (midY - sy) * (1 - (1 - k) * (1 - k)), a: clamp(t / 120) };
    }
    if (t < T_LEAVE) {
      var p = ease(clamp((t - T_WRITE) / WRITE));
      var x = x0 + (x1 - x0) * p;
      return { x: x, y: midY + Math.sin(x / (fs * 0.42)) * fs * 0.26, a: 1 };
    }
    var q = clamp((t - T_LEAVE) / LEAVE);
    return { x: x1 + q * Math.min(220, W * 0.2), y: midY + Math.sin(x1 / (fs * 0.42)) * fs * 0.26 - q * q * (H * 0.9), a: 1 - q };
  }

  function frame(now) {
    if (done) return;
    if (start === null) start = now;
    var t = now - start;
    ctx.clearRect(0, 0, W, H);

    // the words written so far: everything left of the star, with a soft edge just behind it
    var s = t < T_END ? starAt(Math.min(t, T_LEAVE + LEAVE)) : null;
    var reveal = t < T_WRITE ? x0 - 30 : (t < T_LEAVE ? s.x : W + 40);
    var fade = 1 - clamp((t - T_FADE) / FADE);
    if (reveal > x0 - 30 && fade > 0) {
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(0, -(1 - fade) * 6); // drifting up a touch as it fades
      ctx.drawImage(layer, 0, 0, W, H);
      ctx.globalCompositeOperation = 'destination-in';
      var m = ctx.createLinearGradient(reveal - 26, 0, reveal + 2, 0);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = m;
      ctx.fillRect(0, -10, W, H + 20);
      ctx.restore();
    }

    // stardust shed by the star, drifting down and fading
    if (s && s.a > 0.05 && t < T_LEAVE + LEAVE) {
      for (var i = 0; i < 3; i++) {
        dust.push({ x: s.x + (Math.random() - 0.5) * 4, y: s.y + (Math.random() - 0.5) * 4,
                    vx: (Math.random() - 0.6) * 0.5, vy: Math.random() * 0.6 + 0.15,
                    r: Math.random() * 1.3 + 0.4, born: t, life: 500 + Math.random() * 500 });
      }
    }
    dust = dust.filter(function (d) { return t - d.born < d.life; });
    dust.forEach(function (d) {
      var age = (t - d.born) / d.life;
      d.x += d.vx; d.y += d.vy;
      ctx.globalAlpha = (1 - age) * 0.9;
      ctx.fillStyle = age < 0.3 ? '#FFF6E4' : '#D4B483';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // the star: a bright head with a glow, and a tail along the path it just took
    if (s && s.a > 0) {
      trail.push({ x: s.x, y: s.y });
      if (trail.length > 14) trail.shift();
      for (var j = 1; j < trail.length; j++) {
        var k = j / trail.length;
        ctx.strokeStyle = 'rgba(255, 240, 210, ' + (k * 0.55 * s.a) + ')';
        ctx.lineWidth = k * 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(trail[j - 1].x, trail[j - 1].y); ctx.lineTo(trail[j].x, trail[j].y); ctx.stroke();
      }
      var glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 14);
      glow.addColorStop(0, 'rgba(255, 248, 230, ' + s.a + ')');
      glow.addColorStop(0.25, 'rgba(240, 210, 150, ' + (0.6 * s.a) + ')');
      glow.addColorStop(1, 'rgba(212, 180, 131, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, Math.PI * 2); ctx.fill();
    }

    if (t >= T_END && dust.length === 0) return finish();
    requestAnimationFrame(frame);
  }

  // fold the band away (--band eases to 0 in CSS) and tidy up
  function finish() {
    done = true;
    root.classList.remove('welcome');
    canvas.remove();
    ['pointerdown', 'keydown', 'click'].forEach(function (e) { document.removeEventListener(e, skip, true); });
  }
  // A click, tap or key while it plays clears it at once, band and all, before the page handles
  // the click: anything laid out around the dial (the CV paper, the drawings) then measures the
  // page in its final shape.
  function skip() {
    if (done) return;
    root.style.transition = 'none';
    finish();
    void root.offsetWidth;
    requestAnimationFrame(function () { root.style.transition = ''; });
  }
  ['pointerdown', 'keydown', 'click'].forEach(function (e) { document.addEventListener(e, skip, true); });

  // wait for the lettering's font so the words aren't measured in the fallback
  var go = function () { layout(); requestAnimationFrame(frame); };
  var fonts = document.fonts && document.fonts.load ? document.fonts.load('500 40px Cinzel') : null;
  if (fonts) Promise.race([fonts, new Promise(function (r) { setTimeout(r, 1200); })]).then(go, go);
  else go();
})();
