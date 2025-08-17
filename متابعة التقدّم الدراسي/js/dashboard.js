// js/dashboard.js

// هذه الوحدة مسؤولة عن الأدوات الموجودة في لوحة التحكم.

import { State, SAVE } from './state.js';
import { U } from './utils.js';

// --- Private state for timers and tools ---
const AudioKit = (() => {
    let ctx;

    function ensure() {
        if (!ctx) ctx = new(window.AudioContext || window.webkitAudioContext)();
        return ctx;
    }

    function beep(freq = 880, dur = 0.08, type = 'sine', gain = 0.08) {
        const ac = ensure();
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.value = gain;
        o.connect(g);
        g.connect(ac.destination);
        o.start();
        o.stop(ac.currentTime + dur);
    }
    return {
        start: () => beep(880, 0.06, 'sine', 0.09),
        stop: () => beep(440, 0.06, 'sine', 0.09),
        done: () => beep(1200, 0.18, 'triangle', 0.12),
        tick: () => beep(700, 0.015, 'square', 0.04)
    };
})();

let pomo = { mode: 'idle', remaining: 0, timer: null, roundsLeft: 0 };
let sw = { running: false, paused: false, startTs: null, accSec: 0, interval: null };
let cd = { status: 'idle', remaining: 0, targetTs: null, interval: null, initialDuration: 0 };
let rng = { history: [], noRepeatPool: [], lastRange: '' };
let wheel = { options: [], rot: 0, spinning: false, vel: 0, raf: 0, tickInt: null };

// --- Helper Functions ---
function logTimeToTopic(selector, timeInSeconds) {
    const selectedVal = document.querySelector(selector).value;
    if (!selectedVal) return;
    const [sIndex, tIndex] = selectedVal.split('-').map(Number);
    if (isNaN(sIndex) || isNaN(tIndex)) return;

    const topic = State.subjects[sIndex]?.topics?.[tIndex];
    if (topic) {
        topic.timeSpent = (topic.timeSpent || 0) + timeInSeconds;
        SAVE.data();
    }
}

function updateTimerButtons() {
    const pBtn = document.getElementById('pomoToggleBtn');
    if (pBtn) {
        if (pomo.timer) { pBtn.textContent = 'إيقاف مؤقت'; pBtn.disabled = false; } 
        else if (pomo.mode !== 'idle' && pomo.remaining > 0) { pBtn.textContent = 'استئناف'; pBtn.disabled = false; } 
        else { pBtn.textContent = 'إيقاف مؤقت'; pBtn.disabled = true; }
    }
    const swBtn = document.getElementById('swToggleBtn');
    if (swBtn) {
        if (sw.running) { swBtn.textContent = 'إيقاف مؤقت'; swBtn.disabled = false; } 
        else if (sw.paused) { swBtn.textContent = 'استئناف'; swBtn.disabled = false; } 
        else { swBtn.textContent = 'إيقاف مؤقت'; swBtn.disabled = true; }
    }
    const cdBtn = document.getElementById('cdToggleBtn');
    if (cdBtn) {
        if (cd.status === 'running') { cdBtn.textContent = 'إيقاف مؤقت'; cdBtn.disabled = false; } 
        else if (cd.status === 'paused') { cdBtn.textContent = 'استئناف'; cdBtn.disabled = false; } 
        else { cdBtn.textContent = 'إيقاف مؤقت'; cdBtn.disabled = true; }
    }
}

// --- Pomodoro Logic ---
function pomoStart() {
    clearInterval(pomo.timer);
    const work = Math.max(1, parseInt(document.getElementById('pomoWork').value) || 25);
    const brk = Math.max(1, parseInt(document.getElementById('pomoBreak').value) || 5);
    const rounds = Math.max(1, parseInt(document.getElementById('pomoRounds').value) || 4);
    pomo.roundsLeft = rounds;
    startPhase('work', work * 60, brk * 60);
    updateTimerButtons();
}

