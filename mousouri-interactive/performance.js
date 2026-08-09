(() => {
  const root = document.documentElement;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
  const lowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
  const narrowScreen = matchMedia("(max-width: 809.98px)").matches;
  const saveData = Boolean(connection?.saveData);

  if (lowMemory || lowCpu || narrowScreen || saveData) root.dataset.performance = "low";

  function optimizeImage(image) {
    image.decoding = "async";
    if (image.getBoundingClientRect().top > innerHeight * 1.5) image.loading = "lazy";
  }

  function optimizeVideo(video) {
    video.preload = root.dataset.performance === "low" ? "metadata" : "auto";
    video.playsInline = true;
    video.muted = true;
    video.defaultMuted = true;
  }

  function start() {
    document.querySelectorAll("img").forEach(optimizeImage);
    const videos = [...document.querySelectorAll("video")];
    videos.forEach(optimizeVideo);

    const videoObserver = new IntersectionObserver((entries) => {
      for (const { target: video, isIntersecting } of entries) {
        if (isIntersecting && !document.hidden) video.play().catch(() => {});
        else video.pause();
      }
    }, { rootMargin: "150px 0px" });

    videos.forEach((video) => videoObserver.observe(video));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) videos.forEach((video) => video.pause());
    });

    if (root.dataset.performance === "low") {
      setTimeout(() => {
        document.querySelectorAll('[style*="will-change"]').forEach((element) => {
          element.style.willChange = "auto";
        });
      }, 3500);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
