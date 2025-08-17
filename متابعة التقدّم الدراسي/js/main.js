// js/main.js

// هذا هو الملف الرئيسي ونقطة الدخول للتطبيق.
// مهمته هي استيراد كل الوحدات الأخرى وتشغيلها بالترتيب الصحيح.

// --- 1. استيراد جميع الوحدات ---
import { State, SAVE } from './state.js';
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

// --- 2. إتاحة الوحدات عالميًا ---
// نجعل الوحدات متاحة عبر كائن 'App' لضمان عمل دوال 'onclick' الموجودة في HTML.
// هذه خطوة انتقالية مهمة لحل مشكلة الاعتماد الدائري.
window.App = {
    State,
    SAVE,
    U,
    Achievements,
    Goals,
    Charts,
    Calendar,
    Dash,
    Cards,
    GlobalSearch,
    Tracker,
    Views
};

// --- 3. دالة التشغيل الرئيسية (Bootstrap) ---
// هذه الدالة تعمل مرة واحدة عند تحميل الصفحة.
function bootstrap() {
    // تهيئة (init) الوحدات التي تحتاج تحميل بيانات أولية
    Cards.init();

    // ربط الأحداث (bind) لكل الوحدات التي تحتاجها
    // الـ Bind يربط الأحداث للأزرار والعناصر الثابتة في الصفحة
    Views.bind();
    GlobalSearch.bind();
    Goals.bind();
    Calendar.bind();
    Dash.bind();
    Tracker.bind();
    
    // ربط الأحداث العامة مثل الوضع الليلي والتصدير/الاستيراد
    document.getElementById('darkBtn').onclick = U.toggleDark;
    document.getElementById('btnExport').onclick = () => {
        const blob = new Blob([JSON.stringify(State.subjects, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'studyProgress.json';
        a.click();
    };
    document.getElementById('importInput').onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
            try {
                const data = JSON.parse(r.result);
                if (Array.isArray(data)) {
                    State.subjects = data;
                    SAVE.data();
                    Views.render();
                } else U.toast('صيغة ملف غير صحيحة');
            } catch { U.toast('ملف غير صالح'); }
        };
        r.readAsText(f);
    };

    // تطبيق الوضع الداكن/الفاتح وعرض النقاط
    U.applyDark();
    U.renderPoints();

    // عرض (render) الصفحة الحالية التي كان عليها المستخدم آخر مرة
    Views.render();

    // التحقق من الإنجازات عند بدء التشغيل
    Achievements.check();
}

// --- 4. بدء تشغيل التطبيق ---
// ننتظر حتى يتم تحميل كل محتوى الصفحة (HTML) ثم نقوم بتشغيل دالة bootstrap
document.addEventListener('DOMContentLoaded', bootstrap);
