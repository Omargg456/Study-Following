<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>متابعة التقدّم الدراسي — Merged</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script> tailwind.config = { darkMode:'class' } </script>
  <style>
    .card{ box-shadow:0 6px 18px rgba(0,0,0,.06) }
    .btn{ padding:.5rem .75rem;border-radius:.375rem;font-size:.9rem;transition:transform .06s ease, background-color .15s ease, opacity .15s ease}
    .btn:active{ transform:scale(.97) }
    .btn-ghost{ background:#e5e7eb } .btn-ghost:hover{ background:#d1d5db }
    .btn-danger{ background:#ef4444;color:#fff } .btn-danger:hover{ background:#dc2626 }
    .btn-primary{ background:#3b82f6;color:#fff } .btn-primary:hover{ background:#2563eb }
    .btn-accent{ background:#fbbf24 } .btn-accent:hover{ background:#f59e0b }
    .btn-green{ background:#22c55e;color:#fff } .btn-green:hover{ background:#16a34a }
    .badge{ display:inline-block;font-size:.75rem;border-radius:.375rem;padding:.1rem .5rem }
    .badge-gray{ background:#f3f4f6;color:#374151 }
    .badge-amber{ background:#fef3c7;color:#92400e }
    .badge-green{ background:#dcfce7;color:#166534 }
    .dark .btn-ghost{ background:#1f2937 } .dark .btn-ghost:hover{ background:#374151 }
    .dark .badge-gray{ background:#111827;color:#e5e7eb }
    .dark .badge-amber{ background:#3b2e12;color:#fcd34d }
    .dark .badge-green{ background:#052e16;color:#86efac }
    .dark .card{ box-shadow:0 6px 18px rgba(0,0,0,.35) }
    .index-bubble{ min-width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:#e5e7eb;color:#111827;font-weight:700 }
    .dark .index-bubble{ background:#1f2937;color:#e5e7eb }
    #toast{ position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:50;display:none }
    .progress-wrap{ position:relative } .progress-text{ position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.8rem;color:#111827 }
    .dark .progress-text{ color:#e5e7eb }
    .activity-cell{ width:14px;height:14px;border-radius:3px;background:#e5e7eb } .dark .activity-cell{ background:#1f2937 }
    .activity-1{ background:#bfdbfe } .activity-2{ background:#60a5fa } .activity-3{ background:#2563eb }
    .dark .activity-1{ background:#1e3a8a } .dark .activity-2{ background:#1d4ed8 } .dark .activity-3{ background:#3b82f6 }
    .drag-handle{ cursor:grab } .drag-handle.disabled{ opacity:.35; cursor:not-allowed }
    .drag-handle:active{ cursor:grabbing }
    .editable{ outline:none;border-bottom:1px dashed transparent } .editable:focus{ border-bottom-color:#60a5fa }
    .overdue{ outline:2px solid #f97316; outline-offset:2px } .stale{ outline:2px solid #ef4444; outline-offset:2px }
    .tag{ padding:.1rem .45rem;border-radius:.4rem;font-size:.75rem; margin-left:.25rem; display:inline-flex; align-items:center; gap:.25rem }
    .tag-btn{ border:1px solid transparent; cursor:pointer } .tag-btn:active{ transform:scale(.96) }
    .tag-dot{ width:8px;height:8px;border-radius:9999px;display:inline-block }
    .pill{ padding:.15rem .55rem;border-radius:9999px;border:1px dashed #cbd5e1;font-size:.75rem }
    .dim{ opacity:.6 }
    .placeholder{ border:2px dashed #60a5fa; border-radius:.5rem; background:transparent; margin:.25rem 0 }
    canvas{ touch-action:none; display:block; margin:auto }
    .topic-item,.subject-item, .subtopic-item{ list-style:none }
  </style>
</head>
<body class="bg-gray-100 dark:bg-gray-900 dark:text-gray-100 min-h-screen text-[15px]">
  <header class="w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
      <h1 class="text-xl font-bold">📚 متابعة التقدّم الدراسي</h1>
      <div class="ml-auto flex items-center gap-2">
        <button id="viewBtn" class="btn btn-ghost">لوحة التحكم</button>
        <button id="quickBtn" class="btn btn-ghost">عرض سريع: إيقاف</button>
        <button id="darkBtn" class="btn btn-ghost">🌙 وضع ليلي: إيقاف</button>
        <button id="btnExport" class="btn btn-green">تصدير JSON</button>
        <label class="btn btn-primary cursor-pointer">استيراد JSON
          <input id="importInput" type="file" accept="application/json" class="hidden"/>
        </label>
      </div>
    </div>
  </header>

  <!-- DASHBOARD -->
  <section id="dashboard" class="max-w-6xl mx-auto px-4 mt-4 hidden">
    <div class="grid gap-3 md:grid-cols-4">
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
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="text-gray-500 dark:text-gray-400 text-sm mb-1">نشاط آخر ٧ أيام</div>
        <div id="activityBar" class="flex items-center gap-1"></div>
        <div id="dbAverages" class="text-xs text-gray-500 dark:text-gray-400 mt-2">—</div>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-2 mt-4">
      <!-- Pomodoro -->
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
        <div id="pomoStatus" class="text-lg font-semibold mb-2">جاهز</div>
        <div class="flex gap-2">
          <button id="pomoStart" class="btn btn-primary">بدء</button>
          <button id="pomoToggleBtn" class="btn btn-ghost">إيقاف مؤقت</button>
          <button id="pomoReset" class="btn btn-danger">إعادة</button>
        </div>
      </div>

      <!-- Stopwatch -->
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold">ستوب وتش</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">Stopwatch</span>
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
      <!-- Countdown -->
      <div class="card bg-white dark:bg-gray-800 p-4 rounded">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-bold">عداد تنازلي</h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">Countdown</span>
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

      <!-- Wheel of Choice -->
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
          <span class="text-xs text-gray-500 dark:text-gray-400">يدعم بدون تكرار</span>
        </div>
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <label class="text-sm">Min: <input id="rngMin" type="number" value="1" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded w-24"></label>
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
  </section>

  <!-- TRACKER -->
  <section id="tracker" class="max-w-6xl mx-auto px-4 mt-4">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="card bg-white dark:bg-gray-800 p-4 rounded"><div class="text-gray-500 dark:text-gray-400 text-sm">إجمالي المواضيع</div><div id="statTotal" class="text-2xl font-bold">0</div></div>
      <div class="card bg-white dark:bg-gray-800 p-4 rounded"><div class="text-gray-500 dark:text-gray-400 text-sm">المكتملة</div><div id="statDone" class="text-2xl font-bold">0</div></div>
      <div class="card bg-white dark:bg-gray-800 p-4 rounded"><div class="text-gray-500 dark:text-gray-400 text-sm">نسبة التقدّم</div><div id="statPct" class="text-2xl font-bold">0%</div></div>
    </div>

    <div class="card bg-white dark:bg-gray-800 p-4 rounded flex flex-wrap gap-2 items-center mt-4">
      <input id="subjectName" type="text" placeholder="اسم المادة" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded flex-1 min-w-[220px]">
      <button id="addSubjectBtn" class="btn btn-primary">إضافة مادة</button>
    </div>

    <main id="subjectsContainer" class="mt-4"></main>
  </section>

  <div id="toast" class="card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-4 py-3 flex items-center gap-3">
    <span id="toastMsg">تم الحذف.</span>
    <button id="undoBtn" class="btn btn-ghost">تراجع</button>
  </div>

<script>
(function(){
  // ===== Namespaced single state (shared) =====
  const App = window.App || (window.App = {});
  const State = App.State || (App.State = {
    subjects: JSON.parse(localStorage.getItem('studyProgress')) || [],
    activity: JSON.parse(localStorage.getItem('sp_activity')) || {},
    tagColors: JSON.parse(localStorage.getItem('sp_tag_colors')) || {},
    undoTimer: null, lastDelete: null,
    quickView: localStorage.getItem('sp_quick')==='on',
    currentView: localStorage.getItem('sp_view') || 'tracker',
    uiTicker: null
  });
  const SAVE = {
    data(){ localStorage.setItem('studyProgress', JSON.stringify(State.subjects)); },
    activity(){ localStorage.setItem('sp_activity', JSON.stringify(State.activity)); },
    tags(){ localStorage.setItem('sp_tag_colors', JSON.stringify(State.tagColors)); }
  };

  // ===== Utilities (one copy only) =====
  const U = App.Util || (App.Util = {
    DIFFICULTY_INTERVAL: { 'Easy':7, 'Medium':3, 'Hard':1 },
    SR_GROWTH: [1,2,4,7],
    formatHMS(totalSeconds){ totalSeconds = Math.max(0, Math.floor(totalSeconds||0)); const h=Math.floor(totalSeconds/3600), m=Math.floor((totalSeconds%3600)/60), s=Math.floor(totalSeconds%60); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; },
    progressStyle(pct){ const hue = Math.max(0, Math.min(120, Math.round((pct/100)*120))); const startHue = Math.max(0, hue-20), endHue = Math.min(120, hue+20); return `width:${pct}%;background:linear-gradient(90deg,hsl(${startHue},90%,50%),hsl(${endHue},90%,40%));`; },
    statusBadge(s){ if(s==='Completed') return '<span class="badge badge-green">Completed</span>'; if(s==='In Review') return '<span class="badge badge-amber">In Review</span>'; return '<span class="badge badge-gray">Not Started</span>'; },
    dayKey(d=new Date()){ const dt=new Date(d.getTime()); dt.setHours(0,0,0,0); return dt.toISOString().slice(0,10); },
    bumpToday(){ const k=U.dayKey(); State.activity[k]=(State.activity[k]||0)+1; SAVE.activity(); },
    calcDue(topic){ const base = U.DIFFICULTY_INTERVAL[topic.difficulty||'Medium']||3; const lvl=topic.srLevel||0; const mul=U.SR_GROWTH[Math.min(lvl, U.SR_GROWTH.length-1)]; const last = topic.lastReviewed ? new Date(topic.lastReviewed) : null; if(!last) return {dueDate:null, overdue:false, stale:false}; const due=new Date(last.getTime()); due.setDate(due.getDate()+base*mul); const now=new Date(); return {dueDate:due, overdue:now>due, stale:(now-last)>=1000*60*60*24*120}; },
    humanize(ms){ const d=Math.floor(ms/86400000), h=Math.floor((ms%86400000)/3600000), m=Math.floor((ms%3600000)/60000); return (d?d+'ي ':'')+(h?h+'س ':'')+(m?m+'د':''); },
    tagColor(name){ return State.tagColors[name] || ({'حفظ':'#0ea5e9','مسائل':'#f97316','عملي':'#22c55e','محاضرة':'#a855f7','أخرى':'#64748b'}[name]||'#64748b'); },
    renderTags(tags){ tags = tags||[]; if(tags.length===0) return '<div class="text-xs text-gray-500 dark:text-gray-400">لا وسوم</div>'; return `<div class="flex flex-wrap gap-1">${tags.map(t=>`<span class="tag" style="border:1px solid ${U.tagColor(t)};color:${U.tagColor(t)}"><span class="tag-dot" style="background:${U.tagColor(t)}"></span>${t}</span>`).join('')}</div>`; },
    toast(msg){ const el=document.getElementById('toast'); document.getElementById('toastMsg').textContent=msg; el.style.display='flex'; clearTimeout(State.undoTimer); State.undoTimer=setTimeout(()=>{ el.style.display='none'; State.lastDelete=null; },5000); },
    applyDark(){ const pref = localStorage.getItem('sp_dark') || 'off'; document.documentElement.classList.toggle('dark', pref==='on'); const db=document.getElementById('darkBtn'); if(db) db.textContent = '🌙 وضع ليلي: ' + (pref==='on' ? 'تشغيل' : 'إيقاف'); },
    toggleDark(){ const pref = localStorage.getItem('sp_dark') || 'off'; localStorage.setItem('sp_dark', pref==='on'?'off':'on'); U.applyDark(); }
  });

  // ===== Dashboard Module =====
  App.Dash = App.Dash || (function(){
    // Audio (tiny)
    const AudioKit = (function(){ let ctx; function ensure(){ if(!ctx) ctx = new (window.AudioContext||window.webkitAudioContext)(); return ctx; } function beep(freq=880, dur=0.08, type='sine', gain=0.08){ const ac=ensure(); const o=ac.createOscillator(); const g=ac.createGain(); o.type=type; o.frequency.value=freq; g.gain.value=gain; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+dur);} return { start:()=>beep(880,0.06,'sine',0.09), stop:()=>beep(440,0.06,'sine',0.09), done:()=>beep(1200,0.18,'triangle',0.12), tick:()=>beep(700,0.015,'square',0.04) }; })();

    // Timers state
    let pomo = { mode:'idle', remaining:0, timer:null, roundsLeft:0 };
    let sw   = { running:false, paused:false, startTs:null, accSec:0, interval:null };
    let cd   = { status:'idle', remaining:0, targetTs:null, interval:null };
    // RNG State
    let rng = {
        history: [],
        noRepeatPool: [],
        lastRange: ''
    };


    function updateTimerButtons(){
      const pBtn=document.getElementById('pomoToggleBtn'); if(pBtn){ if(pomo.timer){ pBtn.textContent='إيقاف مؤقت'; pBtn.disabled=false; } else if(pomo.mode!=='idle' && pomo.remaining>0){ pBtn.textContent='استئناف'; pBtn.disabled=false; } else{ pBtn.textContent='إيقاف مؤقت'; pBtn.disabled=true; } }
      const swBtn=document.getElementById('swToggleBtn'); if(swBtn){ if(sw.running){ swBtn.textContent='إيقاف مؤقت'; swBtn.disabled=false; } else if(sw.paused){ swBtn.textContent='استئناف'; swBtn.disabled=false; } else{ swBtn.textContent='إيقاف مؤقت'; swBtn.disabled=true; } }
      const cdBtn=document.getElementById('cdToggleBtn'); if(cdBtn){ if(cd.status==='running'){ cdBtn.textContent='إيقاف مؤقت'; cdBtn.disabled=false; } else if(cd.status==='paused'){ cdBtn.textContent='استئناف'; cdBtn.disabled=false; } else{ cdBtn.textContent='إيقاف مؤقت'; cdBtn.disabled=true; } }
    }

    // Pomodoro
    function pomoStart(){ clearInterval(pomo.timer); const work=Math.max(1, parseInt(document.getElementById('pomoWork').value)||25); const brk=Math.max(1, parseInt(document.getElementById('pomoBreak').value)||5); const rounds=Math.max(1, parseInt(document.getElementById('pomoRounds').value)||4); pomo.roundsLeft=rounds; startPhase('work', work*60, brk*60); updateTimerButtons(); }
    function startPhase(mode, seconds, otherSeconds){ clearInterval(pomo.timer); pomo.mode=mode; pomo.remaining=seconds; const st=document.getElementById('pomoStatus'); st.textContent=(mode==='work'? 'وقت عمل ⏳: ':'استراحة ☕: ')+U.formatHMS(pomo.remaining); AudioKit.start(); pomo.timer=setInterval(()=>{ pomo.remaining--; st.textContent=(mode==='work'? 'وقت عمل ⏳: ':'استراحة ☕: ')+U.formatHMS(Math.max(0,pomo.remaining)); if(pomo.remaining<=0){ clearInterval(pomo.timer); AudioKit.done(); if(mode==='work'){ pomo.roundsLeft--; if(pomo.roundsLeft<=0){ st.textContent='انتهت الجولات ✅'; pomo.mode='idle'; pomo.remaining=0; updateTimerButtons(); return; } startPhase('break', Math.max(60, otherSeconds), (parseInt(document.getElementById('pomoWork').value)||25)*60); } else { startPhase('work', Math.max(60, otherSeconds), (parseInt(document.getElementById('pomoBreak').value)||5)*60); } } },1000); updateTimerButtons(); }
    function pomoPause(){ if(pomo.timer){ clearInterval(pomo.timer); pomo.timer=null; AudioKit.stop(); updateTimerButtons(); } }
    function pomoResume(){ if(!pomo.timer && pomo.mode!=='idle' && pomo.remaining>0){ const other=(pomo.mode==='work'? Math.max(60,(parseInt(document.getElementById('pomoBreak').value)||5)*60) : Math.max(60,(parseInt(document.getElementById('pomoWork').value)||25)*60)); startPhase(pomo.mode, pomo.remaining, other); } }
    function pomoToggle(){ if(pomo.timer) pomoPause(); else pomoResume(); }
    function pomoReset(){ clearInterval(pomo.timer); pomo.timer=null; pomo.mode='idle'; pomo.remaining=0; pomo.roundsLeft=0; document.getElementById('pomoStatus').textContent='جاهز'; AudioKit.stop(); updateTimerButtons(); }

    // Stopwatch
    function swStart(){ if(sw.running) return; clearInterval(sw.interval); sw.running=true; sw.paused=false; sw.startTs=Date.now(); AudioKit.start(); sw.interval=setInterval(()=>{ const secs=sw.accSec + Math.floor((Date.now()-sw.startTs)/1000); document.getElementById('swDisplay').textContent=U.formatHMS(secs); },1000); updateTimerButtons(); }
    function swPause(){ if(!sw.running) return; sw.accSec += Math.floor((Date.now()-sw.startTs)/1000); sw.running=false; sw.paused=true; clearInterval(sw.interval); sw.interval=null; AudioKit.stop(); updateTimerButtons(); }
    function swResume(){ if(!sw.paused) return; sw.running=true; sw.paused=false; sw.startTs=Date.now(); AudioKit.start(); sw.interval=setInterval(()=>{ const secs=sw.accSec + Math.floor((Date.now()-sw.startTs)/1000); document.getElementById('swDisplay').textContent=U.formatHMS(secs); },1000); updateTimerButtons(); }
    function swReset(){ clearInterval(sw.interval); sw.interval=null; sw.running=false; sw.paused=false; sw.accSec=0; sw.startTs=null; document.getElementById('swDisplay').textContent='00:00:00'; AudioKit.stop(); updateTimerButtons(); }

    // Countdown
    function cdStart(){ if(cd.status==='running') return; let min=Math.max(0, parseInt(document.getElementById('cdMin').value)||0); let sec=Math.max(0, Math.min(59, parseInt(document.getElementById('cdSec').value)||0)); const total=min*60+sec; if(total<=0){ alert('ضع وقت العدّ التنازلي'); return; } cd.remaining=total; cd.targetTs=Date.now()+total*1000; cd.status='running'; AudioKit.start(); clearInterval(cd.interval); document.getElementById('cdDisplay').textContent=U.formatHMS(total); cd.interval=setInterval(()=>{ const remain=Math.max(0, Math.ceil((cd.targetTs - Date.now())/1000)); document.getElementById('cdDisplay').textContent=U.formatHMS(remain); if(remain<=0){ clearInterval(cd.interval); cd.interval=null; cd.status='idle'; cd.remaining=0; AudioKit.done(); updateTimerButtons(); } },1000); updateTimerButtons(); }
    function cdPause(){ if(cd.status!=='running') return; const nowRemain=Math.max(0, Math.ceil((cd.targetTs - Date.now())/1000)); cd.remaining=nowRemain; cd.status='paused'; clearInterval(cd.interval); cd.interval=null; AudioKit.stop(); updateTimerButtons(); }
    function cdResume(){ if(cd.status!=='paused' || cd.remaining<=0) return; cd.targetTs=Date.now()+cd.remaining*1000; cd.status='running'; AudioKit.start(); clearInterval(cd.interval); cd.interval=setInterval(()=>{ const remain=Math.max(0, Math.ceil((cd.targetTs - Date.now())/1000)); document.getElementById('cdDisplay').textContent=U.formatHMS(remain); if(remain<=0){ clearInterval(cd.interval); cd.interval=null; cd.status='idle'; cd.remaining=0; AudioKit.done(); updateTimerButtons(); } },1000); updateTimerButtons(); }
    function cdReset(){ clearInterval(cd.interval); cd.interval=null; cd.status='idle'; cd.remaining=0; cd.targetTs=null; document.getElementById('cdDisplay').textContent='00:00:00'; AudioKit.stop(); updateTimerButtons(); }

    // Wheel
    let wheel = { options:[], rot:0, spinning:false, vel:0, raf:0, tickInt:null };
    function parseWheelInput(){ const raw=document.getElementById('wheelInput').value||''; return raw.split(/[\n,؛،;]+/).map(s=>s.trim()).filter(Boolean); }
    function wheelDraw(lines){ wheel.options=lines; const c=document.getElementById('wheelCanvas'); const ctx=c.getContext('2d'); const W=c.width, H=c.height, r=Math.min(W,H)/2-10; ctx.clearRect(0,0,W,H); ctx.save(); ctx.translate(W/2,H/2); ctx.rotate(wheel.rot); const n=Math.max(1, lines.length); for(let i=0;i<n;i++){ const a0=i*2*Math.PI/n, a1=(i+1)*2*Math.PI/n; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,r,a0,a1); ctx.closePath(); ctx.fillStyle = `hsl(${(i*360/n)|0},80%,${(i%2?65:55)}%)`; ctx.fill(); ctx.save(); ctx.rotate(a0+(a1-a0)/2); ctx.fillStyle=document.documentElement.classList.contains('dark')?'#e5e7eb':'#111827'; ctx.font='bold 12px sans-serif'; ctx.textAlign='center'; ctx.fillText(lines[i]||'', r*0.6, 4); ctx.restore(); } ctx.restore(); ctx.beginPath(); ctx.moveTo(W/2, H/2 - (r+6)); ctx.lineTo(W/2-8, H/2-(r-8)); ctx.lineTo(W/2+8, H/2-(r-8)); ctx.closePath(); ctx.fillStyle='#ef4444'; ctx.fill(); }
    function wheelInit(){ const saved=localStorage.getItem('sp_wheel_opts'); if(saved){ try{ document.getElementById('wheelInput').value = JSON.parse(saved).join('\n'); }catch{} } const input=document.getElementById('wheelInput'); input.addEventListener('input', ()=>{ const lines=parseWheelInput(); localStorage.setItem('sp_wheel_opts', JSON.stringify(lines)); wheelDraw(lines); }); wheelDraw(parseWheelInput()); }
    function wheelSave(){ const lines=parseWheelInput(); if(lines.length<2){ alert('أدخل خيارين على الأقل'); return; } localStorage.setItem('sp_wheel_opts', JSON.stringify(lines)); wheelDraw(lines); }
    function wheelPickIndex(n){ if(n===0) return 0; const TAU=Math.PI*2; const pointer=-Math.PI/2; let ang = pointer - (wheel.rot % TAU); ang = (ang % TAU + TAU) % TAU; const seg = TAU/n; return Math.floor(ang/seg)%n; }
    function wheelSpin(){ const lines=parseWheelInput(); if(lines.length<2){ alert('أدخل خيارين على الأقل'); return; } if(wheel.spinning) return; wheel.spinning=true; wheel.vel=0.4+Math.random()*0.6; const exclude=document.getElementById('wheelExclude').checked; if(wheel.tickInt) clearInterval(wheel.tickInt); wheel.tickInt=setInterval(()=>AudioKit.tick(),120); function step(){ wheel.rot += wheel.vel; wheel.vel *= 0.985; wheelDraw(lines); if(wheel.vel < 0.005){ wheel.spinning=false; cancelAnimationFrame(wheel.raf); clearInterval(wheel.tickInt); wheel.tickInt=null; const idx=wheelPickIndex(lines.length); const winner=lines[idx]||'—'; document.getElementById('wheelWinner').textContent=winner; AudioKit.done(); if(exclude){ const rest=lines.filter((x,i)=>i!==idx); document.getElementById('wheelInput').value = rest.join('\n'); localStorage.setItem('sp_wheel_opts', JSON.stringify(rest)); wheelDraw(rest); } return; } wheel.raf = requestAnimationFrame(step); } AudioKit.start(); wheel.raf=requestAnimationFrame(step); }

    // Random Number Generator Functions
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
            // If range or checkbox status changes, reset the pool
            if (rng.lastRange !== currentRange) {
                rng.history = []; // Also reset history for the new range
                rng.lastRange = currentRange;
                // Create a shuffled pool of numbers
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
            // Simple random number generation
            num = Math.floor(Math.random() * (max - min + 1)) + min;
            rng.history.push(num); // Keep history even for repeating mode
        }

        resultEl.textContent = num;
        historyEl.textContent = rng.history.join(', ');
    }

    function rngReset() {
        rng.history = [];
        rng.noRepeatPool = [];
        rng.lastRange = '';
        document.getElementById('rngResult').textContent = '—';
        document.getElementById('rngHistory').textContent = '—';
    }

    // Activity + cards
    function renderActivity7(elId){ const el=document.getElementById(elId); if(!el) return; el.innerHTML=''; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const key=U.dayKey(d), c=State.activity[key]||0; const cell=document.createElement('div'); cell.className='activity-cell ' + (c>=3?'activity-3':c==2?'activity-2':c==1?'activity-1':''); cell.title=`${key}: ${c} مراجعات`; el.appendChild(cell); } }
    function renderNeglected(){ const el=document.getElementById('neglectedList'); if(!el) return; const items=[]; State.subjects.forEach((s,si)=> (s.topics||[]).forEach((t,ti)=>{ const last=t.lastReviewed? new Date(t.lastReviewed):null; const days= last? Math.floor((Date.now()-last.getTime())/86400000):9999; items.push({name:`${s.name} — ${t.name}`, days, status:t.status||'Not Started'}); })); items.sort((a,b)=> b.days-a.days); el.innerHTML = items.slice(0,10).map(x=>`<li>${x.name} <span class="text-gray-500 dark:text-gray-400">(${x.days===9999?'لم يُراجع':x.days+' يوم'})</span> — <span class="badge badge-gray">${x.status}</span></li>`).join('') || '<li>لا يوجد عناصر مهملة 🎉</li>'; }

    function updateHeader(){ const qb=document.getElementById('quickBtn'); if(qb) qb.textContent='عرض سريع: ' + (State.quickView?'تشغيل':'إيقاف'); const vb=document.getElementById('viewBtn'); if(vb) vb.textContent = State.currentView==='dashboard'? 'العودة للتراكر':'لوحة التحكم'; }

    function render(){ const db=document.getElementById('dashboard'); const tr=document.getElementById('tracker'); db.classList.toggle('hidden', State.currentView!=='dashboard'); tr.classList.toggle('hidden', State.currentView!=='tracker'); updateHeader(); if(State.currentView!=='dashboard') return; const all=State.subjects.flatMap(s=>s.topics||[]); const total=all.length, done=all.filter(t=>t.status==='Completed').length; const pct= total? Math.round((done/total)*100):0; document.getElementById('dbSubjects').textContent=State.subjects.length; document.getElementById('dbTopics').textContent=total; document.getElementById('dbPct').textContent=pct+'%'; renderActivity7('activityBar'); const last7=[...Array(7)].map((_,i)=>State.activity[U.dayKey(new Date(Date.now()-(6-i)*86400000))]||0); const dailyAvg=(last7.reduce((a,b)=>a+b,0)/7).toFixed(2); const weeklyAvg=(Object.keys(State.activity).slice(-28).reduce((acc,k)=>acc+(State.activity[k]||0),0)/4).toFixed(2); const dbAvg=document.getElementById('dbAverages'); if(dbAvg) dbAvg.textContent=`متوسط يومي: ${dailyAvg} • أسبوعي: ${weeklyAvg}`; renderNeglected(); }

    function bind(){
      document.getElementById('darkBtn').onclick = U.toggleDark;
      document.getElementById('viewBtn').onclick = ()=>{ State.currentView = (State.currentView==='tracker'?'dashboard':'tracker'); localStorage.setItem('sp_view', State.currentView); render(); };
      document.getElementById('quickBtn').onclick = ()=>{ State.quickView=!State.quickView; localStorage.setItem('sp_quick', State.quickView?'on':'off'); render(); };
      document.getElementById('btnExport').onclick = ()=>{ const blob=new Blob([JSON.stringify(State.subjects,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='studyProgress.json'; a.click(); };
      document.getElementById('importInput').onchange = (e)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ try{ const data=JSON.parse(r.result); if(Array.isArray(data)){ State.subjects=data; SAVE.data(); App.Tracker.render(); render(); } else alert('صيغة ملف غير صحيحة'); }catch{ alert('ملف غير صالح'); } }; r.readAsText(f); };
      // timers
      document.getElementById('pomoStart').onclick=pomoStart; document.getElementById('pomoToggleBtn').onclick=pomoToggle; document.getElementById('pomoReset').onclick=pomoReset;
      document.getElementById('swStart').onclick=swStart; document.getElementById('swToggleBtn').onclick=()=>{ if(sw.running) swPause(); else if(sw.paused) swResume(); updateTimerButtons(); }; document.getElementById('swReset').onclick=swReset;
      document.getElementById('cdStart').onclick=cdStart; document.getElementById('cdToggleBtn').onclick=()=>{ if(cd.status==='running') cdPause(); else if(cd.status==='paused') cdResume(); updateTimerButtons(); }; document.getElementById('cdReset').onclick=cdReset;
      // wheel
      document.getElementById('wheelSave').onclick=wheelSave; document.getElementById('wheelSpin').onclick=wheelSpin; wheelInit();
      // rng
      document.getElementById('rngGo').onclick = rngGenerate;
      document.getElementById('rngReset').onclick = rngReset;
      // toast undo
      document.getElementById('undoBtn').onclick = ()=>{ const t=State.lastDelete; if(!t) return; if(t.type==='subject') State.subjects.splice(t.sIndex,0,t.data); else if(t.type==='topic') State.subjects[t.sIndex].topics.splice(t.tIndex,0,t.data); else if(t.type==='subtopic') State.subjects[t.sIndex].topics[t.tIndex].subtopics.splice(t.si,0,t.data); SAVE.data(); App.Tracker.render(); State.lastDelete=null; document.getElementById('toast').style.display='none'; clearTimeout(State.undoTimer); };
    }

    return { render, bind };
  })();

  // ===== Tracker Module =====
  App.Tracker = App.Tracker || (function(){
    function updateStats(){ const all=State.subjects.flatMap(s=>s.topics||[]); const total=all.length, done=all.filter(t=>t.status==='Completed').length; const pct= total? Math.round((done/total)*100):0; const statTotal=document.getElementById('statTotal'); if(statTotal){ statTotal.textContent=total; document.getElementById('statDone').textContent=done; document.getElementById('statPct').textContent=pct+'%'; } }

    function sortTopics(arr, sortBy, dir){ const mul=dir==='desc'?-1:1; const order={'Not Started':0,'In Review':1,'Completed':2}; const copy=arr.slice(); if(sortBy==='manual') return copy.sort((a,b)=>(a.order||0)-(b.order||0)); return copy.sort((a,b)=>{ if(!!b.pinned - !!a.pinned) return (b.pinned?1:-1); if(sortBy==='reviews') return ((a.reviews||0)-(b.reviews||0))*mul; if(sortBy==='status') return ((order[a.status]||0)-(order[b.status]||0))*mul; if(sortBy==='last') return ((new Date(a.lastReviewed||0))-(new Date(b.lastReviewed||0)))*mul; return 0; }); }
    function filterByStatus(arr, status){ return (!status||status==='All')? arr : arr.filter(t=>t.status===status); }
    function matchesSearch(topic, q){ if(!q) return true; const s=q.toLowerCase(); const inTopic=(topic.name||'').toLowerCase().includes(s) || (topic.notes||'').toLowerCase().includes(s); const inSubs=(topic.subtopics||[]).some(st => (st.name||'').toLowerCase().includes(s) || (st.notes||'').toLowerCase().includes(s)); return inTopic || inSubs; }

    // CRUD Subjects
    function addSubject(){ const input=document.getElementById('subjectName'); const name=(input?.value||'').trim(); if(!name) return; State.subjects.push({ name, topics: [], sortBy:'status', sortDir:'asc', statusFilter:'All', search:'', tagFilter:'', collapsed:false }); input.value=''; SAVE.data(); render(); }
    function deleteSubject(sIndex){ const data=State.subjects[sIndex]; State.subjects.splice(sIndex,1); SAVE.data(); render(); State.lastDelete={type:'subject', sIndex, data}; U.toast('تم حذف المادة.'); }

    // CRUD Topics
    function addTopic(sIndex){ const input=document.getElementById(`topic-${sIndex}`); const name=(input?.value||'').trim(); if(!name) return; const subj=State.subjects[sIndex]; subj.topics=subj.topics||[]; const orderBase = Math.max(-1, ...subj.topics.map(t=>typeof t.order==='number'?t.order:-1)); subj.topics.push({ name, status:'Not Started', reviews:0, lastReviewed:null, notes:'', subtopics:[], difficulty:'Medium', pinned:false, tags:[], srLevel:0, completedAt:null, attachments:[], order: orderBase+1 }); input.value=''; subj.collapsed=false; subj.search=''; subj.statusFilter='All'; subj.tagFilter=''; SAVE.data(); render(); setTimeout(()=>{ const el=document.getElementById(`topic-${sIndex}`); if(el) el.focus(); },0); }
    function deleteTopic(sIndex, tIndex){ const data=State.subjects[sIndex].topics[tIndex]; State.subjects[sIndex].topics.splice(tIndex,1); SAVE.data(); render(); State.lastDelete={type:'topic', sIndex, tIndex, data}; U.toast('تم حذف الموضوع.'); }
    function renameTopic(sIndex,tIndex,newName){ if(!newName) return; State.subjects[sIndex].topics[tIndex].name=newName; SAVE.data(); render(); }
    function changeStatus(sIndex,tIndex,status){ const t=State.subjects[sIndex].topics[tIndex]; const wasCompleted=t.status==='Completed'; t.status=status; if(status==='Completed' && !wasCompleted){ t.completedAt=new Date().toISOString(); } SAVE.data(); render(); }
    function setLastReviewed(sIndex,tIndex,val){ const t=State.subjects[sIndex].topics[tIndex]; const dt=new Date(val); if(!isNaN(dt.getTime())){ t.lastReviewed=dt.toISOString(); SAVE.data(); render(); } }
    function editReviews(sIndex,tIndex,val){ const t=State.subjects[sIndex].topics[tIndex]; if(t.status!=='Completed'){ alert('تعديل المراجعات متاح فقط عندما تكون الحالة Completed.'); render(); return; } const n=Math.max(0, parseInt(val)||0); t.reviews=n; SAVE.data(); render(); }
    function setDifficulty(sIndex,tIndex,val){ State.subjects[sIndex].topics[tIndex].difficulty=val; SAVE.data(); render(); }
    function togglePin(sIndex,tIndex){ const t=State.subjects[sIndex].topics[tIndex]; t.pinned=!t.pinned; SAVE.data(); render(); }
    function editNotes(sIndex,tIndex,value){ State.subjects[sIndex].topics[tIndex].notes=value; SAVE.data(); }
    function reviewTopic(sIndex,tIndex){ const t=State.subjects[sIndex].topics[tIndex]; t.reviews=(t.reviews||0)+1; t.lastReviewed=new Date().toISOString(); t.srLevel=(t.srLevel||0)+1; U.bumpToday(); SAVE.data(); render(); }
    function safeReview(sIndex,tIndex){ const t=State.subjects[sIndex].topics[tIndex]; if(t.status!=='Completed'){ alert('لا تُحتسب المراجعات إلا بعد وضع الحالة "Completed".'); return; } reviewTopic(sIndex,tIndex); }

    // Filters & view state
    function setSubjectSearch(sIndex,v){ State.subjects[sIndex].search=v||''; SAVE.data(); render(); }
    function setSort(sIndex,val){ State.subjects[sIndex].sortBy=val; SAVE.data(); render(); }
    function toggleSortDir(sIndex){ State.subjects[sIndex].sortDir= State.subjects[sIndex].sortDir==='asc'?'desc':'asc'; SAVE.data(); render(); }
    function setStatusFilter(sIndex,val){ State.subjects[sIndex].statusFilter=val; SAVE.data(); render(); }
    function setTagFilter(sIndex,val){ State.subjects[sIndex].tagFilter=val||''; SAVE.data(); render(); }
    function toggleTopics(sIndex){ State.subjects[sIndex].collapsed=!State.subjects[sIndex].collapsed; SAVE.data(); render(); }
    function clearFilters(sIndex){ State.subjects[sIndex].search=''; State.subjects[sIndex].statusFilter='All'; State.subjects[sIndex].tagFilter=''; SAVE.data(); render(); }

    // Tags
    function toggleTag(sIndex,tIndex, name){ const t=State.subjects[sIndex].topics[tIndex]; t.tags=t.tags||[]; const i=t.tags.indexOf(name); if(i>-1) t.tags.splice(i,1); else t.tags.push(name); SAVE.data(); render(); }
    function addCustomTag(sIndex,tIndex){ const name=(document.getElementById(`newtag-${sIndex}-${tIndex}`)?.value||'').trim(); const color=(document.getElementById(`newtagcolor-${sIndex}-${tIndex}`)?.value||'#64748b'); if(!name) return; State.tagColors[name]=color; const t=State.subjects[sIndex].topics[tIndex]; t.tags=t.tags||[]; if(!t.tags.includes(name)) t.tags.push(name); SAVE.tags(); SAVE.data(); render(); }
    function addGlobalTag(sIndex){ const name=(document.getElementById(`mgrNewTag-${sIndex}`)?.value||'').trim(); const color=document.getElementById(`mgrNewColor-${sIndex}`)?.value||'#64748b'; if(!name) return; State.tagColors[name]=color; SAVE.tags(); render(); }
    function deleteGlobalTag(name){ delete State.tagColors[name]; // remove from all topics
      State.subjects.forEach(s => (s.topics||[]).forEach(t => { t.tags = (t.tags||[]).filter(x=>x!==name); })); SAVE.tags(); SAVE.data(); render(); }

    function toggleTagManager(sIndex){ const box=document.getElementById(`tagManager-${sIndex}`); if(!box) return; box.classList.toggle('hidden'); if(!box.dataset.inited){ box.dataset.inited='1'; }
      const list=document.getElementById(`tagMgrList-${sIndex}`); if(list){ list.innerHTML = Object.keys(State.tagColors).length===0? '<span class="text-xs text-gray-500 dark:text-gray-400">لا توجد وسوم مخصصة بعد.</span>' : Object.entries(State.tagColors).map(([n,c])=>`<span class="tag" style="border:1px solid ${c};color:${c}"><span class="tag-dot" style="background:${c}"></span>${n}<button class="ml-1" title="حذف" onclick="App.Tracker.deleteGlobalTag('${n}')">✕</button></span>`).join(''); }
    }

    // Attachments (stored as data URLs; use small files)
    function addAttachment(ev, sIndex, tIndex){ const file=ev.target.files[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ const t=State.subjects[sIndex].topics[tIndex]; t.attachments=t.attachments||[]; t.attachments.push({ name:file.name, data:r.result }); SAVE.data(); render(); }; r.readAsDataURL(file); }
    function removeAttachment(sIndex,tIndex,i){ const t=State.subjects[sIndex].topics[tIndex]; (t.attachments||[]).splice(i,1); SAVE.data(); render(); }

    // Subtopics
    function toggleSubtopics(sIndex, tIndex) {
        const el = document.getElementById(`subs-${sIndex}-${tIndex}`);
        if (el) {
            el.classList.remove('hidden'); // Ensure subtopic list is visible after adding/deleting
        }
    }
    function renderSubtopics(sIndex,tIndex){
        const listEl=document.getElementById(`sublist-${sIndex}-${tIndex}`);
        if(!listEl) return;
        const subs=State.subjects[sIndex].topics[tIndex].subtopics||[];
        listEl.innerHTML='';
        subs.forEach((sub,si)=>{
            const row=document.createElement('li');
            row.className='subtopic-item border border-gray-200 dark:border-gray-700 rounded p-2 flex items-center gap-2';
            row.dataset.si = si;
            row.innerHTML=`
              <div class="drag-handle index-bubble cursor-grab" title="اسحب لإعادة الترتيب">≡</div>
              <div class="flex-1">
                  <div class="flex justify-between items-center gap-2">
                    <div class="editable font-medium" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="App.Tracker.renameSubtopic(${sIndex}, ${tIndex}, ${si}, this.textContent.trim())">${sub.name||''}</div>
                    <div class="flex gap-1 items-center">
                      <button id="btn-subnote-${sIndex}-${tIndex}-${si}" class="btn btn-ghost" onclick="App.Tracker.toggleSubNote(${sIndex}, ${tIndex}, ${si})">ملاحظات</button>
                      <button class="btn btn-danger" onclick="if(confirm('حذف هذا الـ Subtopic؟')) App.Tracker.deleteSubtopic(${sIndex}, ${tIndex}, ${si})">❌</button>
                    </div>
                  </div>
                  <div id="subnote-${sIndex}-${tIndex}-${si}" class="mt-2 hidden">
                    <textarea class="border dark:border-gray-700 bg-white dark:bg-gray-900 w-full p-2 rounded" rows="2" oninput="App.Tracker.editSubNote(${sIndex}, ${tIndex}, ${si}, this.value)">${sub.notes||''}</textarea>
                  </div>
              </div>`;
            listEl.appendChild(row);
        });
    }
    function addSubtopic(sIndex,tIndex){ const input=document.getElementById(`subtopic-${sIndex}-${tIndex}`); const name=(input?.value||'').trim(); if(!name) return; const t=State.subjects[sIndex].topics[tIndex]; t.subtopics=t.subtopics||[]; t.subtopics.push({ name, notes:'' }); input.value=''; SAVE.data(); render(); toggleSubtopics(sIndex,tIndex); }
    function deleteSubtopic(sIndex,tIndex,si){ const data=State.subjects[sIndex].topics[tIndex].subtopics[si]; State.subjects[sIndex].topics[tIndex].subtopics.splice(si,1); SAVE.data(); render(); toggleSubtopics(sIndex,tIndex); State.lastDelete={type:'subtopic', sIndex, tIndex, si, data}; U.toast('تم حذف الـ Subtopic.'); }
    function editSubNote(sIndex,tIndex,si,value){ State.subjects[sIndex].topics[tIndex].subtopics[si].notes=value; SAVE.data(); }
    function renameSubtopic(sIndex,tIndex,si,newName){ if(!newName) return; State.subjects[sIndex].topics[tIndex].subtopics[si].name=newName; SAVE.data(); render(); }
    function toggleSubNote(sIndex,tIndex,si){ const el=document.getElementById(`subnote-${sIndex}-${tIndex}-${si}`); const btn=document.getElementById(`btn-subnote-${sIndex}-${tIndex}-${si}`); if(el) el.classList.toggle('hidden'); if(btn){ btn.classList.toggle('btn-ghost'); btn.classList.toggle('btn-primary'); } }

    // Drag & Drop
    function setupSubjectDnD(){
        const container=document.getElementById('subjectsContainer');
        const sections=[...container.querySelectorAll('section.subject-item')];
        sections.forEach(sec=>{
            const handle=sec.querySelector('.drag-handle');
            if(!handle) return;
            handle.draggable=true;
            handle.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', sec.dataset.sIndex); sec.classList.add('dim'); });
            handle.addEventListener('dragend', ()=>sec.classList.remove('dim'));
            sec.addEventListener('dragover', e=>{ e.preventDefault(); });
            sec.addEventListener('drop', e=>{
                e.preventDefault();
                const from=parseInt(e.dataTransfer.getData('text/plain'));
                const to=parseInt(sec.dataset.sIndex);
                if(isNaN(from)||isNaN(to)||from===to) return;
                const [moved]=State.subjects.splice(from,1);
                State.subjects.splice(to,0,moved);
                SAVE.data();
                render();
            });
        });
    }

    function setupSubtopicDnD(sIndex, tIndex) {
        const container = document.getElementById(`sublist-${sIndex}-${tIndex}`);
        if (!container) return;

        container.querySelectorAll('li.subtopic-item').forEach(item => {
            item.draggable = true;

            item.addEventListener('dragstart', e => {
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', JSON.stringify({ sIndex, tIndex, fromIndex: item.dataset.si }));
                setTimeout(() => item.classList.add('dim'), 0);
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dim');
            });

            item.addEventListener('dragover', e => {
                e.preventDefault();
            });

            item.addEventListener('drop', e => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.dim').forEach(el => el.classList.remove('dim'));

                const dataStr = e.dataTransfer.getData('text/plain');
                if (!dataStr) return;
                
                const data = JSON.parse(dataStr);
                const fromSIndex = data.sIndex;
                const fromTIndex = data.tIndex;
                const fromIndex = parseInt(data.fromIndex, 10);
                const toIndex = parseInt(item.dataset.si, 10);

                if (fromSIndex !== sIndex || fromTIndex !== tIndex || isNaN(fromIndex) || isNaN(toIndex) || fromIndex === toIndex) {
                    return;
                }

                const subtopics = State.subjects[sIndex].topics[tIndex].subtopics;
                const [moved] = subtopics.splice(fromIndex, 1);
                subtopics.splice(toIndex, 0, moved);

                SAVE.data();
                render();
            });
        });
    }

    // Render
    function render(){ U.applyDark(); updateStats(); App.Dash.render(); if(State.uiTicker){ clearInterval(State.uiTicker); State.uiTicker=null; } if(State.currentView!=='tracker') return; State.uiTicker = setInterval(()=>{ State.subjects.forEach((subject,sIndex)=> (subject.topics||[]).forEach((t,tIndex)=>{ const sinceEl=document.getElementById(`since-${sIndex}-${tIndex}`); if(sinceEl && t.completedAt){ sinceEl.textContent = U.humanize(Date.now() - new Date(t.completedAt).getTime()); } })); },1000);
      const container=document.getElementById('subjectsContainer'); container.innerHTML='';
      State.subjects.forEach((subject,sIndex)=>{
        subject.topics=subject.topics||[]; subject.sortBy=subject.sortBy||'status'; subject.sortDir=subject.sortDir||'asc'; subject.statusFilter=subject.statusFilter||'All'; subject.search=subject.search||''; subject.tagFilter=subject.tagFilter||''; subject.collapsed=!!subject.collapsed;
        const total=subject.topics.length; const completed=subject.topics.filter(t=>t.status==='Completed').length; const progress= total? Math.round((completed/total)*100):0;
        let list = subject.topics.filter(t=>matchesSearch(t, subject.search)); list = (!subject.collapsed)? filterByStatus(list, subject.statusFilter):list; list = sortTopics(list, subject.sortBy, subject.sortDir);
        const defaultTags=['حفظ','مسائل','عملي','محاضرة','أخرى']; const dynamicTags=new Set([...defaultTags, ...Object.keys(State.tagColors||{}), ...subject.topics.flatMap(t=>t.tags||[])]);
        const tagOptionsHtml=['<option value="">كل الوسوم</option>', ...[...dynamicTags].map(t=>`<option ${subject.tagFilter===t?'selected':''}>${t}</option>`)].join('');
        const sec=document.createElement('section'); sec.className='card bg-white dark:bg-gray-800 p-4 rounded mb-4 subject-item'; sec.dataset.sIndex=sIndex;
        sec.innerHTML = `
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2">
              <div class="drag-handle index-bubble" title="اسحب لإعادة ترتيب المواد">≡</div>
              <h2 class="text-lg md:text-xl font-bold">${subject.name}</h2>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="App.Tracker.toggleTopics(${sIndex})" class="btn btn-ghost">${subject.collapsed?'إظهار':'إخفاء'}</button>
              <button onclick="if(confirm('حذف المادة بكل ما فيها؟')) App.Tracker.deleteSubject(${sIndex})" class="btn btn-danger">حذف</button>
            </div>
          </div>
          <div class="progress-wrap w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5 mb-2 overflow-hidden">
            <div class="h-5 rounded-full transition-all duration-500 ease-out" style="${U.progressStyle(progress)}"></div>
            <div class="progress-text">${progress}%</div>
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400 mb-3">إجمالي: ${total} • مكتمل: ${completed}</div>
          <div class="${subject.collapsed?'hidden':''}">
            <div class="flex flex-wrap gap-2 mb-3">
              <input type="search" placeholder="بحث في هذه المادة..." value="${subject.search||''}" oninput="App.Tracker.setSubjectSearch(${sIndex}, this.value)" class="subject-search border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded flex-1 min-w-[160px]">
              <select onchange="App.Tracker.setSort(${sIndex}, this.value)" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded">
                <option value="status" ${subject.sortBy==='status'?'selected':''}>فرز: الحالة</option>
                <option value="reviews" ${subject.sortBy==='reviews'?'selected':''}>فرز: المراجعات</option>
                <option value="last" ${subject.sortBy==='last'?'selected':''}>فرز: آخر مراجعة</option>
                <option value="manual" ${subject.sortBy==='manual'?'selected':''}>فرز: ترتيب يدوي</option>
              </select>
              <button class="border dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-2" title="اتجاه" onclick="App.Tracker.toggleSortDir(${sIndex})">${subject.sortDir==='asc'?'↑':'↓'}</button>
              <select id="tagFilter-${sIndex}" onchange="App.Tracker.setTagFilter(${sIndex}, this.value)" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded">${tagOptionsHtml}</select>
              <select onchange="App.Tracker.setStatusFilter(${sIndex}, this.value)" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded">
                <option>All</option>
                <option ${subject.statusFilter==='Not Started'?'selected':''}>Not Started</option>
                <option ${subject.statusFilter==='In Review'?'selected':''}>In Review</option>
                <option ${subject.statusFilter==='Completed'?'selected':''}>Completed</option>
              </select>
              <button class="btn btn-ghost" onclick="App.Tracker.clearFilters(${sIndex})">مسح الفلاتر</button>
              <button class="btn btn-ghost" onclick="App.Tracker.toggleTagManager(${sIndex})">إدارة الوسوم</button>
            </div>
            <div id="tagManager-${sIndex}" class="hidden border dark:border-gray-700 rounded p-2 mb-3">
              <div class="text-sm font-semibold mb-1">الوسوم المخصصة (عالميًا):</div>
              <div id="tagMgrList-${sIndex}" class="flex flex-wrap gap-2 mb-2"></div>
              <div class="flex items-center gap-2">
                <input id="mgrNewTag-${sIndex}" class="border dark:border-gray-700 bg-white dark:bg-gray-900 rounded p-1" placeholder="وسم جديد">
                <input id="mgrNewColor-${sIndex}" type="color" value="#64748b" class="border rounded w-10 h-8 p-0">
                <button class="btn btn-primary" onclick="App.Tracker.addGlobalTag(${sIndex})">إضافة</button>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">الحذف يزيل الوسم من جميع المواضيع أيضًا.</div>
            </div>
            <div class="flex gap-2 mb-2">
              <input type="text" id="topic-${sIndex}" placeholder="اسم الموضوع" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded flex-1" onkeydown="if(event.key==='Enter'){App.Tracker.addTopic(${sIndex})}">
              <button onclick="App.Tracker.addTopic(${sIndex})" class="btn btn-primary w-32">إضافة موضوع</button>
            </div>
          </div>
          <ul id="topics-${sIndex}" class="space-y-3 ${subject.collapsed?'hidden':''}"></ul>
        `;
        container.appendChild(sec);

        if(!subject.collapsed){
          const ul=sec.querySelector(`#topics-${sIndex}`);
          list.forEach((topic)=>{
            if(!topic.tags) topic.tags=[]; topic.difficulty=topic.difficulty||'Medium'; topic.srLevel=topic.srLevel||0; topic.order = (typeof topic.order==='number')? topic.order : Date.now(); const tIndex=subject.topics.indexOf(topic); const reviews=topic.reviews||0; if(topic.status==='Completed' && !topic.completedAt){ topic.completedAt=new Date().toISOString(); }
            const due=U.calcDue(topic); const lastStr= topic.lastReviewed ? new Date(topic.lastReviewed).toISOString().slice(0,16) : '';
            const li=document.createElement('li'); li.className=`topic-item border border-gray-200 dark:border-gray-700 rounded p-3 ${due.overdue?'overdue':''} ${due.stale?'stale':''} ${State.quickView?'dim':''}`; li.dataset.sIndex=sIndex; li.dataset.tIndex=tIndex;
            li.innerHTML = `
              <div class="flex items-start gap-3">
                <div class="drag-handle index-bubble disabled" title="تفعيل السحب متاح فقط في ترتيب يدوي">≡</div>
                <div class="flex-1">
                  <div class="flex flex-wrap items-center gap-2 justify-between">
                    <div class="text-base md:text-[17px] font-semibold editable" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="App.Tracker.renameTopic(${sIndex}, ${tIndex}, this.textContent.trim())">${topic.name}</div>
                    <div class="flex flex-wrap items-center gap-2">
                      ${U.statusBadge(topic.status)}
                      <label class="text-xs flex items-center gap-1"><span>🔄</span><input type="number" min="0" value="${reviews}" ${topic.status!=='Completed'?'disabled':''} class="w-16 border dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-1 ${topic.status!=='Completed'?'opacity-50 cursor-not-allowed':''}" onchange="App.Tracker.editReviews(${sIndex},${tIndex}, this.value)"></label>
                      ${due.stale?'<span class="badge badge-gray" style="background:#fee2e2;color:#991b1b">+4 أشهر</span>':''}
                      ${due.overdue && due.dueDate? `<span class="badge badge-amber" title="مستحق منذ ${due.dueDate.toLocaleDateString()}">Due</span>`:''}
                      <span class="text-xs text-gray-500 dark:text-gray-400">آخر مراجعة:
                        <input type="datetime-local" class="border dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-1" value="${lastStr}" onchange="App.Tracker.setLastReviewed(${sIndex},${tIndex}, this.value)">
                      </span>
                    </div>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 mt-2">
                    <select onchange="App.Tracker.changeStatus(${sIndex}, ${tIndex}, this.value)" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded">
                      <option ${topic.status==='Not Started'?'selected':''}>Not Started</option>
                      <option ${topic.status==='In Review'?'selected':''}>In Review</option>
                      <option ${topic.status==='Completed'?'selected':''}>Completed</option>
                    </select>
                    <select onchange="App.Tracker.setDifficulty(${sIndex}, ${tIndex}, this.value)" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded" title="الصعوبة تحدد سرعة الاستحقاق">
                      <option ${topic.difficulty==='Easy'?'selected':''}>Easy</option>
                      <option ${topic.difficulty==='Medium'?'selected':''}>Medium</option>
                      <option ${topic.difficulty==='Hard'?'selected':''}>Hard</option>
                    </select>
                    <button id="btn-pin-${sIndex}-${tIndex}" class="btn btn-ghost" onclick="App.Tracker.togglePin(${sIndex},${tIndex})">${topic.pinned?'📌 مثبّت':'📍 تثبيت'}</button>
                    <button id="btn-review-${sIndex}-${tIndex}" onclick="App.Tracker.safeReview(${sIndex}, ${tIndex})" class="btn btn-accent" ${topic.status!=='Completed'?' disabled style="opacity:.6;cursor:not-allowed"':''}>مراجعة +1</button>
                    <button id="btn-notes-${sIndex}-${tIndex}" onclick="document.getElementById('notes-${sIndex}-${tIndex}').classList.toggle('hidden')" class="btn btn-ghost">Notes</button>
                    <button id="btn-subs-${sIndex}-${tIndex}" onclick="document.getElementById('subs-${sIndex}-${tIndex}').classList.toggle('hidden')" class="btn btn-ghost">Subtopics</button>
                    <button id="btn-extra-${sIndex}-${tIndex}" onclick="document.getElementById('extras-${sIndex}-${tIndex}').classList.toggle('hidden')" class="btn btn-ghost">تفاصيل</button>
                    <button onclick="if(confirm('حذف هذا الموضوع؟')) App.Tracker.deleteTopic(${sIndex}, ${tIndex})" class="btn btn-danger">❌ حذف</button>
                  </div>

                  ${State.quickView? '' : `
                    <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">منذ الإكمال: <span id="since-${sIndex}-${tIndex}">${topic.completedAt? U.humanize(Date.now() - new Date(topic.completedAt).getTime()) : '—'}</span></div>

                    <div id="notes-${sIndex}-${tIndex}" class="mt-2 hidden">
                      <textarea placeholder="ملاحظات الموضوع..." oninput="App.Tracker.editNotes(${sIndex}, ${tIndex}, this.value)" class="border dark:border-gray-700 bg-white dark:bg-gray-900 w-full p-2 rounded" rows="2">${topic.notes||''}</textarea>
                    </div>

                    <div id="subs-${sIndex}-${tIndex}" class="mt-3 hidden">
                      <div class="flex gap-2 mb-2">
                        <input type="text" id="subtopic-${sIndex}-${tIndex}" placeholder="اسم الـ Subtopic" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded flex-1" onkeydown="if(event.key==='Enter'){App.Tracker.addSubtopic(${sIndex},${tIndex})}">
                        <button onclick="App.Tracker.addSubtopic(${sIndex}, ${tIndex})" class="btn btn-green">إضافة</button>
                      </div>
                      <ul id="sublist-${sIndex}-${tIndex}" class="space-y-2"></ul>
                    </div>

                    <div id="extras-${sIndex}-${tIndex}" class="mt-3 hidden">
                      <div class="mt-2">
                        ${U.renderTags(topic.tags)}
                        <div class="mt-2 flex flex-wrap items-center gap-2">
                          <span class="pill">أضف وسم:</span>
                          ${['حفظ','مسائل','عملي','محاضرة','أخرى'].map(tg=>`<button class="tag tag-btn" onclick="App.Tracker.toggleTag(${sIndex}, ${tIndex}, '${tg}')"><span class="tag-dot" style="background:${U.tagColor(tg)}"></span>${tg}</button>`).join('')}
                          <input id="newtag-${sIndex}-${tIndex}" class="border dark:border-gray-700 bg-white dark:bg-gray-900 rounded p-1" placeholder="وسم مخصص">
                          <input id="newtagcolor-${sIndex}-${tIndex}" type="color" value="#64748b" class="border rounded w-10 h-8 p-0">
                          <button class="btn btn-ghost" onclick="App.Tracker.addCustomTag(${sIndex},${tIndex})">إضافة</button>
                        </div>
                      </div>
                      <div class="mt-3">
                        <label class="btn btn-ghost cursor-pointer">إرفاق (صورة/PDF)
                          <input type="file" accept="image/*,application/pdf" class="hidden" onchange="App.Tracker.addAttachment(event, ${sIndex}, ${tIndex})"/>
                        </label>
                        <div class="text-xs text-gray-500 dark:text-gray-400">يفضّل ملفات صغيرة حتى ما يكبر التخزين.</div>
                        <ul class="mt-1">${(topic.attachments||[]).map((a,i)=>`<li class="flex items-center gap-2"><a href="${a.data}" target="_blank" class="underline">${a.name}</a><button class="btn btn-ghost" onclick="App.Tracker.removeAttachment(${sIndex},${tIndex},${i})">حذف</button></li>`).join('')}</ul>
                      </div>
                    </div>`}
                </div>
              </div>`;
            ul.appendChild(li);
            renderSubtopics(sIndex,tIndex);
            setupSubtopicDnD(sIndex, tIndex);
          });
        }
      });
      setupSubjectDnD();
    }

    function bind(){ document.getElementById('addSubjectBtn').onclick=addSubject; document.getElementById('subjectName').addEventListener('keydown', e=>{ if(e.key==='Enter') addSubject(); }); }

    return { render, bind,
      // expose for inline handlers
      addSubject, deleteSubject, addTopic, deleteTopic, renameTopic, changeStatus, setLastReviewed, editReviews, setDifficulty, togglePin, editNotes, reviewTopic, safeReview,
      setSubjectSearch, setSort, toggleSortDir, setStatusFilter, setTagFilter, toggleTopics, clearFilters,
      toggleTag, addCustomTag, addGlobalTag, deleteGlobalTag, toggleTagManager,
      addAttachment, removeAttachment,
      addSubtopic, deleteSubtopic, editSubNote, renameSubtopic, toggleSubNote, toggleSubtopics,
      renderSubtopics,
      // for dnd
      setupSubjectDnD,
      deleteGlobalTag: deleteGlobalTag
    };
  })();

  // ===== Bootstrap =====
  function bootstrap(){
    U.applyDark();
    App.Dash.bind();
    App.Tracker.bind();
    // header quick text
    const qb=document.getElementById('quickBtn'); if(qb) qb.textContent='عرض سريع: ' + (State.quickView?'تشغيل':'إيقاف');
    // initial view
    App.Tracker.render();
  }
  document.addEventListener('DOMContentLoaded', bootstrap);
})();
</script>
</body>
</html>
