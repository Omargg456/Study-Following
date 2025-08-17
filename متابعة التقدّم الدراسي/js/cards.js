// js/cards.js

import { U } from './utils.js';

// --- Private state for this module ---
const state = {
    subjects: [],
    view: 'groups', // 'groups', 'topics', 'flashcards', 'reviewSession'
    selectedSubjectId: null,
    selectedTopicId: null,
    modal: { isOpen: false, type: '', itemType: '', data: null },
    editors: {},
    review: {
        cards: [],
        currentIndex: 0,
        isFlipped: false,
        rated: false,
        counted: false, // لتتبع ما إذا تمت زيادة عداد المراجعة لهذه البطاقة في الجلسة الحالية
        subjectId: null, // تمت الإضافة لتحديد المادة الحالية في المراجعة
        topicId: null    // تمت الإضافة لتحديد الموضوع الحالي في المراجعة
    }
};

const uuid = () => (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
const STORAGE_KEY = 'studyTrackerApp-cards';
const SRS_INTERVALS = [1, 3, 7, 16, 35, 90]; // in days

// --- Data Persistence ---
function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.subjects));
    } catch (e) {
        console.error("فشل في حفظ بيانات البطاقات", e);
    }
}

function load() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            state.subjects = JSON.parse(saved);
        }
    } catch (e) {
        console.error("فشل في تحميل بيانات البطاقات", e);
    }
}

function handleInputKeyDown(e, callback) {
    if (e.key === 'Enter') {
        e.preventDefault();
        callback();
    }
}

// --- Difficulty Calculation ---
/**
 * تحسب هذه الدالة الصعوبة بناءً على عاملين:
 * 1.  التقييم (ratingFactor): تأثير طردي (صعب = 5، جيد = 3، سهل = 1).
 * 2.  عدد المراجعات (reviewDiscount): تأثير عكسي (كلما زادت المراجعات، قلّت الصعوبة).
 */
function calculateDifficulty(card) {
    if (!card) return 3;

    const ratingFactor = card.ratingsCount > 0
        ? (card.ratingsSum || 0) / card.ratingsCount
        : 3;

    const reviewDiscount = Math.min(2.5, (card.reviews || 0) * 0.25);

    const finalDifficulty = ratingFactor - reviewDiscount;

    return parseFloat(Math.max(1, Math.min(5, finalDifficulty)).toFixed(2));
}


// --- Navigation ---
function selectSubject(subject) { state.selectedSubjectId = subject.id; state.view = 'topics'; render(); }
function selectTopic(topic) { state.selectedTopicId = topic.id; state.view = 'flashcards'; render(); }
function backToSubjects() { state.selectedSubjectId = null; state.view = 'groups'; render(); }
function backToTopics() { state.selectedTopicId = null; state.view = 'topics'; closeModal(); render(); }

// --- CRUD Operations ---
function handleAddSubject() {
    const input = document.getElementById('newSubjectName');
    const name = input.value.trim();
    if (!name) return;
    state.subjects.push({ id: uuid(), name, topics: [] });
    input.value = '';
    save();
    render();
}

function handleAddTopic() {
    const input = document.getElementById('newTopicName');
    const name = input.value.trim();
    if (!name || !state.selectedSubjectId) return;
    state.subjects = state.subjects.map(s =>
        s.id === state.selectedSubjectId ?
        { ...s, topics: [...s.topics, { id: uuid(), name, flashcards: [] }] } :
        s
    );
    input.value = '';
    save();
    render();
}

function handleAddFlashcard() {
    const front = state.editors.newCardFront?.root.innerHTML || '';
    const back = state.editors.newCardBack?.root.innerHTML || '';
    if ((!front.trim() || front === '<p><br></p>') || (!back.trim() || back === '<p><br></p>')) {
        U.toast('الرجاء ملء وجهي البطاقة.');
        return;
    }
    const newCard = {
        id: uuid(),
        front,
        back,
        level: 0,
        reviews: 0,
        ratingsSum: 0,
        ratingsCount: 0,
        difficulty: 3,
        dueDate: new Date().toISOString()
    };
    state.subjects = state.subjects.map(s =>
        s.id !== state.selectedSubjectId ? s : {
            ...s,
            topics: s.topics.map(t =>
                t.id !== state.selectedTopicId ? t : {
                    ...t,
                    flashcards: [...t.flashcards, newCard]
                }
            )
        }
    );
    // Clear editors after adding
    state.editors.newCardFront.setText('');
    state.editors.newCardBack.setText('');
    save();
    render();
}

