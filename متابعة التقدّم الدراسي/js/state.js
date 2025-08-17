// js/state.js

// هذا الملف يحتوي على "دماغ" التطبيق - البيانات المشتركة.
// كل الوحدات الأخرى ستقوم باستيراد 'State' لقراءة البيانات و 'SAVE' لكتابتها في localStorage.

// نستخدم 'export' لجعل هذه الثوابت متاحة للملفات الأخرى.
export const State = {
  subjects: JSON.parse(localStorage.getItem('studyProgress')) || [],
  goals: JSON.parse(localStorage.getItem('sp_goals')) || [],
  activity: JSON.parse(localStorage.getItem('sp_activity')) || {},
  tagColors: JSON.parse(localStorage.getItem('sp_tag_colors')) || {},
  settings: JSON.parse(localStorage.getItem('sp_settings')) || { staleDays: 120, dueGraceDays: 0 },
  points: JSON.parse(localStorage.getItem('sp_points')) || 0,
  achievements: JSON.parse(localStorage.getItem('sp_achievements')) || [],
  calendarEvents: JSON.parse(localStorage.getItem('sp_calendar_events')) || {},
  undoTimer: null,
  lastDelete: null,
  quickView: localStorage.getItem('sp_quick') === 'on',
  currentView: localStorage.getItem('sp_view') || 'tracker',
  editors: {}
};

export const SAVE = {
  data() { localStorage.setItem('studyProgress', JSON.stringify(State.subjects)); },
  goals() { localStorage.setItem('sp_goals', JSON.stringify(State.goals)); },
  activity() { localStorage.setItem('sp_activity', JSON.stringify(State.activity)); },
  tags() { localStorage.setItem('sp_tag_colors', JSON.stringify(State.tagColors)); },
  settings() { localStorage.setItem('sp_settings', JSON.stringify(State.settings)); },
  points() { localStorage.setItem('sp_points', JSON.stringify(State.points)); },
  achievements() { localStorage.setItem('sp_achievements', JSON.stringify(State.achievements)); },
  calendarEvents() { localStorage.setItem('sp_calendar_events', JSON.stringify(State.calendarEvents)); },
};
