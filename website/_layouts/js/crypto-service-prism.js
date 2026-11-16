/*
 * SPDX-License-Identifier: Apache-2.0 OR MIT
 */
/* Crypto Service behaviour layered on the unmodified PRISM interaction
   script, adapted from pain001.com's site script: current-page marking,
   the footer motion toggle, and keyboard-reachable wide tables. */
(function () {
  "use strict";

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function markCurrentPage() {
    var path = window.location.pathname.replace(/\/+$/, "") + "/";
    document.querySelectorAll(".nav-link").forEach(function (link) {
      if (link.getAttribute("href") === path) {
        link.setAttribute("aria-current", "page");
      }
    });
  }

  /* Motion toggle in the footer (WCAG 2.3.3): stored on this device only. */
  function wireMotionToggle(root) {
    var motion = document.getElementById("motion-toggle");
    if (!motion) return;
    var off = root.classList.contains("motion-off");
    motion.setAttribute("aria-pressed", String(off));
    motion.addEventListener("click", function () {
      off = !off;
      root.classList.toggle("motion-off", off);
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      root.classList.toggle("js-motion", !off && !reduce);
      motion.setAttribute("aria-pressed", String(off));
      try {
        if (off) localStorage.setItem("motion", "off");
        else localStorage.removeItem("motion");
      } catch {
        /* Storage unavailable: the choice applies for this page only. */
      }
    });
  }

  /* A table wider than its box scrolls sideways; keyboard users can only
     scroll what they can focus, so only wrappers that overflow become
     named, focusable regions. */
  function labelWideTables() {
    var used = {};
    document.querySelectorAll(".table-responsive").forEach(function (box) {
      if (box.hasAttribute("tabindex")) return;
      if (box.scrollWidth <= box.clientWidth + 1) return;
      var th = box.querySelector("th");
      var name = (th ? th.textContent.trim() : "") || document.title;
      used[name] = (used[name] || 0) + 1;
      if (used[name] > 1) name += " (" + used[name] + ")";
      box.setAttribute("tabindex", "0");
      box.setAttribute("role", "region");
      box.setAttribute("aria-label", "Table: " + name);
    });
  }

  ready(function () {
    markCurrentPage();
    wireMotionToggle(document.documentElement);
    labelWideTables();
  });
})();
