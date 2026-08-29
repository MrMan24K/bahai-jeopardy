/**
 * Persistent question history per board slot.
 * Tracks which question IDs have been shown for each
 * difficulty + category + dollar-value configuration.
 */
const STORAGE_KEY = 'bahaiJeopardyQuestionHistory_v1';
const VISITOR_KEY = 'bahaiJeopardyVisitorId_v1';

const QuestionHistory = {
  _data: null,

  _load() {
    if (this._data) return this._data;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this._data = raw ? JSON.parse(raw) : { visitorId: this.getVisitorId(), buckets: {} };
    } catch {
      this._data = { visitorId: this.getVisitorId(), buckets: {} };
    }
    if (!this._data.buckets) this._data.buckets = {};
    if (!this._data.visitorId) this._data.visitorId = this.getVisitorId();
    return this._data;
  },

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch {
      // Storage full or unavailable — game still works without persistence.
    }
  },

  getVisitorId() {
    try {
      let id = localStorage.getItem(VISITOR_KEY);
      if (!id) {
        id = (crypto.randomUUID && crypto.randomUUID()) ||
          `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(VISITOR_KEY, id);
      }
      return id;
    } catch {
      return 'anonymous';
    }
  },

  slotKey(gameDifficulty, category, value) {
    return `${gameDifficulty}|${category}|${value}`;
  },

  getUsedIds(gameDifficulty, category, value) {
    const key = this.slotKey(gameDifficulty, category, value);
    const bucket = this._load().buckets[key];
    return new Set(bucket || []);
  },

  markUsed(gameDifficulty, category, value, questionId) {
    const data = this._load();
    const key = this.slotKey(gameDifficulty, category, value);
    const bucket = new Set(data.buckets[key] || []);
    bucket.add(questionId);
    data.buckets[key] = [...bucket];
    this._save();
  },

  clearBucket(gameDifficulty, category, value) {
    const data = this._load();
    delete data.buckets[this.slotKey(gameDifficulty, category, value)];
    this._save();
  },

  resetAll() {
    this._data = { visitorId: this.getVisitorId(), buckets: {} };
    this._save();
  },

  resetDifficulty(gameDifficulty) {
    const data = this._load();
    const prefix = `${gameDifficulty}|`;
    for (const key of Object.keys(data.buckets)) {
      if (key.startsWith(prefix)) delete data.buckets[key];
    }
    this._save();
  },

  stats(gameDifficulty, category, value, poolSize) {
    const used = this.getUsedIds(gameDifficulty, category, value).size;
    return { used, remaining: Math.max(0, poolSize - used), total: poolSize };
  }
};

if (typeof module !== 'undefined') module.exports = QuestionHistory;
