(() => {
  const board = document.getElementById('availability-board');
  if (!board) return;

  const get = (id) => document.getElementById(id);
  const groups = get('availability-groups');
  const title = get('availability-title');
  const fullTitle = 'ラグコス2026Twinkle タイムテーブル';
  const shortTitle = 'ラグコス2026TW タイテ';
  let availableSlots = [];
  const statusLabels = { open: '○ 空き', pending: '△ 確認待ち', confirmed: '× 予約済み', break: '× 休憩', blocked: '× 受付停止', ended: '× 終了' };

  function fitTitle() {
    if (!title.clientWidth) return;
    title.style.fontSize = '';
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    const style = getComputedStyle(title);
    context.font = style.font;
    const widthOf = value => context.measureText(value).width;
    const value = widthOf(fullTitle) <= title.clientWidth ? fullTitle : shortTitle;
    title.textContent = value;
    title.setAttribute('aria-label', fullTitle);
    title.style.fontSize = `${Math.min(1, title.clientWidth / widthOf(value)) * parseFloat(style.fontSize)}px`;
  }

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function clock(iso) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tokyo', hour: 'numeric', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(iso));
    const hour = parts.find(part => part.type === 'hour')?.value ?? '0';
    const minute = parts.find(part => part.type === 'minute')?.value ?? '00';
    return `${Number(hour)}:${minute}`;
  }

  function range(slot) {
    return `${clock(slot.starts_at)} 〜 ${clock(slot.ends_at)}`;
  }

  function stateIcon(status) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const shape = document.createElementNS(svg.namespaceURI, status === 'open' ? 'circle' : 'path');
    if (status === 'open') {
      shape.setAttribute('cx', '12'); shape.setAttribute('cy', '12'); shape.setAttribute('r', '8.25');
    } else if (status === 'pending') {
      shape.setAttribute('d', 'M12 3.5 21 20H3L12 3.5Z');
    } else {
      shape.setAttribute('d', 'm5 5 14 14M19 5 5 19');
    }
    svg.append(shape);
    return svg;
  }

  const consultation = element('dialog', undefined, 'availability-dialog');
  consultation.setAttribute('aria-labelledby', 'availability-dialog-title');
  const dialogContent = element('div', undefined, 'availability-dialog-content');
  const dialogHeader = element('div', undefined, 'availability-dialog-header');
  const dialogTitle = element('h3');
  dialogTitle.id = 'availability-dialog-title';
  const closeButton = element('button', '×', 'availability-dialog-close');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '閉じる');
  closeButton.addEventListener('click', () => consultation.close());
  dialogHeader.append(dialogTitle, closeButton);
  const dialogStatus = element('p', undefined, 'availability-dialog-status');
  const invitation = element('div', undefined, 'availability-dialog-invitation');
  invitation.append(element('p', '\\ 楽しいお誘いお待ちしております！ /'));
  const actions = element('div', undefined, 'availability-dialog-actions');
  for (const [label, href, icon, className] of [
    ['DMで相談', 'https://x.com/98tml', '𝕏', 'availability-dialog-dm'],
    ['メールフォーム', 'https://t98.info/contact/', '✉', 'availability-dialog-mail'],
  ]) {
    const link = element('a', undefined, className);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const mark = element('span', icon);
    mark.setAttribute('aria-hidden', 'true');
    link.append(mark, document.createTextNode(label));
    actions.append(link);
  }
  invitation.append(actions);
  const recommendations = element('div', undefined, 'availability-recommendations');
  recommendations.hidden = true;
  dialogContent.append(dialogHeader, dialogStatus, invitation, recommendations);
  consultation.append(dialogContent);
  document.body.append(consultation);
  consultation.addEventListener('click', event => {
    if (event.target === consultation) {
      const rect = consultation.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) consultation.close();
    }
  });

  function showConsultation(slot, status) {
    dialogTitle.textContent = range(slot);
    dialogStatus.textContent = statusLabels[status] || '× 受付停止';
    dialogStatus.dataset.status = status;
    const receiving = board.dataset.receiving === 'true';
    invitation.hidden = !receiving || !['open', 'pending'].includes(status);
    recommendations.replaceChildren();
    const nearby = receiving && status !== 'open' ? availableSlots
      .filter(candidate => candidate.starts_at !== slot.starts_at && Date.parse(candidate.starts_at) > Date.now())
      .sort((a, b) => Math.abs(Date.parse(a.starts_at) - Date.parse(slot.starts_at)) - Math.abs(Date.parse(b.starts_at) - Date.parse(slot.starts_at)) || Date.parse(a.starts_at) - Date.parse(b.starts_at))
      .slice(0, 3) : [];
    recommendations.hidden = nearby.length === 0;
    if (nearby.length) {
      recommendations.append(element('h4', '\\ こちらの時間帯はいかがですか？ /'));
      const cards = element('div', undefined, 'availability-recommendation-grid');
      for (const candidate of nearby) {
        const button = element('button', undefined, 'availability-recommendation');
        button.type = 'button';
        const date = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' }).format(new Date(candidate.starts_at));
        button.setAttribute('aria-label', `${date} ${range(candidate)} 空き、相談する`);
        button.append(element('span', date, 'availability-recommendation-date'), element('span', range(candidate)), element('span', '○ 空き', 'availability-recommendation-state'));
        button.addEventListener('click', () => showConsultation(candidate, 'open'));
        cards.append(button);
      }
      recommendations.append(cards);
    }
    if (!consultation.open) consultation.showModal();
    else closeButton.focus();
  }

  function renderSection(section, slots, now) {
    const panel = element('section', undefined, `availability-section availability-section--${section}`);
    const heading = element('h2');
    const icon = element('img');
    icon.src = `/timetable/${section === 'day' ? 'sun' : 'moon'}.png`;
    icon.alt = '';
    icon.width = 24;
    icon.height = 24;
    heading.append(icon, element('span', section === 'day' ? '昼の部' : '夜の部'));
    heading.id = `availability-${section}`;
    panel.setAttribute('aria-labelledby', heading.id);
    panel.append(heading);

    const table = element('table');
    const columns = element('colgroup');
    columns.append(element('col', undefined, 'availability-col-time'), element('col', undefined, 'availability-col-state'));
    table.append(columns);
    const caption = element('caption', `${section === 'day' ? '昼' : '夜'}の撮影時間帯と空き状況`);
    caption.className = 'visually-hidden';
    table.append(caption);
    const body = element('tbody');
    for (const slot of slots) {
      const rawStatus = slot.status;
      const status = rawStatus === 'open' && Date.parse(slot.starts_at) <= now ? 'ended' : rawStatus;
      const row = element('tr');
      row.dataset.status = status;
      const time = element('th');
      time.scope = 'row';
      {
        const button = element('button', range(slot), 'availability-slot-button');
        button.type = 'button';
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-label', `${range(slot)} ${statusLabels[status] || '受付停止'}、詳細を見る`);
        time.append(button);
        row.classList.add('availability-slot-interactive');
        row.addEventListener('click', () => showConsultation(slot, status));
      }
      const state = element('td');
      const mark = element('span', undefined, 'availability-state');
      mark.setAttribute('role', 'img');
      const labels = { open: '空きあり', pending: '確認待ち', confirmed: '予約済み', break: '休憩', blocked: '受付停止', ended: '終了' };
      mark.setAttribute('aria-label', labels[status] || '受付停止');
      mark.append(stateIcon(status));
      state.append(mark);
      row.append(time, state);
      body.append(row);
    }
    table.append(body);
    panel.append(table);
    return panel;
  }

  async function load() {
    try {
      const response = await fetch(board.dataset.api, { method: 'GET', credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('空き状況を取得できませんでした。');
      const data = await response.json();
      if (data.event?.slug !== 'lagcos-tw-2026' || !Array.isArray(data.slots) || !data.updatedAt) throw new Error('空き状況を取得できませんでした。');

      board.dataset.receiving = String(data.event.receiving === true);
      availableSlots = data.slots.filter(slot => slot.status === 'open');
      const now = Date.now();
      const counts = { open: 0 };
      const sections = [];
      for (const section of ['day', 'night']) {
        const slots = data.slots.filter(slot => slot.section === section);
        if (!slots.length) continue;
        for (const slot of slots) {
          if (slot.status === 'open' && Date.parse(slot.starts_at) > now) counts.open += 1;
        }
        sections.push(renderSection(section, slots, now));
      }
      if (!sections.length) throw new Error('空き状況を取得できませんでした。');
      groups.replaceChildren(...sections);
      const count = get('availability-count');
      count.replaceChildren(document.createTextNode('残り '), element('strong', String(counts.open)), document.createTextNode(' 枠'));
      get('availability-closed').hidden = data.event.receiving === true;
      const noticeList = get('availability-notice-list');
      const notices = String(data.event.image_note || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      noticeList.replaceChildren(...notices.map(line => element('li', line.replace(/^[・●]\s*/, ''))));
      get('availability-notices').hidden = false;
      const updated = new Date(data.updatedAt);
      get('availability-updated').textContent = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h23',
      }).format(updated) + ' 現在';
      document.title = `${fullTitle} · にじてくと`;
      get('availability-error').hidden = true;
      fitTitle();
    } catch {
      groups.replaceChildren();
      get('availability-count').textContent = '';
      get('availability-updated').textContent = '';
      get('availability-notices').hidden = true;
      get('availability-closed').hidden = true;
      const error = get('availability-error');
      error.textContent = '空き状況を読み込めませんでした。時間をおいて再度ページを開いてください。';
      error.hidden = false;
    } finally {
      get('availability-loading').hidden = true;
    }
  }

  window.addEventListener('resize', fitTitle, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(fitTitle);
  load();
})();
