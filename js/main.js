// js/main.js

import { State, SAVE, loadProfile, createProfile, deleteProfile, renameProfile } from './state.js';
import { U } from './utils.js';
import { Achievements } from './achievements.js';
import { Goals } from './goals.js';
import { Charts } from './charts.js';
import { Calendar } from './calendar.js';
import { Dash } from './dashboard.js';
import { Cards } from './cards.js';
import { GlobalSearch } from './search.js';
import { Tracker } from './tracker.js';
import { Views } from './views.js';

const ProfileManager = {
    elements: {
        managerScreen: document.getElementById('profileManager'),
        mainAppScreen: document.getElementById('mainApp'),
        profilesList: document.getElementById('profilesList'),
        newProfileNameInput: document.getElementById('newProfileNameInput'),
        activeProfileName: document.getElementById('activeProfileName'),
    },

    renderProfilesList() {
        const { profiles } = State;
        this.elements.profilesList.innerHTML = profiles.length > 0 ? profiles.map(p => `
            <div class="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span class="font-semibold">${p.name}</span>
                <div class="flex gap-2">
                    <button class="btn btn-primary" data-action="select-profile" data-id="${p.id}">اختيار</button>
                    <button class="btn btn-ghost" data-action="rename-profile" data-id="${p.id}">تعديل الاسم</button>
                    <button class="btn btn-danger" data-action="delete-profile" data-id="${p.id}" data-name="${p.name}">حذف</button>
                </div>
            </div>
        `).join('') : '<p class="text-gray-500 dark:text-gray-400">لا توجد ملفات شخصية. أنشئ واحدًا لتبدأ.</p>';
    },

    selectProfile(profileId) {
        if (loadProfile(profileId)) {
            this.elements.managerScreen.classList.add('hidden');
            this.elements.mainAppScreen.classList.remove('hidden');
            runApp();
        }
    },

    handleCreateProfile() {
        const name = this.elements.newProfileNameInput.value.trim();
        if (!name) {
            U.toast('الرجاء إدخال اسم للملف الشخصي.');
            return;
        }
        const newProfile = createProfile(name);
        this.selectProfile(newProfile.id);
    },
    
    handleRenameProfile(profileId) {
        const profile = State.profiles.find(p => p.id === profileId);
        if (!profile) return;
        const newName = prompt("الرجاء إدخال الاسم الجديد للملف الشخصي:", profile.name);
        if (newName && newName.trim() !== '') {
            if (renameProfile(profileId, newName)) {
                U.toast('تم تحديث الاسم بنجاح.');
                this.renderProfilesList();
                if (State.activeProfileId === profileId) {
                    this.elements.activeProfileName.textContent = newName.trim();
                }
            }
        }
    },

    handleDeleteProfile(profileId, profileName) {
        U.confirmAction(`هل أنت متأكد من حذف الملف الشخصي "${profileName}"؟ سيتم حذف كل بياناته نهائيًا.`, () => {
            deleteProfile(profileId);
            this.renderProfilesList();
            U.toast('تم حذف الملف الشخصي.');
        });
    },
    
    switchToManager() {
        State.isLoaded = false;
        State.activeProfileId = null;
        SAVE.data(); // Save the deactivated state
        this.elements.mainAppScreen.classList.add('hidden');
        this.elements.managerScreen.classList.remove('hidden');
        this.renderProfilesList();
    },

    bind() {
        document.getElementById('createNewProfileBtn').onclick = () => this.handleCreateProfile();
        document.getElementById('switchProfileBtn').onclick = () => this.switchToManager();
        this.elements.profilesList.addEventListener('click', e => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;
            const { action, id, name } = button.dataset;
            if (action === 'select-profile') this.selectProfile(id);
            else if (action === 'rename-profile') this.handleRenameProfile(id);
            else if (action === 'delete-profile') this.handleDeleteProfile(id, name);
        });
    }
};

window.App = { State, SAVE, U, Achievements, Goals, Charts, Calendar, Dash, Cards, GlobalSearch, Tracker, Views, ProfileManager };

function runApp() {
    const activeProfile = State.profiles.find(p => p.id === State.activeProfileId);
    if (activeProfile) {
        ProfileManager.elements.activeProfileName.textContent = activeProfile.name;
    }

    Cards.init();
    Views.bind();
    GlobalSearch.bind();
    Goals.bind();
    Calendar.bind();
    Dash.bind();
    Tracker.bind();
    
    document.getElementById('darkBtn').onclick = U.toggleDark;
    document.getElementById('btnExport').onclick = () => {
        const activeProfile = State.profiles.find(p => p.id === State.activeProfileId);
        if (!activeProfile) return U.toast('لا يوجد ملف شخصي نشط للتصدير.');
        
        const blob = new Blob([JSON.stringify(activeProfile.data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${activeProfile.name}_study_progress.json`;
        a.click();
    };
    document.getElementById('importInput').onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
            try {
                const importedData = JSON.parse(r.result);
                // Basic validation for imported data structure
                if (typeof importedData === 'object' && Array.isArray(importedData.subjects)) {
                    Object.assign(State, importedData);
                    SAVE.data();
                    Views.render();
                    U.toast('تم استيراد البيانات بنجاح في الملف الشخصي الحالي.');
                } else {
                    U.toast('صيغة الملف غير متوافقة.');
                }
            } catch { U.toast('ملف غير صالح أو تالف.'); }
        };
        r.readAsText(f);
        e.target.value = '';
    };

    U.applyDark();
    U.renderPoints();
    Views.render();
    Achievements.check();
}

function bootstrap() {
    ProfileManager.bind();
    if (State.activeProfileId && State.profiles.some(p => p.id === State.activeProfileId)) {
        ProfileManager.selectProfile(State.activeProfileId);
    } else {
        ProfileManager.switchToManager();
    }
}

document.addEventListener('DOMContentLoaded', bootstrap);
