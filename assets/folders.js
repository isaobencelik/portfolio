/* Floating folders: one per case file. A click opens the file in a panel; Esc, the cross or a click outside closes it. */
(function () {
  var vault = document.querySelector('.cf-files');
  var files = vault ? [].slice.call(vault.querySelectorAll('article.file')) : [];
  if (!files.length) return;
  try {
    var STILL = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var TOUCH = window.matchMedia && window.matchMedia('(hover: none)').matches;
    var TILT = [-1.3, 1.1, .9, -1], DUR = [7, 8.2, 7.6, 6.6], DEPTH = [1, .8, 1.2, .9];

    // ---- the desk of folders, built from each file's own heading ----
    var desk = document.createElement('div');
    desk.className = 'desk' + (files.length === 1 ? ' solo' : ''); desk.id = 'desk';
    var hint = document.createElement('p');
    hint.className = 'desk-hint';
    hint.textContent = TOUCH ? 'Tap a folder to open the file' : 'Click a folder to open the file';
    desk.appendChild(hint);
    var folders = files.map(function (a, i) {
      var cat = a.querySelector('.text-xs.uppercase'), reg = a.querySelector('.stamp'), h = a.querySelector('h3'), tab = a.querySelector('.file-tab');
      var slot = document.createElement('div');
      slot.className = 'slot';
      slot.style.setProperty('--tilt', TILT[i % 4] + 'deg');
      slot.style.setProperty('--dur', DUR[i % 4] + 's');
      slot.style.setProperty('--delay', (-i * 1.7) + 's');
      var f = document.createElement('button');
      f.type = 'button'; f.className = 'folder';
      f.style.setProperty('--d', DEPTH[i % 4]);
      f.setAttribute('aria-haspopup', 'dialog');
      var t = h ? h.textContent.replace(/\s+/g, ' ').trim() : 'Case file';
      f.setAttribute('aria-label', t + '. Open the file');
      var rich = vault.getAttribute('data-folder-style') === 'rich';
      if (rich) f.className = 'folder rich';
      f.innerHTML =
        '<span class="f-back" aria-hidden="true"></span>' +
        '<span class="f-tab" aria-hidden="true"></span>' +
        '<span class="f-paper" aria-hidden="true"></span><span class="f-paper" aria-hidden="true"></span>' +
        '<span class="f-front"><span class="f-top"><span class="f-cat"></span><span class="stamp"></span></span>' +
        '<span class="f-title"></span><span class="f-open" aria-hidden="true">Open file &rarr;</span></span>';
      f.querySelector('.f-tab').textContent = tab ? tab.textContent : 'FILE ' + (i + 1);
      f.querySelector('.f-cat').textContent = cat ? cat.textContent : '';
      f.querySelector('.stamp').textContent = reg ? reg.textContent : '';
      f.querySelector('.f-title').textContent = t;
      if (rich) {
        // a richer closed folder: tagline, key facts and a thumbnail of the app, all taken from the file itself
        var front = f.querySelector('.f-front'), openEl = f.querySelector('.f-open');
        var tl = a.querySelector('[data-peek="tagline"]'), chips = a.querySelectorAll('[data-peek="chip"]'), th = a.querySelector('[data-peek="thumb"]');
        var main = document.createElement('span'); main.className = 'f-main';
        [].slice.call(front.children).forEach(function (n) { if (n !== openEl) main.appendChild(n); });
        if (tl) { var p = document.createElement('span'); p.className = 'f-tag'; p.textContent = tl.textContent.replace(/\s+/g, ' ').trim(); main.appendChild(p); }
        if (chips.length) {
          var row = document.createElement('span'); row.className = 'f-chips';
          [].slice.call(chips).forEach(function (c) {
            var k = c.children[0], v = c.children[1], ch = document.createElement('span');
            ch.className = 'f-chip';
            ch.innerHTML = '<span class="f-chip-k"></span><span class="f-chip-v"></span>';
            ch.children[0].textContent = k ? k.textContent : ''; ch.children[1].textContent = v ? v.textContent.replace(/\s+/g, ' ').trim() : '';
            row.appendChild(ch);
          });
          main.appendChild(row);
        }
        front.classList.add('has-peek');
        front.insertBefore(main, openEl);
        if (th) {
          var ph = document.createElement('span'); ph.className = 'f-phone'; ph.setAttribute('aria-hidden', 'true');
          var im = document.createElement('img'); im.src = th.getAttribute('src'); im.alt = ''; im.width = th.getAttribute('width') || 461; im.height = th.getAttribute('height') || 801;
          ph.appendChild(im); front.appendChild(ph);
        }
      }
      f.addEventListener('click', function () { open(i); });
      slot.appendChild(f); desk.appendChild(slot);
      return f;
    });
    vault.parentNode.insertBefore(desk, vault);

    // the folders lean towards the cursor, each by its own depth (not on touch screens or with reduced motion)
    if (!STILL && !TOUCH) {
      window.addEventListener('pointermove', function (e) {
        desk.style.setProperty('--mx', ((e.clientX / window.innerWidth - .5) * 2).toFixed(3));
        desk.style.setProperty('--my', ((e.clientY / window.innerHeight - .5) * 2).toFixed(3));
      });
    }

    // ---- the panel an open file lives in ----
    var dossier = document.createElement('div');
    dossier.className = 'dossier';
    dossier.setAttribute('role', 'dialog'); dossier.setAttribute('aria-modal', 'true');
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'dossier-close'; x.setAttribute('aria-label', 'Close the file');
    x.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    dossier.appendChild(x);
    document.body.appendChild(dossier);

    var cur = -1, busy = false, lastFocus = null;
    // where the file sits relative to its folder: move and shrink it onto the folder (and back)
    function squeeze(a, f) {
      var fr = f.getBoundingClientRect(), ar = a.getBoundingClientRect();
      var s = Math.min(1, fr.width / ar.width);
      var dx = (fr.left + fr.width / 2) - (ar.left + ar.width / 2), dy = (fr.top + fr.height / 2) - (ar.top + ar.height / 2);
      return 'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) scale(' + s.toFixed(3) + ')';
    }
    function open(i) {
      if (cur !== -1 || busy) return;
      var a = files[i], f = folders[i];
      cur = i; lastFocus = f;
      dossier.appendChild(a);
      dossier.setAttribute('aria-label', (a.querySelector('h3') || {}).textContent || 'Case file');
      dossier.scrollTop = 0;
      dossier.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (!STILL) {
        a.style.transition = 'none';
        a.style.transform = squeeze(a, f);
        a.style.opacity = '0';
        void a.offsetWidth;
        a.style.transition = ''; a.style.transform = ''; a.style.opacity = '';
      }
      f.classList.add('is-empty');
      try { history.replaceState(null, '', '#' + a.id); } catch (e) {}
      x.focus({ preventScroll: true });
    }
    function close() {
      if (cur === -1 || busy) return;
      var i = cur, a = files[i], f = folders[i];
      cur = -1; busy = true;
      function done() {
        dossier.classList.remove('open');
        vault.appendChild(a); a.style.cssText = '';
        f.classList.remove('is-empty');
        document.body.style.overflow = '';
        busy = false;
        if (lastFocus) lastFocus.focus({ preventScroll: true });
      }
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      if (STILL) { done(); return; }
      f.classList.remove('is-empty');
      a.style.transform = squeeze(a, f);
      a.style.opacity = '0';
      dossier.classList.remove('open');
      setTimeout(done, 560);
    }
    x.addEventListener('click', close);
    dossier.addEventListener('click', function (e) { if (e.target === dossier) close(); });
    document.addEventListener('keydown', function (e) {
      if (cur === -1) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      // keep the keyboard inside the open file
      var els = [].slice.call(dossier.querySelectorAll('button, a[href], summary')).filter(function (n) { return n.offsetParent !== null; });
      if (!els.length) return;
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // a link like case-studies.html#omnichannel opens that file
    function fromHash() {
      var id = location.hash.slice(1), k = -1;
      files.forEach(function (a, n) { if (a.id === id) k = n; });
      return k;
    }
    var k0 = fromHash();
    if (k0 > -1) setTimeout(function () { open(k0); }, 350);
    window.addEventListener('hashchange', function () { var k = fromHash(); if (k > -1 && cur === -1) open(k); });
  } catch (err) {
    document.documentElement.classList.remove('js'); // anything went wrong: show the files stacked, as before
    if (window.console) console.error(err);
  }
})();