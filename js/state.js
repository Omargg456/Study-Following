// js/state.js

// --- (إصلاح نهائي: دمج كامل مع نظام الملفات الشخصية) ---

// -----------------------------------------------------------------------------
//  1. الهيكل العام للحالة (State)
// -----------------------------------------------------------------------------

const defaultProfileData = {
  subjects: [],
  goals: [],
  activity: {},
  tagColors: {},
  settings: { staleDays: 120, dueGraceDays: 0 },
  points: 0,
  achievements: [],
  calendarEvents: {},
  cardSubjects: [], // بيانات البطاقات لكل ملف شخصي
};

export const State = {
  profiles: [],
  activeProfileId: null,
  isLoaded: false,
  currentView: 'tracker',
  undoTimer: null,
  lastDelete: null,
  editors: {},
  ...defaultProfileData
};

// -----------------------------------------------------------------------------
//  2. دوال إدارة البيانات والملفات الشخصية
// -----------------------------------------------------------------------------

const APP_STORAGE_KEY = 'studyApp';

function saveAllAppData(appData) {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    console.error("فشل في حفظ بيانات التطبيق:", e);
  }
}

function migrateOldData() {
  console.log("التحقق من وجود بيانات قديمة للترحيل...");
  const oldSubjects = localStorage.getItem('studyProgress');
  if (!oldSubjects) {
    console.log("لا توجد بيانات قديمة.");
    return null;
  }

  console.log("تم العثور على بيانات قديمة! جاري عملية الترحيل...");
  const oldCards = localStorage.getItem('studyTrackerApp-cards');

  const newProfile = {
    id: `profile_${Date.now()}`,
    name: 'ملفي الشخصي الافتراضي',
    createdAt: new Date().toISOString(),
    data: {
      subjects: JSON.parse(oldSubjects) || [],
      goals: JSON.parse(localStorage.getItem('sp_goals')) || [],
      activity: JSON.parse(localStorage.getItem('sp_activity')) || {},
      tagColors: JSON.parse(localStorage.getItem('sp_tag_colors')) || {},
      settings: JSON.parse(localStorage.getItem('sp_settings')) || { staleDays: 120, dueGraceDays: 0 },
      points: JSON.parse(localStorage.getItem('sp_points')) || 0,
      achievements: JSON.parse(localStorage.getItem('sp_achievements')) || [],
      calendarEvents: JSON.parse(localStorage.getItem('sp_calendar_events')) || {},
      cardSubjects: oldCards ? JSON.parse(oldCards) : [],
    }
  };

  const oldKeys = ['studyProgress', 'sp_goals', 'sp_activity', 'sp_tag_colors', 'sp_settings', 'sp_points', 'sp_achievements', 'sp_calendar_events', 'sp_view', 'sp_quick', 'studyTrackerApp-cards'];
  oldKeys.forEach(key => localStorage.removeItem(key));

  console.log("تم ترحيل البيانات بنجاح إلى ملف شخصي جديد.");
  return newProfile;
}

export function loadInitialData() {
    let appData;
    const rawData = localStorage.getItem(APP_STORAGE_KEY);

    if (rawData) {
        appData = JSON.parse(rawData);
    } else {
        const migratedProfile = migrateOldData();
        if (migratedProfile) {
            appData = {
                profiles: [migratedProfile],
                activeProfileId: migratedProfile.id
            };
            saveAllAppData(appData);
        } else {
            appData = { profiles: [], activeProfileId: null };
        }
    }

    State.profiles = appData.profiles || [];
    State.activeProfileId = appData.activeProfileId || null;
}

// --- (إصلاح) تم تحسين هذه الدالة لمسح البيانات القديمة بشكل صحيح ---
export function loadProfile(profileId) {
  const profileToLoad = State.profiles.find(p => p.id === profileId);
  if (!profileToLoad) {
    console.error(`لم يتم العثور على الملف الشخصي بالمعرّف: ${profileId}`);
    State.isLoaded = false;
    return false;
  }

  // 1. إعادة تعيين بيانات الحالة إلى الوضع الافتراضي لمسح أي بيانات قديمة
  Object.keys(defaultProfileData).forEach(key => {
      State[key] = JSON.parse(JSON.stringify(defaultProfileData[key]));
  });

  // 2. دمج بيانات الملف الشخصي المحمل
  const profileData = JSON.parse(JSON.stringify({ ...defaultProfileData, ...(profileToLoad.data || {}) }));
  Object.assign(State, profileData);

  State.activeProfileId = profileId;
  State.isLoaded = true;
  
  const currentAppData = { profiles: State.profiles, activeProfileId: profileId };
  saveAllAppData(currentAppData);

  State.currentView = localStorage.getItem('sp_view') || 'tracker';

  console.log(`تم تحميل الملف الشخصي: ${profileToLoad.name}`);
  return true;
}

export function createProfile(name) {
    const newProfile = {
        id: `profile_${Date.now()}`,
        name: name.trim(),
        createdAt: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(defaultProfileData))
    };

    State.profiles.push(newProfile);
    saveAllAppData({ profiles: State.profiles, activeProfileId: State.activeProfileId });
    return newProfile;
}

export function deleteProfile(profileId) {
    State.profiles = State.profiles.filter(p => p.id !== profileId);
    
    if (State.activeProfileId === profileId) {
        State.activeProfileId = null;
        Object.assign(State, defaultProfileData);
        State.isLoaded = false;
    }

    saveAllAppData({ profiles: State.profiles, activeProfileId: State.activeProfileId });
}

export function renameProfile(profileId, newName) {
    const profileToRename = State.profiles.find(p => p.id === profileId);
    if (profileToRename) {
        profileToRename.name = newName.trim();
        saveAllAppData({ profiles: State.profiles, activeProfileId: State.activeProfileId });
        return true;
    }
    return false;
}

// -----------------------------------------------------------------------------
//  3. كائن الحفظ (SAVE) الجديد
// -----------------------------------------------------------------------------

function saveActiveProfileData() {
  if (!State.isLoaded || !State.activeProfileId) {
    return;
  }

  const activeProfile = State.profiles.find(p => p.id === State.activeProfileId);
  if (!activeProfile) {
    console.error("خطأ: الملف الشخصي النشط غير موجود في قائمة الملفات الشخصية.");
    return;
  }

  const profileDataToSave = {};
  for (const key in defaultProfileData) {
      if (State.hasOwnProperty(key)) {
        profileDataToSave[key] = State[key];
      }
  }
  activeProfile.data = profileDataToSave;
  
  saveAllAppData({ profiles: State.profiles, activeProfileId: State.activeProfileId });
}

export const SAVE = {
  data: saveActiveProfileData,
};

// -----------------------------------------------------------------------------
//  4. تشغيل الكود عند تحميل الملف
// -----------------------------------------------------------------------------

loadInitialData();
