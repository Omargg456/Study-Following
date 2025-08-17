// js/tracker.js

import { State, SAVE } from './state.js';
import { U } from './utils.js';

const quillToolbarOptions = [
    [{ 'size': ['12px', '14px', false, '18px', '20px', '24px'] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }]
];

function updateStats(){ const all=State.subjects.flatMap(s=>s.topics||[]); const total=all.length, done=all.filter(t=>t.status==='Completed').length; const pct= total? Math.round((done/total)*100):0; const statTotal=document.getElementById('statTotal'); if(statTotal){ statTotal.textContent=total; document.getElementById('statDone').textContent=done; document.getElementById('statPct').textContent=pct+'%'; } }
function sortTopics(arr, sortBy, dir){ const mul=dir==='desc'?-1:1; const order={'Not Started':0, 'In Progress': 1, 'In Review':2,'Completed':3}; const copy=arr.slice(); if(sortBy==='manual') return copy.sort((a,b)=>(a.order||0)-(b.order||0)); return copy.sort((a,b)=>{ if(!!b.pinned - !!a.pinned) return (b.pinned?1:-1); if(sortBy==='reviews') return ((a.reviews||0)-(b.reviews||0))*mul; if(sortBy==='status') return ((order[a.status]||0)-(order[b.status]||0))*mul; if(sortBy==='last') return ((new Date(a.lastReviewed||0))-(new Date(b.lastReviewed||0)))*mul; return 0; }); }
function filterByStatus(arr, status){ return (!status||status==='All')? arr : arr.filter(t=>t.status===status); }
function matchesSearch(topic, q){ if(!q) return true; const s=q.toLowerCase(); const inTopic=(topic.name||'').toLowerCase().includes(s) || (topic.notes||'').toLowerCase().includes(s); const inSubs=(topic.subtopics||[]).some(st => (st.name||'').toLowerCase().includes(s) || (st.notes||'').toLowerCase().includes(s)); return inTopic || inSubs; }
function filterByTag(arr, tag) { if (!tag || tag === '') return arr; return arr.filter(t => t.tags && t.tags.includes(tag)); }
function addSubject(){ const input=document.getElementById('subjectName'); const name=(input?.value||'').trim(); if(!name) return; State.subjects.push({ name, topics: [], sortBy:'status', sortDir:'asc', statusFilter:'All', search:'', tagFilter:'', collapsed:false }); input.value=''; SAVE.data(); render(); }
function deleteSubject(sIndex){ U.confirmAction('هل أنت متأكد من حذف هذه المادة وكل ما فيها؟', () => { const subjectToDelete = State.subjects[sIndex]; const completedTopicsInSubject = (subjectToDelete.topics || []).filter(t => t.status === 'Completed'); const pointsToDeduct = completedTopicsInSubject.length * 10; if (pointsToDeduct > 0) { U.updatePoints(-pointsToDeduct); } const data = State.subjects[sIndex]; State.subjects.splice(sIndex, 1); SAVE.data(); render(); State.lastDelete = { type: 'subject', sIndex, data }; U.toast('تم حذف المادة.'); }); }
function addTopic(sIndex){ const input=document.getElementById(`topic-${sIndex}`); const name=(input?.value||'').trim(); if(!name) return; const subj=State.subjects[sIndex]; subj.topics=subj.topics||[]; const orderBase = Math.max(-1, ...subj.topics.map(t=>typeof t.order==='number'?t.order:-1)); subj.topics.push({ id: `topic_${Date.now()}_${Math.random()}`, name, status:'Not Started', reviews:0, lastReviewed:null, notes:'', subtopics:[], subtopicsVisible: false, notesVisible: false, extrasVisible: false, difficulty:'Medium', pinned:false, tags:[], srLevel:0, completedAt:null, attachments:[], order: orderBase+1, timeSpent: 0, useCustomSR: false, customSRGrowth: '' }); input.value=''; subj.collapsed=false; subj.search=''; subj.statusFilter='All'; subj.tagFilter=''; SAVE.data(); render(); setTimeout(()=>{ const el=document.getElementById(`topic-${sIndex}`); if(el) el.focus(); },0); }
function deleteTopic(sIndex, tIndex){ U.confirmAction('هل أنت متأكد من حذف هذا الموضوع؟', () => { const data=State.subjects[sIndex].topics[tIndex]; if (data.status === 'Completed') U.updatePoints(-10); State.subjects[sIndex].topics.splice(tIndex,1); SAVE.data(); render(); State.lastDelete={type:'topic', sIndex, tIndex, data, wasCompleted: data.status === 'Completed'}; U.toast('تم حذف الموضوع.'); }); }
function renameTopic(sIndex,tIndex,newName){ if(!newName) return; State.subjects[sIndex].topics[tIndex].name=newName; SAVE.data(); }
function changeStatus(sIndex, tIndex, newStatus) {
    const t = State.subjects[sIndex].topics[tIndex];
    const oldStatus = t.status;
    if (newStatus === 'In Progress') {
        const subtopics = t.subtopics || [];
        const completedCount = subtopics.filter(s => s.completed).length;
        const canRestore = Array.isArray(t._previousSubtopicState);
        if (!canRestore && (subtopics.length === 0 || completedCount === 0 || completedCount === subtopics.length)) {
            U.toast('لا يمكن تحديد "قيد الإنجاز" يدوياً. يتم تحديده تلقائياً.');
            render(); 
            return;
        }
    }
    if (oldStatus === newStatus) return;
    if ((oldStatus === 'In Progress' || oldStatus === 'In Review') && (newStatus === 'Completed' || newStatus === 'Not Started')) { t._previousSubtopicState = (t.subtopics || []).map(s => s.completed); }
    if (newStatus === 'Completed') { (t.subtopics || []).forEach(sub => sub.completed = true); } else if (newStatus === 'Not Started') { (t.subtopics || []).forEach(sub => sub.completed = false); }
    if ((oldStatus === 'Completed' || oldStatus === 'Not Started') && (newStatus === 'In Progress' || newStatus === 'In Review')) {
         if (Array.isArray(t._previousSubtopicState)) {
            (t.subtopics || []).forEach((sub, i) => { sub.completed = t._previousSubtopicState[i] || false; });
            delete t._previousSubtopicState;
        }
    }
    if ((oldStatus === 'Completed' && newStatus === 'Not Started') || (oldStatus === 'Not Started' && newStatus === 'Completed')) { delete t._previousSubtopicState; }
    t.status = newStatus;
    const wasCompleted = oldStatus === 'Completed';
    const isCompleted = newStatus === 'Completed';
    if (isCompleted && !wasCompleted) { t.completedAt = new Date().toISOString(); U.updatePoints(10); } else if (!isCompleted && wasCompleted) { t.completedAt = null; U.updatePoints(-10); }
    SAVE.data();
    render();
    if(window.App && window.App.Achievements) window.App.Achievements.check();
}
function updateTopicStatusFromSubtopics(sIndex, tIndex) {
    const t = State.subjects[sIndex].topics[tIndex];
    const subtopics = t.subtopics || [];
    if (subtopics.length === 0) return;
    const oldStatus = t.status;
    const completedCount = subtopics.filter(s => s.completed).length;
    let newStatus;
    if (completedCount === 0) { newStatus = 'Not Started'; } else if (completedCount === subtopics.length) { newStatus = 'Completed'; } else { newStatus = 'In Progress'; }
    if (oldStatus !== newStatus) {
        t.status = newStatus;
        const wasCompleted = oldStatus === 'Completed';
        const isCompleted = newStatus === 'Completed';
        if (isCompleted && !wasCompleted) { t.completedAt = new Date().toISOString(); U.updatePoints(10); } else if (!isCompleted && wasCompleted) { t.completedAt = null; U.updatePoints(-10); }
    }
}
function toggleSubtopicStatus(sIndex, tIndex, si) {
    const topic = State.subjects[sIndex].topics[tIndex];
    const subtopic = topic.subtopics[si];
    subtopic.completed = !subtopic.completed;
    updateTopicStatusFromSubtopics(sIndex, tIndex);
    SAVE.data();
    render();
    if(window.App && window.App.Achievements) window.App.Achievements.check();
}
function editReviews(sIndex,tIndex,val){ const t=State.subjects[sIndex].topics[tIndex]; if(t.status!=='Completed'){ U.toast('تعديل المراجعات متاح فقط عندما تكون الحالة Completed.'); render(); return; } const n=Math.max(0, parseInt(val)||0); t.reviews=n; SAVE.data(); if(window.App && window.App.Achievements) window.App.Achievements.check(); render(); }
function setDifficulty(sIndex,tIndex,val){ State.subjects[sIndex].topics[tIndex].difficulty=val; SAVE.data(); render(); }
function togglePin(sIndex,tIndex){ const t=State.subjects[sIndex].topics[tIndex]; t.pinned=!t.pinned; SAVE.data(); render(); }
function editNotes(sIndex,tIndex,value){ State.subjects[sIndex].topics[tIndex].notes=value; SAVE.data(); if(window.App && window.App.Achievements) window.App.Achievements.check(); }
function reviewTopic(sIndex,tIndex){ const t=State.subjects[sIndex].topics[tIndex]; t.reviews=(t.reviews||0)+1; t.lastReviewed=new Date().toISOString(); t.srLevel=(t.srLevel||0)+1; U.bumpToday(); SAVE.data(); if(window.App && window.App.Achievements) window.App.Achievements.check(); render(); }
function safeReview(sIndex,tIndex){ const t=State.subjects[sIndex].topics[tIndex]; if(t.status!=='Completed'){ U.toast('لا تُحتسب المراجعات إلا بعد وضع الحالة "Completed".'); return; } reviewTopic(sIndex,tIndex); }
function setSubjectSearch(sIndex,v){ State.subjects[sIndex].search=v||''; SAVE.data(); render(); }
function setSort(sIndex,val){ State.subjects[sIndex].sortBy=val; SAVE.data(); render(); }
function toggleSortDir(sIndex){ State.subjects[sIndex].sortDir= State.subjects[sIndex].sortDir==='asc'?'desc':'asc'; SAVE.data(); render(); }
function setStatusFilter(sIndex,val){ State.subjects[sIndex].statusFilter=val; SAVE.data(); render(); }
function setTagFilter(sIndex,val){ State.subjects[sIndex].tagFilter=val||''; SAVE.data(); render(); }
function toggleTopics(sIndex){ State.subjects[sIndex].collapsed=!State.subjects[sIndex].collapsed; SAVE.data(); render(); }
function clearFilters(sIndex){ State.subjects[sIndex].search=''; State.subjects[sIndex].statusFilter='All'; State.subjects[sIndex].tagFilter=''; SAVE.data(); render(); }
function toggleTag(sIndex,tIndex, name){ const t=State.subjects[sIndex].topics[tIndex]; t.tags=t.tags||[]; const i=t.tags.indexOf(name); if(i>-1) t.tags.splice(i,1); else t.tags.push(name); SAVE.data(); render(); }
function addCustomTag(sIndex,tIndex){ const name=(document.getElementById(`newtag-${sIndex}-${tIndex}`)?.value||'').trim(); const color=(document.getElementById(`newtagcolor-${sIndex}-${tIndex}`)?.value||'#64748b'); if(!name) return; State.tagColors[name]=color; const t=State.subjects[sIndex].topics[tIndex]; t.tags=t.tags||[]; if(!t.tags.includes(name)) t.tags.push(name); SAVE.tags(); SAVE.data(); render(); }
function addGlobalTag(sIndex){ const name=(document.getElementById(`mgrNewTag-${sIndex}`)?.value||'').trim(); const color=document.getElementById(`mgrNewColor-${sIndex}`)?.value||'#64748b'; if(!name) return; State.tagColors[name]=color; SAVE.tags(); render(); }
function deleteGlobalTag(name){ U.confirmAction(`هل أنت متأكد من حذف الوسم "${name}"؟ سيتم إزالته من جميع المواضيع.`, () => { delete State.tagColors[name]; State.subjects.forEach(s => (s.topics||[]).forEach(t => { t.tags = (t.tags||[]).filter(x=>x!==name); })); SAVE.tags(); SAVE.data(); render(); }); }
function toggleTagManager(sIndex){ const box=document.getElementById(`tagManager-${sIndex}`); if(!box) return; box.classList.toggle('hidden'); if(!box.dataset.inited){ box.dataset.inited='1'; } const list=document.getElementById(`tagMgrList-${sIndex}`); if(list){ list.innerHTML = Object.keys(State.tagColors).length===0? '<span class="text-xs text-gray-500 dark:text-gray-400">لا توجد وسوم مخصصة بعد.</span>' : Object.entries(State.tagColors).map(([n,c])=>`<span class="tag" style="border:1px solid ${c};color:${c}"><span class="tag-dot" style="background:${c}"></span>${n}<button class="ml-1" title="حذف" onclick="App.Tracker.deleteGlobalTag('${n}')">✕</button></span>`).join(''); } }
function addAttachment(ev, sIndex, tIndex){ const file=ev.target.files[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ const t=State.subjects[sIndex].topics[tIndex]; t.attachments=t.attachments||[]; t.attachments.push({ name:file.name, data:r.result }); SAVE.data(); render(); }; r.readAsDataURL(file); }
function removeAttachment(sIndex,tIndex,i){ U.confirmAction('هل أنت متأكد من حذف هذا المرفق؟', () => { const t=State.subjects[sIndex].topics[tIndex]; (t.attachments||[]).splice(i,1); SAVE.data(); render(); }); }
function toggleSectionVisibility(sIndex, tIndex, section) { const topic = State.subjects[sIndex].topics[tIndex]; const key = `${section}Visible`; topic[key] = !topic[key]; SAVE.data(); render(); }
function addSubtopic(sIndex, tIndex) { const input = document.getElementById(`subtopic-${sIndex}-${tIndex}`); const name = (input?.value || '').trim(); if (!name) return; const t = State.subjects[sIndex].topics[tIndex]; t.subtopics = t.subtopics || []; t.subtopics.push({ name, notes: '', completed: false }); input.value = ''; t.subtopicsVisible = true; updateTopicStatusFromSubtopics(sIndex, tIndex); SAVE.data(); render(); }