// --- Modal Logic ---
function openModal(type, itemType, data) { state.modal = { isOpen: true, type, itemType, data }; render(); }
function closeModal() { const modalEl = document.getElementById('cardsModal'); if (modalEl) modalEl.style.display = 'none'; state.modal = { isOpen: false, type: '', itemType: '', data: null }; }

function handleDelete() {
    const { itemType, data } = state.modal;
    if (!data) return;
    if (itemType === 'subject') {
        state.subjects = state.subjects.filter(s => s.id !== data.id);
    } else if (itemType === 'topic') {
        state.subjects = state.subjects.map(s =>
            s.id === state.selectedSubjectId ? { ...s, topics: s.topics.filter(t => t.id !== data.id) } : s
        );
    } else if (itemType === 'flashcard') {
        state.subjects = state.subjects.map(s => s.id !== state.selectedSubjectId ? s : {
            ...s,
            topics: s.topics.map(t =>
                t.id !== state.selectedTopicId ? t : { ...t, flashcards: t.flashcards.filter(fc => fc.id !== data.id) }
            )
        });
    }
    save();
    closeModal();
    render();
}

function handleEdit() {
    const { itemType, data } = state.modal;
    if (!data) return;
    if (itemType === 'subject') {
        const editText = document.getElementById('editText').value;
        state.subjects = state.subjects.map(s => s.id === data.id ? { ...s, name: editText } : s);
    } else if (itemType === 'topic') {
        const editText = document.getElementById('editText').value;
        state.subjects = state.subjects.map(s =>
            s.id === state.selectedSubjectId ? {
                ...s,
                topics: s.topics.map(t => t.id === data.id ? { ...t, name: editText } : t)
            } : s
        );
    } else if (itemType === 'flashcard') {
        const editCardFront = state.editors.editCardFront.root.innerHTML;
        const editCardBack = state.editors.editCardBack.root.innerHTML;
        state.subjects = state.subjects.map(s => s.id !== state.selectedSubjectId ? s : {
            ...s,
            topics: s.topics.map(t =>
                t.id !== state.selectedTopicId ? t : {
                    ...t,
                    flashcards: t.flashcards.map(fc =>
                        fc.id === data.id ? { ...fc, front: editCardFront, back: editCardBack } : fc
                    )
                }
            )
        });
    }
    save();
    closeModal();
    render();
}

// --- Review Session & SRS ---
// (تم التعديل) - هذه الدالة تسمح الآن بإعادة المراجعة مباشرة
function startReviewSession(topic, subjectId) {
    const now = new Date();
    // أولاً، نحاول الحصول على البطاقات المستحقة للمراجعة
    let cardsToReview = (topic.flashcards || []).filter(fc => new Date(fc.dueDate || 0) <= now);

    // إذا لم تكن هناك بطاقات مستحقة، ولكن الموضوع يحتوي على بطاقات، اسمح للمستخدم بمراجعتها كلها
    // هذا يسمح بإعادة المراجعة مباشرة بعد انتهاء الجلسة
    if (cardsToReview.length === 0 && (topic.flashcards || []).length > 0) {
        cardsToReview = [...(topic.flashcards || [])];
        U.toast('لا توجد بطاقات مستحقة. جاري بدء جلسة مراجعة لكل البطاقات.');
    }

    // إذا لم تكن هناك بطاقات على الإطلاق (الموضوع فارغ)، أظهر رسالة واخرج
    if (cardsToReview.length === 0) {
        U.toast('لا توجد بطاقات في هذا الموضوع للمراجعة.');
        return;
    }
    
    state.review.cards = [...cardsToReview].sort((a, b) => {
        const diffA = a.difficulty ?? calculateDifficulty(a);
        const diffB = b.difficulty ?? calculateDifficulty(b);
        return diffB - diffA;
    });

    state.review.currentIndex = 0;
    state.review.isFlipped = false;
    state.review.rated = false;
    state.review.counted = false;
    state.review.subjectId = subjectId; // حفظ معرّف المادة
    state.review.topicId = topic.id;   // حفظ معرّف الموضوع
    state.view = 'reviewSession';
    render();
}