function startPhase(mode, seconds, otherSeconds) {
    clearInterval(pomo.timer);
    pomo.mode = mode;
    pomo.remaining = seconds;
    const st = document.getElementById('pomoStatus');
    st.textContent = (mode === 'work' ? 'وقت عمل ⏳: ' : 'استراحة ☕: ') + U.formatHMS(pomo.remaining);
    AudioKit.start();
    pomo.timer = setInterval(() => {
        pomo.remaining--;
        st.textContent = (mode === 'work' ? 'وقت عمل ⏳: ' : 'استراحة ☕: ') + U.formatHMS(Math.max(0, pomo.remaining));
        if (pomo.remaining <= 0) {
            clearInterval(pomo.timer);
            AudioKit.done();
            if (mode === 'work') {
                const workDuration = (parseInt(document.getElementById('pomoWork').value) || 25) * 60;
                logTimeToTopic('#pomoTopicLink', workDuration);
                pomo.roundsLeft--;
                if (pomo.roundsLeft <= 0) {
                    st.textContent = 'انتهت الجولات ✅';
                    pomo.mode = 'idle';
                    pomo.remaining = 0;
                    updateTimerButtons();
                    return;
                }
                startPhase('break', Math.max(60, otherSeconds), workDuration);
            } else {
                startPhase('work', Math.max(60, otherSeconds), (parseInt(document.getElementById('pomoBreak').value) || 5) * 60);
            }
        }
    }, 1000);
    updateTimerButtons();
}

function pomoPause() { if (pomo.timer) { clearInterval(pomo.timer); pomo.timer = null; AudioKit.stop(); updateTimerButtons(); } }
function pomoResume() { if (!pomo.timer && pomo.mode !== 'idle' && pomo.remaining > 0) { const other = (pomo.mode === 'work' ? Math.max(60, (parseInt(document.getElementById('pomoBreak').value) || 5) * 60) : Math.max(60, (parseInt(document.getElementById('pomoWork').value) || 25) * 60)); startPhase(pomo.mode, pomo.remaining, other); } }
function pomoToggle() { if (pomo.timer) pomoPause(); else pomoResume(); }
function pomoReset() { clearInterval(pomo.timer); pomo.timer = null; pomo.mode = 'idle'; pomo.remaining = 0; pomo.roundsLeft = 0; document.getElementById('pomoStatus').textContent = 'جاهز'; AudioKit.stop(); updateTimerButtons(); }

// --- Stopwatch Logic ---
function swStart() { if (sw.running) return; clearInterval(sw.interval); sw.running = true; sw.paused = false; sw.startTs = Date.now(); AudioKit.start(); sw.interval = setInterval(() => { const secs = sw.accSec + Math.floor((Date.now() - sw.startTs) / 1000); document.getElementById('swDisplay').textContent = U.formatHMS(secs); }, 1000); updateTimerButtons(); }
function swPause() { if (!sw.running) return; const elapsed = Math.floor((Date.now() - sw.startTs) / 1000); logTimeToTopic('#swTopicLink', elapsed); sw.accSec += elapsed; sw.running = false; sw.paused = true; clearInterval(sw.interval); sw.interval = null; AudioKit.stop(); updateTimerButtons(); }
function swResume() { if (!sw.paused) return; sw.running = true; sw.paused = false; sw.startTs = Date.now(); AudioKit.start(); sw.interval = setInterval(() => { const secs = sw.accSec + Math.floor((Date.now() - sw.startTs) / 1000); document.getElementById('swDisplay').textContent = U.formatHMS(secs); }, 1000); updateTimerButtons(); }
function swToggle() { if (sw.running) swPause(); else if (sw.paused) swResume(); updateTimerButtons(); }
function swReset() { clearInterval(sw.interval); sw.interval = null; if (sw.running) { const elapsed = Math.floor((Date.now() - sw.startTs) / 1000); logTimeToTopic('#swTopicLink', elapsed); } sw.running = false; sw.paused = false; sw.accSec = 0; sw.startTs = null; document.getElementById('swDisplay').textContent = '00:00:00'; AudioKit.stop(); updateTimerButtons(); }

