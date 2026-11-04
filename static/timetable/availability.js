(() => {
  const board = document.getElementById('availability-board');
  if (!board) return;

  const get = (id) => document.getElementById(id);
  const groups = get('availability-groups');
  const title = get('availability-title');
  const eventSlug = board.dataset.eventSlug || 'lagcos-tw-2026';
  const fullTitle = board.dataset.title || 'ラグコス2026Twinkle タイムテーブル';
  const shortTitle = board.dataset.shortTitle || 'ラグコス2026TW タイテ';
  let availableSlots = [];
  let weather = null;
  let slotRows = [];
  let timelines = [];
  let useTimeline = false;
  const preview = ['localhost','127.0.0.1'].includes(location.hostname) && board.dataset.presencePreview === 'true';
  const previewTime = Date.parse(board.dataset.presenceNow), previewStarted = performance.now();
  const currentTime = () => preview && Number.isFinite(previewTime) ? previewTime + performance.now() - previewStarted : Date.now();
  const statusLabels = { open: '○ 空き', pending: '△ 確認待ち', adjusting: '△ 調整中', confirmed: '× 確定', break: '× 休憩', blocked: '× 受付停止', ended: '× 終了' };

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

  function mailIcon() {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('width', '18');
    svg.setAttribute('height', '18');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const rect = document.createElementNS(namespace, 'rect');
    rect.setAttribute('x', '3'); rect.setAttribute('y', '5');
    rect.setAttribute('width', '18'); rect.setAttribute('height', '14');
    rect.setAttribute('rx', '2');
    const flap = document.createElementNS(namespace, 'path');
    flap.setAttribute('d', 'm3 7 9 6 9-6');
    svg.append(rect, flap);
    return svg;
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
    } else if (['pending', 'adjusting'].includes(status)) {
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
    ['メールフォーム', 'https://t98.info/contact/', 'mail', 'availability-dialog-mail'],
  ]) {
    const link = element('a', undefined, className);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const mark = icon === 'mail' ? mailIcon() : element('span', icon);
    if (icon !== 'mail') mark.setAttribute('aria-hidden', 'true');
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
      .filter(candidate => candidate.starts_at !== slot.starts_at && Date.parse(candidate.starts_at) > currentTime())
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

    if (useTimeline) panel.classList.add('availability-section--timeline');
    const table = element(useTimeline ? 'div' : 'table', undefined, useTimeline ? 'availability-timeline' : undefined);
    const columns = element('colgroup');
    columns.append(element('col', undefined, 'availability-col-time'), element('col', undefined, 'availability-col-state'));
    if (!useTimeline) table.append(columns);
    const caption = element('caption', `${section === 'day' ? '昼' : '夜'}の撮影時間帯と空き状況`);
    caption.className = 'visually-hidden';
    if (!useTimeline) table.append(caption);
    const body = element(useTimeline ? 'div' : 'tbody', undefined, useTimeline ? 'availability-timeline-track' : undefined);
    let startsAt = 0;
    if (useTimeline) {
      const hour = 3600000;
      startsAt = Math.floor(Math.min(...slots.map(slot => Date.parse(slot.starts_at))) / hour) * hour;
      const endsAt = Math.ceil(Math.max(...slots.map(slot => Date.parse(slot.ends_at))) / hour) * hour;
      table.style.setProperty('--timeline-height', `${(endsAt - startsAt) / 60000 * 2}px`);
      const axis = element('div', undefined, 'availability-time-axis');
      axis.setAttribute('aria-hidden', 'true');
      for (let at = startsAt; at <= endsAt; at += hour) {
        const tick = element('span', clock(at), 'availability-time-tick');
        tick.style.top = `${(at - startsAt) / 60000 * 2}px`;
        axis.append(tick);
      }
      const indicator = element('div', undefined, 'availability-time-now');
      indicator.setAttribute('aria-hidden', 'true');
      body.setAttribute('role', 'list');
      body.setAttribute('aria-label', `${section === 'day' ? '昼' : '夜'}の撮影時間帯と空き状況`);
      table.append(axis);
      body.append(indicator);
      timelines.push({startsAt, endsAt, indicator});
    }
    for (const slot of slots) {
      const rawStatus = slot.status;
      const status = Date.parse(slot.ends_at) <= now ? 'ended' : rawStatus;
      const row = element(useTimeline ? 'div' : 'tr', undefined, useTimeline ? 'availability-timeline-slot' : undefined);
      if (useTimeline) {
        row.setAttribute('role', 'listitem');
        if (Date.parse(slot.ends_at) - Date.parse(slot.starts_at) < 30 * 60000) row.classList.add('availability-timeline-slot--compact');
        row.style.top = `${(Date.parse(slot.starts_at) - startsAt) / 60000 * 2}px`;
        row.style.height = `${(Date.parse(slot.ends_at) - Date.parse(slot.starts_at)) / 60000 * 2 - 3}px`;
      }
      row.dataset.status = status;
      if (slot.timelineActivity) row.dataset.activity = slot.kind;
      const time = element(useTimeline ? 'div' : 'th', undefined, useTimeline ? 'availability-timeline-time' : undefined);
      if (!useTimeline) time.scope = 'row';
      {
        const button = element(slot.timelineActivity ? 'span' : 'button', range(slot), 'availability-slot-button');
        if (!slot.timelineActivity) {
          button.type = 'button';
          button.setAttribute('aria-haspopup', 'dialog');
        }
        if (!slot.timelineActivity) button.setAttribute('aria-label', `${range(slot)} ${statusLabels[status] || '受付停止'}、詳細を見る`);
        const hour = weather?.hours?.find(hour => Date.parse(hour.time) === Math.floor(Date.parse(slot.starts_at) / 3600000) * 3600000);
        if (!slot.timelineActivity && hour && ['sun','moon','cloud','rain','snow'].includes(hour.icon)) {
          const mark = element('span', undefined, 'availability-weather-mark');
          const icon = element('span', undefined, 'availability-weather-icon');
          const temperature = typeof hour.temperature === 'number' && Number.isFinite(hour.temperature) ? `${hour.temperature.toFixed(1)} ℃` : '—';
          icon.style.setProperty('--weather-icon', `url("/timetable/weather/${hour.icon}.svg")`);
          mark.setAttribute('role', 'img');
          mark.setAttribute('aria-label', `${hour.label} ${temperature}`);
          icon.setAttribute('aria-hidden', 'true');
          const value = element('span', temperature, 'availability-weather-temperature');
          value.setAttribute('aria-hidden', 'true');
          mark.append(icon, value);
          const updated = weather.fetchedAt ? new Intl.DateTimeFormat('ja-JP', {timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',hourCycle:'h23'}).format(new Date(weather.fetchedAt)) : '';
          mark.title = `${weather.location.name}：${hour.label} ${temperature}${updated ? `（${weather.stale ? '更新遅延・最終取得' : '予報取得'} ${updated}）` : ''}`;
          button.classList.add('availability-slot-button--weather');
          button.prepend(mark);
          button.setAttribute('aria-label', `${range(slot)} ${hour.label} ${temperature} ${statusLabels[status] || '受付停止'}、詳細を見る`);
        }
        time.append(button);
        if (!slot.timelineActivity) {
          row.classList.add('availability-slot-interactive');
          row.addEventListener('click', () => showConsultation(slot, row.dataset.status));
        }
      }
      const state = element(useTimeline ? 'div' : 'td', undefined, useTimeline ? 'availability-timeline-state' : undefined);
      const mark = element('span', undefined, 'availability-state');
      mark.setAttribute('role', 'img');
      const labels = { open: '空きあり', pending: '確認待ち', adjusting: '調整中', confirmed: '確定', break: '休憩', blocked: '受付停止', ended: '終了' };
      mark.setAttribute('aria-label', labels[status] || '受付停止');
      mark.append(stateIcon(status));
      if (!slot.timelineActivity) state.append(mark);
      if (useTimeline) state.append(element('span', slot.timelineActivity ? (slot.kind === 'free' ? 'フリー' : '休憩') : (labels[status] || '受付停止'), 'availability-timeline-label'));
      row.append(time, state);
      body.append(row);
      slotRows.push({slot,row});
    }
    table.append(body);
    panel.append(table);
    return panel;
  }

  function refreshSlotTimes() {
    if(document.hidden || !slotRows.length)return;
    const now=currentTime();
    for (const {startsAt, endsAt, indicator} of timelines) {
      indicator.hidden = now < startsAt || now >= endsAt;
      if (!indicator.hidden) indicator.style.top = `${(now - startsAt) / 60000 * 2}px`;
    }
    for(const {slot,row} of slotRows){
      const active=Date.parse(slot.starts_at)<=now && now<Date.parse(slot.ends_at);
      const status=Date.parse(slot.ends_at)<=now?'ended':slot.status;
      if(row.dataset.current!==String(active)){
        row.dataset.current=String(active);
        if(active)row.setAttribute('aria-current','time');else row.removeAttribute('aria-current');
      }
      if(row.dataset.status===status)continue;
      row.dataset.status=status;
      if (slot.timelineActivity) continue;
      const mark=row.querySelector('.availability-state');
      mark.setAttribute('aria-label',status==='ended'?'終了':statusLabels[status]||'受付停止');
      mark.replaceChildren(stateIcon(status));
      const label = row.querySelector('.availability-timeline-label');
      if (label) label.textContent = status === 'ended' ? '終了' : (statusLabels[status] || '受付停止').replace(/^[○△×] /, '');
      const button=row.querySelector('.availability-slot-button');
      const forecast=row.querySelector('.availability-weather-mark')?.getAttribute('aria-label');
      button.setAttribute('aria-label',`${range(slot)} ${forecast?forecast+' ':''}${statusLabels[status]||'受付停止'}、詳細を見る`);
    }
    const open=availableSlots.filter(slot=>Date.parse(slot.starts_at)>now).length;
    const countPanel=get('availability-count');
    countPanel.hidden=Number.isFinite(Date.parse(board.timetableEvent?.ends_at)) && now>=Date.parse(board.timetableEvent.ends_at);
    const count=countPanel.querySelector('strong');if(count)count.textContent=String(open);
    const selected=slotRows.find(({slot})=>range(slot)===dialogTitle.textContent);
    if(consultation.open && selected && selected.row.dataset.status==='ended'){
      dialogStatus.textContent=statusLabels.ended;dialogStatus.dataset.status='ended';invitation.hidden=true;
    }
  }

  async function load() {
    try {
      const response = await fetch(board.dataset.api, { method: 'GET', credentials: 'omit', cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('空き状況を取得できませんでした。');
      const data = await response.json();
      if (data.event?.slug !== eventSlug || !Array.isArray(data.slots) || !data.updatedAt) throw new Error('空き状況を取得できませんでした。');

      useTimeline = data.event.timetable_mode === 'timeline';
      board.classList.toggle('availability-board--timeline', useTimeline);
      board.timetableEvent = data.event;
      board.dispatchEvent(new CustomEvent('timetable:loaded', {detail:{event:data.event}}));
      weather = data.weather || null;
      board.dataset.receiving = String(data.event.receiving === true);
      availableSlots = data.slots.filter(slot => slot.status === 'open');
      const now = currentTime();
      slotRows = [];
      timelines = [];
      const counts = { open: 0 };
      const sections = [];
      const displayed = useTimeline ? [...data.slots, ...(data.activities || []).filter(a => ['break','free'].includes(a.kind)).map(a => ({...a, status:a.kind, timelineActivity:true}))] : data.slots;
      for (const section of ['day', 'night']) {
        const slots = displayed.filter(slot => slot.section === section).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
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
      refreshSlotTimes();
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
      weather = null;
      slotRows = [];
      timelines = [];
      groups.replaceChildren();
      get('availability-count').textContent = '';
      get('availability-updated').textContent = '';
      get('availability-notices').hidden = true;
      const error = get('availability-error');
      error.textContent = '空き状況を読み込めませんでした。時間をおいて再度ページを開いてください。';
      error.hidden = false;
    } finally {
      get('availability-loading').hidden = true;
    }
  }

  window.addEventListener('resize', fitTitle, { passive: true });
  if (document.fonts?.ready) document.fonts.ready.then(fitTitle);
  setInterval(refreshSlotTimes,1000);
  document.addEventListener('visibilitychange',refreshSlotTimes);
  load();
})();
