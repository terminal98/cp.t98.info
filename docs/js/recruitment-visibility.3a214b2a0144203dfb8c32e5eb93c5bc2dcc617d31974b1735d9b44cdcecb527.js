(() => {
  // Keep the recruitment archive intact; other lists expire without a rebuild.
  const archives = ['/categories/recruit/', '/tags/募集終了/'];
  if (archives.some(path => location.pathname.startsWith(path) || location.pathname.startsWith(encodeURI(path)))) return;
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
