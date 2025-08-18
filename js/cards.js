// js/cards.js

// --- (إصلاح نهائي: دمج كامل مع نظام الملفات الشخصية) ---
import { State, SAVE } from './state.js';
import { U } from './utils.js';

// --- حالة واجهة المستخدم لهذه الوحدة فقط (لا يتم حفظها) ---
const uiState = {
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
        counted: false,
        subjectId: null,
        topicId: null
    }
};

// --- (جديد) متغير لتتبع الملف الشخصي الذي تم عرضه ---
let lastRenderedProfileId = null;

const uuid = () => (crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
const SRS_INTERVALS = [1, 3, 7, 16, 35, 90]; // in days

function handleInputKeyDown(e, callback) {
    if (e.key === 'Enter') {
        e.preventDefault();
        callback();
    }
}

function calculateDifficulty(card) {
    if (!card) return 3;
    const ratingFactor = card.ratingsCount > 0 ? (card.ratingsSum || 0) / card.ratingsCount : 3;
    const reviewDiscount = Math.min(2.5, (card.reviews || 0) * 0.25);
    const finalDifficulty = ratingFactor - reviewDiscount;
    return parseFloat(Math.max(1, Math.min(5, finalDifficulty)).toFixed(2));
}

// --- Navigation ---
function selectSubject(subject) { uiState.selectedSubjectId = subject.id; uiState.view = 'topics'; render(); }
function selectTopic(topic) { uiState.selectedTopicId = topic.id; uiState.view = 'flashcards'; render(); }
function backToSubjects() { uiState.selectedSubjectId = null; uiState.view = 'groups'; render(); }
function backToTopics() { uiState.selectedTopicId = null; uiState.view = 'topics'; closeModal(); render(); }

// --- CRUD Operations (تم إصلاحها لتعمل بطريقة آمنة مع State) ---
function handleAddSubject() {
    const input = document.getElementById('newSubjectName');
    const name = input.value.trim();
    if (!name) return;
    if (!Array.isArray(State.cardSubjects)) {
        State.cardSubjects = [];
    }
    State.cardSubjects.push({ id: uuid(), name, topics: [] });
    input.value = '';
    SAVE.data();
    render();
}

function handleAddTopic() {
    const input = document.getElementById('newTopicName');
    const name = input.value.trim();
    if (!name || !uiState.selectedSubjectId) return;

    State.cardSubjects = State.cardSubjects.map(subject => {
        if (subject.id === uiState.selectedSubjectId) {
            const newTopics = [...(subject.topics || []), { id: uuid(), name, flashcards: [] }];
            return { ...subject, topics: newTopics };
        }
        return subject;
    });

    input.value = '';
    SAVE.data();
    render();
}

function handleAddFlashcard() {
    const front = uiState.editors.newCardFront?.root.innerHTML || '';
    const back = uiState.editors.newCardBack?.root.innerHTML || '';
    if ((!front.trim() || front === '<p><br></p>') || (!back.trim() || back === '<p><br></p>')) {
        U.toast('الرجاء ملء وجهي البطاقة.');
        return;
    }
    const newCard = {
        id: uuid(), front, back, level: 0, reviews: 0, ratingsSum: 0,
        ratingsCount: 0, difficulty: 3, dueDate: new Date().toISOString()
    };
    
    State.cardSubjects = State.cardSubjects.map(subject => {
        if (subject.id === uiState.selectedSubjectId) {
            return {
                ...subject,
                topics: subject.topics.map(topic => {
                    if (topic.id === uiState.selectedTopicId) {
                        const newFlashcards = [...(topic.flashcards || []), newCard];
                        return { ...topic, flashcards: newFlashcards };
                    }
                    return topic;
                })
            };
        }
        return subject;
    });

    uiState.editors.newCardFront.setText('');
    uiState.editors.newCardBack.setText('');
    SAVE.data();
    render();
}

// --- Modal Logic ---
function openModal(type, itemType, data) { uiState.modal = { isOpen: true, type, itemType, data }; render(); }
function closeModal() { const modalEl = document.getElementById('cardsModal'); if (modalEl) modalEl.style.display = 'none'; uiState.modal = { isOpen: false, type: '', itemType: '', data: null }; }

function handleDelete() {
    const { itemType, data } = uiState.modal;
    if (!data) return;

    if (itemType === 'subject') {
        State.cardSubjects = State.cardSubjects.filter(s => s.id !== data.id);
    } else if (itemType === 'topic') {
        State.cardSubjects = State.cardSubjects.map(s => {
            if (s.id === uiState.selectedSubjectId) {
                return { ...s, topics: s.topics.filter(t => t.id !== data.id) };
            }
            return s;
        });
    } else if (itemType === 'flashcard') {
        State.cardSubjects = State.cardSubjects.map(s => {
            if (s.id === uiState.selectedSubjectId) {
                return {
                    ...s,
                    topics: s.topics.map(t => {
                        if (t.id === uiState.selectedTopicId) {
                            return { ...t, flashcards: t.flashcards.filter(fc => fc.id !== data.id) };
                        }
                        return t;
                    })
                };
            }
            return s;
        });
    }
    SAVE.data();
    closeModal();
    render();
}

function handleEdit() {
    const { itemType, data } = uiState.modal;
    if (!data) return;

    if (itemType === 'subject') {
        const editText = document.getElementById('editText').value;
        State.cardSubjects = State.cardSubjects.map(s => s.id === data.id ? { ...s, name: editText } : s);
    } else if (itemType === 'topic') {
        const editText = document.getElementById('editText').value;
        State.cardSubjects = State.cardSubjects.map(s => {
            if (s.id === uiState.selectedSubjectId) {
                return { ...s, topics: s.topics.map(t => t.id === data.id ? { ...t, name: editText } : t) };
            }
            return s;
        });
    } else if (itemType === 'flashcard') {
        const editCardFront = uiState.editors.editCardFront.root.innerHTML;
        const editCardBack = uiState.editors.editCardBack.root.innerHTML;
        State.cardSubjects = State.cardSubjects.map(s => {
            if (s.id === uiState.selectedSubjectId) {
                return {
                    ...s,
                    topics: s.topics.map(t => {
                        if (t.id === uiState.selectedTopicId) {
                            return {
                                ...t,
                                flashcards: t.flashcards.map(fc => fc.id === data.id ? { ...fc, front: editCardFront, back: editCardBack } : fc)
                            };
                        }
                        return t;
                    })
                };
            }
            return s;
        });
    }
    SAVE.data();
    closeModal();
    render();
}

// --- Review Session & SRS ---
function startReviewSession(topic, subjectId) {
    const now = new Date();
    let cardsToReview = (topic.flashcards || []).filter(fc => new Date(fc.dueDate || 0) <= now);

    if (cardsToReview.length === 0 && (topic.flashcards || []).length > 0) {
        cardsToReview = [...(topic.flashcards || [])];
        U.toast('لا توجد بطاقات مستحقة. جاري بدء جلسة مراجعة لكل البطاقات.');
    }

    if (cardsToReview.length === 0) {
        U.toast('لا توجد بطاقات في هذا الموضوع للمراجعة.');
        return;
    }
    
    uiState.review.cards = [...cardsToReview].sort((a, b) => (b.difficulty ?? 3) - (a.difficulty ?? 3));
    uiState.review.currentIndex = 0;
    uiState.review.isFlipped = false;
    uiState.review.rated = false;
    uiState.review.counted = false;
    uiState.review.subjectId = subjectId;
    uiState.review.topicId = topic.id;
    uiState.view = 'reviewSession';
    render();
}

function rateCard(rating) {
    const currentReviewCard = uiState.review.cards[uiState.review.currentIndex];
    if (!currentReviewCard || uiState.review.rated) return;

    uiState.review.rated = true;

    let originalCard;
    State.cardSubjects = State.cardSubjects.map(subject => {
        if (subject.id === uiState.review.subjectId) {
            return {
                ...subject,
                topics: subject.topics.map(topic => {
                    if (topic.id === uiState.review.topicId) {
                        return {
                            ...topic,
                            flashcards: topic.flashcards.map(card => {
                                if (card.id === currentReviewCard.id) {
                                    let level = card.level || 0;
                                    if (rating === 'hard') { level = 0; }
                                    else if (rating === 'good') { level++; }
                                    else if (rating === 'easy') { level += 2; }
                                    level = Math.min(level, SRS_INTERVALS.length - 1);
                                    
                                    const daysToAdd = SRS_INTERVALS[level];
                                    const newDueDate = new Date();
                                    newDueDate.setDate(newDueDate.getDate() + daysToAdd);

                                    const ratingValue = (rating === 'hard') ? 5 : (rating === 'good' ? 3 : 1);
                                    const ratingsSum = (card.ratingsSum || 0) + ratingValue;
                                    const ratingsCount = (card.ratingsCount || 0) + 1;

                                    const updatedCardData = { ...card, level, dueDate: newDueDate.toISOString(), ratingsSum, ratingsCount };
                                    updatedCardData.difficulty = calculateDifficulty(updatedCardData);
                                    
                                    originalCard = updatedCardData;
                                    return updatedCardData;
                                }
                                return card;
                            })
                        };
                    }
                    return topic;
                })
            };
        }
        return subject;
    });

    if (originalCard) {
        Object.assign(currentReviewCard, originalCard);
    }
    
    SAVE.data();
    render();
}

function flipReviewCard() {
    uiState.review.isFlipped = !uiState.review.isFlipped;
    
    if (uiState.review.isFlipped && !uiState.review.counted) {
        const reviewCard = uiState.review.cards[uiState.review.currentIndex];
        if (!reviewCard) return;

        let originalCard;
        State.cardSubjects = State.cardSubjects.map(subject => {
            if (subject.id === uiState.review.subjectId) {
                return {
                    ...subject,
                    topics: subject.topics.map(topic => {
                        if (topic.id === uiState.review.topicId) {
                             return {
                                ...topic,
                                flashcards: topic.flashcards.map(card => {
                                    if (card.id === reviewCard.id) {
                                        const newReviewCount = (card.reviews || 0) + 1;
                                        const updatedCardData = { ...card, reviews: newReviewCount };
                                        updatedCardData.difficulty = calculateDifficulty(updatedCardData);
                                        originalCard = updatedCardData;
                                        return updatedCardData;
                                    }
                                    return card;
                                })
                             };
                        }
                        return topic;
                    })
                };
            }
            return subject;
        });
        
        if (originalCard) {
            Object.assign(reviewCard, originalCard);
            uiState.review.counted = true;
            SAVE.data();
        }
    }
    render();
}

function showNextCard() {
    if (uiState.review.currentIndex < uiState.review.cards.length - 1) {
        uiState.review.currentIndex++;
        uiState.review.isFlipped = false;
        uiState.review.rated = false;
        uiState.review.counted = false;
        render();
    }
}

function showPrevCard() {
    if (uiState.review.currentIndex > 0) {
        uiState.review.currentIndex--;
        uiState.review.isFlipped = false;
        uiState.review.rated = false;
        uiState.review.counted = false;
        render();
    }
}

// --- Render Functions (تقرأ الآن من State و uiState) ---
function renderSubjects() {
    const subjects = State.cardSubjects || [];
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
    const selectedSubject = (State.cardSubjects || []).find(s => s.id === uiState.selectedSubjectId);
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
    const subject = (State.cardSubjects || []).find(s => s.id === uiState.selectedSubjectId);
    const topic = subject?.topics.find(t => t.id === uiState.selectedTopicId);
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
            ${flashcards.map(fc => `
                <div class="card bg-white dark:bg-gray-800 p-4 rounded-lg space-y-3">
                    <div class="badges"><span class="badge">عدد المراجعات <b>${fc.reviews||0}</b></span><span class="badge">الصعوبة <b>${fc.difficulty ?? 3}/5</b></span></div>
                    <div class="flashcard-container" data-action="flip-card"><div class="flashcard-inner">
                        <div class="flashcard-front"><div class="ql-editor-content">${fc.front}</div></div>
                        <div class="flashcard-back"><div class="ql-editor-content">${fc.back}</div></div>
                    </div></div>
                    <div class="text-sm font-semibold text-gray-600 dark:text-gray-400 border-t dark:border-gray-700 pt-3 mt-3 space-y-1"><p>🗓️ <span class="font-mono">${new Date(fc.dueDate || 0).toLocaleDateString('ar-EG')}</span> تاريخ الاستحقاق</p></div>
                    <div class="flex gap-2 justify-end">
                        <button data-action="edit" data-type="flashcard" data-id="${fc.id}" class="btn btn-ghost">تعديل</button>
                        <button data-action="delete" data-type="flashcard" data-id="${fc.id}" class="btn btn-danger">حذف</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderReviewSession() {
    const card = uiState.review.cards[uiState.review.currentIndex];
    if (!card) {
        setTimeout(backToTopics, 1000);
        return '<div class="text-center text-2xl font-bold p-8">🎉 انتهت جلسة المراجعة!</div>';
    }
    
    const isFlippedClass = uiState.review.isFlipped ? 'is-flipped' : '';
    const atLast = uiState.review.currentIndex === uiState.review.cards.length - 1;
    const canFinish = atLast && uiState.review.isFlipped && uiState.review.rated;

    return `
        <div class="flex items-center justify-between mb-4">
            <h1 class="text-2xl font-bold">جلسة مراجعة</h1>
            <button data-action="finish-review" class="btn btn-ghost">العودة للمواضيع</button>
        </div>
        <div class="max-w-3xl mx-auto">
            <p class="text-center mb-2">البطاقة ${uiState.review.currentIndex + 1} من ${uiState.review.cards.length}</p>
            <div class="badges justify-center"><span class="badge">عدد المراجعات <b>${(card.reviews||0)}</b></span><span class="badge">الصعوبة <b>${card.difficulty ?? 3}/5</b></span></div>
            <div id="reviewCardContainer" class="flashcard-container ${isFlippedClass}" data-action="flip-review-card">
                <div class="flashcard-inner">
                    <div class="flashcard-front"><div class="ql-editor-content">${card.front}</div></div>
                    <div class="flashcard-back"><div class="ql-editor-content">${card.back}</div></div>
                </div>
            </div>
            <div class="flex flex-col items-center gap-3 mt-6">
                <div class="flex items-center gap-3">
                    <button data-action="prev-card" class="btn btn-ghost px-6 py-2" ${uiState.review.currentIndex === 0 ? 'disabled' : ''}>◀︎ السابقة</button>
                    ${!uiState.review.isFlipped ? `<button data-action="show-answer" class="btn btn-primary px-8 py-3">إظهار الإجابة</button>` : `<div class="w-[150px] text-center"></div>`}
                    <button data-action="next-card" class="btn btn-primary px-6 py-2" ${atLast ? 'disabled' : ''}>التالية ▶︎</button>
                </div>
                ${uiState.review.isFlipped ? `<div class="flex items-center gap-3 mt-3"><p class="font-semibold">ما مدى سهولة تذكرك؟</p><button data-action="rate-card" data-rating="hard" class="btn btn-danger px-6 py-3" ${uiState.review.rated ? 'disabled' : ''}>صعب</button><button data-action="rate-card" data-rating="good" class="btn btn-accent px-6 py-3" ${uiState.review.rated ? 'disabled' : ''}>جيد</button><button data-action="rate-card" data-rating="easy" class="btn btn-green px-6 py-3" ${uiState.review.rated ? 'disabled' : ''}>سهل</button></div>` : ``}
                ${canFinish ? `<button data-action="finish-review" class="btn btn-green mt-4 px-8 py-3">تم ✔︎ إنهاء الجلسة</button>` : ``}
            </div>
        </div>
    `;
}

function renderModal() {
    const modalEl = document.getElementById('cardsModal');
    if (!modalEl || !uiState.modal.isOpen) {
        if (modalEl) modalEl.style.display = 'none';
        return;
    }
    
    const { type, itemType, data } = uiState.modal;
    let title = '', body = '';

    if (type === 'delete') {
        title = 'تأكيد الحذف';
        body = `<p>هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.</p><div class="flex justify-end gap-2 mt-4"><button onclick="App.Cards.closeModal()" class="btn btn-ghost">إلغاء</button><button onclick="App.Cards.handleDelete()" class="btn btn-danger">حذف</button></div>`;
    } else if (type === 'edit') {
        title = 'تعديل العنصر';
        if (itemType === 'flashcard') {
            body = `<div class="space-y-3"><div><label class="block text-sm mb-1">الوجه الأمامي:</label><div id="editCardFrontEditor"></div></div><div><label class="block text-sm mb-1">الوجه الخلفي:</label><div id="editCardBackEditor"></div></div></div><div class="flex justify-end gap-2 mt-4"><button onclick="App.Cards.closeModal()" class="btn btn-ghost">إلغاء</button><button onclick="App.Cards.handleEdit()" class="btn btn-primary">حفظ التعديلات</button></div>`;
        } else {
            body = `<input id="editText" type="text" class="w-full p-2 border dark:border-gray-700 bg-white dark:bg-gray-900 rounded" value="${data.name}"><div class="flex justify-end gap-2 mt-4"><button onclick="App.Cards.closeModal()" class="btn btn-ghost">إلغاء</button><button onclick="App.Cards.handleEdit()" class="btn btn-primary">حفظ</button></div>`;
        }
    }
    
    modalEl.querySelector('.modal-content').innerHTML = `<h3 class="text-xl font-bold mb-4">${title}</h3>${body}`;
    modalEl.style.display = 'flex';
}

function setupQuillEditors() {
    const quillToolbarOptions = [[{ 'header': [1, 2, false] }], ['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'color': [] }, { 'background': [] }], ['clean']];
    
    if (uiState.view === 'flashcards' && document.getElementById('newCardFrontEditor')) {
        uiState.editors.newCardFront = new Quill('#newCardFrontEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions }, placeholder: 'محتوى الوجه الأمامي...' });
        uiState.editors.newCardBack = new Quill('#newCardBackEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions }, placeholder: 'محتوى الوجه الخلفي...' });
    }

    if (uiState.modal.isOpen && uiState.modal.type === 'edit' && uiState.modal.itemType === 'flashcard') {
        if (document.getElementById('editCardFrontEditor')) {
            uiState.editors.editCardFront = new Quill('#editCardFrontEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions } });
            uiState.editors.editCardFront.root.innerHTML = uiState.modal.data.front;
        }
        if (document.getElementById('editCardBackEditor')) {
            uiState.editors.editCardBack = new Quill('#editCardBackEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions } });
            uiState.editors.editCardBack.root.innerHTML = uiState.modal.data.back;
        }
    }
}

function bindEvents(container) {
    container.addEventListener('click', (e) => {
        const target = e.target;
        const button = target.closest('button[data-action]');
        const cardContainer = target.closest('.flashcard-container[data-action]');

        if (button) {
            e.preventDefault();
            const { action, id, type, rating } = button.dataset;
            
            if (action === 'select-subject') {
                const subject = (State.cardSubjects || []).find(s => s.id === id);
                if (subject) selectSubject(subject);
            } else if (action === 'select-topic') {
                const subject = (State.cardSubjects || []).find(s => s.id === uiState.selectedSubjectId);
                const topic = subject?.topics.find(t => t.id === id);
                if (topic) selectTopic(topic);
            } else if (action === 'start-review') {
                const subjectId = uiState.selectedSubjectId;
                const subject = (State.cardSubjects || []).find(s => s.id === subjectId);
                const topic = subject?.topics.find(t => t.id === id);
                if (topic) startReviewSession(topic, subjectId);
            } else if (action === 'delete' || action === 'edit') {
                let data;
                if (type === 'subject') data = (State.cardSubjects || []).find(s => s.id === id);
                else if (type === 'topic') {
                    const subject = (State.cardSubjects || []).find(s => s.id === uiState.selectedSubjectId);
                    data = subject?.topics.find(t => t.id === id);
                } else if (type === 'flashcard') {
                    const subject = (State.cardSubjects || []).find(s => s.id === uiState.selectedSubjectId);
                    const topic = subject?.topics.find(t => t.id === uiState.selectedTopicId);
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

    // --- (إصلاح) تحقق من تغيير الملف الشخصي وأعد تعيين الواجهة ---
    if (lastRenderedProfileId !== State.activeProfileId) {
        console.log("Profile changed! Resetting cards view.");
        uiState.view = 'groups';
        uiState.selectedSubjectId = null;
        uiState.selectedTopicId = null;
        lastRenderedProfileId = State.activeProfileId;
    }

    uiState.editors = {};

    let content = '';
    switch (uiState.view) {
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
    // تم حذف دالة load()، فالبيانات تأتي من State المركزي عند اختيار الملف الشخصي
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
