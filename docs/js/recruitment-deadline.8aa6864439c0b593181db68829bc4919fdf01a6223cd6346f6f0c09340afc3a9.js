(() => {
  const day = 86400000;
  const refresh = () => {
    document.querySelectorAll('[data-recruitment-deadline]').forEach(label => {
      const deadline = Date.parse(label.dataset.recruitmentDeadline);
      if (!Number.isFinite(deadline) || label.dataset.recruitmentClosed === 'true') return;
      const remaining = deadline - Date.now();
      let text = label.dataset.deadlineAbsolute;
      if (remaining <= 0) text = '締切済み';
      else if (remaining <= day) text = `あと${Math.ceil(remaining / 3600000)}時間`;
      else if (remaining <= 7 * day) text = `あと${Math.ceil(remaining / day)}日`;
      label.textContent = text;
      label.classList.toggle('is-urgent', remaining > 0 && remaining <= day);
    });
  };
  refresh();
  setInterval(refresh, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
