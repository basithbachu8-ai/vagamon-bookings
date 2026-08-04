const monthLabel = document.getElementById('month-label');
const weekdayRow = document.getElementById('weekday-row');
const calendarGrid = document.getElementById('calendar-grid');

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const statusOrder = ['available', 'hold', 'soldout'];
const statusLabels = {
  available: 'Available',
  hold: 'Hold',
  soldout: 'Sold out'
};
const STORAGE_URL = 'https://jsonblob.com/api/jsonBlob/019fcd22-c843-7174-b3c0-bbe7b6611408';
const LOCAL_STORAGE_KEY = 'vagamon-bookings-state';

const today = new Date();
const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const calendarState = new Map();

function loadLocalState() {
  try {
    const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!savedState) {
      return;
    }

    const parsedState = JSON.parse(savedState);
    Object.entries(parsedState).forEach(([dateKey, status]) => {
      if (statusOrder.includes(status)) {
        calendarState.set(dateKey, status);
      }
    });
  } catch (error) {
    console.warn('Unable to load local calendar state:', error);
  }
}

function saveLocalState() {
  const stateObject = Object.fromEntries(calendarState);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stateObject));
}

async function loadRemoteState() {
  try {
    const response = await fetch(STORAGE_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Unable to fetch remote state');
    }

    const data = await response.json();
    Object.entries(data).forEach(([dateKey, status]) => {
      if (statusOrder.includes(status)) {
        calendarState.set(dateKey, status);
      }
    });
    saveLocalState();
  } catch (error) {
    loadLocalState();
  }
}

async function saveRemoteState() {
  const stateObject = Object.fromEntries(calendarState);
  saveLocalState();

  try {
    await fetch(STORAGE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateObject),
      cache: 'no-store'
    });
  } catch (error) {
    console.warn('Unable to sync calendar state remotely:', error);
  }
}

function renderCalendar() {
  monthLabel.textContent = currentMonth.toLocaleDateString('en', {
    month: 'long',
    year: 'numeric'
  });

  weekdayRow.innerHTML = '';
  weekdays.forEach((day) => {
    const label = document.createElement('div');
    label.className = 'weekday';
    label.textContent = day;
    weekdayRow.appendChild(label);
  });

  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const prevMonthDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();

  calendarGrid.innerHTML = '';

  for (let i = 0; i < firstDay; i += 1) {
    const cell = document.createElement('button');
    cell.className = 'date-cell muted';
    cell.type = 'button';
    cell.disabled = true;
    const dayNumber = prevMonthDays - firstDay + i + 1;
    cell.innerHTML = `<span class="day-number">${dayNumber}</span><span class="status-label">Prev</span>`;
    calendarGrid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cell = document.createElement('button');
    cell.type = 'button';
    const dateKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}-${day}`;
    const status = calendarState.get(dateKey) || 'available';
    cell.dataset.status = status;
    cell.className = `date-cell ${status}`;
    cell.innerHTML = `<span class="day-number">${day}</span><span class="status-label">${statusLabels[status]}</span>`;

    cell.addEventListener('click', async () => {
      const currentStatus = cell.dataset.status || 'available';
      const nextIndex = (statusOrder.indexOf(currentStatus) + 1) % statusOrder.length;
      const nextStatus = statusOrder[nextIndex];
      cell.dataset.status = nextStatus;
      cell.className = `date-cell ${nextStatus}`;
      cell.innerHTML = `<span class="day-number">${day}</span><span class="status-label">${statusLabels[nextStatus]}</span>`;
      calendarState.set(dateKey, nextStatus);
      await saveRemoteState();
    });

    calendarGrid.appendChild(cell);
  }

  const fillCount = (7 - ((firstDay + daysInMonth) % 7)) % 7;
  for (let i = 0; i < fillCount; i += 1) {
    const cell = document.createElement('button');
    cell.className = 'date-cell muted';
    cell.type = 'button';
    cell.disabled = true;
    cell.innerHTML = `<span class="day-number">${i + 1}</span><span class="status-label">Next</span>`;
    calendarGrid.appendChild(cell);
  }
}

async function init() {
  loadLocalState();
  await loadRemoteState();
  renderCalendar();
}

init();
