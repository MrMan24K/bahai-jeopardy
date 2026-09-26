#!/usr/bin/env node
/**
 * Validates question-bank.js structure, Jeopardy answer format, id/difficulty
 * consistency, category membership, and runtime filter rules (mirrors game.js).
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const bankPath = path.join(__dirname, '..', 'question-bank.js');
const gamePath = path.join(__dirname, '..', 'game.js');
const src = fs.readFileSync(bankPath, 'utf8');

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(
  src.replace(/\bconst (QUESTION_BANK|FINAL_JEOPARDY_POOL|CATEGORY_POOL|Q)\b/g, 'var $1'),
  sandbox
);

const { QUESTION_BANK, FINAL_JEOPARDY_POOL, CATEGORY_POOL } = sandbox;

const gameSrc = fs.readFileSync(gamePath, 'utf8');
const gameSandbox = {
  console,
  state: { difficulty: 'medium', usedQuestionIds: new Set() },
  QUESTION_BANK,
  DIFFICULTY_TIERS: {
    easy: ['easy'],
    medium: ['easy', 'medium'],
    hard: ['easy', 'medium', 'hard'],
  },
  CATEGORY_SETS: {
    easy: ['THE BÁB', "BAHÁ'U'LLÁH", "'ABDU'L-BAHÁ", 'HOLY PLACES', 'THE WRITINGS', 'PRINCIPLES & TEACHINGS'],
    medium: ['THE BÁB', "BAHÁ'U'LLÁH", "'ABDU'L-BAHÁ", 'SHOGHI EFFENDI', 'HISTORY & EVENTS', "BAHA'I CALENDAR"],
    hard: ['SHOGHI EFFENDI', 'HISTORY & EVENTS', "BAHA'I CALENDAR", 'HANDS OF THE CAUSE', 'INSTITUTIONS', 'PERSECUTION & RESILIENCE'],
  },
};
// Extract filter helpers from game.js
const helperBlock = gameSrc.match(
  /function normalizeText[\s\S]*?function isFilteredQuestion[\s\S]*?return false;\n}/
);
if (!helperBlock) {
  console.error('Could not extract filter helpers from game.js');
  process.exit(1);
}
vm.createContext(gameSandbox);
vm.runInContext(
  helperBlock[0] +
    '\nfunction getDifficultyTiers() { return DIFFICULTY_TIERS[state.difficulty]; }\n' +
    'function getQuestionPool(category, allowReuse = false, allowWeak = false) {\n' +
    '  const tiers = getDifficultyTiers();\n' +
    '  const all = QUESTION_BANK[category] || [];\n' +
    '  return all.filter(q => tiers.includes(q.d) && (allowReuse || !state.usedQuestionIds.has(q.id)) && !isFilteredQuestion(q, category, allowWeak));\n' +
    '}\n',
  gameSandbox
);

const ANSWER_RE = /^(Who is|What is|What are|Where is)\s+.+\?$/;
const DIFFS = new Set(['easy', 'medium', 'hard']);
const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

const bankCategories = Object.keys(QUESTION_BANK);
for (const cat of CATEGORY_POOL) {
  if (!QUESTION_BANK[cat]) err(`CATEGORY_POOL entry missing from QUESTION_BANK: ${cat}`);
}
for (const cat of bankCategories) {
  if (!CATEGORY_POOL.includes(cat)) err(`QUESTION_BANK category not in CATEGORY_POOL: ${cat}`);
}

const seenIds = new Map();
let total = 0;

for (const [category, questions] of Object.entries(QUESTION_BANK)) {
  const byDiff = { easy: 0, medium: 0, hard: 0 };
  for (const q of questions) {
    total++;
    if (!q.id || !q.d || !q.clue || !q.answer) {
      err(`${category}: missing field on question ${q.id || '(no id)'}`);
      continue;
    }
    if (!DIFFS.has(q.d)) err(`${q.id}: invalid difficulty "${q.d}"`);
    if (!ANSWER_RE.test(q.answer.trim())) {
      err(`${q.id}: answer not in Jeopardy format: ${q.answer}`);
    }
    if (!q.clue.trim().endsWith('?') && !q.clue.trim().endsWith('.') && !q.clue.includes('—')) {
      warn(`${q.id}: clue may be missing terminal punctuation`);
    }
    const idDiff = q.id.match(/-(e|m|h)\d+$/);
    if (idDiff) {
      const expected = { e: 'easy', m: 'medium', h: 'hard' }[idDiff[1]];
      if (q.d !== expected) err(`${q.id}: id suffix implies ${expected} but d="${q.d}"`);
    }
    if (seenIds.has(q.id)) err(`Duplicate id ${q.id} in ${category} and ${seenIds.get(q.id)}`);
    else seenIds.set(q.id, category);
    byDiff[q.d] = (byDiff[q.d] || 0) + 1;

    if (gameSandbox.isFilteredQuestion(q, category, false)) {
      warn(`${q.id} (${category}, ${q.d}): filtered at runtime by game.js heuristics`);
    }
  }
  for (const d of DIFFS) {
    if ((byDiff[d] || 0) < 5) {
      err(`${category}: only ${byDiff[d] || 0} ${d} questions (need ≥5 per column tier)`);
    }
  }
}

for (const q of FINAL_JEOPARDY_POOL) {
  if (!q.id || !q.d || !q.category || !q.clue || !q.answer) {
    err(`Final Jeopardy ${q.id || '?'}: missing field`);
    continue;
  }
  if (!DIFFS.has(q.d)) err(`${q.id}: invalid difficulty`);
  if (!ANSWER_RE.test(q.answer.trim())) err(`${q.id}: bad final answer format`);
  if (!CATEGORY_POOL.includes(q.category)) err(`${q.id}: unknown category ${q.category}`);
  if (seenIds.has(q.id)) err(`Duplicate id ${q.id} (final + bank)`);
}

// Slot coverage: each board category must fill all slot difficulties
function getSlotDifficulties(level, multiplier) {
  if (level === 'easy') return ['easy', 'easy', 'easy', 'easy', 'easy'];
  if (level === 'medium') {
    return multiplier === 1
      ? ['easy', 'easy', 'easy', 'medium', 'medium']
      : ['easy', 'easy', 'medium', 'medium', 'medium'];
  }
  return multiplier === 1
    ? ['easy', 'medium', 'medium', 'medium', 'hard']
    : ['medium', 'medium', 'hard', 'hard', 'hard'];
}

for (const [level, cats] of Object.entries(gameSandbox.CATEGORY_SETS)) {
  gameSandbox.state.difficulty = level;
  for (const cat of cats) {
    for (const mult of [1, 2]) {
      const slots = getSlotDifficulties(level, mult);
      for (const slotD of [...new Set(slots)]) {
        const pool = (QUESTION_BANK[cat] || []).filter(
          q => q.d === slotD && !gameSandbox.isFilteredQuestion(q, cat, false)
        );
        if (pool.length === 0) {
          err(`${level} board: ${cat} has no playable ${slotD} questions for $${mult * 100} tier`);
        }
      }
    }
  }
}

console.log(`Validated ${total} board questions + ${FINAL_JEOPARDY_POOL.length} final clues.`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.forEach(w => console.log('  WARN:', w));
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  errors.forEach(e => console.log('  ERR:', e));
  process.exit(1);
}
console.log('OK — no structural errors.');
