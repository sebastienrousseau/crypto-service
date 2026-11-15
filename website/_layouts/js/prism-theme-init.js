/*
 * SPDX-FileCopyrightText: 2026 Sebastien Rousseau
 * SPDX-License-Identifier: MIT
 */
/*
 * Runs before first paint so the stored theme is applied without a flash
 * of the wrong palette. postbuild_fix.py inlines this file into every
 * page's <head> (its hash is in the CSP), so the page does not pay a
 * render-blocking request for 1 KB; this file remains the source.
 *
 * Only an explicit user choice is stamped onto <html>. When no choice has
 * been stored the attribute is deliberately left off, so the stylesheet's
 * `prefers-color-scheme` block decides and the page follows the OS.
 */
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') {
      root.setAttribute('data-theme', saved);
    }
  } catch {
    /* Private browsing or blocked storage: fall back to the OS preference. */
  }
  /* Motion: the footer toggle ("Reduce motion") stores "off"; the OS
     setting is honoured as well. Only when neither asks for less motion
     does `js-motion` switch the scroll reveals on, so a page never waits
     on an animation it was told not to run. */
  var motionOff = false;
  try {
    motionOff = localStorage.getItem('motion') === 'off';
  } catch {
    /* Storage unavailable: the OS setting still applies. */
  }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (motionOff) root.classList.add('motion-off');
  if (!motionOff && !reduce) root.classList.add('js-motion');
})();
