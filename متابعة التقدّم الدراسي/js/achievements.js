// js/achievements.js

import { State, SAVE } from './state.js';
import { U } from './utils.js';

const achievementList = [
    { id: 'complete_1', icon: '🚀', title: 'البداية القوية', desc: 'أكمل موضوعك الأول.', condition: (stats) => stats.completedTopics >= 1 },
    { id: 'complete_5', icon: '🔥', title: 'على الطريق الصحيح', desc: 'أكمل 5 مواضيع.', condition: (stats) => stats.completedTopics >= 5 },
    { id: 'complete_10', icon: '🎯', title: 'منطلق!', desc: 'أكمل 10 مواضيع.', condition: (stats) => stats.completedTopics >= 10 },
    { id: 'complete_25', icon: '🏆', title: 'محترف', desc: 'أكمل 25 موضوعًا.', condition: (stats) => stats.completedTopics >= 25 },
    { id: 'complete_45', icon: '🧑‍🎓', title: 'خبير المواضيع', desc: 'أكمل 45 موضوعًا.', condition: (stats) => stats.completedTopics >= 45 },
    { id: 'complete_75', icon: '🧐', title: 'أستاذ', desc: 'أكمل 75 موضوعًا.', condition: (stats) => stats.completedTopics >= 75 },
    { id: 'points_100', icon: '💰', title: 'جامع النقاط', desc: 'اجمع 100 نقطة.', condition: (stats) => stats.points >= 100 },
    { id: 'points_500', icon: '💎', title: 'كنز النقاط', desc: 'اجمع 500 نقطة.', condition: (stats) => stats.points >= 500 },
    { id: 'subject_1', icon: '📚', title: 'المادة الأولى', desc: 'أكمل جميع مواضيع مادة دراسية واحدة.', condition: (stats) => stats.completedSubjects >= 1 },
    { id: 'subject_3', icon: '🗺️', title: 'متعدد المواهب', desc: 'أكمل جميع مواضيع 3 مواد دراسية.', condition: (stats) => stats.completedSubjects >= 3 },
    { id: 'review_10', icon: '🧐', title: 'المراجع الدؤوب', desc: 'قم بمراجعة المواضيع 10 مرات.', condition: (stats) => stats.totalReviews >= 10 },
    { id: 'review_50', icon: '👑', title: 'ملك المراجعة', desc: 'قم بمراجعة المواضيع 50 مرة.', condition: (stats) => stats.totalReviews >= 50 },
    { id: 'goal_create_1', icon: '✍️', title: 'المُخطِّط', desc: 'أنشئ هدفك الأول.', condition: (stats) => stats.createdGoals >= 1 },
    { id: 'goal_complete_1', icon: '🎉', title: 'منجز الأهداف', desc: 'أكمل هدفك الأول بنجاح.', condition: (stats) => stats.completedGoals >= 1 },
    { id: 'goal_complete_3', icon: '🌟', title: 'استراتيجي', desc: 'أكمل 3 أهداف مختلفة.', condition: (stats) => stats.completedGoals >= 3 },
    { id: 'consistency_7', icon: '🗓️', title: 'مثابرة أسبوعية', desc: 'ذاكر في 7 أيام مختلفة.', condition: (stats) => stats.uniqueStudyDays >= 7 },
    { id: 'notes_10', icon: '✍️', title: 'المدوّن الخبير', desc: 'اكتب ملاحظات لـ 10 مواضيع مختلفة.', condition: (stats) => stats.totalNotes >= 10 },
];

function getStats() {
    const allTopics = State.subjects.flatMap(s => s.topics || []);
    const completedSubjects = State.subjects.filter(s => (s.topics || []).length > 0 && (s.topics || []).every(t => t.status === 'Completed')).length;

    const createdGoals = State.goals.length;
    const completedGoals = State.goals.filter(goal => {
        // FIX: Use the global App object to avoid circular dependency
        const currentProgress = window.App && window.App.Goals ? window.App.Goals.calculateProgress(goal) : 0;
        return currentProgress >= goal.target;
    }).length;

    const uniqueStudyDays = Object.keys(State.activity || {}).length;
    const totalNotes = allTopics.filter(t => t.notes && t.notes.length > 20).length;

    return {
        completedTopics: allTopics.filter(t => t.status === 'Completed').length,
        totalReviews: allTopics.reduce((acc, t) => acc + (t.reviews || 0), 0),
        points: State.points,
        completedSubjects: completedSubjects,
        createdGoals: createdGoals,
        completedGoals: completedGoals,
        uniqueStudyDays: uniqueStudyDays,
        totalNotes: totalNotes
    };
}

function check() {
    setTimeout(() => {
        const stats = getStats();
        achievementList.forEach(ach => {
            if (!State.achievements.includes(ach.id) && ach.condition(stats)) {
                State.achievements.push(ach.id);
                SAVE.achievements();
                U.toast(`إنجاز جديد: ${ach.title}`, 'achievement');
                if (State.currentView === 'achievementsPage') render();
            }
        });
    }, 100);
}

function render() {
    if (State.currentView !== 'achievementsPage') return;
    const container = document.getElementById('achievementsPage');
    if (!container) return;

    const gridContainerId = 'achievementsContainer';
    let gridContainer = document.getElementById(gridContainerId);

    if (!gridContainer) {
        container.innerHTML = `
            <div class="card bg-white dark:bg-gray-800 p-4 rounded">
                <h2 class="text-2xl font-bold mb-4 text-center">🏅 لوحة الإنجازات 🏅</h2>
                <div id="${gridContainerId}" class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"></div>
            </div>`;
        gridContainer = document.getElementById(gridContainerId);
    }
    
    gridContainer.innerHTML = achievementList.map(ach => {
        const isUnlocked = State.achievements.includes(ach.id);
        const cardClass = isUnlocked ? 'unlocked' : 'locked';
        return `
            <div class="achievement-card ${cardClass} card bg-white dark:bg-gray-800 p-4 rounded border-2 border-transparent text-center">
                <div class="text-5xl mb-2">${ach.icon}</div>
                <h3 class="font-bold text-lg">${ach.title}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">${ach.desc}</p>
            </div>
        `;
    }).join('');
}

export const Achievements = {
    render,
    check
};
