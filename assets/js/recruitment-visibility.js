(() => {
  // Keep the recruitment archive intact; other lists expire without a rebuild.
  if (/^\/categories\/recruit(?:\/|$)/.test(location.pathname)) return;
  const refresh = () => {
    document.querySelectorAll('[data-recruitment-hide-after]').forEach(card => {
      const deadline = Date.parse(card.dataset.recruitmentHideAfter);
      if (Number.isFinite(deadline) && Date.now() >= deadline) card.remove();
    });
  };
  refresh();
  setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