function renderSubtopics(sIndex, tIndex) {
    const listEl = document.getElementById(`sublist-${sIndex}-${tIndex}`);
    if (!listEl) return;
    const subs = State.subjects[sIndex].topics[tIndex].subtopics || [];
    listEl.innerHTML = '';
    subs.forEach((sub, si) => {
        sub.completed = sub.completed || false;
        const row = document.createElement('li');
        row.className = `subtopic-item border border-gray-200 dark:border-gray-700 rounded p-2 flex items-center gap-2 ${sub.completed ? 'completed' : ''}`;
        row.dataset.si = si;
        row.innerHTML = `
            <div class="drag-handle index-bubble cursor-grab" title="اسحب لإعادة الترتيب">≡</div>
            <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500" ${sub.completed ? 'checked' : ''} onchange="App.Tracker.toggleSubtopicStatus(${sIndex}, ${tIndex}, ${si})">
            <div class="flex-1">
                <div class="flex justify-between items-center gap-2">
                    <div class="editable font-medium" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="App.Tracker.renameSubtopic(${sIndex}, ${tIndex}, ${si}, this.textContent.trim())">${sub.name || ''}</div>
                    <div class="flex gap-1 items-center">
                        <button id="btn-subnote-${sIndex}-${tIndex}-${si}" class="btn btn-ghost" onclick="App.Tracker.toggleSubNote(${sIndex}, ${tIndex}, ${si})">ملاحظات</button>
                        <button class="btn btn-danger" onclick="App.Tracker.deleteSubtopic(${sIndex}, ${tIndex}, ${si})">❌</button>
                    </div>
                </div>
                <div id="subnote-${sIndex}-${tIndex}-${si}" class="mt-2 hidden">
                    <div id="sub-editor-${sIndex}-${tIndex}-${si}"></div>
                </div>
            </div>`;
        listEl.appendChild(row);
    });
}