// (تم الإصلاح) - هذه الدالة الآن تجد البطاقة الأصلية بشكل موثوق
function rateCard(rating) {
    const currentReviewCard = state.review.cards[state.review.currentIndex];
    if (!currentReviewCard || state.review.rated) return;

    state.review.rated = true;

    // البحث عن البطاقة الأصلية باستخدام المعرّفات المحفوظة
    let originalCard = null;
    const subject = state.subjects.find(s => s.id === state.review.subjectId);
    if (subject) {
        const topic = subject.topics.find(t => t.id === state.review.topicId);
        if (topic) {
            originalCard = topic.flashcards.find(fc => fc.id === currentReviewCard.id);
        }
    }

    if (!originalCard) {
        console.error("لم يتم العثور على البطاقة الأصلية لتحديثها!");
        return;
    }

    // تحديث نظام التكرار المتباعد (SRS)
    let level = originalCard.level || 0;
    if (rating === 'hard') { level = 0; }
    else if (rating === 'good') { level++; }
    else if (rating === 'easy') { level += 2; }
    level = Math.min(level, SRS_INTERVALS.length - 1);
    
    const daysToAdd = SRS_INTERVALS[level];
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + daysToAdd);

    // تحديث بيانات التقييم لحساب الصعوبة
    const ratingValue = (rating === 'hard') ? 5 : (rating === 'good' ? 3 : 1);
    const ratingsSum = (originalCard.ratingsSum || 0) + ratingValue;
    const ratingsCount = (originalCard.ratingsCount || 0) + 1;

    // بناء البيانات المحدثة للبطاقة
    const updatedCardData = {
        ...originalCard,
        level,
        dueDate: newDueDate.toISOString(),
        ratingsSum,
        ratingsCount,
    };

    // حساب الصعوبة الجديدة بناءً على البيانات المحدثة
    updatedCardData.difficulty = calculateDifficulty(updatedCardData);

    // دمج البيانات المحدثة مع البطاقة الأصلية وبطاقة المراجعة
    Object.assign(originalCard, updatedCardData);
    Object.assign(currentReviewCard, updatedCardData);

    save();
    render();
}

// (تم الإصلاح) - هذه الدالة الآن تجد البطاقة الأصلية بشكل موثوق
function flipReviewCard() {
    state.review.isFlipped = !state.review.isFlipped;
    
    if (state.review.isFlipped && !state.review.counted) {
        const reviewCard = state.review.cards[state.review.currentIndex];
        if (!reviewCard) return;

        // البحث عن البطاقة الأصلية باستخدام المعرّفات المحفوظة
        let originalCard = null;
        const subject = state.subjects.find(s => s.id === state.review.subjectId);
        if (subject) {
            const topic = subject.topics.find(t => t.id === state.review.topicId);
            if (topic) {
                originalCard = topic.flashcards.find(fc => fc.id === reviewCard.id);
            }
        }
        
        if (originalCard) {
            const newReviewCount = (originalCard.reviews || 0) + 1;
            const updatedCardData = { reviews: newReviewCount };
            
            // ندمج البيانات الجديدة مع القديمة لحساب الصعوبة
            const tempCardForCalc = { ...originalCard, ...updatedCardData };
            updatedCardData.difficulty = calculateDifficulty(tempCardForCalc);
            
            // تحديث البطاقة الأصلية وبطاقة المراجعة الحالية
            Object.assign(originalCard, updatedCardData);
            Object.assign(reviewCard, updatedCardData);
            
            state.review.counted = true;
            save();
        } else {
             console.error("FlipReviewCard: لم يتم العثور على البطاقة الأصلية لتحديثها!");
        }
    }
    
    render();
}

