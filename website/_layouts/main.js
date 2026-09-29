(function () {
  "use strict";
  if (window.__theme_inited) return;
  window.__theme_inited = true;

  /* Older SSG releases emit the search trigger at a fixed viewport position
     instead of replacing the declared header slot. Normalise both generator
     behaviours before interaction begins. */
  var searchSlot = document.querySelector("[data-ssg-search]");
  var searchButton = document.getElementById("ssg-search-btn");
  if (searchSlot && searchButton) searchSlot.replaceWith(searchButton);

  /* Three states, not two: "system" is the absence of data-theme, so a
     visitor can hand the choice back to the operating system. The previous
     two-way switch stamped data-theme on the first click and never removed
     it. The mode icon is rendered by CSS so its dimensions are reserved
     before this deferred script runs, preventing a header layout shift. */
  var ORDER = ["system", "light", "dark"];

  function currentMode() {
    var set = document.documentElement.getAttribute("data-theme");
    return set === "light" || set === "dark" ? set : "system";
  }

  function labelFor(mode, btn, state) {
    if (mode === "system") return state ? state.getAttribute("data-label-system") || "System" : "System";
    return btn.getAttribute("data-label-" + mode) || (mode === "light" ? "Light" : "Dark");
  }

  function setMode(mode) {
    if (mode === "system") {
      document.documentElement.removeAttribute("data-theme");
      try { localStorage.removeItem("theme"); } catch (e) {}
    } else {
      document.documentElement.setAttribute("data-theme", mode);
      try { localStorage.setItem("theme", mode); } catch (e) {}
    }
    var btn = document.getElementById("mode-toggle");
    if (!btn) return;
    var state = document.getElementById("mode-state");
    if (state) state.textContent = labelFor(mode, btn, state);
  }

  setMode(currentMode());

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("#mode-toggle");
    if (!btn) return;
    setMode(ORDER[(ORDER.indexOf(currentMode()) + 1) % ORDER.length]);
  });


  document.addEventListener("click", function (e) {
    var toggle = e.target.closest("#navToggle");
    if (!toggle) return;
    var menu = document.getElementById("navMenu");
    if (menu) {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      menu.classList.toggle("is-open");
    }
  });

  /* SWIFT Mega Dropdown Navigation Interaction */
  var activeNavTimer = null;

  function closeAllNavDropdowns() {
    var items = document.querySelectorAll(".swift-nav-item.is-open");
    items.forEach(function (item) {
      item.classList.remove("is-open");
      var link = item.querySelector(".swift-nav-link");
      if (link) link.setAttribute("aria-expanded", "false");
    });
  }

  function openNavDropdown(navItem) {
    if (activeNavTimer) {
      clearTimeout(activeNavTimer);
      activeNavTimer = null;
    }
    var siblings = document.querySelectorAll(".swift-nav-item.is-open");
    siblings.forEach(function (sib) {
      if (sib !== navItem) {
        sib.classList.remove("is-open");
        var link = sib.querySelector(".swift-nav-link");
        if (link) link.setAttribute("aria-expanded", "false");
      }
    });
    navItem.classList.add("is-open");
    var activeLink = navItem.querySelector(".swift-nav-link");
    if (activeLink) activeLink.setAttribute("aria-expanded", "true");
  }

  function scheduleCloseNavDropdowns() {
    if (activeNavTimer) clearTimeout(activeNavTimer);
    activeNavTimer = setTimeout(function () {
      closeAllNavDropdowns();
      activeNavTimer = null;
    }, 280);
  }

  var navItems = document.querySelectorAll(".swift-nav-item");
  navItems.forEach(function (item) {
    var hasDropdown = item.querySelector(".swift-dropdown");
    if (!hasDropdown) return;

    item.addEventListener("mouseenter", function () {
      if (window.innerWidth > 1080) {
        openNavDropdown(item);
      }
    });

    item.addEventListener("mouseleave", function () {
      if (window.innerWidth > 1080) {
        scheduleCloseNavDropdowns();
      }
    });

    var triggerLink = item.querySelector(".swift-nav-link");
    if (triggerLink) {
      triggerLink.addEventListener("click", function (e) {
        if (item.querySelector(".swift-dropdown")) {
          e.preventDefault();
          if (item.classList.contains("is-open")) {
            item.classList.remove("is-open");
            triggerLink.setAttribute("aria-expanded", "false");
          } else {
            openNavDropdown(item);
          }
        }
      });
    }
  });

  // Close dropdown when clicking a submenu link inside the dropdown
  document.addEventListener("click", function (e) {
    var dropdownItem = e.target.closest(".swift-dropdown-item, .swift-spotlight-link");
    if (dropdownItem) {
      closeAllNavDropdowns();
    } else if (!e.target.closest(".swift-nav-item")) {
      closeAllNavDropdowns();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAllNavDropdowns();
      var menu = document.getElementById("navMenu");
      var toggle = document.getElementById("navToggle");
      if (menu && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      }
    }
  });

  document.addEventListener("click", function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || href === "#") return;
    var target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      if (history.pushState) {
        history.pushState(null, null, href);
      }
      var menu = document.getElementById("navMenu");
      var toggle = document.getElementById("navToggle");
      if (menu && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      }
    }
  });

  /* SWIFT Interactive Solutions Tab Switching */
  document.addEventListener("click", function (e) {
    var tabBtn = e.target.closest(".swift-tab-btn");
    if (!tabBtn) return;
    var tabNav = tabBtn.closest(".swift-tabs-nav");
    if (!tabNav) return;
    var allTabs = tabNav.querySelectorAll(".swift-tab-btn");
    allTabs.forEach(function (btn) {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
    });
    tabBtn.classList.add("active");
    tabBtn.setAttribute("aria-selected", "true");

    var tabKey = tabBtn.getAttribute("data-tab");
    var stage = tabNav.closest(".swift-solutions-stage");
    if (!stage) return;
    var panels = stage.querySelectorAll(".swift-tab-content-panel");
    panels.forEach(function (panel) {
      if (panel.id === tabKey) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });
  });

  /* SWIFT Interactive Solutions Slider Arrow Buttons */
  document.addEventListener("click", function (e) {
    var sliderBtn = e.target.closest(".swift-slider-btn");
    if (!sliderBtn) return;
    var stage = sliderBtn.closest(".swift-solutions-stage");
    if (!stage) return;
    var tabs = Array.from(stage.querySelectorAll(".swift-tab-btn"));
    if (!tabs.length) return;
    var currentIndex = tabs.findIndex(function (btn) {
      return btn.classList.contains("active");
    });
    if (currentIndex === -1) currentIndex = 0;

    var isNext = sliderBtn.classList.contains("swift-slider-next");
    var nextIndex;
    if (isNext) {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }

    tabs[nextIndex].click();
  });
})();
