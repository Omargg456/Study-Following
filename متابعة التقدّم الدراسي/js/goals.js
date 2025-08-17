// js/goals.js

import { State, SAVE } from './state.js';
import { U } from './utils.js';

function getPeriod(timeframe) {
    const now = new Date();
    if (timeframe === 'week') {
        const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
        firstDay.setHours(0, 0, 0, 0);
        const lastDay = new Date(firstDay);
        lastDay.setDate(lastDay.getDate() + 6);
        lastDay.setHours(23, 59, 59, 999);
        return { start: firstDay, end: lastDay };
    }
    if (timeframe === 'month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { start, end };
    }
    return { start: null, end: null };
}

function calculateProgress(goal) {
    const { start, end } = getPeriod(goal.timeframe);
    if (!start || !end) return 0;

    let current = 0;
    const allTopics = State.subjects.flatMap(s => s.topics || []);

    if (goal.type === 'complete') {
        current = allTopics.filter(t => {
            if (t.status !== 'Completed' || !t.completedAt) return false;
            const completedDate = new Date(t.completedAt);
            return completedDate >= start && completedDate <= end;
        }).length;
    } else if (goal.type === 'review') {
        current = allTopics.filter(t => {
            if (!t.lastReviewed) return false;
            const reviewDate = new Date(t.lastReviewed);
            return reviewDate >= start && reviewDate <= end;
        }).length;
    }
    return current;
}

function addGoal() {
    const description = document.getElementById('goalDescription').value.trim();
    const target = parseInt(document.getElementById('goalTarget').value, 10);
    const type = document.getElementById('goalType').value;
    const timeframe = document.getElementById('goalTimeframe').value;

    if (!description || isNaN(target) || target < 1) {
        U.toast('الرجاء إدخال وصف صحيح وهدف رقمي أكبر من صفر.');
        return;
    }

    const newGoal = { id: Date.now(), description, target, type, timeframe, createdAt: new Date().toISOString() };

    State.goals.push(newGoal);
    SAVE.goals();
    render();
    // FIX: Use global App object
    if (window.App && window.App.Achievements) {
        window.App.Achievements.check();
    }

    document.getElementById('goalDescription').value = '';
    document.getElementById('goalTarget').value = '10';
}

function deleteGoal(goalId) {
    U.confirmAction('هل أنت متأكد من حذف هذا الهدف؟', () => {
        State.goals = State.goals.filter(g => g.id !== goalId);
        SAVE.goals();
        render();
        // FIX: Use global App object
        if (window.App && window.App.Achievements) {
            window.App.Achievements.check();
        }
    });
}

function render() {
    if (State.currentView !== 'goalsPage') return;
    const container = document.getElementById('goalsPage');
    if (!container) return;

    let contentHTML = `
        <div class="card bg-white dark:bg-gray-800 p-4 rounded mb-4">
            <h2 class="text-xl font-bold mb-3">إضافة هدف جديد</h2>
            <div class="grid md:grid-cols-2 gap-4">
                <div>
                    <label for="goalDescription" class="block text-sm font-medium text-gray-700 dark:text-gray-300">وصف الهدف</label>
                    <input type="text" id="goalDescription" placeholder="مثال: إكمال 15 موضوع هذا الأسبوع" class="mt-1 border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded w-full">
                </div>
                <div class="flex items-end gap-2">
                    <div>
                        <label for="goalTarget" class="block text-sm font-medium text-gray-700 dark:text-gray-300">العدد المستهدف</label>
                        <input type="number" id="goalTarget" min="1" value="10" class="mt-1 border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded w-24">
                    </div>
                    <div>
                        <label for="goalType" class="block text-sm font-medium text-gray-700 dark:text-gray-300">نوع الهدف</label>
                        <select id="goalType" class="mt-1 border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded">
                            <option value="complete">إكمال مواضيع</option>
                            <option value="review">مراجعة مواضيع</option>
                        </select>
                    </div>
                    <div>
                        <label for="goalTimeframe" class="block text-sm font-medium text-gray-700 dark:text-gray-300">المدة</label>
                        <select id="goalTimeframe" class="mt-1 border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded">
                            <option value="week">هذا الأسبوع</option>
                            <option value="month">هذا الشهر</option>
                        </select>
                    </div>
                    <button id="addGoalBtn" class="btn btn-primary h-10">إضافة الهدف</button>
                </div>
            </div>
        </div>
        <div id="goalsContainer" class="space-y-4"></div>`;
    
    container.innerHTML = contentHTML;
    
    const goalsContainer = document.getElementById('goalsContainer');
    if (State.goals.length === 0) {
        goalsContainer.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400 py-8">لا توجد أهداف حالية. أضف هدفًا جديدًا لتبدأ!</div>`;
        return;
    }

    goalsContainer.innerHTML = State.goals.map(goal => {
        const current = calculateProgress(goal);
        const progress = goal.target > 0 ? Math.round((current / goal.target) * 100) : 0;
        const timeframeText = goal.timeframe === 'week' ? 'الأسبوعي' : 'الشهري';
        const typeText = goal.type === 'complete' ? 'إكمال' : 'مراجعة';
        return `
            <div class="card bg-white dark:bg-gray-800 p-4 rounded">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-bold">${goal.description}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">الهدف ${timeframeText}: ${typeText} ${goal.target} مواضيع</p>
                    </div>
                    <button onclick="App.Goals.deleteGoal(${goal.id})" class="btn btn-danger">حذف</button>
                </div>
                <div class="mt-3">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">التقدم</span>
                        <span class="text-sm font-bold">${current} / ${goal.target}</span>
                    </div>
                    <div class="progress-wrap w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
                        <div class="h-5 rounded-full transition-all duration-500 ease-out" style="${U.progressStyle(progress)}"></div>
                        <div class="progress-text">${progress}%</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function bind() {
    document.getElementById('goalsPage').addEventListener('click', function(event) {
        if (event.target && event.target.id === 'addGoalBtn') {
            addGoal();
        }
    });
}

export const Goals = {
    render,
    bind,
    deleteGoal,
    calculateProgress
};