function showNextCard() {
    if (state.review.currentIndex < state.review.cards.length - 1) {
        state.review.currentIndex++;
        state.review.isFlipped = false;
        state.review.rated = false;
        state.review.counted = false;
        render();
    }
}

function showPrevCard() {
    if (state.review.currentIndex > 0) {
        state.review.currentIndex--;
        state.review.isFlipped = false;
        state.review.rated = false;
        state.review.counted = false;
        render();
    }
}

// --- Render Functions ---
function renderSubjects() {
    const subjects = state.subjects;
    return `
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold">المواد الدراسية للبطاقات</h1>
        </div>
        <div class="card bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
            <label class="block text-gray-500 dark:text-gray-400 mb-2">إضافة مادة جديدة</label>
            <input id="newSubjectName" class="w-full p-3 bg-white dark:bg-gray-700 rounded-lg" placeholder="اسم المادة">
            <button onclick="App.Cards.handleAddSubject()" class="mt-3 btn btn-primary">إضافة</button>
        </div>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            ${subjects.length > 0 ? subjects.map(s => `
                <div key="${s.id}" class="card bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xl font-semibold">${s.name}</h3>
                        <div class="flex gap-2">
                            <button data-action="edit" data-type="subject" data-id="${s.id}" class="btn btn-ghost">تعديل</button>
                            <button data-action="delete" data-type="subject" data-id="${s.id}" class="btn btn-danger">حذف</button>
                        </div>
                    </div>
                    <button data-action="select-subject" data-id="${s.id}" class="mt-3 btn btn-primary">المواضيع (${(s.topics || []).length})</button>
                </div>
            `).join('') : '<p class="text-gray-500 dark:text-gray-400">لا توجد مواد. أضف واحدة لتبدأ.</p>'}
        </div>
    `;
}

function renderTopics() {
    const selectedSubject = state.subjects.find(s => s.id === state.selectedSubjectId);
    if (!selectedSubject) return '<div>لم يتم العثور على المادة.</div>';
    const topics = selectedSubject.topics || [];
    return `
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-bold">المواضيع في: ${selectedSubject.name}</h1>
            <button onclick="App.Cards.backToSubjects()" class="btn btn-ghost">رجوع للمواد</button>
        </div>
        <div class="card bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
            <label class="block text-gray-500 dark:text-gray-400 mb-2">إضافة موضوع جديد</label>
            <input id="newTopicName" class="w-full p-3 bg-white dark:bg-gray-700 rounded-lg" placeholder="اسم الموضوع">
            <button onclick="App.Cards.handleAddTopic()" class="mt-3 btn btn-primary">إضافة</button>
        </div>
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            ${topics.length > 0 ? topics.map(t => `
                <div key="${t.id}" class="card bg-white dark:bg-gray-800 p-4 rounded-lg">
                    <div class="flex items-center justify-between">
                        <h3 class="text-xl font-semibold">${t.name}</h3>
                        <div class="flex gap-2">
                            <button data-action="edit" data-type="topic" data-id="${t.id}" class="btn btn-ghost">تعديل</button>
                            <button data-action="delete" data-type="topic" data-id="${t.id}" class="btn btn-danger">حذف</button>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button data-action="select-topic" data-id="${t.id}" class="btn btn-primary">البطاقات (${(t.flashcards || []).length})</button>
                        <button data-action="start-review" data-id="${t.id}" class="btn btn-green" ${(t.flashcards || []).length === 0 ? 'disabled' : ''}>
                            مراجعة
                        </button>
                    </div>
                </div>
            `).join('') : '<p class="text-gray-500 dark:text-gray-400">لا توجد مواضيع في هذه المادة.</p>'}
        </div>
    `;
}

