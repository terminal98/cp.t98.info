document.addEventListener('DOMContentLoaded', () => {
  // --- 設定 ---
  const EVENTS_JSON_URL = 'https://g2.t98.info/events.json';
  const SETTINGS_JSON_URL = 'https://g2.t98.info/calendar-settings.json';
  const HOLIDAYS_JSON_URL = 'https://holidays-jp.github.io/api/v1/date.json';
  const ITEMS_PER_PAGE = 10;

  // --- グローバル変数 ---
  let currentDate = new Date();
  let events = {};
  let calendarSettings = { weekdayTentativeDays: 14 };
  let holidays = {};
  let displayStartDate = null;
  let displayEndDate = null;
  let eventList = [];
  let currentPage = 1;
  let detailsReturnDate = '';
  let detailsReturnTarget = null;
  let hideDetailsTimer = 0;
  const statusLabels = { 1: '空き', 2: '応相談', 3: '締切', 4: 'その他' };

  // --- DOM要素 ---
  const loadingMessage = document.getElementById('loading-message');
  const calendarWrapper = document.getElementById('calendar-wrapper');
  const calendarGrid = document.getElementById('calendar-grid');
  const monthYearEl = document.getElementById('month-year');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const eventModal = document.getElementById('event-modal');
  const modalContent = document.getElementById('modal-content');
  const eventTableWrapper = document.getElementById('event-table-wrapper');
  const noEventsMessage = document.getElementById('no-events-message');
  const paginationControls = document.getElementById('pagination-controls');
  const nextWeekdayEl = document.getElementById('next-weekday');
  const nextWeekendEl = document.getElementById('next-weekend');

  // --- 初期化処理 ---
  async function initialize() {
    try {
      await fetchData();
      setupDisplayRange();
      renderCalendar();
      prepareAndRenderEventList();
      renderNextAvailableDates();
      setupEventListeners();
      loadingMessage.classList.add('hidden');
      calendarWrapper.classList.remove('hidden');
    } catch (error) {
      console.error('初期化に失敗しました:', error);
      loadingMessage.innerHTML = '<p class="text-red-500 dark:text-red-400">現在メンテナンス中です。<br>お急ぎの場合はDMで直接お問い合わせください。</p>';
    }
  }

  // --- データ取得（リトライ機能付き） ---
  async function fetchWithRetry(url, options = { retries: 3, delay: 1000 }) {
    const { retries, delay } = options;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return response;
        }
        console.warn(`Attempt ${i + 1} for ${url} failed with status: ${response.status}`);
      } catch (error) {
        console.warn(`Attempt ${i + 1} for ${url} failed with error:`, error);
      }
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay * (2 ** i)));
      }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} attempts.`);
  }

  async function fetchData() {
    try {
      const [eventsRes, settingsRes, holidaysRes] = await Promise.all([
        fetchWithRetry(EVENTS_JSON_URL),
        fetchWithRetry(SETTINGS_JSON_URL).catch(() => null),
        fetchWithRetry(HOLIDAYS_JSON_URL)
      ]);

      events = await eventsRes.json();
      if (settingsRes) calendarSettings = normalizeCalendarSettings(await settingsRes.json());
      holidays = await holidaysRes.json();
    } catch (error) {
      console.error('データ取得エラー (リトライ後):', error);
      events = {};
      calendarSettings = { weekdayTentativeDays: 14 };
      holidays = {};
      throw error;
    }
  }

  function normalizeCalendarSettings(value) {
    const raw = Number(value?.weekdayTentativeDays);
    return {
      weekdayTentativeDays: Number.isFinite(raw) ? Math.min(365, Math.max(0, Math.round(raw))) : 14
    };
  }

  // --- 表示期間の設定 ---
  function setupDisplayRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 前月ボタンで今月へ戻れるよう、表示可能範囲の開始月は常に今月にする。
    displayStartDate = new Date(today.getFullYear(), today.getMonth(), 1);

    // 今月の今日以降に「空き」または「要相談」がなければ、初期表示だけ翌月へ進める。
    currentDate = new Date(displayStartDate);
    if (!hasAvailableDateInMonth(today)) {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    let maxMonthRange = 6;
    if (today.getDate() >= 25) {
      maxMonthRange++;
    }

    displayEndDate = new Date(today.getFullYear(), today.getMonth() + maxMonthRange, 1);
  }

  function hasAvailableDateInMonth(today) {
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let day = today.getDate(); day <= lastDay; day++) {
      const date = new Date(year, month, day);
      const event = events[formatDate(date)] || getDefaultEvent(date);
      if (event && (event.type === 1 || event.type === 2)) {
        return true;
      }
    }

    return false;
  }

  // --- カレンダー描画 ---
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearEl.textContent = `${year}年 ${month + 1}月`;
    calendarGrid.innerHTML = '';

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let dayOfWeekOfFirst = firstDayOfMonth.getDay();
    const offset = dayOfWeekOfFirst;

    for (let i = 0; i < offset; i++) {
      calendarGrid.appendChild(createEmptyDayCell());
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      calendarGrid.appendChild(createDayCell(date));
    }

    updateNavButtons();
  }

  // --- 日付セル生成 ---
  function dayAccessibleName(date, event) {
    const label = `${date.getMonth() + 1}月${date.getDate()}日`;
    const eventName = event?.eventname?.trim();
    if (eventName) return `${label} ${eventName}`;
    if (event) return `${label} ${statusLabels[event.type] || ''}`.trim();
    return label;
  }

  function createDayCell(date) {
    const dateStr = formatDate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = date < today;
    const event = isPast ? null : (events[dateStr] || getDefaultEvent(date));
    const cell = document.createElement(event ? 'button' : 'div');
    if (event) {
      cell.type = 'button';
      cell.dataset.date = dateStr;
      cell.classList.add('calendar-day');
      cell.setAttribute('aria-label', dayAccessibleName(date, event));
      cell.addEventListener('click', () => showDetails(date, event));
    }

    cell.className += ' relative p-1 md:p-2 border-r border-b border-gray-200 dark:border-gray-700 min-h-[80px] md:min-h-[120px]';

    const dayNumber = document.createElement('div');
    dayNumber.textContent = date.getDate();
    dayNumber.className = 'text-xs md:text-sm font-semibold';

    const dayOfWeek = date.getDay();
    if (holidays[dateStr] || dayOfWeek === 0) {
      dayNumber.classList.add('text-red-500', 'dark:text-red-400');
    } else if (dayOfWeek === 6) {
      dayNumber.classList.add('text-blue-500', 'dark:text-blue-400');
    } else {
      dayNumber.classList.add('text-gray-700', 'dark:text-gray-300');
    }
    cell.appendChild(dayNumber);

    if (isPast) {
      dayNumber.classList.remove('text-red-500', 'dark:text-red-400', 'text-blue-500', 'dark:text-blue-400', 'text-gray-700', 'dark:text-gray-300');
      dayNumber.classList.add('text-gray-400', 'dark:text-gray-500');
      cell.classList.add('bg-gray-50', 'dark:bg-gray-800/50');
      return cell;
    }

    cell.classList.add('cursor-pointer', 'hover:bg-gray-100', 'dark:hover:bg-gray-700', 'transition-colors');
    cell.appendChild(createEventContent(event));
    return cell;
  }

  function createEmptyDayCell() {
    const cell = document.createElement('div');
    cell.className = 'bg-gray-50 dark:bg-gray-800/50 border-r border-b border-gray-200 dark:border-gray-700';
    return cell;
  }

  // --- イベントコンテンツ生成 ---
  function createEventContent(event) {
    const container = document.createElement('div');
    container.className = 'absolute inset-0 flex flex-col items-center justify-center p-1 text-center';

    const statusIcon = document.createElement('div');
    statusIcon.className = 'text-2xl md:text-3xl';

    switch (event.type) {
      case 1: statusIcon.innerHTML = '<i class="far fa-circle text-green-500 dark:text-green-400"></i>'; break;
      case 2: statusIcon.innerHTML = '<i class="fas fa-play text-yellow-500 dark:text-yellow-400" style="transform: rotate(-90deg);"></i>'; break;
      case 3: statusIcon.innerHTML = '<i class="fas fa-times text-red-500 dark:text-red-400"></i>'; break;
      case 4: statusIcon.innerHTML = ''; break;
    }
    container.appendChild(statusIcon);

    if (event.eventname && event.eventname.trim() !== '') {
      const eventNameEl = document.createElement('div');
      eventNameEl.className = 'text-xs font-bold mt-1 hidden md:block truncate w-full';
      eventNameEl.textContent = event.eventname;

      switch (event.type) {
        case 1: eventNameEl.classList.add('text-green-700', 'dark:text-green-300'); break;
        case 2: eventNameEl.classList.add('text-yellow-700', 'dark:text-yellow-300'); break;
        case 3: eventNameEl.classList.add('text-red-700', 'dark:text-red-300'); break;
        case 4:
          eventNameEl.classList.remove('hidden');
          eventNameEl.classList.add('text-gray-700', 'dark:text-gray-300');
          break;
      }
      container.appendChild(eventNameEl);
    }

    return container;
  }

  // --- デフォルトイベント取得 ---
  function getDefaultEvent(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return null;
    const dateStr = formatDate(date);
    const dayOfWeek = date.getDay();
    if (holidays[dateStr] || dayOfWeek === 0 || dayOfWeek === 6) {
      return { eventname: '', type: date.getTime() === today.getTime() ? 2 : 1, isDefault: true };
    } else {
      const cutoffDate = new Date(today.getTime() + calendarSettings.weekdayTentativeDays * 24 * 60 * 60 * 1000);
      return { eventname: '', type: date < cutoffDate ? 3 : 2, isDefault: true };
    }
  }

  // --- 直近の空き日程を描画 ---
  function renderNextAvailableDates() {
    let foundWeekday = null, foundWeekend = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 180 && (!foundWeekday || !foundWeekend); i++) {
      const checkingDate = new Date(today);
      checkingDate.setDate(today.getDate() + i);
      const dateStr = formatDate(checkingDate);
      const dayOfWeek = checkingDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || holidays[dateStr];
      const event = events[dateStr] || getDefaultEvent(checkingDate);
      if (event && (event.type === 1 || event.type === 2)) {
        if (!isWeekend && !foundWeekday) foundWeekday = checkingDate;
        if (isWeekend && !foundWeekend) foundWeekend = checkingDate;
      }
    }
    const updateEl = (el, date) => {
      if (date) {
        const dayOfWeekHtml = getFormattedDayOfWeek(date, 'text-md');
        el.innerHTML = `<span class="absolute top-2 left-3 text-xs font-bold ${el.id === 'next-weekday' ? 'text-gray-500 dark:text-gray-400' : 'text-red-500 dark:text-red-400'}">${el.id === 'next-weekday' ? '平日' : '土休日'}</span><div class="flex justify-center items-baseline"><div class="text-3xl font-bold text-gray-800 dark:text-gray-100">${date.getMonth() + 1}<span class="text-xl font-medium">月</span>${date.getDate()}<span class="text-xl font-medium">日</span></div><div class="ml-2">${dayOfWeekHtml}</div></div>`;
      } else {
        el.innerHTML = `<span class="text-gray-500 dark:text-gray-400">調整中</span>`;
      }
    };
    updateEl(nextWeekdayEl, foundWeekday);
    updateEl(nextWeekendEl, foundWeekend);
  }

  // --- イベントリストの準備と描画 ---
  function prepareAndRenderEventList() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventList = Object.entries(events).filter(([date, event]) => event.isEvent && new Date(date) >= today).sort((a, b) => a[0].localeCompare(b[0]));
    currentPage = 1;
    renderEventList();
  }

  function renderEventList() {
    if (eventList.length === 0) {
      noEventsMessage.classList.remove('hidden');
      eventTableWrapper.innerHTML = '';
      paginationControls.innerHTML = '';
      return;
    }
    noEventsMessage.classList.add('hidden');
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedItems = eventList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const table = document.createElement('table');
    table.className = '!w-full text-sm text-left text-gray-500 dark:text-gray-400 mt-0 mb-0 table-auto';
    table.innerHTML = `
            <thead class="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 block w-full">
                <tr class="inline-flex w-full">
                    <th scope="col" class="px-4 py-2 text-left w-1/4">日付</th>
                    <th scope="col" class="px-4 py-2 text-left w-3/4">イベント名</th>
                </tr>
            </thead>
            <tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    paginatedItems.forEach(([dateStr, event]) => {
      const date = new Date(dateStr);
      const dayOfWeekHtml = getFormattedDayOfWeek(date);
      const tr = document.createElement('tr');
      tr.className = 'bg-white dark:bg-gray-800 border-b dark:border-gray-700 inline-flex w-full';
      tr.innerHTML = `
                <td class="px-4 py-2 w-1/4">${date.getMonth() + 1}/${date.getDate()} ${dayOfWeekHtml}</td>
                <td class="px-4 py-2 break-words w-3/4">
                  <div class="flex justify-between items-center">
                      <span class="font-medium text-gray-900 dark:text-white truncate flex-grow">${escapeHtml(event.eventname)}</span>
                      <button type="button" class="detail-btn text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 text-lg flex-shrink-0 ml-4" data-date="${dateStr}" aria-label="${escapeHtml(dayAccessibleName(date, event))}の詳細">
                          <i class="fas fa-info-circle" aria-hidden="true"></i>
                      </button>
                    </div>
                </td>
            `;
      tr.querySelector('.detail-btn').addEventListener('click', () => showDetails(date, event));
      tbody.appendChild(tr);
    });
    eventTableWrapper.innerHTML = '';
    eventTableWrapper.appendChild(table);
    renderPagination();
  }

  // --- ページネーション描画 ---
  function renderPagination() {
    paginationControls.innerHTML = '';
    const totalPages = Math.ceil(eventList.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;
    const createBtn = (html, label, disabled, onClick) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = html;
      btn.setAttribute('aria-label', label);
      btn.className = 'px-3 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50';
      btn.disabled = disabled;
      btn.addEventListener('click', onClick);
      return btn;
    };
    paginationControls.appendChild(createBtn('<i class="fas fa-arrow-left" aria-hidden="true"></i>', '前のページ', currentPage === 1, () => { currentPage--; renderEventList(); }));
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    pageInfo.className = 'px-3 py-1 text-sm';
    paginationControls.appendChild(pageInfo);
    paginationControls.appendChild(createBtn('<i class="fas fa-arrow-right" aria-hidden="true"></i>', '次のページ', currentPage === totalPages, () => { currentPage++; renderEventList(); }));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function publicLocationInfoMarkup(event) {
    // locationInfoは、場所が公開された予定の公開投影にだけ含まれる。
    const info = event?.locationInfo;
    if (!event?.place || !info || typeof info !== 'object') return '';
    const address = info.address && typeof info.address === 'object'
      ? ['street', 'city', 'state', 'countryOrRegion', 'postalCode']
        .map((field) => info.address[field])
        .filter(Boolean)
        .join(', ')
      : '';
    const latitude = Number(info.coordinates?.latitude);
    const longitude = Number(info.coordinates?.longitude);
    const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
    if (!address && !hasCoordinates) return '';
    const query = hasCoordinates ? `${latitude},${longitude}` : address;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    const coordinateText = hasCoordinates ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` : '';
    return `<div class="ml-7 mt-1 rounded-lg bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm text-gray-600 dark:text-gray-300">` +
      `${address ? `<div><i class="fas fa-location-dot w-5 mr-1 text-blue-500"></i>${escapeHtml(address)}</div>` : ''}` +
      `${coordinateText ? `<div class="mt-1"><i class="fas fa-crosshairs w-5 mr-1 text-blue-500"></i>${escapeHtml(coordinateText)}</div>` : ''}` +
      `<a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="mt-1 inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"><i class="fas fa-map mr-1"></i>地図で開く</a>` +
      `</div>`;
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function resolveTimetableSlug(dateStr, event) {
    if (Object.hasOwn(event, 'timetableSlug')) return event.timetableSlug === 'lagcos-tw-2026' ? event.timetableSlug : '';
    // Existing published calendar JSON predates the explicit association field.
    return dateStr === '2026-11-07' && event.isEvent === true && /ラグコス/.test(event.eventname || '') ? 'lagcos-tw-2026' : '';
  }

  async function loadTimetableSummary(slug, target) {
    try {
      const response = await fetch(`https://g2.t98.info/timetable/${slug}.json`, {
        credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('status unavailable');
      const data = await response.json();
      if (data.event?.slug !== slug || !Array.isArray(data.slots)) throw new Error('invalid status');
      const now = Date.now();
      const remaining = data.slots.filter(slot => ['day', 'night'].includes(slot.section) && slot.status === 'open' && Date.parse(slot.starts_at) > now).length;
      if (data.event.receiving === true) {
        const count = document.createElement('strong');
        count.textContent = String(remaining);
        target.replaceChildren('残り', count, '枠');
      } else target.textContent = '受付終了';
    } catch {
      target.textContent = '確認する';
    }
  }

  // --- 詳細モーダル表示 ---
  function showDetails(date, event) {
    if (eventModal.classList.contains('hidden') || eventModal.classList.contains('is-closing')) {
      detailsReturnTarget = document.activeElement;
      detailsReturnDate = formatDate(date);
    }
    clearTimeout(hideDetailsTimer);
    eventModal.classList.remove('is-closing');
    const dateStr = formatDate(date);
    const holidayName = holidays[dateStr];
    const dayOfWeekHtml = getFormattedDayOfWeek(date, 'text-lg');

    const statusMap = {
      1: { symbol: '○', text: '空き', colorClass: 'text-green-600 dark:text-green-400', icon: 'far fa-circle' },
      2: { symbol: '△', text: '要相談', colorClass: 'text-yellow-600 dark:text-yellow-400', icon: 'fas fa-play' },
      3: { symbol: '✕', text: '満枠', colorClass: 'text-red-600 dark:text-red-400', icon: 'fas fa-times' },
      4: { symbol: 'その他', text: 'その他', colorClass: 'text-gray-600 dark:text-gray-400', icon: 'fas fa-info-circle' }
    };

    const status = statusMap[event.type];
    const displayName = escapeHtml(event.isDefault ? ` ${status.text}` : event.eventname);
    const titleIcon = event.type === 2 ? `<i class="${status.icon} mr-2" style="transform: rotate(-90deg);"></i>` : `<i class="${status.icon} mr-2"></i>`;

    let detailsHtml = `
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 id="event-detail-heading" class="flex items-baseline font-bold text-gray-800 dark:text-gray-100">
                          <span class="text-3xl">${date.getMonth() + 1}</span><span class="text-xl">月</span>
                          <span class="text-3xl">${date.getDate()}</span><span class="text-xl">日</span>
                          <span class="ml-2">${dayOfWeekHtml}</span>
                        </h3>
                        ${holidayName ? `<p class="text-sm font-semibold text-red-500 dark:text-red-400">${escapeHtml(holidayName)}</p>` : ''}
                        <p class="text-lg font-semibold ${status.colorClass} ${holidayName ? 'mt-1' : ''}">${titleIcon}${displayName}</p>
                    </div>
                    <button id="close-modal" type="button" aria-label="閉じる" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"><i class="fas fa-times" aria-hidden="true"></i></button>
                </div>
                <div class="space-y-3 text-gray-700 dark:text-gray-300">`;

    if (!event.isDefault) {
      if (event.time) detailsHtml += `<div><i class="far fa-clock w-5 mr-2 text-gray-400 dark:text-gray-500"></i>${escapeHtml(event.time)}</div>`;
      if (event.place) {
        detailsHtml += `<div><i class="fas fa-map-marker-alt w-5 mr-2 text-gray-400 dark:text-gray-500"></i>${escapeHtml(event.place)}</div>`;
        detailsHtml += publicLocationInfoMarkup(event);
      }
      const eventUrl = safeHttpUrl(event.url);
      if (eventUrl) detailsHtml += `<div><i class="fas fa-link w-5 mr-2 text-gray-400 dark:text-gray-500"></i><a href="${escapeHtml(eventUrl)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${escapeHtml(eventUrl)}</a></div>`;
      if (event.note) detailsHtml += `<div class="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg whitespace-pre-wrap"><i class="far fa-sticky-note w-5 mr-2 text-gray-400 dark:text-gray-500 align-top"></i><span class="inline-block">${escapeHtml(event.note)}</span></div>`;
    }

    const imageUrl = safeHttpUrl(event.imgPath);
    if (!event.isDefault && imageUrl) {
      detailsHtml += `<a class="event-detail-image" href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="画像を拡大して開く"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(event.eventname || '予定の画像')}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>`;
    }
    const timetableSlug = resolveTimetableSlug(dateStr, event);
    if (timetableSlug) {
      detailsHtml += `<a class="event-timetable-banner" href="/timetable/${timetableSlug}/"><span class="event-timetable-banner__title"><i class="fas fa-calendar-days" aria-hidden="true"></i>タイテ募集中！</span><span class="event-timetable-banner__status" role="status" aria-live="polite">確認中…</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a>`;
    }

    if (event.type === 1 || event.type === 2) {
      detailsHtml += `<div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center"><p class="text-sm text-gray-600 dark:text-gray-400 mb-4">\\ 楽しいお誘いお待ちしております！ /</p><div class="flex items-center justify-center space-x-4"><a href="https://x.com/98tml" target="_blank" rel="noopener noreferrer" class="inline-flex items-center bg-black text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-transform transform hover:scale-105"><i class="fab fa-x-twitter mr-2"></i>DMで相談</a><a href="https://t98.info/contact/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105"><i class="far fa-envelope mr-2"></i>メールフォーム</a></div></div>`;
    }

    if (event.type === 3) {
      const nearbyAvailableDates = findNearbyAvailableDates(date);
      if (nearbyAvailableDates.length > 0) {
        detailsHtml += `
          <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
            <h4 class="font-bold text-gray-800 dark:text-gray-100">\\ こちらの日程はいかがですか？ /</h4>
            <div class="grid grid-cols-3 gap-2">
              ${nearbyAvailableDates.map(({ date: recommendedDate, event: recommendedEvent }) => {
                const recommendedStatus = statusMap[recommendedEvent.type];
                const recommendedDateLabel = `${recommendedDate.getMonth() + 1}/${recommendedDate.getDate()}`;
                const recommendedDayOfWeek = getFormattedDayOfWeek(recommendedDate, 'text-xs');
                return `<button type="button" class="nearby-date-recommendation group flex min-w-0 min-h-[72px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-1.5 py-2 text-center transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500 dark:hover:bg-blue-700" data-date="${formatDate(recommendedDate)}">
                  <span class="flex items-baseline justify-center gap-1 whitespace-nowrap">
                    <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">${recommendedDateLabel}</span>${recommendedDayOfWeek}
                  </span>
                  <span class="mt-1 ${recommendedStatus.colorClass} text-xs font-semibold">${recommendedStatus.symbol} 空き</span>
                </button>`;
              }).join('')}
            </div>
          </div>`;
      }
    }

    detailsHtml += `</div></div>`;

    modalContent.innerHTML = detailsHtml;
    const timetableStatus = modalContent.querySelector('.event-timetable-banner__status');
    if (timetableStatus) loadTimetableSummary(timetableSlug, timetableStatus);
    const detailImage = modalContent.querySelector('.event-detail-image img');
    if (detailImage) detailImage.addEventListener('error', () => { detailImage.parentElement.hidden = true; });
    modalContent.classList.remove('modal-leave', 'modal-leave-active');
    modalContent.classList.add('modal-enter', 'modal-enter-active');
    eventModal.classList.remove('hidden');
    const closeButton = document.getElementById('close-modal');
    closeButton.addEventListener('click', hideDetails);
    modalContent.querySelectorAll('.nearby-date-recommendation').forEach((button) => {
      button.addEventListener('click', () => {
        const recommendedDate = parseDate(button.dataset.date);
        const recommendedEvent = events[button.dataset.date] || getDefaultEvent(recommendedDate);
        if (recommendedDate && recommendedEvent) showDetails(recommendedDate, recommendedEvent);
      });
    });
    closeButton.focus();
  }

  function findNearbyAvailableDates(targetDate, limit = 3, radius = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recommendations = [];

    for (let distance = 1; distance <= radius && recommendations.length < limit; distance++) {
      for (const offset of [-distance, distance]) {
        const candidateDate = new Date(targetDate);
        candidateDate.setDate(candidateDate.getDate() + offset);
        if (candidateDate < today) continue;

        const candidateDateStr = formatDate(candidateDate);
        const candidateEvent = events[candidateDateStr] || getDefaultEvent(candidateDate);
        if (candidateEvent && candidateEvent.type === 1) {
          recommendations.push({ date: candidateDate, event: candidateEvent });
          if (recommendations.length === limit) break;
        }
      }
    }

    return recommendations;
  }

  function hideDetails() {
    if (eventModal.classList.contains('hidden') || eventModal.classList.contains('is-closing')) return;
    eventModal.classList.add('is-closing');
    modalContent.classList.remove('modal-enter', 'modal-enter-active');
    modalContent.classList.add('modal-leave', 'modal-leave-active');
    clearTimeout(hideDetailsTimer);
    hideDetailsTimer = setTimeout(() => {
      eventModal.classList.add('hidden');
      eventModal.classList.remove('is-closing');
      const returnTarget = (detailsReturnTarget?.isConnected && detailsReturnTarget !== document.body ? detailsReturnTarget : null)
        || calendarGrid.querySelector(`button[data-date="${detailsReturnDate}"]`)
        || eventTableWrapper.querySelector(`button[data-date="${detailsReturnDate}"]`);
      if (returnTarget) returnTarget.focus();
    }, 200);
  }

  function onDetailsKeydown(event) {
    if (eventModal.classList.contains('hidden')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      hideDetails();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...modalContent.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!modalContent.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // --- ヘルパー関数 ---
  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function getFormattedDayOfWeek(date, sizeClass = 'text-sm') {
    const dayOfWeekMap = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = date.getDay();
    const dateStr = formatDate(date);
    let colorClass = 'text-gray-600 dark:text-gray-300';
    if (holidays[dateStr] || dayOfWeek === 0) {
      colorClass = 'text-red-500 dark:text-red-400';
    } else if (dayOfWeek === 6) {
      colorClass = 'text-blue-500 dark:text-blue-400';
    }
    return `<span class="${sizeClass} ${colorClass}">(${dayOfWeekMap[dayOfWeek]})</span>`;
  }

  function setupLegend() {
    const legend = document.getElementById('legend');
    const tooltip = document.getElementById('legend-description');
    const buttons = [...legend.querySelectorAll('[data-legend]')];
    const descriptions = {
      open: 'ご連絡いただければすぐ予定を確定できる日です。土休日中心ですが、連休前後の平日にも設定しています。',
      tentative: '予定の調整をすれば対応できる日です。場合によっては確定まで数日お時間をいただく場合があります。',
      closed: '既に予定が埋まっており対応が難しい日です。場合により状況が変わる可能性はあります。キャンセル待ちは承っておりません。',
    };
    let pinned = null;
    let active = null;
    function close() {
      tooltip.hidden = true;
      buttons.forEach(button => button.setAttribute('aria-expanded', 'false'));
      pinned = active = null;
    }
    function position() {
      if (!active || tooltip.hidden) return;
      const bounds = legend.getBoundingClientRect();
      const buttonBounds = active.getBoundingClientRect();
      const left = buttonBounds.left - bounds.left + buttonBounds.width / 2 - tooltip.offsetWidth / 2;
      tooltip.style.left = `${Math.max(0, Math.min(left, legend.clientWidth - tooltip.offsetWidth))}px`;
      const above = window.innerHeight - bounds.bottom < tooltip.offsetHeight + 8 && bounds.top >= tooltip.offsetHeight + 8;
      tooltip.style.top = above ? 'auto' : 'calc(100% + 8px)';
      tooltip.style.bottom = above ? 'calc(100% + 8px)' : 'auto';
    }
    function show(button) {
      active = button;
      tooltip.textContent = descriptions[button.dataset.legend];
      tooltip.hidden = false;
      buttons.forEach(item => item.setAttribute('aria-expanded', String(item === button)));
      position();
    }
    buttons.forEach(button => {
      button.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'touch' && !pinned) show(button);
      });
      button.addEventListener('focus', () => {
        if (pinned !== button) pinned = null;
        show(button);
      });
      button.addEventListener('click', () => {
        if (pinned === button) close();
        else { pinned = button; show(button); }
      });
    });
    legend.addEventListener('pointerleave', () => {
      if (!pinned && !legend.contains(document.activeElement)) close();
    });
    legend.addEventListener('focusout', event => {
      if (!legend.contains(event.relatedTarget)) close();
    });
    document.addEventListener('pointerdown', event => {
      if (!legend.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !tooltip.hidden) close();
    });
    window.addEventListener('resize', position);
  }

  // --- イベントリスナー設定 ---
  function setupEventListeners() {
    setupLegend();
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    eventModal.addEventListener('click', (e) => { if (e.target === eventModal) hideDetails(); });
    document.addEventListener('keydown', onDetailsKeydown);
  }

  function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta, 1);
    renderCalendar();
  }

  function updateNavButtons() {
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    prevMonthBtn.disabled = currentMonthStart <= displayStartDate;
    nextMonthBtn.disabled = currentMonthStart >= displayEndDate;
  }

  // --- 実行 ---
  initialize();
});
