(() => {
  const source = document.getElementById('news-expiry-data');
  if (!source) return;
  const entries = JSON.parse(source.textContent);
  const update = () => {
    const now = Date.now();
    for (const entry of entries) {
      if (now < Date.parse(entry.expires)) continue;
      for (const card of document.querySelectorAll('.article-link--card, .article-link--simple')) {
        if (Array.from(card.querySelectorAll('a[href]')).some(link =>
          [entry.url, entry.externalUrl].includes(link.getAttribute('href')))) {
          card.hidden = true;
          card.style.display = 'none';
        }
      }
      if (location.pathname !== entry.url) continue;
      const content = document.querySelector('.article-content');
      if (!content || content.querySelector('[data-recruitment-closed]')) continue;
      const message = document.createElement('p');
      message.dataset.recruitmentClosed = '';
      message.setAttribute('role', 'status');
      message.textContent = 'この募集の受付は終了しました。';
      content.prepend(message);
      content.querySelector('.shooting-contact')?.remove();
    }
  };
  update();
  window.setInterval(update, 60000);
  window.addEventListener('pageshow', update);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) update();
  });
})();
