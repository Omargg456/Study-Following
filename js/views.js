// js/views.js

import { State, SAVE } from './state.js';
import { U } from './utils.js';

function switchView(viewName) {
    State.currentView = viewName;
    localStorage.setItem('sp_view', viewName);
    render();
}

function renderFollowUpPage() {
    const container = document.getElementById('followUpPage');
    if (!container) return;

    container.innerHTML = `
        <div class="grid md:grid-cols-2 gap-4">
            <div class="card bg-white dark:bg-gray-800 p-4 rounded">
                <h2 class="text-xl font-bold mb-3">مواضيع مكتملة</h2>
                <div id="completedTopicsList" class="space-y-2 max-h-[75vh] overflow-y-auto"></div>
            </div>
            <div class="card bg-white dark:bg-gray-800 p-4 rounded">
                <h2 class="text-xl font-bold mb-3">مواضيع غير مكتملة</h2>
                <div id="incompleteTopicsList" class="space-y-2 max-h-[75vh] overflow-y-auto"></div>
            </div>
        </div>`;

    const completedListEl = document.getElementById('completedTopicsList');
    const incompleteListEl = document.getElementById('incompleteTopicsList');

    // --- MODIFIED: Keep track of original sIndex and tIndex ---
    const allTopics = State.subjects.flatMap((s, sIndex) =>
        (s.topics || []).map((t, tIndex) => ({
            ...t,
            subjectName: s.name,
            sIndex,
            tIndex
        }))
    );

    const completed = allTopics.filter(t => t.status === 'Completed');
    const incomplete = allTopics.filter(t => t.status !== 'Completed');

    completed.sort((a, b) => new Date(b.lastReviewed || 0) - new Date(a.lastReviewed || 0));
    incomplete.sort((a, b) => (a.name > b.name) ? 1 : -1);

    // --- MODIFIED: Add delete button to the template ---
    const topicTemplate = t => `
        <div class="border-b dark:border-gray-700 pb-2">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-bold">${t.name} <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(${t.subjectName})</span></p>
                    ${t.status === 'Completed' ? `
                        <p class="text-xs text-gray-600 dark:text-gray-300">أُكمل منذ: ${t.completedAt ? U.humanize(Date.now() - new Date(t.completedAt).getTime()) : 'غير محدد'}</p>
                        <p class="text-xs text-gray-600 dark:text-gray-300">آخر مراجعة: ${t.lastReviewed ? `${new Date(t.lastReviewed).toLocaleString('ar-EG')} (منذ ${U.humanize(Date.now() - new Date(t.lastReviewed).getTime())})` : 'لم تراجع بعد'}</p>
                    ` : `
                        <p class="text-xs">${U.statusBadge(t.status)}</p>
                    `}
                </div>
                <button class="btn btn-danger" data-action="delete-topic" data-s-index="${t.sIndex}" data-t-index="${t.tIndex}">❌</button>
            </div>
        </div>
    `;

    completedListEl.innerHTML = completed.length ? completed.map(topicTemplate).join('') : '<p class="text-gray-500">لا توجد مواضيع مكتملة بعد.</p>';
    incompleteListEl.innerHTML = incomplete.length ? incomplete.map(topicTemplate).join('') : '<p class="text-gray-500">رائع! كل المواضيع مكتملة.</p>';
}


function updateDueDatePreview() {
    const previewEl = document.getElementById('dueDatePreview');
    if (!previewEl) return;
    const graceDays = parseInt(document.getElementById('dueGraceDaysInput').value, 10) || 0;
    const easyBase = U.DIFFICULTY_INTERVAL['Easy'];
    const mediumBase = U.DIFFICULTY_INTERVAL['Medium'];
    const hardBase = U.DIFFICULTY_INTERVAL['Hard'];
    previewEl.innerHTML = `
        <div class="flex justify-between"><span>صعب (Hard):</span> <span class="font-mono text-right">${hardBase} يوم + ${graceDays} يوم = <b>${hardBase + graceDays}</b> أيام</span></div>
        <div class="flex justify-between"><span>متوسط (Medium):</span> <span class="font-mono text-right">${mediumBase} يوم + ${graceDays} يوم = <b>${mediumBase + graceDays}</b> أيام</span></div>
        <div class="flex justify-between"><span>سهل (Easy):</span> <span class="font-mono text-right">${easyBase} يوم + ${graceDays} يوم = <b>${easyBase + graceDays}</b> أيام</span></div>
    `;
}

