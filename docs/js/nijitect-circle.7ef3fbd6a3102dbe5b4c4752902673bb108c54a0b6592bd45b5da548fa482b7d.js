document.querySelectorAll('.cp-circle').forEach((circle) => {
  const nav = circle.querySelector('.cp-circle-nav');
  const header = document.querySelector('body > header .fixed');
  const categoryLinks = [...nav.querySelectorAll('a[href^="#"]')];
  const shelves = categoryLinks.map((link) => circle.querySelector(link.getAttribute('href')));
  let scrollFrame = 0;
  const updateCurrentCategory = () => {
    scrollFrame = 0;
    if (circle.querySelector('dialog[open]')) return;
    const viewportTop = (header?.getBoundingClientRect().bottom || 0)
      + nav.getBoundingClientRect().height;
    let current = 0;
    let largestVisibleArea = 0;
    shelves.forEach((shelf, index) => {
      const rect = shelf.getBoundingClientRect();
      if (rect.top <= viewportTop) current = index;
      const visibleArea = Math.max(0, Math.min(rect.bottom, window.innerHeight)
        - Math.max(rect.top, viewportTop));
      if (visibleArea > largestVisibleArea) {
        largestVisibleArea = visibleArea;
        current = index;
      }
    });
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      current = shelves.length - 1;
    }
    categoryLinks.forEach((link, index) => {
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };
  const scheduleCategoryUpdate = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateCurrentCategory);
  };
  const updateOffsets = () => {
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    circle.style.setProperty('--cp-circle-header-height', `${headerHeight}px`);
    circle.style.setProperty('--cp-circle-nav-height', `${nav.getBoundingClientRect().height}px`);
    scheduleCategoryUpdate();
  };
  updateOffsets();
  const observer = new ResizeObserver(updateOffsets);
  observer.observe(nav);
  observer.observe(circle);
  if (header) observer.observe(header);
  window.addEventListener('scroll', scheduleCategoryUpdate, { passive: true });
  window.addEventListener('resize', scheduleCategoryUpdate);
  window.addEventListener('hashchange', scheduleCategoryUpdate);
  const entries = [...circle.querySelectorAll('[data-circle-open]')].map((trigger) => ({
    trigger,
    dialog: document.getElementById(trigger.dataset.circleOpen),
  })).filter(({ dialog }) => dialog && typeof dialog.showModal === 'function');
  let currentIndex = -1;
  let activeDialog = null;
  let opener = null;
  const show = (index) => {
    const nextIndex = (index + entries.length) % entries.length;
    if (activeDialog?.open) activeDialog.close();
    currentIndex = nextIndex;
    activeDialog = entries[nextIndex].dialog;
    activeDialog.showModal();
    activeDialog.scrollTop = 0;
    document.documentElement.classList.add('cp-circle-modal-open');
  };
  entries.forEach(({ trigger, dialog }, index) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      opener = trigger;
      show(index);
    });
    dialog.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
        || event.target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 'next' : 'previous';
      show(currentIndex + (direction === 'next' ? 1 : -1));
    });
    dialog.querySelector('[data-circle-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right
        || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      if (dialog.open || activeDialog !== dialog) return;
      activeDialog = null;
      document.documentElement.classList.remove('cp-circle-modal-open');
      scheduleCategoryUpdate();
      opener?.focus({ preventScroll: true });
    });
  });
});