function deleteSubtopic(sIndex,tIndex,si){ U.confirmAction('هل أنت متأكد من حذف هذا الموضوع الفرعي؟', () => { const data=State.subjects[sIndex].topics[tIndex].subtopics[si]; State.subjects[sIndex].topics[tIndex].subtopics.splice(si,1); updateTopicStatusFromSubtopics(sIndex, tIndex); SAVE.data(); render(); State.lastDelete={type:'subtopic', sIndex, tIndex, si, data}; U.toast('تم حذف الموضوع الفرعي.'); }); }
function editSubNote(sIndex,tIndex,si,value){ State.subjects[sIndex].topics[tIndex].subtopics[si].notes=value; SAVE.data(); }
function renameSubtopic(sIndex,tIndex,si,newName){ if(!newName) return; State.subjects[sIndex].topics[tIndex].subtopics[si].name=newName; SAVE.data(); render(); }

function toggleSubNote(sIndex, tIndex, si) {
    const noteContainer = document.getElementById(`subnote-${sIndex}-${tIndex}-${si}`);
    const btn = document.getElementById(`btn-subnote-${sIndex}-${tIndex}-${si}`);
    if (!noteContainer || !btn) return;
    const isHidden = noteContainer.classList.toggle('hidden');
    btn.classList.toggle('btn-ghost', isHidden);
    btn.classList.toggle('btn-primary', !isHidden);
    const editorId = `sub-editor-${sIndex}-${tIndex}-${si}`;
    if (!isHidden && !State.editors[editorId]) {
        const subtopic = State.subjects[sIndex].topics[tIndex].subtopics[si];
        const quill = new Quill(`#${editorId}`, {
            modules: { toolbar: quillToolbarOptions },
            placeholder: 'ملاحظات الموضوع الفرعي...',
            theme: 'snow'
        });
        quill.root.innerHTML = subtopic.notes || '';
        quill.on('text-change', () => {
            editSubNote(sIndex, tIndex, si, quill.root.innerHTML);
        });
        State.editors[editorId] = quill;
    }
}

