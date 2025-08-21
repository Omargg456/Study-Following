// js/utils.js

// هذا الملف هو "صندوق الأدوات" الخاص بالتطبيق.
// يحتوي على دوال مساعدة عامة يمكن لأي وحدة أخرى استخدامها.

// نستورد 'State' و 'SAVE' من ملف الحالة الذي أنشأناه سابقًا.
import { State, SAVE } from './state.js';

export const U = {
  DIFFICULTY_INTERVAL: { 'Easy': 14, 'Medium': 7, 'Hard': 3 },
  SR_GROWTH: [1, 2, 4, 7, 14, 30, 60],

  formatHMS(totalSeconds) {
    totalSeconds = Math.max(0, Math.floor(totalSeconds || 0));
    const h = Math.floor(totalSeconds / 3600),
      m = Math.floor((totalSeconds % 3600) / 60),
      s = Math.floor(totalSeconds % 60);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  progressStyle(pct) {
    const hue = Math.max(0, Math.min(120, Math.round((pct / 100) * 120)));
    const startHue = Math.max(0, hue - 20),
      endHue = Math.min(120, hue + 20);
    return `width:${pct}%;background:linear-gradient(90deg,hsl(${startHue},90%,50%),hsl(${endHue},90%,40%));`;
  },

  statusBadge(s) {
    if (s === 'Completed') return '<span class="badge badge-green">مكتمل</span>';
    if (s === 'In Progress') return '<span class="badge badge-blue">قيد الإنجاز</span>';
    if (s === 'In Review') return '<span class="badge badge-amber">قيد المراجعة</span>';
    return '<span class="badge badge-gray">لم يبدأ</span>';
  },

  dayKey(d = new Date()) {
    const dateObj = new Date(d);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  bumpToday() {
    const k = U.dayKey();
    State.activity[k] = (State.activity[k] || 0) + 1;
    SAVE.data(); // FIX: Use the unified save function
  },

  calcDue(topic) {
    const baseDateString = topic.lastReviewed || topic.completedAt;
    const last = baseDateString ? new Date(baseDateString) : null;

    if (!last) return { finalDueDate: null, overdue: false, stale: false };

    const finalDueDate = new Date(last.getTime());

    if (topic.useCustomSR && topic.customSRGrowth) {
      const customFactors = topic.customSRGrowth.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
      if (customFactors.length > 0) {
        const lvl = topic.srLevel || 0;
        const daysToAdd = customFactors[Math.min(lvl, customFactors.length - 1)];
        finalDueDate.setDate(finalDueDate.getDate() + daysToAdd);
      }
    } else {
      const baseInterval = U.DIFFICULTY_INTERVAL[topic.difficulty || 'Medium'] || 7;
      finalDueDate.setDate(finalDueDate.getDate() + baseInterval);
    }

    const graceDays = State.settings.dueGraceDays || 0;
    if (graceDays > 0) {
      finalDueDate.setDate(finalDueDate.getDate() + graceDays);
    }

    const now = new Date();
    const staleDays = State.settings.staleDays || 120;

    const staleCheckDate = baseDateString ? new Date(baseDateString) : null;

    return {
      finalDueDate: finalDueDate,
      overdue: now.getTime() > finalDueDate.getTime(),
      stale: staleCheckDate ? (now - staleCheckDate) >= (staleDays * 86400000) : false
    };
  },

  humanize(ms) {
    if (ms < 0) ms = 0;
    const d = Math.floor(ms / 86400000),
      h = Math.floor((ms % 86400000) / 3600000),
      m = Math.floor((ms % 3600000) / 60000);
    return (d ? d + 'ي ' : '') + (h ? h + 'س ' : '') + (m ? m + 'د' : '');
  },

  tagColor(name) {
    return State.tagColors[name] || ({ 'حفظ': '#0ea5e9', 'مسائل': '#f97316', 'عملي': '#22c55e', 'محاضرة': '#a855f7', 'أخرى': '#64748b' }[name] || '#64748b');
  },

  renderTags(tags) {
    tags = tags || [];
    if (tags.length === 0) return '<div class="text-xs text-gray-500 dark:text-gray-400">لا وسوم</div>';
    return `<div class="flex flex-wrap gap-1">${tags.map(t=>`<span class="tag" style="border:1px solid ${U.tagColor(t)};color:${U.tagColor(t)}"><span class="tag-dot" style="background:${U.tagColor(t)}"></span>${t}</span>`).join('')}</div>`;
  },

  toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    let msgEl = el.querySelector('#toastMsg');
    if (!msgEl) {
        el.innerHTML = '<span id="toastMsg"></span><button id="undoBtn" class="btn btn-ghost">تراجع</button>';
        msgEl = el.querySelector('#toastMsg');
    }
    msgEl.textContent = msg;

    if (type === 'achievement') {
      el.classList.add('border-amber-400', 'dark:border-amber-400', 'text-amber-600', 'dark:text-amber-300');
    } else {
      el.classList.remove('border-amber-400', 'dark:border-amber-400', 'text-amber-600', 'dark:text-amber-300');
    }
    el.style.display = 'flex';
    clearTimeout(State.undoTimer);
    State.undoTimer = setTimeout(() => {
      el.style.display = 'none';
      State.lastDelete = null;
    }, 5000);
  },

  applyDark() {
    const pref = localStorage.getItem('sp_dark') || 'off';
    document.documentElement.classList.toggle('dark', pref === 'on');
    const darkBtn = document.getElementById('darkBtn');
    if(darkBtn) darkBtn.textContent = pref === 'on' ? '☀️' : '🌙';
  },

  toggleDark() {
    const pref = localStorage.getItem('sp_dark') || 'off';
    localStorage.setItem('sp_dark', pref === 'on' ? 'off' : 'on');
    U.applyDark();
    if (window.App && window.App.Charts) {
        window.App.Charts.render();
    }
  },

  updatePoints(value) {
    State.points = Math.max(0, (State.points || 0) + value);
    SAVE.data(); // FIX: Use the unified save function
    U.renderPoints();
    if (window.App && window.App.Achievements) {
        window.App.Achievements.check();
    }
  },

  renderPoints() {
    const el = document.getElementById('pointsCounter');
    if (el) el.innerHTML = `<span>${State.points}</span> <span>نقطة</span> ✨`;
  },

  confirmAction(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    if (!modal.innerHTML.trim()) {
        modal.innerHTML = `
            <div class="modal-content card bg-white dark:bg-gray-800 p-5 rounded-lg w-full max-w-sm text-center">
                <h3 id="confirmModalTitle" class="text-lg font-bold mb-3">تأكيد الإجراء</h3>
                <p id="confirmModalMessage" class="mb-5"></p>
                <div class="flex justify-center gap-3">
                    <button id="confirmModalCancel" class="btn btn-ghost w-24">إلغاء</button>
                    <button id="confirmModalConfirm" class="btn btn-danger w-24">تأكيد</button>
                </div>
            </div>`;
    }

    const msgEl = document.getElementById('confirmModalMessage');
    const confirmBtn = document.getElementById('confirmModalConfirm');
    const cancelBtn = document.getElementById('confirmModalCancel');

    msgEl.textContent = message;
    modal.style.display = 'block';

    const confirmHandler = () => {
      onConfirm();
      hide();
    };

    const hide = () => {
      modal.style.display = 'none';
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    confirmBtn.onclick = confirmHandler;
    cancelBtn.onclick = hide;
  }
};
