/*
 * SPDX-FileCopyrightText: 2026 Sebastien Rousseau
 * SPDX-License-Identifier: MIT
 */
/*!
 * Prism behaviour: a navigation disclosure, a mega-menu of disclosure
 * panels, and a theme toggle.
 *
 * Every control is present and usable in the markup before this file
 * runs; this only upgrades them. The top-level menu items are links, so
 * the site navigates without any of it.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  ready(function () {
    var root = document.documentElement;
    var wide = window.matchMedia('(min-width: 64rem)');
    var hoverable = window.matchMedia('(hover: hover)');

    /* ssg 0.0.62 replaces the slot in-place. The published 0.0.56 search
       plugin appends its trigger at the end of <body> instead. Normalise the
       older output before interaction so the same header geometry is used by
       both generator versions. */
    var searchSlot = document.querySelector('[data-ssg-search]');
    var searchButton = document.getElementById('ssg-search-btn');
    if (searchSlot && searchButton) {
      searchSlot.replaceWith(searchButton);
    }

    /* ---------------- navigation disclosure ---------------- */
    var navToggle = document.getElementById('navToggle');
    var navMenu = document.getElementById('navMenu');

    var setNav = function (open) {
      if (!navToggle || !navMenu) {
        return;
      }
      navToggle.setAttribute('aria-expanded', String(open));
      navMenu.setAttribute('data-open', String(open));
    };

    if (navToggle && navMenu) {
      setNav(false);

      navToggle.addEventListener('click', function () {
        setNav(navToggle.getAttribute('aria-expanded') !== 'true');
      });

      /* Escape closes the menu and returns focus to the control that
         opened it, so keyboard users are never stranded inside it. */
      navMenu.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !event.defaultPrevented) {
          setNav(false);
          navToggle.focus();
        }
      });
    }

    /* ---------------- mega-menu panels ---------------- */
    /* Each `.has-panel` item holds a link, a disclosure button and a panel.
       The button owns the state; the panel is `hidden` until opened, so
       its links are neither visible nor focusable while it is closed. */
    var items = Array.prototype.slice.call(
      document.querySelectorAll('.nav-item.has-panel')
    );
    var openItem = null;

    var partsOf = function (item) {
      return {
        button: item.querySelector('.nav-disclosure'),
        panel: item.querySelector('.nav-panel')
      };
    };

    var closePanel = function (item, restoreFocus) {
      var p = partsOf(item);
      if (!p.button || !p.panel) {
        return;
      }
      p.button.setAttribute('aria-expanded', 'false');
      p.panel.hidden = true;
      p.panel.style.left = '';
      item.classList.remove('is-open');
      if (openItem === item) {
        openItem = null;
      }
      if (restoreFocus) {
        p.button.focus();
      }
    };

    var closeAll = function () {
      items.forEach(function (item) {
        closePanel(item, false);
      });
    };

    var openPanel = function (item) {
      var p = partsOf(item);
      if (!p.button || !p.panel) {
        return;
      }
      items.forEach(function (other) {
        if (other !== item) {
          closePanel(other, false);
        }
      });
      p.button.setAttribute('aria-expanded', 'true');
      p.panel.hidden = false;
      item.classList.add('is-open');
      openItem = item;

      /* On the wide layout the panel is positioned under its item. An item
         near the right edge would push it off-screen, so it is measured and
         pulled back inside the viewport. Set through the CSSOM, which the
         page's `style-src 'self'` policy permits; an inline attribute would
         not be. */
      if (wide.matches) {
        p.panel.style.left = '';
        var rect = p.panel.getBoundingClientRect();
        var margin = 16;
        var overflow = rect.right - (window.innerWidth - margin);
        if (overflow > 0) {
          p.panel.style.left = String(-Math.ceil(overflow)) + 'px';
        }
      }
    };

    items.forEach(function (item) {
      var p = partsOf(item);
      if (!p.button || !p.panel) {
        return;
      }
      var hoverTimer = null;
      /* A panel the pointer opened is "pinned" by a click on its button
         rather than closed by it: the visitor's intent was to keep what
         hover had already shown, not to dismiss it. */
      var openedByHover = false;

      closePanel(item, false);

      p.button.addEventListener('click', function () {
        if (p.button.getAttribute('aria-expanded') === 'true') {
          if (openedByHover) {
            openedByHover = false;
            return;
          }
          closePanel(item, false);
        } else {
          openedByHover = false;
          openPanel(item);
        }
      });

      /* Escape closes only this panel and hands focus back to its button;
         the outer drawer's own Escape handler is not triggered as well. */
      item.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && p.button.getAttribute('aria-expanded') === 'true') {
          event.preventDefault();
          event.stopPropagation();
          closePanel(item, true);
        }
      });

      /* Tabbing out of the item closes its panel, so focus never lands on
         a control that is visually behind the next item's panel. */
      item.addEventListener('focusout', function (event) {
        if (!item.contains(event.relatedTarget)) {
          closePanel(item, false);
        }
      });

      /* Pointer users get the panel on hover as well. Only where hover is
         a real capability and only on the wide layout: on touch, "hover"
         is the first tap, and the drawer already exposes every panel. The
         close is delayed so crossing the gap between button and panel does
         not dismiss it (WCAG 1.4.13 hoverable). */
      item.addEventListener('mouseenter', function () {
        if (!(wide.matches && hoverable.matches)) {
          return;
        }
        window.clearTimeout(hoverTimer);
        if (p.button.getAttribute('aria-expanded') !== 'true') {
          openedByHover = true;
          openPanel(item);
        }
      });
      item.addEventListener('mouseleave', function () {
        if (!(wide.matches && hoverable.matches)) {
          return;
        }
        hoverTimer = window.setTimeout(function () {
          openedByHover = false;
          closePanel(item, false);
        }, 200);
      });
    });

    document.addEventListener('click', function (event) {
      if (openItem && !openItem.contains(event.target)) {
        closeAll();
      }
      if (
        navToggle && navMenu &&
        navToggle.getAttribute('aria-expanded') === 'true' &&
        !navMenu.contains(event.target) &&
        !navToggle.contains(event.target)
      ) {
        setNav(false);
      }
    });

    /* Re-opening the desktop layout must not leave the drawer or a panel
       in the state the small-screen rules depend on. */
    var syncWidth = function () {
      setNav(false);
      closeAll();
    };
    if (typeof wide.addEventListener === 'function') {
      wide.addEventListener('change', syncWidth);
    }

    /* ---------------- theme mode (system / light / dark) ---------------- */
    /* Three states, not two. A two-way switch gives no way back to following
       the operating system once it has been touched: the first click stamps
       `data-theme` and nothing ever removes it. "system" is therefore part of
       the cycle, represented by the *absence* of the attribute and of the
       stored value -- exactly what theme-init.js already expects. */
    var mode = document.getElementById('mode-toggle');
    var modeState = document.getElementById('mode-state');

    if (mode && modeState) {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      var order = ['system', 'light', 'dark'];
      var labels = {
        system: modeState.textContent.trim(),
        light: mode.getAttribute('data-label-light') || 'Light',
        dark: mode.getAttribute('data-label-dark') || 'Dark'
      };

      var current = function () {
        var set = root.getAttribute('data-theme');
        return set === 'light' || set === 'dark' ? set : 'system';
      };

      var apply = function (next) {
        if (next === 'system') {
          root.removeAttribute('data-theme');
          try {
            localStorage.removeItem('theme');
          } catch {
            /* Storage unavailable: the choice applies for this page only. */
          }
        } else {
          root.setAttribute('data-theme', next);
          try {
            localStorage.setItem('theme', next);
          } catch {
            /* Storage unavailable: the choice applies for this page only. */
          }
        }
        modeState.textContent = labels[next];
      };

      modeState.textContent = labels[current()];

      mode.addEventListener('click', function () {
        apply(order[(order.indexOf(current()) + 1) % order.length]);
      });

      /* While the visitor is following the OS, reflect its changes. */
      if (typeof prefersDark.addEventListener === 'function') {
        prefersDark.addEventListener('change', function () {
          if (!root.hasAttribute('data-theme')) {
            modeState.textContent = labels.system;
          }
        });
      }
    }
  });
})();
