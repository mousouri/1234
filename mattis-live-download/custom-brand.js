(() => {
  const replacements = [
    [/mattistudio/gi, 'mousouri'],
    [/MATTIS®/g, 'MOUSOURI®'],
    [/Mattis®/g, 'Mousouri®'],
    [/MATTIS/g, 'MOUSOURI'],
    [/Mattis/g, 'Mousouri'],
    [/mattis/gi, 'Mousouri'],
  ];

  function rename(value) {
    return replacements.reduce(
      (result, [pattern, replacement]) => result.replace(pattern, replacement),
      value
    );
  }

  function resumeVideos(root = document) {
    const videos = [
      ...(root.matches?.('video') ? [root] : []),
      ...(root.querySelectorAll?.('video') || []),
    ];

    for (const video of videos) {
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('autoplay', '');
      video.play().catch(() => {});
    }
  }

  function customize(root = document) {
    root.querySelectorAll?.(
      '#__framer-badge-container, #template-overlay, [data-framer-name="Delete me!"], [name="Delete me!"]'
    ).forEach((element) => element.remove());

    const walker = document.createTreeWalker(
      root === document ? document.body : root,
      NodeFilter.SHOW_TEXT
    );
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    for (const node of textNodes) {
      if (node.parentElement?.closest('script, style, noscript')) continue;
      const updated = rename(node.nodeValue);
      if (updated !== node.nodeValue) node.nodeValue = updated;
    }

    root.querySelectorAll?.('[title], [aria-label], [alt]').forEach((element) => {
      for (const attribute of ['title', 'aria-label', 'alt']) {
        if (element.hasAttribute(attribute)) {
          element.setAttribute(attribute, rename(element.getAttribute(attribute)));
        }
      }
    });

    document.title = rename(document.title);
    resumeVideos(root);
  }

  const start = () => {
    customize();
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) customize(node);
          if (node.nodeType === Node.TEXT_NODE && node.parentElement) customize(node.parentElement);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) resumeVideos();
    });
    document.addEventListener('pointerdown', () => resumeVideos(), { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
