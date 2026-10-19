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

  const mobile = window.matchMedia('(max-width: 640px)');
  for (const carousel of document.querySelectorAll('.schedule-recruitments__carousel')) {
    const container = carousel.closest('.schedule-recruitments');
    const slides = Array.from(carousel.querySelectorAll('.schedule-recruitments__slide'));
    if (!container || slides.length < 2) continue;

    let activeIndex = 0;
    const showSlide = (nextIndex) => {
      activeIndex = nextIndex;
      slides.forEach((slide, index) => {
        const isActive = index === activeIndex;
        slide.dataset.active = String(isActive);
        slide.setAttribute('aria-hidden', String(!isActive));
        slide.toggleAttribute('inert', !isActive);
      });
    };
    const updateLayout = () => {
      container.classList.toggle('is-slideshow', mobile.matches && !reducedMotion.matches);
      showSlide(activeIndex);
    };

    updateLayout();
    mobile.addEventListener('change', updateLayout);
    reducedMotion.addEventListener('change', updateLayout);
    window.setInterval(() => {
      if (!container.classList.contains('is-slideshow') || document.hidden || container.matches(':hover, :focus-within')) return;
      showSlide((activeIndex + 1) % slides.length);
    }, 5000);
  }

})();