// --- Countdown Logic ---
function cdStart() { if (cd.status === 'running') return; let min = Math.max(0, parseInt(document.getElementById('cdMin').value) || 0); let sec = Math.max(0, Math.min(59, parseInt(document.getElementById('cdSec').value) || 0)); const total = min * 60 + sec; if (total <= 0) { U.toast('ضع وقت العدّ التنازلي'); return; } cd.initialDuration = total; cd.remaining = total; cd.targetTs = Date.now() + total * 1000; cd.status = 'running'; AudioKit.start(); clearInterval(cd.interval); document.getElementById('cdDisplay').textContent = U.formatHMS(total); cd.interval = setInterval(() => { const remain = Math.max(0, Math.ceil((cd.targetTs - Date.now()) / 1000)); document.getElementById('cdDisplay').textContent = U.formatHMS(remain); if (remain <= 0) { clearInterval(cd.interval); cd.interval = null; cd.status = 'idle'; cd.remaining = 0; AudioKit.done(); logTimeToTopic('#cdTopicLink', cd.initialDuration); cd.initialDuration = 0; updateTimerButtons(); } }, 1000); updateTimerButtons(); }
function cdPause() { if (cd.status !== 'running') return; const nowRemain = Math.max(0, Math.ceil((cd.targetTs - Date.now()) / 1000)); cd.remaining = nowRemain; cd.status = 'paused'; clearInterval(cd.interval); cd.interval = null; AudioKit.stop(); updateTimerButtons(); }
function cdResume() { if (cd.status !== 'paused' || cd.remaining <= 0) return; cd.targetTs = Date.now() + cd.remaining * 1000; cd.status = 'running'; AudioKit.start(); clearInterval(cd.interval); cd.interval = setInterval(() => { const remain = Math.max(0, Math.ceil((cd.targetTs - Date.now()) / 1000)); document.getElementById('cdDisplay').textContent = U.formatHMS(remain); if (remain <= 0) { clearInterval(cd.interval); cd.interval = null; cd.status = 'idle'; cd.remaining = 0; AudioKit.done(); logTimeToTopic('#cdTopicLink', cd.initialDuration); cd.initialDuration = 0; updateTimerButtons(); } }, 1000); updateTimerButtons(); }
function cdToggle() { if (cd.status === 'running') cdPause(); else if (cd.status === 'paused') cdResume(); updateTimerButtons(); }
function cdReset() { clearInterval(cd.interval); cd.interval = null; if (cd.status !== 'idle' && cd.initialDuration > 0) { let elapsed = 0; if (cd.status === 'running') { elapsed = cd.initialDuration - Math.max(0, Math.ceil((cd.targetTs - Date.now()) / 1000)); } else if (cd.status === 'paused') { elapsed = cd.initialDuration - cd.remaining; } logTimeToTopic('#cdTopicLink', elapsed); } cd.status = 'idle'; cd.remaining = 0; cd.targetTs = null; cd.initialDuration = 0; document.getElementById('cdDisplay').textContent = '00:00:00'; AudioKit.stop(); updateTimerButtons(); }

