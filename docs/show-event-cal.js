let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
const nowDate = new Date().getDate();

let maxMonthRange = 3; // 今月から3ヶ月分
if (nowDate >= 25) {
  maxMonthRange++; // 25日以降は1ヶ月増やす
}

let events = {};
let holidays = {};

function fetchData() {
  return Promise.all([
    fetch('/data/events.json').then(response => response.json()),
    fetch('/data/holidays.json').then(response => response.json())
  ]).then(data => {
    events = data[0];
    holidays = data[1];
  }).catch(error => {
    console.error('Error fetching data:', error);
  });
}

function maxYearMonthGen() {
  const today = new Date();
  const threeMonthsLater = new Date(new Date().setMonth(new Date(today.getFullYear(), today.getMonth() + 1, 1).getMonth() + maxMonthRange));
  // 年と月を取得
  const threeMonthsLaterYear = threeMonthsLater.getFullYear();
  const threeMonthsLaterMonth = threeMonthsLater.getMonth()
  document.getElementById('showMaxRange').innerText = `${threeMonthsLaterYear}年${threeMonthsLaterMonth}月までの予定を公開しています`;
}

function generateCalendar(month, year) {
  const today = new Date();
  let firstDay = new Date(year, month, 1).getDay();
  let daysInMonth = new Date(year, month + 1, 0).getDate();
  let calendarDiv = document.getElementById('calendar');
  let calendarHtml = `<table><thead><tr><th class="mon">月</th><th class="tue">火</th><th class="wed">水</th><th class="thu">木</th><th class="fri">金</th><th class="sat">土</th><th class="sun">日</th></tr><tr></thead><tbody>`;

  const shiftDays = (firstDay === 0) ? 6 : firstDay - 1;
  for (let i = 0; i < shiftDays; i++) {
    calendarHtml += `<td class="day blank"></td>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    if ((shiftDays + day - 1) % 7 === 0 && day !== 1) {
      calendarHtml += `</tr><tr>`;
    }
    let dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let eventName = eventUrl = "";
    if (events[dateStr]) {
      eventName = events[dateStr].eventname;
      if (events[dateStr].url) {
        eventName = `<a href="${events[dateStr].url}" target="_blank">${eventName}</a>`;
      }
    }
    let holiday = holidays[dateStr] ? holidays[dateStr] : '';
    // 振替休日の処理
    if (holiday.includes('振替休日')) {
      holiday = '振替休日';
    }

    if (!eventName) {
      const currentDate = new Date(year, month, day);
      const daysDiff = Math.ceil((currentDate - today) / (1000 * 60 * 60 * 24));
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

      if (isWeekend || holiday) {
        // 土休日 前日まで○ 当日△にする
        eventName = daysDiff === 0 ? '△' : '○';
        console.log(dateStr, today);
      } else {
        if (daysDiff < 0) {
          // 平日 これはなに？
          eventName = daysDiff >= -7 ? '✕' : '△';
        } else {
          // 平日 7日前まで△ 以降は✕
          eventName = daysDiff <= 7 ? '✕' : '△';
        }
      }
    }

    // 過去のイベントはハイフンにする
    let eventDisplay = new Date(dateStr) < today ? '-' : eventName;

    let isToday = today.getMonth() === currentMonth && today.getDate() === day ? " today" : "";

    if (holiday || (shiftDays + day - 1) % 7 == 6) {
      calendarHtml += `<td class="day${isToday}"><span class="num sun" title="${holiday}">${day}</span><span class="event-title">${eventDisplay}</span></td>`;
    } else if ((shiftDays + day - 1) % 7 == 5) {
      calendarHtml += `<td class="day${isToday}"><span class="num sat">${day}</span><span class="event-title">${eventDisplay}</span></td>`;
    } else {
      calendarHtml += `<td class="day${isToday}"><span class="num">${day}</span><span class="event-title">${eventDisplay}</span></td>`;
    }
  }

  while ((shiftDays + daysInMonth) % 7 !== 0) {
    calendarHtml += `<td></td>`;
    daysInMonth++;
  }

  calendarHtml += `</tr><tbody></table>`;
  calendarDiv.innerHTML = calendarHtml;

  let monthYearText = `${year}年${month + 1}月`;
  document.getElementById('monthYear').innerText = monthYearText;

  // 月切替ボタンの制御
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');

  if (month === new Date().getMonth()) {
    prevButton.disabled = true;
  } else {
    prevButton.disabled = false;
  }

  if ((month === new Date().getMonth() + maxMonthRange || (month + 12) === new Date().getMonth() + maxMonthRange)) {
    nextButton.disabled = true;
  } else {
    nextButton.disabled = false
  }

}

function updateCalendar() {
  generateCalendar(currentMonth, currentYear);
}

function changeMonth(change) {
  currentMonth += change;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  updateCalendar();
}

document.addEventListener('DOMContentLoaded', () => {
  fetchData().then(() => {
    updateCalendar();
  });
  maxYearMonthGen();
});
