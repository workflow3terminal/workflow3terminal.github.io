const safePlay = async (video) => {
  try {
    await video.play();
  } catch {
    video.controls = true;
  }
};

export function initMediaLifecycle({ selector = "video[data-managed]" } = {}) {
  const videos = [...document.querySelectorAll(selector)];
  if (!videos.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    videos.forEach((video) => {
      video.pause();
      video.removeAttribute("autoplay");
    });
    return;
  }

  videos.forEach((video) => {
    video.muted = true;
    video.setAttribute("muted", "");
  });

  if (!("IntersectionObserver" in window)) {
    videos.forEach(safePlay);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (!(video instanceof HTMLVideoElement)) return;
        if (entry.isIntersecting && document.visibilityState === "visible") safePlay(video);
        else video.pause();
      });
    },
    { rootMargin: "30% 0px", threshold: 0.05 },
  );
  videos.forEach((video) => observer.observe(video));

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") videos.forEach((video) => video.pause());
  });
}