function toggleCustomSR(sIndex, tIndex, isChecked) { const topic = State.subjects[sIndex].topics[tIndex]; topic.useCustomSR = isChecked; SAVE.data(); render(); }
function setCustomSR(sIndex, tIndex, value) { const topic = State.subjects[sIndex].topics[tIndex]; topic.customSRGrowth = value; SAVE.data(); render(); }

function setupSubjectDnD() { const container = document.getElementById('subjectsContainer'); if(!container) return; const sections = [...container.querySelectorAll('section.subject-item')]; sections.forEach(sec => { const handle = sec.querySelector('.drag-handle'); if (!handle) return; handle.draggable = true; handle.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', sec.dataset.sIndex); sec.classList.add('dim'); }); handle.addEventListener('dragend', () => sec.classList.remove('dim')); sec.addEventListener('dragover', e => { e.preventDefault(); }); sec.addEventListener('drop', e => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData('text/plain')); const to = parseInt(sec.dataset.sIndex); if (isNaN(from) || isNaN(to) || from === to) return; const [moved] = State.subjects.splice(from, 1); State.subjects.splice(to, 0, moved); SAVE.data(); render(); }); }); }
function setupTopicDnD(sIndex) { const container = document.getElementById(`topics-${sIndex}`); if (!container || State.subjects[sIndex].sortBy !== 'manual') return; container.querySelectorAll('li.topic-item').forEach(item => { const handle = item.querySelector('.drag-handle:not(.disabled)'); if (!handle) return; item.draggable = true; item.addEventListener('dragstart', e => { e.stopPropagation(); e.dataTransfer.setData('text/plain', item.dataset.tIndex); setTimeout(() => item.classList.add('dim'), 0); }); item.addEventListener('dragend', () => { item.classList.remove('dim'); }); item.addEventListener('dragover', e => { e.preventDefault(); }); item.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); const fromTIndex = parseInt(e.dataTransfer.getData('text/plain'), 10); const toTIndex = parseInt(item.dataset.tIndex, 10); const topics = State.subjects[sIndex].topics; if (isNaN(fromTIndex) || isNaN(toTIndex) || fromTIndex === toTIndex) { return; } const [movedItem] = topics.splice(fromTIndex, 1); topics.splice(toTIndex, 0, movedItem); topics.forEach((topic, index) => { topic.order = index; }); SAVE.data(); render(); }); }); }
function setupSubtopicDnD(sIndex, tIndex) { const container = document.getElementById(`sublist-${sIndex}-${tIndex}`); if (!container) return; container.querySelectorAll('li.subtopic-item').forEach(item => { item.draggable = true; item.addEventListener('dragstart', e => { e.stopPropagation(); e.dataTransfer.setData('text/plain', JSON.stringify({ sIndex, tIndex, fromIndex: item.dataset.si })); setTimeout(() => item.classList.add('dim'), 0); }); item.addEventListener('dragend', () => { item.classList.remove('dim'); }); item.addEventListener('dragover', e => { e.preventDefault(); }); item.addEventListener('drop', e => { e.preventDefault(); e.stopPropagation(); document.querySelectorAll('.dim').forEach(el => el.classList.remove('dim')); const dataStr = e.dataTransfer.getData('text/plain'); if (!dataStr) return; try { const data = JSON.parse(dataStr); const fromSIndex = data.sIndex; const fromTIndex = data.tIndex; const fromIndex = parseInt(data.fromIndex, 10); const toIndex = parseInt(item.dataset.si, 10); if (fromSIndex !== sIndex || fromTIndex !== tIndex || isNaN(fromIndex) || isNaN(toIndex) || fromIndex === toIndex) { return; } const subtopics = State.subjects[sIndex].topics[tIndex].subtopics; const [moved] = subtopics.splice(fromIndex, 1); subtopics.splice(toIndex, 0, moved); SAVE.data(); render(); } catch (e) { console.error("Subtopic drop failed", e); render(); } }); }); }
function hideCompletionDateModal() { document.getElementById('editCompletionDateModal').style.display = 'none'; }
function promptEditCompletionDate(sIndex, tIndex) {
    const topic = State.subjects[sIndex].topics[tIndex];
    if (!topic || topic.status !== 'Completed') return;
    const modal = document.getElementById('editCompletionDateModal');
    const input = document.getElementById('completionDateInput');
    const date = new Date(topic.completedAt);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    input.value = date.toISOString().slice(0, 16);
    modal.dataset.sIndex = sIndex;
    modal.dataset.tIndex = tIndex;
    modal.style.display = 'block';
}
function saveCompletionDate() {
    const modal = document.getElementById('editCompletionDateModal');
    const input = document.getElementById('completionDateInput');
    const sIndex = modal.dataset.sIndex;
    const tIndex = modal.dataset.tIndex;
    if (sIndex === undefined || tIndex === undefined) return;
    const newDate = new Date(input.value);
    if (isNaN(newDate.getTime())) { U.toast('التاريخ المدخل غير صحيح.'); return; }
    State.subjects[sIndex].topics[tIndex].completedAt = newDate.toISOString();
    SAVE.data();
    hideCompletionDateModal();
    render();
    U.toast('تم تحديث وقت الإكمال بنجاح.');
}
function hideReviewDateModal() { document.getElementById('editReviewDateModal').style.display = 'none'; }
function promptEditReviewDate(sIndex, tIndex) {
    const topic = State.subjects[sIndex].topics[tIndex];
    if (!topic) return;
    const modal = document.getElementById('editReviewDateModal');
    const input = document.getElementById('reviewDateInput');
    const date = topic.lastReviewed ? new Date(topic.lastReviewed) : new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    input.value = date.toISOString().slice(0, 16);
    modal.dataset.sIndex = sIndex;
    modal.dataset.tIndex = tIndex;
    modal.style.display = 'block';
}
function saveReviewDate() {
    const modal = document.getElementById('editReviewDateModal');
    const input = document.getElementById('reviewDateInput');
    const sIndex = modal.dataset.sIndex;
    const tIndex = modal.dataset.tIndex;
    if (sIndex === undefined || tIndex === undefined) return;
    const newDate = new Date(input.value);
    if (isNaN(newDate.getTime())) { U.toast('التاريخ المدخل غير صحيح.'); return; }
    State.subjects[sIndex].topics[tIndex].lastReviewed = newDate.toISOString();
    SAVE.data();
    hideReviewDateModal();
    render();
    U.toast('تم تحديث تاريخ آخر مراجعة.');
}