// --- Wheel Logic ---
function parseWheelInput() { const raw = document.getElementById('wheelInput').value || ''; return raw.split(/[\n,؛،;]+/).map(s => s.trim()).filter(Boolean); }
function wheelDraw(lines) { wheel.options = lines; const c = document.getElementById('wheelCanvas'); if(!c) return; const ctx = c.getContext('2d'); const W = c.width, H = c.height, r = Math.min(W, H) / 2 - 10; ctx.clearRect(0, 0, W, H); ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(wheel.rot); const n = Math.max(1, lines.length); for (let i = 0; i < n; i++) { const a0 = i * 2 * Math.PI / n, a1 = (i + 1) * 2 * Math.PI / n; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath(); ctx.fillStyle = `hsl(${(i*360/n)|0},80%,${(i%2?65:55)}%)`; ctx.fill(); ctx.save(); ctx.rotate(a0 + (a1 - a0) / 2); ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#111827'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(lines[i] || '', r * 0.6, 4); ctx.restore(); } ctx.restore(); ctx.beginPath(); ctx.moveTo(W / 2, H / 2 - (r + 6)); ctx.lineTo(W / 2 - 8, H / 2 - (r - 8)); ctx.lineTo(W / 2 + 8, H / 2 - (r - 8)); ctx.closePath(); ctx.fillStyle = '#ef4444'; ctx.fill(); }
function wheelInit() { const saved = localStorage.getItem('sp_wheel_opts'); if (saved) { try { document.getElementById('wheelInput').value = JSON.parse(saved).join('\n'); } catch {} } const input = document.getElementById('wheelInput'); input.addEventListener('input', () => { const lines = parseWheelInput(); localStorage.setItem('sp_wheel_opts', JSON.stringify(lines)); wheelDraw(lines); }); wheelDraw(parseWheelInput()); }
function wheelSave() { const lines = parseWheelInput(); if (lines.length < 2) { U.toast('أدخل خيارين على الأقل'); return; } localStorage.setItem('sp_wheel_opts', JSON.stringify(lines)); wheelDraw(lines); }
function wheelPickIndex(n) { if (n === 0) return 0; const TAU = Math.PI * 2; const pointer = -Math.PI / 2; let ang = pointer - (wheel.rot % TAU); ang = (ang % TAU + TAU) % TAU; const seg = TAU / n; return Math.floor(ang / seg) % n; }
function wheelSpin() { const lines = parseWheelInput(); if (lines.length < 2) { U.toast('أدخل خيارين على الأقل'); return; } if (wheel.spinning) return; wheel.spinning = true; wheel.vel = 0.4 + Math.random() * 0.6; const exclude = document.getElementById('wheelExclude').checked; if (wheel.tickInt) clearInterval(wheel.tickInt); wheel.tickInt = setInterval(() => AudioKit.tick(), 120); function step() { wheel.rot += wheel.vel; wheel.vel *= 0.985; wheelDraw(lines); if (wheel.vel < 0.005) { wheel.spinning = false; cancelAnimationFrame(wheel.raf); clearInterval(wheel.tickInt); wheel.tickInt = null; const idx = wheelPickIndex(lines.length); const winner = lines[idx] || '—'; document.getElementById('wheelWinner').textContent = winner; AudioKit.done(); if (exclude) { const rest = lines.filter((x, i) => i !== idx); document.getElementById('wheelInput').value = rest.join('\n'); localStorage.setItem('sp_wheel_opts', JSON.stringify(rest)); wheelDraw(rest); } return; } wheel.raf = requestAnimationFrame(step); } AudioKit.start(); wheel.raf = requestAnimationFrame(step); }

// --- RNG Logic ---
function rngGenerate() {
    const minEl = document.getElementById('rngMin');
    const maxEl = document.getElementById('rngMax');
    const resultEl = document.getElementById('rngResult');
    const historyEl = document.getElementById('rngHistory');
    const noRepeatEl = document.getElementById('rngNoRepeat');

    const min = parseInt(minEl.value, 10);
    const max = parseInt(maxEl.value, 10);

    if (isNaN(min) || isNaN(max) || min > max) {
        resultEl.textContent = 'خطأ في النطاق!';
        return;
    }

    let num;
    if (noRepeatEl.checked) {
        const currentRange = `${min}-${max}`;
        if (rng.lastRange !== currentRange) {
            rng.history = [];
            rng.lastRange = currentRange;
            const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            rng.noRepeatPool = pool;
        }

        if (rng.noRepeatPool.length === 0) {
            resultEl.textContent = 'انتهت الأرقام';
            return;
        }
        num = rng.noRepeatPool.pop();
        rng.history.push(num);
    } else {
        num = Math.floor(Math.random() * (max - min + 1)) + min;
        rng.history.push(num);
    }

    resultEl.textContent = num;
    historyEl.textContent = rng.history.join(', ');
}
function rngReset() { rng.history = []; rng.noRepeatPool = []; rng.lastRange = ''; document.getElementById('rngResult').textContent = '—'; document.getElementById('rngHistory').textContent = '—'; }

// --- Main Render and Bind ---
function renderNeglected() {
    const el = document.getElementById('neglectedList');
    if (!el) return;
    const items = [];
    State.subjects.forEach((s, si) => (s.topics || []).forEach((t, ti) => {
        const last = t.lastReviewed ? new Date(t.lastReviewed) : null;
        const days = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : 9999;
        items.push({ name: `${s.name} — ${t.name}`, days, status: t.status || 'Not Started' });
    }));
    items.sort((a, b) => b.days - a.days);
    el.innerHTML = items.filter(x => x.days >= (State.settings.staleDays || 120)).slice(0, 10).map(x => `<li>${x.name} <span class="text-gray-500 dark:text-gray-400">(${x.days===9999?'لم يُراجع':x.days+' يوم'})</span> — <span class="badge badge-gray">${x.status}</span></li>`).join('') || '<li>لا يوجد عناصر مهملة 🎉</li>';
}

function populateTopicSelectors() {
    const selectors = ['#pomoTopicLink', '#swTopicLink', '#cdTopicLink'];
    selectors.forEach(selector => {
        const selectEl = document.querySelector(selector);
        if (!selectEl) return;

        let optionsHtml = '<option value="">-- اختر موضوعًا --</option>';
        State.subjects.forEach((subject, sIndex) => {
            (subject.topics || []).forEach((topic, tIndex) => {
                optionsHtml += `<option value="${sIndex}-${tIndex}">${subject.name} - ${topic.name}</option>`;
            });
        });
        selectEl.innerHTML = optionsHtml;
    });
}

function render() {
    if (State.currentView !== 'dashboard') return;
    const container = document.getElementById('dashboard');
    if(!container) return;

    // Build the dashboard structure
    container.innerHTML = `
    <div class="grid gap-3 md:grid-cols-3">
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="text-gray-500 dark:text-gray-400 text-sm">عدد المواد</div>
        <div id="dbSubjects" class="text-2xl font-bold">0</div>
      </div>
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="text-gray-500 dark:text-gray-400 text-sm">عدد المواضيع</div>
        <div id="dbTopics" class="text-2xl font-bold">0</div>
      </div>
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="text-gray-500 dark:text-gray-400 text-sm">نسبة التقدّم العامة</div>
        <div id="dbPct" class="text-2xl font-bold">0%</div>
      </div>
    </div>
    <div class="grid gap-3 md:grid-cols-2 mt-4">
       <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold">Pomodoro</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">عمل/استراحة/جولات</span>
        </div>
        <div class="flex flex-wrap gap-2 mb-2">
          <label class="text-sm">عمل (د): <input id="pomoWork" type="number" min="1" value="25" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded w-20"></label>
          <label class="text-sm">استراحة (د): <input id="pomoBreak" type="number" min="1" value="5" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded w-20"></label>
          <label class="text-sm">جولات: <input id="pomoRounds" type="number" min="1" value="4" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded w-20"></label>
        </div>
        <div class="mb-2">
            <label for="pomoTopicLink" class="text-sm font-medium text-gray-700 dark:text-gray-300">ربط الجلسة بموضوع</label>
            <select id="pomoTopicLink" class="w-full mt-1 border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded"></select>
        </div>
        <div id="pomoStatus" class="text-lg font-semibold mb-2">جاهز</div>
        <div class="flex gap-2">
          <button id="pomoStart" class="btn btn-primary">بدء</button>
          <button id="pomoToggleBtn" class="btn btn-ghost">إيقاف مؤقت</button>
          <button id="pomoReset" class="btn btn-danger">إعادة</button>
        </div>
      </div>
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold">ستوب وتش</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">Stopwatch</span>
        </div>
        <div class="mb-2">
            <label for="swTopicLink" class="text-sm font-medium text-gray-700 dark:text-gray-300">ربط الجلسة بموضوع</label>
            <select id="swTopicLink" class="w-full mt-1 border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded"></select>
        </div>
        <div id="swDisplay" class="text-2xl font-mono font-bold mb-2">00:00:00</div>
        <div class="flex gap-2">
          <button id="swStart" class="btn btn-primary">بدء</button>
          <button id="swToggleBtn" class="btn btn-ghost">إيقاف مؤقت</button>
          <button id="swReset" class="btn btn-danger">إعادة</button>
        </div>
      </div>
    </div>
    <div class="grid gap-3 md:grid-cols-2 mt-4">
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold">عداد تنازلي</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">Countdown</span>
        </div>
        <div class="mb-2">
            <label for="cdTopicLink" class="text-sm font-medium text-gray-700 dark:text-gray-300">ربط الجلسة بموضوع</label>
            <select id="cdTopicLink" class="w-full mt-1 border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded"></select>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <label class="text-sm">د: <input id="cdMin" type="number" min="0" value="25" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded w-20"></label>
          <label class="text-sm">ث: <input id="cdSec" type="number" min="0" max="59" value="0" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded w-20"></label>
        </div>
        <div id="cdDisplay" class="text-2xl font-mono font-bold mb-2">00:00:00</div>
        <div class="flex gap-2">
          <button id="cdStart" class="btn btn-primary">بدء</button>
          <button id="cdToggleBtn" class="btn btn-ghost">إيقاف مؤقت</button>
          <button id="cdReset" class="btn btn-danger">إعادة</button>
        </div>
      </div>
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold">عجلة الاختيار</h3>
          <label class="text-sm flex items-center gap-1">
            <input id="wheelExclude" type="checkbox"> استثناء الفائز تلقائيًا
          </label>
        </div>
        <div class="grid md:grid-cols-2 gap-2">
          <div>
            <textarea id="wheelInput" rows="6" class="border dark:border-gray-700 bg-white dark:bg-gray-900 w-full p-2 rounded" placeholder="أدخل خيارًا في كل سطر"></textarea>
            <div class="flex gap-2 mt-2">
              <button id="wheelSpin" class="btn btn-primary">Spin</button>
              <button id="wheelSave" class="btn btn-ghost">حفظ</button>
            </div>
            <div class="mt-2 text-sm text-gray-500 dark:text-gray-400">الفائز: <span id="wheelWinner">—</span></div>
          </div>
          <div class="flex items-center justify-center">
            <canvas id="wheelCanvas" width="320" height="320" class="rounded"></canvas>
          </div>
        </div>
      </div>
    </div>
    <div class="grid gap-3 md:grid-cols-2 mt-4">
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold">مولِّد أرقام عشوائية</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">يدعم الأرقام السالبة وبدون تكرار</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <label class="text-sm">Min: <input id="rngMin" type="number" value="-10" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded w-24"></label>
          <label class="text-sm">Max: <input id="rngMax" type="number" value="10" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded w-24"></label>
          <label class="text-sm flex items-center gap-1"><input id="rngNoRepeat" type="checkbox"> بدون تكرار</label>
          <button id="rngGo" class="btn btn-primary">توليد</button>
          <button id="rngReset" class="btn btn-ghost">إعادة</button>
        </div>
        <div id="rngResult" class="text-xl font-mono mb-1">—</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">السجل: <span id="rngHistory">—</span></div>
      </div>
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <h3 class="font-bold mb-2">أكثر المواضيع المهملة</h3>
        <ul id="neglectedList" class="list-disc list-inside text-sm text-gray-700 dark:text-gray-300"></ul>
      </div>
    </div>
    `;

    // Populate data
    const all = State.subjects.flatMap(s => s.topics || []);
    const total = all.length,
        done = all.filter(t => t.status === 'Completed').length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById('dbSubjects').textContent = State.subjects.length;
    document.getElementById('dbTopics').textContent = total;
    document.getElementById('dbPct').textContent = pct + '%';
    populateTopicSelectors();
    renderNeglected();
    wheelInit(); // Initialize wheel after its canvas is in the DOM
}

function bind() {
    // Use event delegation on the parent container
    document.getElementById('dashboard').addEventListener('click', (e) => {
        const id = e.target.id;
        if (id === 'pomoStart') pomoStart();
        else if (id === 'pomoToggleBtn') pomoToggle();
        else if (id === 'pomoReset') pomoReset();
        else if (id === 'swStart') swStart();
        else if (id === 'swToggleBtn') swToggle();
        else if (id === 'swReset') swReset();
        else if (id === 'cdStart') cdStart();
        else if (id === 'cdToggleBtn') cdToggle();
        else if (id === 'cdReset') cdReset();
        else if (id === 'wheelSave') wheelSave();
        else if (id === 'wheelSpin') wheelSpin();
        else if (id === 'rngGo') rngGenerate();
        else if (id === 'rngReset') rngReset();
    });
}

export const Dash = {
    render,
    bind
};