function toggleSettingsModal(show) {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    if (show) {
        modal.innerHTML = `
            <div class="modal-content card bg-white dark:bg-gray-800 p-5 rounded-lg w-full max-w-lg">
                <h2 class="text-xl font-bold mb-4">الإعدادات</h2>
                <div class="space-y-4">
                    <div>
                        <label for="staleDaysInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تنبيه إهمال الموضوع بعد (أيام)</label>
                        <input type="number" id="staleDaysInput" min="1" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded w-full">
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">تمييز المواضيع التي لم تراجعها لهذه المدة باللون الأحمر.</p>
                    </div>
                    <div>
                        <label for="dueGraceDaysInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">فترة السماح للاستحقاق (أيام)</label>
                        <input type="number" id="dueGraceDaysInput" min="0" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded w-full">
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">عدد الأيام الإضافية قبل تمييز الموضوع كمستحق (برتقالي).</p>
                    </div>
                    <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">شرح فترة السماح:</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            بعد انتهاء فترة المراجعة الأساسية (المعتمدة على الصعوبة)، تبدأ فترة السماح. سيتم تمييز الموضوع باللون البرتقالي (مستحق) فقط بعد انتهاء <b>كلتا الفترتين</b>.
                        </p>
                        <div id="dueDatePreview" class="space-y-1 text-sm p-3 bg-gray-100 dark:bg-gray-700 rounded"></div>
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button id="settingsCancel" class="btn btn-ghost">إلغاء</button>
                    <button id="settingsSave" class="btn btn-primary">حفظ الإعدادات</button>
                </div>
            </div>`;
        document.getElementById('staleDaysInput').value = State.settings.staleDays || 120;
        document.getElementById('dueGraceDaysInput').value = State.settings.dueGraceDays || 0;
        document.getElementById('settingsCancel').onclick = () => toggleSettingsModal(false);
        document.getElementById('settingsSave').onclick = saveSettings;
        document.getElementById('dueGraceDaysInput').addEventListener('input', updateDueDatePreview);
        modal.style.display = 'block';
        updateDueDatePreview();
    } else {
        modal.style.display = 'none';
    }
}

function saveSettings() {
    const staleDays = parseInt(document.getElementById('staleDaysInput').value, 10);
    const dueGraceDays = parseInt(document.getElementById('dueGraceDaysInput').value, 10);
    if (!isNaN(staleDays) && staleDays > 0) { State.settings.staleDays = staleDays; } else { U.toast('الرجاء إدخال عدد أيام صحيح لتنبيه الإهمال.'); return; }
    if (!isNaN(dueGraceDays) && dueGraceDays >= 0) { State.settings.dueGraceDays = dueGraceDays; } else { U.toast('الرجاء إدخال عدد أيام صحيح لفترة السماح.'); return; }
    SAVE.data(); // Use the unified save function
    toggleSettingsModal(false);
    if (window.App && window.App.Tracker) {
        window.App.Tracker.render();
    }
    U.toast('تم حفظ الإعدادات.');
}

function render() {
    const views = ['tracker', 'cardsPage', 'dashboard', 'followUpPage', 'goalsPage', 'calendarPage', 'achievementsPage', 'chartsPage'];
    const btns = {
        tracker: 'viewTrackerBtn', cardsPage: 'viewCardsBtn', dashboard: 'viewDashboardBtn',
        followUpPage: 'viewFollowUpBtn', goalsPage: 'viewGoalsBtn', calendarPage: 'viewCalendarBtn',
        achievementsPage: 'viewAchievementsBtn', chartsPage: 'viewChartsBtn'
    };
    views.forEach(v => { const el = document.getElementById(v); if (el) el.classList.toggle('hidden', State.currentView !== v); });
    Object.values(btns).forEach(btnId => { const btn = document.getElementById(btnId); if (btn) { btn.classList.remove('btn-primary'); btn.classList.add('btn-ghost'); } });
    const activeBtn = document.getElementById(btns[State.currentView]);
    if (activeBtn) { activeBtn.classList.add('btn-primary'); activeBtn.classList.remove('btn-ghost'); }

    const App = window.App;
    if (!App) return;

    if (State.currentView === 'tracker' && App.Tracker) App.Tracker.render();
    if (State.currentView === 'cardsPage' && App.Cards) App.Cards.render();
    if (State.currentView === 'dashboard' && App.Dash) App.Dash.render();
    if (State.currentView === 'followUpPage') renderFollowUpPage();
    if (State.currentView === 'goalsPage' && App.Goals) App.Goals.render();
    if (State.currentView === 'calendarPage' && App.Calendar) App.Calendar.render();
    if (State.currentView === 'achievementsPage' && App.Achievements) App.Achievements.render();
    if (State.currentView === 'chartsPage' && App.Charts) App.Charts.render();
}

function bind() {
    document.getElementById('viewTrackerBtn').onclick = () => switchView('tracker');
    document.getElementById('viewCardsBtn').onclick = () => switchView('cardsPage');
    document.getElementById('viewChartsBtn').onclick = () => switchView('chartsPage');
    document.getElementById('viewGoalsBtn').onclick = () => switchView('goalsPage');
    document.getElementById('viewAchievementsBtn').onclick = () => switchView('achievementsPage');
    document.getElementById('viewCalendarBtn').onclick = () => switchView('calendarPage');
    document.getElementById('viewDashboardBtn').onclick = () => switchView('dashboard');
    document.getElementById('viewFollowUpBtn').onclick = () => switchView('followUpPage');
    document.getElementById('settingsBtn').onclick = () => toggleSettingsModal(true);

    // --- NEW: Add event listener for delete buttons on the follow-up page ---
    document.getElementById('followUpPage').addEventListener('click', e => {
        const target = e.target.closest('button[data-action="delete-topic"]');
        if (target) {
            const sIndex = parseInt(target.dataset.sIndex, 10);
            const tIndex = parseInt(target.dataset.tIndex, 10);
            if (!isNaN(sIndex) && !isNaN(tIndex) && window.App && window.App.Tracker && window.App.Tracker.deleteTopic) {
                window.App.Tracker.deleteTopic(sIndex, tIndex);
            }
        }
    });
}

export const Views = {
    render,
    bind,
    switchView
};
