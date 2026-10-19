(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  for (const banner of document.querySelectorAll('.lagcos-availability-banner')) {
    const title = banner.querySelector('.lagcos-availability-banner__title');
    if (!title || !title.querySelector('.lagcos-availability-banner__copy--alternate')) continue;
    const swap = () => {
      banner.dataset.alternate = String(banner.dataset.alternate !== 'true');
      title.classList.remove('is-switching');
    };
    window.setInterval(() => {
      if (document.hidden || banner.matches(':hover, :focus-within')) return;
      if (reducedMotion.matches) {
        swap();
      } else {
        title.classList.add('is-switching');
        window.setTimeout(swap, 180);
      }
    }, 5000);
  }
})();
