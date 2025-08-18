// js/search.js

import { State, SAVE } from './state.js';

function performSearch(query) {
    const resultsEl = document.getElementById('globalSearchResults');
    if (!query || query.length < 2) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        return;
    }

    const q = query.toLowerCase();
    let results = [];

    State.subjects.forEach((subject, sIndex) => {
        if (subject.name.toLowerCase().includes(q)) {
            results.push({ type: 'المادة', name: subject.name, sIndex });
        }
        (subject.topics || []).forEach((topic, tIndex) => {
            if (topic.name.toLowerCase().includes(q)) {
                results.push({ type: 'الموضوع', name: topic.name, subjectName: subject.name, sIndex, tIndex });
            }
            (topic.subtopics || []).forEach((subtopic, stIndex) => {
                if (subtopic.name.toLowerCase().includes(q)) {
                    results.push({ type: 'موضوع فرعي', name: subtopic.name, topicName: topic.name, subjectName: subject.name, sIndex, tIndex, stIndex });
                }
            });
        });
    });

    renderResults(results);
}

function renderResults(results) {
    const resultsEl = document.getElementById('globalSearchResults');
    if (results.length === 0) {
        resultsEl.innerHTML = '<div class="p-2 text-gray-500">لا توجد نتائج.</div>';
    } else {
        resultsEl.innerHTML = results.slice(0, 20).map(r => {
            let path = '';
            if (r.type === 'الموضوع') path = `<span class="text-xs text-gray-400">(${r.subjectName})</span>`;
            if (r.type === 'موضوع فرعي') path = `<span class="text-xs text-gray-400">(${r.subjectName} > ${r.topicName})</span>`;
            return `<a href="#" data-s-index="${r.sIndex}" data-t-index="${r.tIndex}" class="block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <div class="flex justify-between items-center">
                    <span class="font-semibold">${r.name}</span>
                    <span class="badge badge-gray">${r.type}</span>
                </div>
                ${path}
            </a>`;
        }).join('');
    }
    resultsEl.classList.remove('hidden');
}

function navigateToResult(e) {
    e.preventDefault();
    const target = e.target.closest('a');
    if (!target) return;

    const sIndex = parseInt(target.dataset.sIndex, 10);
    const tIndex = target.dataset.tIndex ? parseInt(target.dataset.tIndex, 10) : null;

    if (isNaN(sIndex)) return;

    if (window.App && window.App.Views) {
        window.App.Views.switchView('tracker');
    }
    
    State.subjects[sIndex].collapsed = false;
    State.subjects[sIndex].search = '';
    State.subjects[sIndex].statusFilter = 'All';
    State.subjects[sIndex].tagFilter = '';
    SAVE.data();
    
    if (window.App && window.App.Tracker) {
        window.App.Tracker.render();
    }

    setTimeout(() => {
        let elementToScrollTo;
        if (tIndex !== null && tIndex >= 0) {
            elementToScrollTo = document.querySelector(`.topic-item[data-s-index='${sIndex}'][data-t-index='${tIndex}']`);
        } else {
            elementToScrollTo = document.querySelector(`.subject-item[data-s-index='${sIndex}']`);
        }

        if (elementToScrollTo) {
            elementToScrollTo.scrollIntoView({ behavior: 'smooth', block: 'center' });
            elementToScrollTo.style.transition = 'background-color 0.5s';
            elementToScrollTo.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
            setTimeout(() => {
                elementToScrollTo.style.backgroundColor = '';
            }, 2000);
        }
    }, 100);

    document.getElementById('globalSearchInput').value = '';
    document.getElementById('globalSearchResults').classList.add('hidden');
}

function bind() {
    const inputEl = document.getElementById('globalSearchInput');
    const resultsEl = document.getElementById('globalSearchResults');

    inputEl.addEventListener('input', (e) => performSearch(e.target.value));
    inputEl.addEventListener('focus', (e) => performSearch(e.target.value));
    resultsEl.addEventListener('click', navigateToResult);
    document.addEventListener('click', (e) => {
        if (!inputEl.contains(e.target) && !resultsEl.contains(e.target)) {
            resultsEl.classList.add('hidden');
        }
    });
}

export const GlobalSearch = {
    bind
};
