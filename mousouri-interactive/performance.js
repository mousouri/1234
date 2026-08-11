(() => {
  "use strict";

  const root = document.documentElement;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const lowMemory = typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4;
  const lowCpu = typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4;
  const narrowScreen = matchMedia("(max-width: 809.98px)").matches;
  const saveData = Boolean(connection?.saveData);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (lowMemory || lowCpu || narrowScreen || saveData) root.dataset.performance = "low";

  /* ------------------------------------------------------------------
   * Layer budget — Framer's SSR writes `will-change: transform` on ~260
   * elements, parking one GPU layer per element. Most never animate, and
   * the browser auto-promotes elements while they truly animate, so these
   * parked layers are pure GPU-memory waste. We deflate everything that is
   * not actively animating and re-sweep whenever the runtime re-promotes.
   * ------------------------------------------------------------------ */

  function hasRunningAnimation(el) {
    if (typeof el.getAnimations !== "function") return false;
    const anims = el.getAnimations();
    for (let i = 0; i < anims.length; i++) {
      if (anims[i].playState === "running") return true;
    }
    return false;
  }

  function deflateLayer(el) {
    if (!el || !el.style) return;
    if (el.style.willChange === "" || el.style.willChange === "auto") return;
    if (hasRunningAnimation(el)) return; // leave genuinely animating layers alone
    el.style.willChange = "auto";
  }

  function deflateNow() {
    const els = root.querySelectorAll('[style*="will-change"]');
    for (let i = 0; i < els.length; i++) deflateLayer(els[i]);
  }

  // Don't fight the runtime while the user is moving; prune once they settle
  // (debounced), so the browser keeps promoting layers it needs mid-gesture.
  let scrollTimer = null;
  function onScroll() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(deflateNow, 400);
  }

  function startLayerManagement() {
    deflateNow();                       // immediately after DOM ready
    setTimeout(deflateNow, 2000);       // after appear animations settle
    setInterval(deflateNow, 7000);      // backstop for any late promotion
    addEventListener("scroll", onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------
   * Images.
   * ------------------------------------------------------------------ */
  function optimizeImage(image) {
    image.decoding = "async";
    if (image.getBoundingClientRect().top > innerHeight * 1.5) image.loading = "lazy";
  }

  function startImages() {
    const images = root.querySelectorAll("img");
    for (let i = 0; i < images.length; i++) optimizeImage(images[i]);
  }

  /* ------------------------------------------------------------------
   * Videos — decode only while visible and never while the tab is hidden.
   * ------------------------------------------------------------------ */
  function optimizeVideo(video) {
    video.playsInline = true;
    video.muted = true;
    video.defaultMuted = true;
    if (root.dataset.performance === "low") video.preload = "metadata";
    if (reducedMotion) {
      video.preload = "metadata";
      video.pause();
    }
  }

  function startVideos() {
    const videos = [...root.querySelectorAll("video")];
    videos.forEach(optimizeVideo);

    if (!("IntersectionObserver" in window)) return;

    const videoObserver = new IntersectionObserver(
      (entries) => {
        for (const { target: video, isIntersecting } of entries) {
          if (isIntersecting && !document.hidden) video.play().catch(() => {});
          else video.pause();
        }
      },
      { rootMargin: "150px 0px" }
    );

    videos.forEach((video) => videoObserver.observe(video));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) videos.forEach((video) => video.pause());
    });
  }

  /* ------------------------------------------------------------------
   * Analytics — the Framer events beacon is cross-origin and competes with
   * first paint. Defer it until the main thread is idle or the user first
   * interacts.
   * ------------------------------------------------------------------ */
  function startAnalytics() {
    if (!navigator.onLine) return;
    const fid = root.querySelector("[data-framer-events-fid]")?.getAttribute("data-framer-events-fid");
    if (!fid) return;
    const load = () => {
      if (document.getElementById("__framer_events_script")) return;
      const script = document.createElement("script");
      script.id = "__framer_events_script";
      script.src = "https://events.framer.com/script?v=2";
      script.setAttribute("data-fid", fid);
      script.setAttribute("data-no-nt", "");
      script.async = true;
      document.body.appendChild(script);
    };
    const onIdle = window.requestIdleCallback
      ? () => requestIdleCallback(() => setTimeout(load, 2000))
      : () => setTimeout(load, 3000);
    addEventListener("pointerdown", load, { once: true, passive: true });
    onIdle();
  }

  /* ------------------------------------------------------------------ */
  function start() {
    startImages();
    startVideos();
    startLayerManagement();
    startAnalytics();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
