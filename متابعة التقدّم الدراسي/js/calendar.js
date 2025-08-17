// js/calendar.js

// هذه الوحدة مسؤولة عن عرض التقويم وإدارة أحداثه.

import { State, SAVE } from './state.js';
import { U } from './utils.js';

let currentDate = new Date();
let dueTopicsByDate = {};
let currentModalDateKey = null;

function changeMonth(offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    render();
}

function addEvent(e) {
    e.preventDefault();
    if (!currentModalDateKey) return;

    const textInput = document.getElementById('newEventText');
    const colorInput = document.getElementById('newEventColor');
    const text = textInput.value.trim();
    const color = colorInput.value;

    if (!text) {
        U.toast('الرجاء كتابة نص الملاحظة.');
        return;
    }

    const newEvent = {
        id: Date.now(),
        text,
        color
    };

    if (!State.calendarEvents[currentModalDateKey]) {
        State.calendarEvents[currentModalDateKey] = [];
    }
    State.calendarEvents[currentModalDateKey].push(newEvent);
    SAVE.calendarEvents();

    textInput.value = '';
    render(); // Re-render the main calendar to show new event dot
    showDayDetails(currentModalDateKey); // Re-render the modal content
}

function deleteEvent(dateKey, eventId) {
    if (!State.calendarEvents[dateKey]) return;
    State.calendarEvents[dateKey] = State.calendarEvents[dateKey].filter(event => event.id !== eventId);
    if (State.calendarEvents[dateKey].length === 0) {
        delete State.calendarEvents[dateKey];
    }
    SAVE.calendarEvents();
    render();
    showDayDetails(dateKey);
}

