export function initChapters({ selector = "[data-header-theme]" } = {}) {
  const chapters = [...document.querySelectorAll(selector)];
  if (!chapters.length) return;

  chapters.forEach((chapter) => chapter.style.setProperty("--chapter-progress", "0"));

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    chapters.forEach((chapter) => chapter.classList.add("is-visible"));
    return;
  }

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
    },
    { rootMargin: "10% 0px 10% 0px", threshold: 0.08 },
  );
  chapters.forEach((chapter) => visibilityObserver.observe(chapter));

  let queued = false;
  const update = () => {
    queued = false;
    const viewport = window.innerHeight;
    for (const chapter of chapters) {
      const rect = chapter.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewport) continue;
      const travel = rect.height + viewport;
      const progress = Math.min(1, Math.max(0, (viewport - rect.top) / travel));
      chapter.style.setProperty("--chapter-progress", progress.toFixed(4));
    }
  };
  const queueUpdate = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);
}
