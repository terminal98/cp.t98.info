document.addEventListener('DOMContentLoaded', () => {
  // --- 設定 ---
  const EVENTS_JSON_URL = 'https://g2.t98.info/events.json';
  const HOLIDAYS_JSON_URL = 'https://holidays-jp.github.io/api/v1/date.json';
  const ITEMS_PER_PAGE = 10;

  // --- グローバル変数 ---
  let currentDate = new Date();
  let events = {};
  let holidays = {};
  let displayStartDate = null;
  let displayEndDate = null;
  let eventList = [];
  let currentPage = 1;

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

  // --- 初期化処理 ---
  async function initialize() {
    try {
      await fetchData();
      setupDisplayRange();
      renderCalendar();
      prepareAndRenderEventList();
      setupEventListeners();
      loadingMessage.classList.add('hidden');
      calendarWrapper.classList.remove('hidden');
    } catch (error) {
      console.error('初期化に失敗しました:', error);
      loadingMessage.innerHTML = '<p class="text-red-500 dark:text-red-400">予定の読み込みに失敗しました。時間をおいて再度お試しください。</p>';
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
      // 最終試行でなければ、遅延後に再試行
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay * (2 ** i))); // Exponential backoff
      }
    }
    // すべてのリトライが失敗した場合
    throw new Error(`Failed to fetch ${url} after ${retries} attempts.`);
  }

  async function fetchData() {
    try {
      const [eventsRes, holidaysRes] = await Promise.all([
        fetchWithRetry(EVENTS_JSON_URL),
        fetchWithRetry(HOLIDAYS_JSON_URL)
      ]);

      events = await eventsRes.json();
      holidays = await holidaysRes.json();
    } catch (error) {
      console.error('データ取得エラー (リトライ後):', error);
      events = {};
      holidays = {};
      throw error; // エラーを再スローして初期化処理を停止させる
    }
  }

  // --- 表示期間の設定 ---
  function setupDisplayRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (today.getDate() >= 26) {
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const hasEventInCurrentMonth = Object.keys(events).some(date => date.startsWith(currentMonthStr));
      if (!hasEventInCurrentMonth) {
        startMonth.setMonth(startMonth.getMonth() + 1);
      }
    }

    displayStartDate = startMonth;
    currentDate = new Date(displayStartDate);

    let maxMonthRange = 6;
    if (today.getDate() >= 25) {
      maxMonthRange++;
    }

    displayEndDate = new Date(today.getFullYear(), today.getMonth() + maxMonthRange, 1);
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
  function createDayCell(date) {
    const cell = document.createElement('div');
    const dateStr = formatDate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    cell.className = 'relative p-1 md:p-2 border-r border-b border-gray-200 dark:border-gray-700 min-h-[80px] md:min-h-[120px]';

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

    if (date < today) {
      dayNumber.classList.remove('text-red-500', 'dark:text-red-400', 'text-blue-500', 'dark:text-blue-400', 'text-gray-700', 'dark:text-gray-300');
      dayNumber.classList.add('text-gray-400', 'dark:text-gray-500');
      cell.classList.add('bg-gray-50', 'dark:bg-gray-800/50');
      return cell;
    }

    const event = events[dateStr] || getDefaultEvent(date);
    if (event) {
      cell.classList.add('cursor-pointer', 'hover:bg-gray-100', 'dark:hover:bg-gray-700', 'transition-colors');
      cell.addEventListener('click', () => showDetails(date, event));

      const eventContent = createEventContent(event);
      cell.appendChild(eventContent);
    }

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
      if (date.getTime() === today.getTime()) {
        return { eventname: '', type: 2, isDefault: true };
      }
      return { eventname: '', type: 1, isDefault: true };
    }
    else {
      const oneWeekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (date < oneWeekLater) {
        return { eventname: '', type: 3, isDefault: true };
      }
      return { eventname: '', type: 2, isDefault: true };
    }
  }

  // --- イベントリストの準備と描画 ---
  function prepareAndRenderEventList() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventList = Object.entries(events)
      .filter(([date, event]) => event.isEvent === true && new Date(date) >= today)
      .sort((a, b) => a[0].localeCompare(b[0]));

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
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = eventList.slice(startIndex, endIndex);

    const table = document.createElement('table');
    table.className = 'w-full text-sm text-left text-gray-500 dark:text-gray-400 mt-0 mb-0 table-auto';
    table.innerHTML = `
            <thead class="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th scope="col" class="px-6 py-3 w-[150px]">日付</th>
                    <th scope="col" class="px-6 py-3">イベント名</th>
                </tr>
            </thead>
            <tbody></tbody>`;

    const tbody = table.querySelector('tbody');
    paginatedItems.forEach(([dateStr, event]) => {
      const date = new Date(dateStr);
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
      const tr = document.createElement('tr');
      tr.className = 'bg-white dark:bg-gray-800 border-b dark:border-gray-700';
      tr.innerHTML = `
                <td class="px-6 py-4">${date.getMonth() + 1}/${date.getDate()} (${dayOfWeek})</td>
                <td class="px-6 py-4">
                  <div class="flex justify-between items-center">
                      <span class="font-medium text-gray-900 dark:text-white truncate flex-grow min-w-0">${event.eventname}</span>
                      <button class="detail-btn text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 text-lg flex-shrink-0 ml-4">
                          <i class="fas fa-info-circle"></i>
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

    const prevButton = document.createElement('button');
    prevButton.innerHTML = `<i class="fas fa-arrow-left"></i>`;
    prevButton.className = 'px-3 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
      currentPage--;
      renderEventList();
    });
    paginationControls.appendChild(prevButton);

    const pageInfo = document.createElement('span');
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    pageInfo.className = 'px-3 py-1 text-sm';
    paginationControls.appendChild(pageInfo);

    const nextButton = document.createElement('button');
    nextButton.innerHTML = `<i class="fas fa-arrow-right"></i>`;
    nextButton.className = 'px-3 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
      currentPage++;
      renderEventList();
    });
    paginationControls.appendChild(nextButton);
  }

  // --- 詳細モーダル表示 ---
  function showDetails(date, event) {
    const dateStr = formatDate(date);
    const holidayName = holidays[dateStr];
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

    const statusMap = {
      1: { symbol: '○', text: '空き', colorClass: 'text-green-600 dark:text-green-400', icon: 'far fa-circle' },
      2: { symbol: '△', text: '応相談', colorClass: 'text-yellow-600 dark:text-yellow-400', icon: 'fas fa-play' },
      3: { symbol: '✕', text: '締切', colorClass: 'text-red-600 dark:text-red-400', icon: 'fas fa-times' },
      4: { symbol: 'その他', text: 'その他', colorClass: 'text-gray-600 dark:text-gray-400', icon: 'fas fa-info-circle' }
    };

    const status = statusMap[event.type];
    const displayName = event.isDefault ? `${status.text}` : event.eventname;
    const titleIcon = event.type === 2
      ? `<i class="${status.icon} mr-2" style="transform: rotate(-90deg);"></i>`
      : `<i class="${status.icon} mr-2"></i>`;

    let detailsHtml = `
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100">${date.getMonth() + 1}/${date.getDate()} (${dayOfWeek})</h3>
                        ${holidayName ? `<p class="text-sm font-semibold text-red-500 dark:text-red-400">${holidayName}</p>` : ''}
                        <p class="text-lg font-semibold ${status.colorClass} ${holidayName ? 'mt-1' : ''}">${titleIcon}${displayName}</p>
                    </div>
                    <button id="close-modal" class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"><i class="fas fa-times"></i></button>
                </div>
                <div class="space-y-3 text-gray-700 dark:text-gray-300">`;

    if (!event.isDefault) {
      if (event.time) detailsHtml += `<div><i class="far fa-clock w-5 mr-2 text-gray-400 dark:text-gray-500"></i>${event.time}</div>`;
      if (event.place) detailsHtml += `<div><i class="fas fa-map-marker-alt w-5 mr-2 text-gray-400 dark:text-gray-500"></i>${event.place}</div>`;
      if (event.url) detailsHtml += `<div><i class="fas fa-link w-5 mr-2 text-gray-400 dark:text-gray-500"></i><a href="${event.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${event.url}</a></div>`;
      if (event.note) detailsHtml += `<div class="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg whitespace-pre-wrap"><i class="far fa-sticky-note w-5 mr-2 text-gray-400 dark:text-gray-500 align-top"></i><span class="inline-block">${event.note}</span></div>`;
    }

    if (event.type === 1 || event.type === 2) {
      detailsHtml += `
                <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">\\ 楽しいお誘いお待ちしております！ /</p>
                    <div class="flex items-center justify-center space-x-4">
                        <a href="https://x.com/messages/compose?recipient_id=427460306&text=%E3%80%90%E6%92%AE%E5%BD%B1%E4%BE%9D%E9%A0%BC%E3%80%91%E2%80%BB%E4%BB%A5%E4%B8%8B%E3%83%86%E3%83%B3%E3%83%97%E3%83%AC%E3%83%BC%E3%83%88%E3%82%92%E5%9F%8B%E3%82%81%E3%81%A6%E9%80%81%E4%BF%A1%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84%E2%80%BB%0A%0A%E2%91%A0%20%E6%97%A5%E6%99%82%EF%BC%9A%0A%E2%91%A1%20%E5%A0%B4%E6%89%80%20(%E3%82%B9%E3%82%BF%E3%82%B8%E3%82%AA%E3%83%BB%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E5%90%8D)%EF%BC%9A%0A%E2%91%A2%20%E4%BD%9C%E5%93%81/%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%EF%BC%9A%0A%E2%91%A3%20%E4%BA%BA%E6%95%B0%EF%BC%9A%0A%E2%91%A4%20%E8%B2%BB%E7%94%A8%E8%B2%A0%E6%8B%85%20(%E7%9B%B8%E4%BA%92%E8%B2%A0%E6%8B%85%E3%83%BB%E8%A2%AB%E5%86%99%E4%BD%93%E8%B2%A0%E6%8B%85%E2%80%A6%E3%81%AA%E3%81%A9)%EF%BC%9A%0A%E2%91%A5%20%E6%92%AE%E5%BD%B1%E3%82%A4%E3%83%A1%E3%83%BC%E3%82%B8(%E7%94%BB%E5%83%8F%E3%82%82%E3%81%82%E3%82%8B%E3%81%A8%E2%97%8E)%EF%BC%9A%0A%0A%E3%83%BB%E4%BD%B5%E3%81%9B%E3%81%AE%E5%A0%B4%E5%90%88%E3%81%AF%E3%83%A1%E3%83%B3%E3%83%90%E3%83%BC%E5%85%A8%E5%93%A1%E5%88%86%E3%81%AEX%E3%82%A2%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88%E3%82%82%E4%BD%B5%E8%A8%98%E3%81%97%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84%0A%E3%83%BB%E8%A4%87%E6%95%B0%E4%BB%B6%E5%90%8C%E6%99%82%E3%81%AB%E4%BE%9D%E9%A0%BC%E5%8F%AF%E8%83%BD%E3%81%A7%E3%81%99%E3%81%8C%E3%83%86%E3%83%B3%E3%83%97%E3%83%AC%E3%81%AF1%E4%BB%B6%E3%81%9A%E3%81%A4%E4%BD%9C%E6%88%90%E3%81%97%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84%0A%E3%83%BB%E3%81%9D%E3%81%AE%E4%BB%96%E4%B8%8D%E6%98%8E%E3%81%AA%E7%82%B9%E3%81%AF%E3%81%8A%E6%B0%97%E8%BB%BD%E3%81%AB%E3%81%94%E9%80%A3%E7%B5%A1%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84" target="_blank" rel="noopener noreferrer" class="inline-flex items-center bg-black text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-700 transition-transform transform hover:scale-105">
                            <i class="fab fa-x-twitter mr-2"></i>DMで相談
                        </a>
                        <a href="https://t98.info/contact/" target="_blank" rel="noopener noreferrer" class="inline-flex items-center bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
                            <i class="far fa-envelope mr-2"></i>メールフォーム
                        </a>
                    </div>
                </div>
            `;
    }


    detailsHtml += `</div></div>`;

    modalContent.innerHTML = detailsHtml;
    modalContent.classList.remove('modal-leave', 'modal-leave-active');
    modalContent.classList.add('modal-enter', 'modal-enter-active');
    eventModal.classList.remove('hidden');

    document.getElementById('close-modal').addEventListener('click', hideDetails);
  }

  function hideDetails() {
    modalContent.classList.remove('modal-enter', 'modal-enter-active');
    modalContent.classList.add('modal-leave', 'modal-leave-active');
    setTimeout(() => eventModal.classList.add('hidden'), 200);
  }

  // --- ヘルパー関数 ---
  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // --- イベントリスナー設定 ---
  function setupEventListeners() {
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    eventModal.addEventListener('click', (e) => {
      if (e.target === eventModal) {
        hideDetails();
      }
    });
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