function render() {
    if (State.currentView !== 'tracker') return;
    const container = document.getElementById('tracker');
    if (!container.querySelector('#subjectsContainer')) {
        container.innerHTML = `
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
        `;
        bind();
    }
    updateStats();
    const subjectsContainer = document.getElementById('subjectsContainer');
    subjectsContainer.innerHTML = '';
    State.editors = {};
    State.subjects.forEach((subject, sIndex) => {
        subject.topics = subject.topics || [];
        subject.sortBy = subject.sortBy || 'status';
        subject.sortDir = subject.sortDir || 'asc';
        subject.statusFilter = subject.statusFilter || 'All';
        subject.search = subject.search || '';
        subject.tagFilter = subject.tagFilter || '';
        subject.collapsed = !!subject.collapsed;
        const total = subject.topics.length;
        const completed = subject.topics.filter(t => t.status === 'Completed').length;
        const progress = total ? Math.round((completed / total) * 100) : 0;
        let list = subject.topics.filter(t => matchesSearch(t, subject.search));
        list = (!subject.collapsed) ? filterByStatus(list, subject.statusFilter) : list;
        list = (!subject.collapsed && subject.tagFilter) ? filterByTag(list, subject.tagFilter) : list;
        list = sortTopics(list, subject.sortBy, subject.sortDir);
        const dynamicTags = new Set(['حفظ', 'مسائل', 'عملي', 'محاضرة', 'أخرى', ...Object.keys(State.tagColors || {}), ...subject.topics.flatMap(t => t.tags || [])]);
        const tagOptionsHtml = ['<option value="">كل الوسوم</option>', ...[...dynamicTags].map(t => `<option ${subject.tagFilter===t?'selected':''}>${t}</option>`)].join('');
        const sec = document.createElement('section');
        sec.className = 'card bg-white dark:bg-gray-800 p-4 rounded mb-4 subject-item';
        sec.dataset.sIndex = sIndex;
        sec.innerHTML = `
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2">
              <div class="drag-handle index-bubble" title="اسحب لإعادة ترتيب المواد">≡</div>
              <h2 class="text-lg md:text-xl font-bold">${subject.name}</h2>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="App.Tracker.toggleTopics(${sIndex})" class="btn btn-ghost">${subject.collapsed?'إظهار':'إخفاء'}</button>
              <button onclick="App.Tracker.deleteSubject(${sIndex})" class="btn btn-danger">حذف</button>
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
                <option value="All">الكل</option>
                <option value="Not Started" ${subject.statusFilter==='Not Started'?'selected':''}>لم يبدأ</option>
                <option value="In Progress" ${subject.statusFilter==='In Progress'?'selected':''}>قيد الإنجاز</option>
                <option value="In Review" ${subject.statusFilter==='In Review'?'selected':''}>قيد المراجعة</option>
                <option value="Completed" ${subject.statusFilter==='Completed'?'selected':''}>مكتمل</option>
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
        subjectsContainer.appendChild(sec);
        if (!subject.collapsed) {
            const ul = sec.querySelector(`#topics-${sIndex}`);
            list.forEach((topic) => {
                topic.timeSpent = topic.timeSpent || 0;
                if (!topic.tags) topic.tags = [];
                topic.difficulty = topic.difficulty || 'Medium';
                topic.srLevel = topic.srLevel || 0;
                topic.order = (typeof topic.order === 'number') ? topic.order : Date.now();
                const tIndex = subject.topics.indexOf(topic);
                const reviews = topic.reviews || 0;
                if (topic.status === 'Completed' && !topic.completedAt) { topic.completedAt = new Date().toISOString(); }
                const due = U.calcDue(topic);
                const li = document.createElement('li');
                li.className = `topic-item border border-gray-200 dark:border-gray-700 rounded p-3 ${due.overdue?'overdue':''} ${due.stale?'stale':''}`;
                li.dataset.sIndex = sIndex;
                li.dataset.tIndex = tIndex;
                const handleClass = subject.sortBy === 'manual' ? '' : 'disabled';
                const handleTitle = subject.sortBy === 'manual' ? 'اسحب لإعادة الترتيب' : 'تفعيل السحب متاح فقط في ترتيب يدوي';
                const notesBtnClass = topic.notesVisible ? 'btn-primary' : 'btn-ghost';
                const notesSectionClass = topic.notesVisible ? '' : 'hidden';
                const subtopicsBtnClass = topic.subtopicsVisible ? 'btn-primary' : 'btn-ghost';
                const subtopicsSectionClass = topic.subtopicsVisible ? '' : 'hidden';
                const extrasBtnClass = topic.extrasVisible ? 'btn-primary' : 'btn-ghost';
                const extrasSectionClass = topic.extrasVisible ? '' : 'hidden';
                const editorId = `editor-${sIndex}-${tIndex}`;
                const isCustomSR = topic.useCustomSR;
                const difficultyDisabledAttr = isCustomSR ? 'disabled' : '';
                const difficultyClass = isCustomSR ? 'opacity-50 cursor-not-allowed' : '';
                const difficultyTitle = isCustomSR ? 'يتم تجاهل الصعوبة عند استخدام نظام التكرار المخصص' : 'الصعوبة تحدد سرعة الاستحقاق';
                const subtopics = topic.subtopics || [];
                const completedSubtopics = subtopics.filter(s => s.completed).length;
                const canRestoreToInProgress = Array.isArray(topic._previousSubtopicState) && topic._previousSubtopicState.some(s => s === true) && topic._previousSubtopicState.some(s => s === false);
                const isCurrentlyInvalid = (completedSubtopics === 0 || completedSubtopics === subtopics.length) && subtopics.length > 0;
                const inProgressDisabled = isCurrentlyInvalid && !canRestoreToInProgress && topic.status !== 'In Progress' ? 'disabled' : '';
                li.innerHTML = `
                  <div class="flex items-start gap-3">
                    <div class="drag-handle index-bubble ${handleClass}" title="${handleTitle}">≡</div>
                    <div class="flex-1">
                      <div class="flex flex-wrap items-center gap-2 justify-between">
                        <div class="text-base md:text-[17px] font-semibold editable" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="App.Tracker.renameTopic(${sIndex}, ${tIndex}, this.textContent.trim())">${topic.name}</div>
                        <div class="flex flex-wrap items-center gap-2">
                          ${U.statusBadge(topic.status)}
                          <label class="text-xs flex items-center gap-1"><span>🔄</span><input type="number" min="0" value="${reviews}" ${topic.status!=='Completed'?'disabled':''} class="w-16 border dark:border-gray-700 bg-white dark:bg-gray-900 rounded px-1 ${topic.status!=='Completed'?'opacity-50 cursor-not-allowed':''}" onchange="App.Tracker.editReviews(${sIndex},${tIndex}, this.value)"></label>
                          ${due.stale?'<span class="badge badge-gray" style="background:#fee2e2;color:#991b1b">مهمل</span>':''}
                          ${due.overdue && due.finalDueDate? `<span class="badge badge-amber" title="مستحق منذ ${due.finalDueDate.toLocaleDateString('ar-EG')}">Due</span>`:''}
                          <span class="text-xs text-gray-500 dark:text-gray-400">
                            آخر مراجعة: ${topic.lastReviewed ? new Date(topic.lastReviewed).toLocaleString('ar-EG', {dateStyle: 'medium', timeStyle: 'short'}) : 'لم تراجع بعد'}
                            <button class="align-middle p-1 text-blue-500 hover:text-blue-700" title="تعديل تاريخ آخر مراجعة" onclick="App.Tracker.promptEditReviewDate(${sIndex}, ${tIndex})">✏️</button>
                          </span>
                        </div>
                      </div>
                      <div class="flex flex-wrap items-center gap-2 mt-2">
                        <select onchange="App.Tracker.changeStatus(${sIndex}, ${tIndex}, this.value)" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded">
                          <option value="Not Started" ${topic.status==='Not Started'?'selected':''}>لم يبدأ</option>
                          <option value="In Progress" ${topic.status==='In Progress'?'selected':''} ${inProgressDisabled}>قيد الإنجاز</option>
                          <option value="In Review" ${topic.status==='In Review'?'selected':''}>قيد المراجعة</option>
                          <option value="Completed" ${topic.status==='Completed'?'selected':''}>مكتمل</option>
                        </select>
                        <select onchange="App.Tracker.setDifficulty(${sIndex}, ${tIndex}, this.value)" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-1 rounded ${difficultyClass}" title="${difficultyTitle}" ${difficultyDisabledAttr}>
                          <option ${topic.difficulty==='Easy'?'selected':''}>Easy</option>
                          <option ${topic.difficulty==='Medium'?'selected':''}>Medium</option>
                          <option ${topic.difficulty==='Hard'?'selected':''}>Hard</option>
                        </select>
                        <button id="btn-pin-${sIndex}-${tIndex}" class="btn btn-ghost" onclick="App.Tracker.togglePin(${sIndex},${tIndex})">${topic.pinned?'📌 مثبّت':'📍 تثبيت'}</button>
                        <button id="btn-review-${sIndex}-${tIndex}" onclick="App.Tracker.safeReview(${sIndex}, ${tIndex})" class="btn btn-accent" ${topic.status!=='Completed'?' disabled style="opacity:.6;cursor:not-allowed"':''}>مراجعة +1</button>
                        <button onclick="App.Tracker.toggleSectionVisibility(${sIndex},${tIndex}, 'notes')" class="btn ${notesBtnClass}">Notes</button>
                        <button onclick="App.Tracker.toggleSectionVisibility(${sIndex},${tIndex}, 'subtopics')" class="btn ${subtopicsBtnClass}">Subtopics</button>
                        <button onclick="App.Tracker.toggleSectionVisibility(${sIndex},${tIndex}, 'extras')" class="btn ${extrasBtnClass}">تفاصيل</button>
                        <button onclick="App.Tracker.deleteTopic(${sIndex}, ${tIndex})" class="btn btn-danger">❌ حذف</button>
                      </div>
                      ${topic.completedAt ? `
                      <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          وقت الإكمال: ${new Date(topic.completedAt).toLocaleString('ar-EG', {dateStyle: 'medium', timeStyle: 'short'})}
                          <button class="align-middle p-1 text-blue-500 hover:text-blue-700" title="تعديل وقت الإكمال" onclick="App.Tracker.promptEditCompletionDate(${sIndex}, ${tIndex})">✏️</button>
                      </div>` : ''}
                      <div class="mt-2 ${notesSectionClass}"><div id="${editorId}"></div></div>
                      <div class="mt-3 ${subtopicsSectionClass}">
                        <div class="flex gap-2 mb-2">
                          <input type="text" id="subtopic-${sIndex}-${tIndex}" placeholder="اسم الـ Subtopic" class="border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded flex-1" onkeydown="if(event.key==='Enter'){App.Tracker.addSubtopic(${sIndex},${tIndex})}">
                          <button onclick="App.Tracker.addSubtopic(${sIndex}, ${tIndex})" class="btn btn-green">إضافة</button>
                        </div>
                        <ul id="sublist-${sIndex}-${tIndex}" class="space-y-2"></ul>
                      </div>
                      <div class="mt-3 ${extrasSectionClass}">
                        <div class="border-t dark:border-gray-700 pt-2 mt-2 space-y-3">
                            <div>
                              <h4 class="font-semibold mb-2">إعدادات التكرار المتباعد</h4>
                              <label class="flex items-center gap-2">
                                <input type="checkbox" onchange="App.Tracker.toggleCustomSR(${sIndex}, ${tIndex}, this.checked)" ${topic.useCustomSR ? 'checked' : ''}>
                                <span>استخدام نظام تكرار مخصص</span>
                              </label>
                              <div class="mt-2 ${topic.useCustomSR ? '' : 'hidden'}">
                                  <label class="text-sm">سلسلة التكرار (أيام، مفصولة بفاصلة):</label>
                                  <input type="text" placeholder="e.g., 2,5,10,25,60" value="${topic.customSRGrowth || ''}" onchange="App.Tracker.setCustomSR(${sIndex}, ${tIndex}, this.value)" class="w-full mt-1 border dark:border-gray-700 bg-white dark:bg-gray-900 p-2 rounded">
                                  <p class="text-xs text-gray-500 mt-1">هذه هي الفترات بالأيام بين كل مراجعة. يتم تجاهل إعداد الصعوبة.</p>
                              </div>
                            </div>
                            <div><span class="font-semibold">إجمالي وقت المذاكرة:</span> <span class="font-mono">${U.formatHMS(topic.timeSpent)}</span></div>
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
                        </div>
                      </div>
                    </div>
                  </div>`;
                ul.appendChild(li);
                if (topic.notesVisible) {
                    const quill = new Quill(`#${editorId}`, {
                        modules: { toolbar: quillToolbarOptions },
                        placeholder: 'ملاحظات الموضوع...',
                        theme: 'snow'
                    });
                    quill.root.innerHTML = topic.notes || '';
                    quill.on('text-change', () => {
                        editNotes(sIndex, tIndex, quill.root.innerHTML);
                    });
                    State.editors[editorId] = quill;
                }
                if (topic.subtopicsVisible) {
                    renderSubtopics(sIndex, tIndex);
                    setupSubtopicDnD(sIndex, tIndex);
                }
            });
            setupTopicDnD(sIndex);
        }
    });
    setupSubjectDnD();
}

