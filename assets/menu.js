// Menu overlay for every page except the homepage:
// clicking "Oben Celik" (top left) opens a smaller version of the homepage dial.
// Load this before assets/dial.js; it adds the dial markup that dial.js then fills in.
(function () {
  'use strict';

  var overlay = document.createElement('div');
  overlay.className = 'menu-overlay';
  overlay.id = 'menu-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Menu');
  overlay.innerHTML =
    '<button type="button" class="menu-close" id="menu-close" aria-label="Close menu">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
    '</button>' +
    '<div class="dial" id="dial" data-label="bezel">' +
      '<div class="dial-glow" aria-hidden="true"></div>' +
      '<div class="dial-ring" aria-hidden="true"></div>' +
      '<div class="ticks morph" id="ticks" aria-hidden="true"></div>' +
      '<nav class="dial-nav" id="dial-nav" aria-label="Explore"></nav>' +
      '<div class="core morph" id="core" aria-live="polite">' +
        '<div class="core-inner" id="core-inner">' +
          '<span class="core-status"><span class="core-dot" id="core-dot"></span><span id="core-status"></span></span>' +
          '<span class="core-title" id="core-title"></span>' +
          '<span class="core-text" id="core-text"></span>' +
          '<span class="core-meta" id="core-meta"></span>' +
          '<button type="button" class="core-back" id="core-back" hidden>Close</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<a class="menu-home" href="index.html">Back to homepage</a>';
  document.body.appendChild(overlay);

  var opener = document.getElementById('menu-open');
  var lastFocus = null;

  function isOpen() { return overlay.classList.contains('open'); }
  function open() {
    lastFocus = document.activeElement;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (opener) opener.setAttribute('aria-expanded', 'true');
    window.dispatchEvent(new Event('resize')); // let the dial size its labels
    // focus the close button so keyboard users are inside the menu, without pre-selecting a wedge
    setTimeout(function () { document.getElementById('menu-close').focus({ preventScroll: true }); }, 50);
  }
  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (opener) opener.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (opener) opener.addEventListener('click', function () { isOpen() ? close() : open(); });
  document.getElementById('menu-close').addEventListener('click', close);
  // click on the dark backdrop (not on the dial) closes it
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  // Esc: the dial uses Esc to step back a level; once it is fully closed, Esc closes the menu
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !isOpen()) return;
    var back = document.getElementById('core-back');
    if (back && back.hidden) close();
  });
})();
