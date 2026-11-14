/* ============================================================
   Шёрстка — интерактив
   Плавный скролл (Lenis), деликатное движение, reduced-motion
   ============================================================ */
(function () {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector("[data-header]");

  /* ----------  Микро-параллакс (глубина, не аттракцион)  ---------- */
  const pxEls = reduce ? [] : [...document.querySelectorAll("[data-speed]")];
  pxEls.forEach((el) => {
    const t = getComputedStyle(el).transform;
    el.dataset.base = t === "none" ? "" : t;
  });
  function parallaxTick() {
    if (!pxEls.length || window.innerWidth < 720) return;
    const vh = window.innerHeight;
    for (const el of pxEls) {
      const r = el.getBoundingClientRect();
      const center = r.top + r.height / 2 - vh / 2;
      let y = center * +el.dataset.speed;
      y = Math.max(-14, Math.min(14, y));
      el.style.transform = `${el.dataset.base} translate3d(0, ${y}px, 0)`;
    }
  }

  /* ----------  Lenis: инерционный скролл  ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      lerp: 0.1,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      smoothTouch: false,
    });
    const raf = (time) => { lenis.raf(time); parallaxTick(); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  } else if (pxEls.length) {
    const loop = () => { parallaxTick(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  /* ----------  Header: тень при скролле  ---------- */
  const onScroll = () => {
    const y = lenis ? lenis.scroll : window.scrollY;
    header.toggleAttribute("data-scrolled", y > 24);
  };
  if (lenis) lenis.on("scroll", onScroll);
  else window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ----------  Мобильное меню  ---------- */
  const burger = document.querySelector("[data-burger]");
  const nav = document.querySelector("[data-nav]");
  const toggleNav = (open) => {
    const isOpen = open ?? !nav.hasAttribute("data-open");
    nav.toggleAttribute("data-open", isOpen);
    burger.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (lenis) isOpen ? lenis.stop() : lenis.start();
  };
  burger.addEventListener("click", () => toggleNav());
  nav.addEventListener("click", (e) => { if (e.target.closest(".nav__link")) toggleNav(false); });

  /* ----------  Плавный скролл по якорям с учётом шапки  ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = -(header.offsetHeight - 2);
      if (lenis) lenis.scrollTo(target, { offset });
      else {
        const top = target.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      }
    });
  });

  /* ----------  Reveal + счётчик цифр  ---------- */
  const revealEls = document.querySelectorAll("[data-reveal], [data-reveal-group]");
  const countUp = (el) => {
    const end = +el.dataset.count;
    if (reduce) { el.textContent = end.toLocaleString("ru-RU"); return; }
    const dur = 1100, t0 = performance.now(), ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(ease(p) * end).toLocaleString("ru-RU");
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => { el.classList.add("is-in"); el.querySelectorAll("[data-count]").forEach(countUp); });
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            entry.target.querySelectorAll("[data-count]").forEach(countUp);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -12% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ----------  Сравнение «до / после»  ---------- */
  document.querySelectorAll("[data-compare]").forEach((box) => {
    const range = box.querySelector(".compare__range");
    const before = box.querySelector(".compare__before");
    const handle = box.querySelector(".compare__handle");
    const set = (v) => {
      before.style.clipPath = `inset(0 ${100 - v}% 0 0)`;
      handle.style.left = v + "%";
    };
    range.addEventListener("input", () => set(range.value));
    set(range.value);
  });

  /* ----------  FAQ-аккордеон  ---------- */
  document.querySelectorAll(".acc__item").forEach((item) => {
    const q = item.querySelector(".acc__q");
    const a = item.querySelector(".acc__a");
    q.addEventListener("click", () => {
      const open = q.getAttribute("aria-expanded") === "true";
      document.querySelectorAll(".acc__item").forEach((other) => {
        if (other !== item) {
          other.querySelector(".acc__q").setAttribute("aria-expanded", "false");
          other.querySelector(".acc__a").style.height = "0px";
        }
      });
      q.setAttribute("aria-expanded", String(!open));
      a.style.height = open ? "0px" : a.scrollHeight + "px";
    });
  });

  /* ----------  Форма записи  ---------- */
  const form = document.querySelector("[data-form]");
  if (form) {
    const ok = form.querySelector("[data-form-ok]");
    const required = form.querySelectorAll("[required]");

    const validate = (input) => {
      const field = input.closest(".field");
      const valid = input.value.trim().length >= (input.type === "tel" ? 6 : 2);
      field.classList.toggle("field--invalid", !valid);
      return valid;
    };
    required.forEach((input) => {
      input.addEventListener("input", () => {
        if (input.closest(".field").classList.contains("field--invalid")) validate(input);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let allValid = true;
      required.forEach((input) => { if (!validate(input)) allValid = false; });
      if (!allValid) {
        form.querySelector(".field--invalid input")?.focus();
        return;
      }
      ok.hidden = false;
    });
  }
})();
