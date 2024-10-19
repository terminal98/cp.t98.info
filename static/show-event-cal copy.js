let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
const maxMonthRange = 2;  // 今月から3ヶ月分

let events = {};
let holidays = {};

function fetchData() {
  return Promise.all([
    fetch('events.json').then(response => response.json()),
    fetch('holidays.json').then(response => response.json())
  ]).then(data => {
    events = data[0];
    holidays = data[1];
  }).catch(error => {
    console.error('Error fetching data:', error);
  });
}

function generateCalendar(month, year) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDiv = document.getElementById('calendar');
  let calendarHtml = `<table><tr><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th><th>土</th><th>日</th></tr><tr>`;

  const shiftDays = (firstDay === 0) ? 6 : firstDay - 1;
  for (let i = 0; i < shiftDays; i++) {
    calendarHtml += `<td></td>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    if ((shiftDays + day - 1) % 7 === 0 && day !== 1) {
      calendarHtml += `</tr><tr>`;
    }
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const event = events[dateStr] ? events[dateStr].eventname : '';
    const holiday = holidays[dateStr] ? holidays[dateStr].replace(/ 振替休日$/, '振替休日') : '';
    calendarHtml += `<td>${day}<br>${event}<br>${holiday}</td>`;
  }

  while ((shiftDays + daysInMonth) % 7 !== 0) {
    calendarHtml += `<td></td>`;
    daysInMonth++;
  }

  calendarHtml += `</tr></table>`;
  calendarDiv.innerHTML = calendarHtml;

  const monthYearText = `${year}年${month + 1}月`;
  document.getElementById('monthYear').innerText = monthYearText;

  document.getElementById('prevButton').style.display = (month === new Date().getMonth() && year === new Date().getFullYear()) ? 'none' : 'inline';
  document.getElementById('nextButton').style.display = (month === new Date().getMonth() + maxMonthRange && year === new Date().getFullYear()) ? 'none' : 'inline';
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
});
