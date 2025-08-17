// js/charts.js

// هذه الوحدة مسؤولة عن عرض الرسوم البيانية.

import { State } from './state.js';

// متغير لتخزين نسخ الرسوم البيانية الحالية لتدميرها قبل إعادة الرسم
let charts = {};

function destroyCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    charts = {};
}

function renderTopicsBySubjectChart() {
    const ctx = document.getElementById('topicsBySubjectChart')?.getContext('2d');
    if (!ctx) return;
    const labels = State.subjects.map(s => s.name);
    const data = State.subjects.map(s => (s.topics || []).length);
    const backgroundColors = labels.map((_, i) => `hsl(${(i * 50)}, 70%, 60%)`);
    charts.topicsBySubject = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data, backgroundColor: backgroundColors }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151' }
                }
            }
        }
    });
}

function renderStatusDistributionChart() {
    const ctx = document.getElementById('statusDistributionChart')?.getContext('2d');
    if (!ctx) return;
    const allTopics = State.subjects.flatMap(s => s.topics || []);
    const statusCounts = { 'Completed': 0, 'In Review': 0, 'Not Started': 0, 'In Progress': 0 };
    allTopics.forEach(t => { statusCounts[t.status]++; });
    charts.statusDistribution = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['مكتمل', 'قيد الإنجاز', 'قيد المراجعة', 'لم يبدأ'],
            datasets: [{
                data: [statusCounts['Completed'], statusCounts['In Progress'], statusCounts['In Review'], statusCounts['Not Started']],
                backgroundColor: ['#22c55e', '#3b82f6', '#fbbf24', '#9ca3af']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151' }
                }
            }
        }
    });
}

function renderCompletedByDayChart() {
    const ctx = document.getElementById('completedByDayChart')?.getContext('2d');
    if (!ctx) return;

    const completionsByDay = {};
    State.subjects.forEach(subject => {
        (subject.topics || []).forEach(topic => {
            if (topic.status === 'Completed' && topic.completedAt) {
                const dayKey = new Date(topic.completedAt).toISOString().slice(0, 10);
                completionsByDay[dayKey] = (completionsByDay[dayKey] || 0) + 1;
            }
        });
    });

    const sortedDays = Object.keys(completionsByDay).sort((a, b) => new Date(a) - new Date(b));

    const labels = sortedDays;
    const data = sortedDays.map(day => completionsByDay[day]);
    const isDark = document.documentElement.classList.contains('dark');

    charts.completedByDay = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'المواضيع المكتملة',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1200,
                easing: 'easeOutCubic',
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: isDark ? '#9ca3af' : '#6b7280',
                        precision: 0
                    },
                    grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                },
                x: {
                    ticks: { color: isDark ? '#9ca3af' : '#6b7280' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (context) => new Date(context[0].label).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                    }
                }
            }
        }
    });
}

function render() {
    if (State.currentView !== 'chartsPage') return;
    const container = document.getElementById('chartsPage');
    if(!container) return;

    // Ensure the HTML structure for charts exists
    container.innerHTML = `
        <h2 class="text-2xl font-bold mb-4 text-center">📊 تحليلات ورسوم بيانية</h2>
        <div class="grid gap-4 md:grid-cols-2 mb-4">
            <div class="card bg-white dark:bg-gray-800 p-4 rounded">
                <h3 class="font-bold mb-2 text-center">توزيع المواضيع حسب المادة</h3>
                <div class="max-w-sm mx-auto h-64"><canvas id="topicsBySubjectChart"></canvas></div>
            </div>
            <div class="card bg-white dark:bg-gray-800 p-4 rounded">
                <h3 class="font-bold mb-2 text-center">توزيع المواضيع حسب الحالة</h3>
                <div class="max-w-sm mx-auto h-64"><canvas id="statusDistributionChart"></canvas></div>
            </div>
        </div>
        <div class="card bg-white dark:bg-gray-800 p-4 rounded">
            <h3 class="font-bold mb-2 text-center">المواضيع المكتملة يوميًا</h3>
            <div class="relative h-80"><canvas id="completedByDayChart"></canvas></div>
        </div>`;
    
    // Now that the canvas elements are in the DOM, render the charts
    destroyCharts();
    renderTopicsBySubjectChart();
    renderStatusDistributionChart();
    renderCompletedByDayChart();
}

export const Charts = {
    render
};
