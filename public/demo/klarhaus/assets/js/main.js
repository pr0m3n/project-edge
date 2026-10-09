(function () {
  "use strict";

  // Demo: das Formular versendet nichts.

  // Jahr im Footer
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Header-Schatten beim Scrollen
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile Navigation
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("open", open);
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNav(false);
    });
  }

  // Einblend-Animation
  var revealEls = document.querySelectorAll(".service, .benefit, .step, .faq details, .about-copy, .contact-form, .ba, .faq-illu, .contact-illu");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) {
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Seifenblasen im Hero
  var hero = document.querySelector(".hero");
  var bubbleLayer = document.querySelector(".hero-bubbles");
  if (bubbleLayer && !reduceMotion) {
    for (var i = 0; i < 6; i++) {
      var b = document.createElement("span");
      var size = 16 + Math.random() * 30;
      b.className = "hero-bubble";
      b.style.width = b.style.height = size + "px";
      b.style.left = (Math.random() * 100) + "%";
      b.style.setProperty("--d", (18 + Math.random() * 12) + "s");
      b.style.setProperty("--delay", (-Math.random() * 20) + "s");
      b.style.setProperty("--sway", (Math.random() * 80 - 40) + "px");
      bubbleLayer.appendChild(b);
    }
  }

  // Vorher/Nachher-Regler
  var ba = document.querySelector(".ba");
  if (ba) {
    var range = ba.querySelector(".ba-range");
    var setPos = function (v) { ba.style.setProperty("--pos", v + "%"); };
    range.addEventListener("input", function () { ba.dataset.touched = "1"; setPos(range.value); });
    // Kleine Vorführung beim ersten Sichtbarwerden
    if ("IntersectionObserver" in window && !reduceMotion) {
      var demo = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        demo.disconnect();
        var keys = [50, 22, 78, 50], k = 0, from = 50, t0 = null;
        function step(ts) {
          if (ba.dataset.touched) return;
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / 700, 1), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          var v = from + (keys[k + 1] - from) * e;
          setPos(v); range.value = v;
          if (p === 1) { k++; from = keys[k]; t0 = null; if (k >= keys.length - 1) return; }
          requestAnimationFrame(step);
        }
        setTimeout(function () { requestAnimationFrame(step); }, 400);
      }, { threshold: .6 });
      demo.observe(ba);
    }
  }

  // Zähler
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        co.unobserve(entry.target);
        var el = entry.target, target = +el.dataset.count, t0 = null;
        if (!target) return;
        function tick(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / 1200, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        }
        el.textContent = "0";
        requestAnimationFrame(tick);
      });
    }, { threshold: .5 });
    counters.forEach(function (c) { co.observe(c); });
  }

  // Kontaktformular -> vorausgefüllte E-Mail
  var form = document.getElementById("contact-form");
  var hint = document.getElementById("form-hint");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      ["name", "email", "message"].forEach(function (n) {
        var el = form.elements[n];
        var valid = el.value.trim() !== "" && (n !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
        el.classList.toggle("invalid", !valid);
        if (!valid) ok = false;
      });
      var privacy = form.elements.privacy;
      privacy.closest(".check").classList.toggle("invalid", !privacy.checked);
      if (!privacy.checked) ok = false;

      if (!ok) {
        hint.textContent = "Bitte füllen Sie alle Pflichtfelder (*) korrekt aus.";
        hint.className = "form-hint error";
        return;
      }

      hint.textContent = "Demo: In dieser Branchen-Demo wird nichts versendet. Auf einer echten Website landet die Anfrage direkt per E-Mail beim Betrieb.";
      hint.className = "form-hint ok";
    });
  }
})();
