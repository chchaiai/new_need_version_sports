// Local persistence replicating AndroidAppLocalStore + AppLanguagePreferences
// + BuildConfig constants. All keys are namespaced for the student web app.

export const BUILD = {
  VERSION_NAME: "0.1.0-mvp",
  PRIVACY_POLICY_VERSION: "2.1",
};

const NS = "bnbu.student.web.";

export function createEmptyOverlay() {
  return {
    healthReminderAck: false,
  };
}

function read(key, fallback = null) {
  let raw;
  try {
    raw = globalThis.localStorage?.getItem(NS + key);
  } catch {
    return fallback;
  }
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    // Self-heal: drop a corrupted entry so it cannot keep failing on every read.
    try { globalThis.localStorage?.removeItem(NS + key); } catch { /* ignore */ }
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value === null || value === undefined) {
      globalThis.localStorage?.removeItem(NS + key);
    } else {
      globalThis.localStorage?.setItem(NS + key, JSON.stringify(value));
    }
  } catch {
    /* storage unavailable — session-only behavior */
  }
}

export const localStore = {
  // AppLanguagePreferences: default zh for new installs; accepts BCP-47 tags.
  getLanguage() {
    const value = read("language", "zh");
    return String(value).toLowerCase().startsWith("en") ? "en" : "zh";
  },
  setLanguage(lang) { write("language", lang === "en" ? "en" : "zh"); },

  // AppThemeMode storage: light | dark | system, default Light.
  getThemeMode() {
    const value = read("themeMode", "light");
    return ["light", "dark", "system"].includes(value) ? value : "light";
  },
  setThemeMode(mode) { write("themeMode", mode); },

  hasAgreedPrivacyPolicy(version) {
    return read("privacyAgreedVersion") === version;
  },
  agreePrivacyPolicy(version, agreedAt) {
    write("privacyAgreedVersion", version);
    write("privacyAgreedAt", agreedAt);
  },

  hasCompletedPreLoginCourseGuide() { return read("preLoginGuideCompleted", false) === true; },
  markPreLoginCourseGuideCompleted() { write("preLoginGuideCompleted", true); },

  hasCompletedPostEnrollmentGuide(accountId) {
    return read(`postEnrollmentGuide.${accountId}`, false) === true;
  },
  markPostEnrollmentGuideCompleted(accountId) { write(`postEnrollmentGuide.${accountId}`, true); },
  clearPostEnrollmentGuide(accountId) { write(`postEnrollmentGuide.${accountId}`, null); },

  getSession() { return read("session", null); },
  setSession(session) { write("session", session); },
  clearSession() { write("session", null); },

  // Local-only acknowledgement for the health reminder. Legacy synthetic
  // workspace fields are deliberately discarded when an older value is read.
  getOverlay() {
    const defaults = createEmptyOverlay();
    const stored = read("workspaceOverlay", null);
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return defaults;
    return { healthReminderAck: stored.healthReminderAck === true };
  },
  setOverlay(overlay) { write("workspaceOverlay", { healthReminderAck: overlay?.healthReminderAck === true }); },
  clearOverlay() { write("workspaceOverlay", null); },

  getHelpArticles(locale) {
    const normalized = String(locale || "").toLowerCase().startsWith("en") ? "en" : "zh-CN";
    const articles = read(`helpArticles.${normalized}`, []);
    return Array.isArray(articles) ? articles : [];
  },
  setHelpArticles(locale, articles) {
    const normalized = String(locale || "").toLowerCase().startsWith("en") ? "en" : "zh-CN";
    write(`helpArticles.${normalized}`, Array.isArray(articles) ? articles : []);
  },

  // Exercise session draft (ExerciseSessionStore): survives restarts.
  getExerciseSession(accountId) { return read(`exerciseSession.${accountId}`, null); },
  setExerciseSession(accountId, session) { write(`exerciseSession.${accountId}`, session); },
  clearExerciseSession(accountId) { write(`exerciseSession.${accountId}`, null); },

  /** Deletes only the signed-in account's durable workspace state. The
   * workspace overlay is a single current-account slot; other accounts' keyed
   * exercise and guide entries are deliberately left untouched. */
  clearAccountData(accountId) {
    if (typeof accountId !== "string" || accountId.length === 0) return false;
    write(`exerciseSession.${accountId}`, null);
    write(`postEnrollmentGuide.${accountId}`, null);
    write("workspaceOverlay", null);
    return true;
  },
};