function bind() {
    const container = document.getElementById('tracker');
    if (container) {
        container.addEventListener('click', (e) => {
            if (e.target.id === 'addSubjectBtn') {
                addSubject();
            }
        });
        container.addEventListener('keydown', (e) => {
            if (e.target.id === 'subjectName' && e.key === 'Enter') {
                addSubject();
            }
        });
    }
}

export const Tracker = {
    render,
    bind,
    addSubject, deleteSubject, addTopic, deleteTopic, renameTopic, changeStatus, editReviews,
    setDifficulty, togglePin, editNotes, reviewTopic, safeReview, setSubjectSearch, setSort,
    toggleSortDir, setStatusFilter, setTagFilter, toggleTopics, clearFilters, toggleTag,
    addCustomTag, addGlobalTag, deleteGlobalTag, toggleTagManager, addAttachment, removeAttachment,
    addSubtopic, deleteSubtopic, editSubNote, renameSubtopic, toggleSubNote, toggleSectionVisibility,
    renderSubtopics, setupSubjectDnD, setupTopicDnD, toggleCustomSR, setCustomSR,
    promptEditCompletionDate, saveCompletionDate, hideCompletionDateModal, promptEditReviewDate,
    saveReviewDate, hideReviewDateModal, toggleSubtopicStatus
};