function renderFlashcards() {
    const subject = state.subjects.find(s => s.id === state.selectedSubjectId);
    const topic = subject?.topics.find(t => t.id === state.selectedTopicId);
    if (!topic) return '<div>لم يتم العثور على الموضوع.</div>';
    const flashcards = topic.flashcards || [];
    return `
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-bold">بطاقات: ${topic.name}</h1>
            <button onclick="App.Cards.backToTopics()" class="btn btn-ghost">رجوع للمواضيع</button>
        </div>
        <div class="card bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
            <h3 class="text-lg font-semibold mb-2">إضافة بطاقة جديدة</h3>
            <div class="space-y-3">
                <div><label class="block text-sm mb-1">الوجه الأمامي:</label><div id="newCardFrontEditor"></div></div>
                <div><label class="block text-sm mb-1">الوجه الخلفي:</label><div id="newCardBackEditor"></div></div>
                <button onclick="App.Cards.handleAddFlashcard()" class="btn btn-primary w-full">إضافة البطاقة</button>
            </div>
        </div>
        <h3 class="text-lg font-semibold mb-2">البطاقات الحالية (${flashcards.length})</h3>
        <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            ${flashcards.map(fc => {
                const difficulty = fc.difficulty ?? calculateDifficulty(fc);
                return `
                <div class="card bg-white dark:bg-gray-800 p-4 rounded-lg space-y-3">
                    <div class="badges">
                        <span class="badge">عدد المراجعات <b>${fc.reviews||0}</b></span>
                        <span class="badge">الصعوبة <b>${difficulty}/5</b></span>
                    </div>
                    <div class="flashcard-container" data-action="flip-card">
                        <div class="flashcard-inner">
                            <div class="flashcard-front"><div class="ql-editor-content">${fc.front}</div></div>
                            <div class="flashcard-back"><div class="ql-editor-content">${fc.back}</div></div>
                        </div>
                    </div>
                    <div class="text-sm font-semibold text-gray-600 dark:text-gray-400 border-t dark:border-gray-700 pt-3 mt-3 space-y-1">
                        <p>🗓️ <span class="font-mono">${new Date(fc.dueDate || 0).toLocaleDateString('ar-EG')}</span> تاريخ الاستحقاق</p>
                    </div>
                    <div class="flex gap-2 justify-end">
                        <button data-action="edit" data-type="flashcard" data-id="${fc.id}" class="btn btn-ghost">تعديل</button>
                        <button data-action="delete" data-type="flashcard" data-id="${fc.id}" class="btn btn-danger">حذف</button>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

function renderReviewSession() {
    const card = state.review.cards[state.review.currentIndex];
    if (!card) {
        // تأخير بسيط قبل العودة لضمان رؤية المستخدم لرسالة الانتهاء
        setTimeout(backToTopics, 1000);
        return '<div class="text-center text-2xl font-bold p-8">🎉 انتهت جلسة المراجعة!</div>';
    }
    
    const isFlippedClass = state.review.isFlipped ? 'is-flipped' : '';
    const difficulty = card.difficulty ?? calculateDifficulty(card);
    const atLast = state.review.currentIndex === state.review.cards.length - 1;
    const canFinish = atLast && state.review.isFlipped && state.review.rated;

    const controlsHTML = `
      <div class="flex flex-col items-center gap-3 mt-6">
        <div class="flex items-center gap-3">
          <button data-action="prev-card" class="btn btn-ghost px-6 py-2" ${state.review.currentIndex === 0 ? 'disabled' : ''}>
            ◀︎ السابقة
          </button>

          ${!state.review.isFlipped
            ? `<button data-action="show-answer" class="btn btn-primary px-8 py-3">إظهار الإجابة</button>`
            : `<div class="w-[150px] text-center"></div>`
          }

          <button data-action="next-card" class="btn btn-primary px-6 py-2" ${atLast ? 'disabled' : ''}>
            التالية ▶︎
          </button>
        </div>

        ${state.review.isFlipped ? `
          <div class="flex items-center gap-3 mt-3">
            <p class="font-semibold">ما مدى سهولة تذكرك؟</p>
            <button data-action="rate-card" data-rating="hard" class="btn btn-danger px-6 py-3" ${state.review.rated ? 'disabled' : ''}>صعب</button>
            <button data-action="rate-card" data-rating="good" class="btn btn-accent px-6 py-3" ${state.review.rated ? 'disabled' : ''}>جيد</button>
            <button data-action="rate-card" data-rating="easy" class="btn btn-green px-6 py-3" ${state.review.rated ? 'disabled' : ''}>سهل</button>
          </div>
        ` : ``}

        ${canFinish ? `<button data-action="finish-review" class="btn btn-green mt-4 px-8 py-3">تم ✔︎ إنهاء الجلسة</button>` : ``}
      </div>
    `;

    return `
        <div class="flex items-center justify-between mb-4">
            <h1 class="text-2xl font-bold">جلسة مراجعة</h1>
            <button data-action="finish-review" class="btn btn-ghost">العودة للمواضيع</button>
        </div>
        <div class="max-w-3xl mx-auto">
            <p class="text-center mb-2">البطاقة ${state.review.currentIndex + 1} من ${state.review.cards.length}</p>
            <div class="badges justify-center">
              <span class="badge">عدد المراجعات <b>${(card.reviews||0)}</b></span>
              <span class="badge">الصعوبة <b>${difficulty}/5</b></span>
            </div>
            <div id="reviewCardContainer" class="flashcard-container ${isFlippedClass}" data-action="flip-review-card">
                <div class="flashcard-inner">
                    <div class="flashcard-front"><div class="ql-editor-content">${card.front}</div></div>
                    <div class="flashcard-back"><div class="ql-editor-content">${card.back}</div></div>
                </div>
            </div>
            ${controlsHTML}
        </div>
    `;
}

function renderModal() {
    const modalEl = document.getElementById('cardsModal');
    if (!modalEl) return;

    if (!state.modal.isOpen) {
        modalEl.style.display = 'none';
        return;
    }
    
    const { type, itemType, data } = state.modal;
    let title = '', body = '';

    if (type === 'delete') {
        title = 'تأكيد الحذف';
        body = `
            <p>هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div class="flex justify-end gap-2 mt-4">
                <button onclick="App.Cards.closeModal()" class="btn btn-ghost">إلغاء</button>
                <button onclick="App.Cards.handleDelete()" class="btn btn-danger">حذف</button>
            </div>
        `;
    } else if (type === 'edit') {
        title = 'تعديل العنصر';
        if (itemType === 'flashcard') {
            body = `
                <div class="space-y-3">
                    <div><label class="block text-sm mb-1">الوجه الأمامي:</label><div id="editCardFrontEditor"></div></div>
                    <div><label class="block text-sm mb-1">الوجه الخلفي:</label><div id="editCardBackEditor"></div></div>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button onclick="App.Cards.closeModal()" class="btn btn-ghost">إلغاء</button>
                    <button onclick="App.Cards.handleEdit()" class="btn btn-primary">حفظ التعديلات</button>
                </div>
            `;
        } else {
            body = `
                <input id="editText" type="text" class="w-full p-2 border dark:border-gray-700 bg-white dark:bg-gray-900 rounded" value="${data.name}">
                <div class="flex justify-end gap-2 mt-4">
                    <button onclick="App.Cards.closeModal()" class="btn btn-ghost">إلغاء</button>
                    <button onclick="App.Cards.handleEdit()" class="btn btn-primary">حفظ</button>
                </div>
            `;
        }
    }
    
    const modalContentContainer = modalEl.querySelector('.modal-content');
    if (!modalContentContainer) return;

    modalContentContainer.innerHTML = `
        <h3 class="text-xl font-bold mb-4">${title}</h3>
        ${body}
    `;
    modalEl.style.display = 'flex';
}

function setupQuillEditors() {
    const quillToolbarOptions = [
        [{ 'header': [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        ['clean']
    ];
    
    if (state.view === 'flashcards' && document.getElementById('newCardFrontEditor')) {
        state.editors.newCardFront = new Quill('#newCardFrontEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions }, placeholder: 'محتوى الوجه الأمامي...' });
        state.editors.newCardBack = new Quill('#newCardBackEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions }, placeholder: 'محتوى الوجه الخلفي...' });
    }

    if (state.modal.isOpen && state.modal.type === 'edit' && state.modal.itemType === 'flashcard') {
        if (document.getElementById('editCardFrontEditor')) {
            state.editors.editCardFront = new Quill('#editCardFrontEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions } });
            state.editors.editCardFront.root.innerHTML = state.modal.data.front;
        }
        if (document.getElementById('editCardBackEditor')) {
            state.editors.editCardBack = new Quill('#editCardBackEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions } });
            state.editors.editCardBack.root.innerHTML = state.modal.data.back;
        }
    }
}

// (تم التعديل) - تعديل بسيط في معالج الأحداث لتمرير معرّف المادة
function bindEvents(container) {
    container.addEventListener('click', (e) => {
        const target = e.target;
        const button = target.closest('button[data-action]');
        const cardContainer = target.closest('.flashcard-container[data-action]');

        if (button) {
            e.preventDefault();
            const { action, id, type, rating } = button.dataset;
            
            if (action === 'select-subject') {
                const subject = state.subjects.find(s => s.id === id);
                if (subject) selectSubject(subject);
            } else if (action === 'select-topic') {
                const subject = state.subjects.find(s => s.id === state.selectedSubjectId);
                const topic = subject?.topics.find(t => t.id === id);
                if (topic) selectTopic(topic);
            } else if (action === 'start-review') {
                const subjectId = state.selectedSubjectId; // نحصل على معرّف المادة الحالي
                const subject = state.subjects.find(s => s.id === subjectId);
                const topic = subject?.topics.find(t => t.id === id);
                if (topic) startReviewSession(topic, subjectId); // نمرره للدالة
            } else if (action === 'delete' || action === 'edit') {
                let data;
                if (type === 'subject') data = state.subjects.find(s => s.id === id);
                else if (type === 'topic') {
                    const subject = state.subjects.find(s => s.id === state.selectedSubjectId);
                    data = subject?.topics.find(t => t.id === id);
                } else if (type === 'flashcard') {
                    const subject = state.subjects.find(s => s.id === state.selectedSubjectId);
                    const topic = subject?.topics.find(t => t.id === state.selectedTopicId);
                    data = topic?.flashcards.find(fc => fc.id === id);
                }
                if (data) openModal(action, type, data);
            } else if (action === 'rate-card' && rating) {
                rateCard(rating);
            } else if (action === 'next-card') {
                showNextCard();
            } else if (action === 'prev-card') {
                showPrevCard();
            } else if (action === 'show-answer') {
                flipReviewCard();
            } else if (action === 'finish-review') {
                backToTopics();
            }
        } else if (cardContainer) {
            const action = cardContainer.dataset.action;
            if (action === 'flip-card') {
                cardContainer.querySelector('.flashcard-inner').classList.toggle('is-flipped');
            } else if (action === 'flip-review-card') {
                flipReviewCard();
            }
        }
    });
    
    container.addEventListener('keydown', (e) => {
        if (e.target.id === 'newSubjectName') handleInputKeyDown(e, handleAddSubject);
        else if (e.target.id === 'newTopicName') handleInputKeyDown(e, handleAddTopic);
    });
}

function render() {
    const container = document.getElementById('cardsPage');
    if (!container) return;

    state.editors = {};

    let content = '';
    switch (state.view) {
        case 'topics': content = renderTopics(); break;
        case 'flashcards': content = renderFlashcards(); break;
        case 'reviewSession': content = renderReviewSession(); break;
        default: content = renderSubjects();
    }
    
    container.innerHTML = content;
    
    if (!document.getElementById('cardsModalContent')) {
        const modalContainer = document.getElementById('cardsModal');
        if (modalContainer) {
            modalContainer.innerHTML = `<div class="modal-content card bg-white dark:bg-gray-800 p-5 rounded-lg w-full max-w-2xl" id="cardsModalContent"></div>`;
            modalContainer.addEventListener('click', (e) => {
                if (e.target.id === 'cardsModal') closeModal();
            });
        }
    }
    
    renderModal();
    setupQuillEditors();
}

let eventsBound = false;
function init() {
    load();
    if (!eventsBound) {
        const container = document.getElementById('cardsPage');
        if (container) {
            bindEvents(container);
            eventsBound = true;
        }
    }
}

export const Cards = {
    init,
    render,
    handleAddSubject,
    handleAddTopic,
    handleAddFlashcard,
    backToTopics,
    backToSubjects,
    closeModal,
    handleDelete,
    handleEdit,
};
