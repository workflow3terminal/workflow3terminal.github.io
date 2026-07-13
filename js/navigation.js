const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function initNavigation({
  header = document.querySelector("[data-site-header]"),
  menuButton = document.querySelector(".menu-toggle"),
  menu = document.querySelector(".mobile-menu"),
} = {}) {
  if (header) {
    const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 20);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  if (!menuButton || !menu) return;
  let previousFocus = null;

  const close = () => {
    document.body.classList.remove("menu-open");
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    menuButton.setAttribute("aria-expanded", "false");
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  };

  const open = () => {
    previousFocus = document.activeElement;
    document.body.classList.add("menu-open");
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    menuButton.setAttribute("aria-expanded", "true");
    menu.querySelector(focusableSelector)?.focus();
  };

  menuButton.addEventListener("click", () => {
    if (menu.classList.contains("is-open")) close();
    else open();
  });
  menu.querySelectorAll("a, button").forEach((control) => control.addEventListener("click", close));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.classList.contains("is-open")) close();
    if (event.key !== "Tab" || !menu.classList.contains("is-open")) return;
    const focusable = [...menu.querySelectorAll(focusableSelector)].filter(
      (element) => element instanceof HTMLElement && !element.hidden,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

export function initChapterTheme({
  chapters = document.querySelectorAll("[data-header-theme]"),
  body = document.body,
} = {}) {
  if (!chapters.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) body.dataset.activeTheme = visible.target.dataset.headerTheme ?? "hero";
    },
    { rootMargin: "-25% 0px -55% 0px", threshold: [0, 0.2, 0.5, 0.8] },
  );

  chapters.forEach((chapter) => observer.observe(chapter));
}