function showDayDetails(dateString) {
    currentModalDateKey = dateString;
    const modal = document.getElementById('calendarDayModal');
    
    // Ensure modal structure exists
    if (!modal.innerHTML.trim()) {
        modal.innerHTML = `
        <div class="modal-content card bg-white dark:bg-gray-800 p-5 rounded-lg w-full max-w-lg">
            <div class="flex justify-between items-center mb-3">
                <h3 id="modalDayTitle" class="text-lg font-bold"></h3>
                <button id="closeCalendarModal" class="btn btn-ghost">✕</button>
            </div>
            <div id="modalDayContent" class="space-y-4 max-h-[70vh] overflow-y-auto p-1"></div>
        </div>`;
        document.getElementById('closeCalendarModal').onclick = hideDayDetails;
    }

    const titleEl = document.getElementById('modalDayTitle');
    const contentEl = document.getElementById('modalDayContent');

    const topics = dueTopicsByDate[dateString] || [];
    const events = State.calendarEvents[dateString] || [];
    const date = new Date(dateString);
    // Adjust for timezone offset to show correct date
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());


    titleEl.textContent = `تفاصيل يوم ${date.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    let html = '';

    html += '<div><h4 class="font-bold text-md mb-2">مواضيع مستحقة</h4>';
    if (topics.length > 0) {
        html += topics.map(topic => `
            <div class="border-b dark:border-gray-700 pb-2 mb-2">
                <p class="font-bold">${topic.name} <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(${topic.subjectName})</span></p>
                <p class="text-xs">${U.statusBadge(topic.status)}</p>
            </div>
        `).join('');
    } else {
        html += '<p class="text-gray-500 text-sm">لا توجد مواضيع مستحقة في هذا اليوم.</p>';
    }
    html += '</div>';

    html += '<div class="mt-4"><h4 class="font-bold text-md mb-2">ملاحظات وأحداث</h4>';
    if (events.length > 0) {
        html += events.map(event => `
            <div class="flex items-center gap-2 border-b dark:border-gray-700 pb-2 mb-2">
                <div class="event-dot" style="background-color: ${event.color};"></div>
                <p class="flex-1 text-sm">${event.text}</p>
                <button class="btn btn-danger btn-sm" onclick="App.Calendar.deleteEvent('${dateString}', ${event.id})">✕</button>
            </div>
        `).join('');
    } else {
        html += '<p class="text-gray-500 text-sm">لا توجد ملاحظات في هذا اليوم.</p>';
    }
    html += '</div>';

    html += `
        <div class="mt-4 pt-4 border-t dark:border-gray-600">
            <h4 class="font-bold text-md mb-2">إضافة ملاحظة جديدة</h4>
            <form id="addEventForm" class="flex items-center gap-2">
                <input type="text" id="newEventText" placeholder="اكتب ملاحظتك هنا..." class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded flex-1">
                <input type="color" id="newEventColor" value="#3b82f6" class="p-1 h-10 w-10 block bg-white dark:bg-gray-800 border dark:border-gray-700 cursor-pointer rounded">
                <button type="submit" class="btn btn-primary">إضافة</button>
            </form>
        </div>
    `;

    contentEl.innerHTML = html;
    document.getElementById('addEventForm').addEventListener('submit', addEvent);
    modal.style.display = 'block';
}

function hideDayDetails() {
    document.getElementById('calendarDayModal').style.display = 'none';
    currentModalDateKey = null;
}

function render() {
    if (State.currentView !== 'calendarPage') return;
    const container = document.getElementById('calendarPage');
    if (!container) return;

    // Build the calendar structure if it doesn't exist
    container.innerHTML = `
        <div class="card bg-white dark:bg-gray-800 p-4 rounded">
            <div class="flex justify-between items-center mb-4">
                <button id="prevMonthBtn" class="btn btn-ghost">الشهر السابق</button>
                <h2 id="calendarMonthYear" class="text-xl font-bold"></h2>
                <button id="nextMonthBtn" class="btn btn-ghost">الشهر التالي</button>
            </div>
            <div class="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 dark:text-gray-300 mb-2">
                <div>الأحد</div> <div>الاثنين</div> <div>الثلاثاء</div> <div>الأربعاء</div> <div>الخميس</div> <div>الجمعة</div> <div>السبت</div>
            </div>
            <div id="calendarGrid" class="grid grid-cols-7 gap-1"></div>
        </div>`;

    const monthYearEl = document.getElementById('calendarMonthYear');
    const gridEl = document.getElementById('calendarGrid');

    monthYearEl.textContent = currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    gridEl.innerHTML = '';

    dueTopicsByDate = {};
    State.subjects.forEach(subject => {
        (subject.topics || []).forEach(topic => {
            const { finalDueDate } = U.calcDue(topic);
            if (finalDueDate) {
                const key = U.dayKey(finalDueDate);
                if (!dueTopicsByDate[key]) {
                    dueTopicsByDate[key] = [];
                }
                dueTopicsByDate[key].push({ ...topic, subjectName: subject.name });
            }
        });
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0=Sunday, 1=Monday...

    for (let i = 0; i < firstDayOfWeek; i++) {
        gridEl.insertAdjacentHTML('beforeend', '<div></div>');
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dayDate = new Date(year, month, day);
        const dateKey = U.dayKey(dayDate);
        const dueTopics = dueTopicsByDate[dateKey] || [];
        const dayEvents = State.calendarEvents[dateKey] || [];
        const isToday = U.dayKey(new Date()) === dateKey;

        let eventsHtml = '';
        if (dayEvents.length > 0) {
            const visibleEvents = dayEvents.slice(0, 3);
            eventsHtml += '<div class="events-container">';
            eventsHtml += visibleEvents.map(event => `<div class="event-dot" style="background-color: ${event.color};" title="${event.text}"></div>`).join('');
            if (dayEvents.length > 3) {
                eventsHtml += `<span class="more-events">...</span>`;
            }
            eventsHtml += '</div>';
        }

        const cell = `
            <div class="border dark:border-gray-700 p-2 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 flex flex-col justify-between ${isToday ? 'today' : ''}" onclick="App.Calendar.showDayDetails('${dateKey}')">
                <div>
                    <div class="font-bold text-right">${day}</div>
                    ${dueTopics.length > 0 ? `<span class="badge badge-amber mt-2">${dueTopics.length} مستحق</span>` : ''}
                </div>
                ${eventsHtml}
            </div>
        `;
        gridEl.insertAdjacentHTML('beforeend', cell);
    }
    
    // Bind month change buttons after rendering them
    bind();
}

function bind() {
    // Use event delegation for buttons that might be re-rendered
    const container = document.getElementById('calendarPage');
    if (!container) return;

    // Clear previous listeners to avoid duplicates
    const new_container = container.cloneNode(true);
    container.parentNode.replaceChild(new_container, container);

    new_container.addEventListener('click', (event) => {
        if (event.target.id === 'prevMonthBtn') changeMonth(-1);
        if (event.target.id === 'nextMonthBtn') changeMonth(1);
    });
}


export const Calendar = {
    render,
    bind,
    showDayDetails, // Expose for onclick
    deleteEvent     // Expose for onclick
};
