const MAX_TEAMS = 4;
const DIFFICULTY_TIERS = {
  easy: ['easy'],
  medium: ['easy', 'medium'],
  hard: ['easy', 'medium', 'hard']
};

// Fixed category lineups per difficulty — never random
const CATEGORY_SETS = {
  easy: [
    'THE BÁB',
    "BAHÁ'U'LLÁH",
    "'ABDU'L-BAHÁ",
    'HOLY PLACES',
    'THE WRITINGS',
    'PRINCIPLES & TEACHINGS'
  ],
  medium: [
    'THE BÁB',
    "BAHÁ'U'LLÁH",
    "'ABDU'L-BAHÁ",
    'SHOGHI EFFENDI',
    'HISTORY & EVENTS',
    "BAHA'I CALENDAR"
  ],
  hard: [
    'SHOGHI EFFENDI',
    'HISTORY & EVENTS',
    "BAHA'I CALENDAR",
    'HANDS OF THE CAUSE',
    'INSTITUTIONS',
    'PERSECUTION & RESILIENCE'
  ]
};

function getCategoriesForGame() {
  return CATEGORY_SETS[state.difficulty] || CATEGORY_SETS.easy;
}

let selectedDifficulty = 'easy';

let state = {
  difficulty: 'medium',
  round: 0,
  rounds: [],
  teams: [],
  activeTeam: 0,
  used: new Set(),
  usedQuestionIds: new Set(),
  currentClue: null,
  currentWager: 0,
  isDailyDouble: false,
  answerRevealed: false,
  finalJeopardy: null,
  finalWagers: [],
  finalResponses: [],
  finalGraded: []
};

const $ = id => document.getElementById(id);
const screens = {
  title: $('screen-title'),
  setup: $('screen-setup'),
  board: $('screen-board'),
  clue: $('screen-clue'),
  dailyDouble: $('screen-daily-double'),
  final: $('screen-final')
};

function syncDifficultyButtons() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === state.difficulty);
  });
}

function changeDifficulty(diff) {
  if (diff === state.difficulty) return;
  const label = diff.charAt(0).toUpperCase() + diff.slice(1);
  if (!confirm(`Switch to ${label} difficulty and load new questions? Scores will be kept.`)) return;
  state.difficulty = diff;
  selectedDifficulty = diff;
  syncDifficultyButtons();
  generateGame();
  renderBoard();
  showScreen('board');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDifficultyTiers() {
  return DIFFICULTY_TIERS[state.difficulty] || DIFFICULTY_TIERS.medium;
}

function normalizeText(s) {
  return s.toLowerCase()
    .replace(/[áàâä]/g, 'a')
    .replace(/[íìî]/g, 'i')
    .replace(/[úùû]/g, 'u')
    .replace(/[''`]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractAnswerText(answer) {
  return normalizeText(answer.replace(/^(who is|what is|what are|where is)\s+/i, '').replace(/\?+$/, ''));
}

const CATEGORY_FIGURE_ANSWERS = {
  "'ABDU'L-BAHÁ": ['abdu l baha'],
  "BAHÁ'U'LLÁH": ['baha u llah'],
  'THE BÁB': ['the bab'],
  'SHOGHI EFFENDI': ['shoghi effendi'],
};

function isWeakQuestion(question, category) {
  const clue = normalizeText(question.clue);
  const answer = extractAnswerText(question.answer);
  if (!answer) return false;

  const figureAnswers = CATEGORY_FIGURE_ANSWERS[category] || [];
  if (figureAnswers.some(fig => answer === fig)) return true;

  if (answer.length >= 4 && clue.includes(answer)) return true;

  const answerWords = answer.split(' ').filter(w => w.length > 3);
  if (answerWords.length >= 2) {
    const matches = answerWords.filter(w => clue.includes(w)).length;
    if (matches >= Math.min(3, answerWords.length)) return true;
  }

  if (/book called|published in a book|collected in a book/i.test(question.clue)) return true;

  return false;
}

const FIGURE_CATEGORIES = new Set(Object.keys(CATEGORY_FIGURE_ANSWERS));

const ALLOWED_FIGURE_ANSWERS = /^(iran|israel|haifa|akka|tehran|paris|illinois|london|baghdad|shiraz|istanbul|chicago|wilmette|palestine|russia|turkey|africa|australia|ireland|libya|romania|hawaii|famagusta|barfurush|ishqabad|evanston|new delhi|the united states|united states|mediterranean sea|holy land|northern hemisphere|english|arabic|persian|ridvan|nawruz|the fast|the arc|guardianship|non violence|martyrdom|shiraz|1908|1920|1897|1953|1951|1957|1963|1983|1909|1912|1921|1892|1850|1844|1853|1868|1863|1891|1899|1946|1979|1849|1851|1848|1845|1992|2000|2015|36 years|four months|20 years|20|five|seven|nine|nineteen|one thousand years|noon|second|1908)/;

const VAGUE_ANSWERS = new Set([
  'fly', 'generation', 'body', 'knighthood', 'meditations', 'west', 'questions',
  'imprisonment', 'persecution', 'burial', 'burial rights', 'merit', 'established', 'twin pillars',
  'propagation and protection', 'teaching and protection', 'elected', 'urban development',
  'bahai century', 'second', 'noon', 'beauty', 'islam', 'their faith', 'plan',
  'meditations', 'a successor guardian', 'the appointment of a successor in his lifetime',
  'eradication of the bahai community', 'freedom of religion', 'divine guidance',
  'world commonwealth', 'political divisions', 'a bahai election', 'a spiritual assembly',
  'a house of worship', 'the bahai international community', 'the nineteenth day feast',
  'discrimination', 'cemeteries', 'locality', 'election',
]);

function isUnclearQuestion(question, category, level = 'easy') {
  const answer = extractAnswerText(question.answer);
  const clue = question.clue;

  if (VAGUE_ANSWERS.has(answer)) return true;

  if (category === "'ABDU'L-BAHÁ") {
    if (/center of the covenant/i.test(clue)) return true;
    if (/\bthe Master\b/i.test(clue) && !clue.includes("'Abdu'l-Bahá")) return true;
  }

  if (FIGURE_CATEGORIES.has(category) && /^What is /.test(question.answer)) {
    if (question.d === 'easy') return false;
    const hasPrompt = /\b(this|these|known as|called|means|titled|named)\b/i.test(clue);
    if (ALLOWED_FIGURE_ANSWERS.test(answer)) return false;
    if (level === 'hard' && hasPrompt) return false;
    if (level === 'medium' && (hasPrompt || answer.split(' ').length >= 3)) return false;
    return true;
  }

  return false;
}

function isFilteredQuestion(question, category, allowWeak = false) {
  if (!allowWeak && isWeakQuestion(question, category)) return true;
  if (!allowWeak && isUnclearQuestion(question, category, state.difficulty)) return true;
  return false;
}

function getQuestionPool(category, allowReuse = false, allowWeak = false) {
  const tiers = getDifficultyTiers();
  const all = QUESTION_BANK[category] || [];
  return all.filter(q =>
    tiers.includes(q.d) &&
    (allowReuse || !state.usedQuestionIds.has(q.id)) &&
    !isFilteredQuestion(q, category, allowWeak)
  );
}

function getSlotDifficulties(multiplier) {
  const level = state.difficulty;
  if (level === 'easy') {
    return ['easy', 'easy', 'easy', 'easy', 'easy'];
  }
  if (level === 'medium') {
    return multiplier === 1
      ? ['easy', 'easy', 'easy', 'medium', 'medium']
      : ['easy', 'easy', 'medium', 'medium', 'medium'];
  }
  return multiplier === 1
    ? ['easy', 'medium', 'medium', 'medium', 'hard']
    : ['medium', 'medium', 'hard', 'hard', 'hard'];
}

function applyTeenPreference(pool) {
  if (pool.length === 0) return pool;

  const teenPool = pool.filter(q => q.teen !== false);
  const deepPool = pool.filter(q => q.teen === false);

  if (state.difficulty === 'easy') {
    return teenPool.length ? teenPool : pool;
  }
  if (state.difficulty === 'medium') {
    if (teenPool.length && Math.random() < 0.5) return teenPool;
    return pool;
  }
  return deepPool.length ? deepPool : pool;
}

function pickQuestions(category, count, multiplier) {
  const slotDifficulties = getSlotDifficulties(multiplier);

  const picked = [];

  for (const difficulty of slotDifficulties) {
    let pool = getQuestionPool(category).filter(
      q => q.d === difficulty && !picked.some(p => p.id === q.id)
    );

    pool = applyTeenPreference(pool);

    if (pool.length === 0) {
      pool = getQuestionPool(category, true).filter(
        q => q.d === difficulty && !picked.some(p => p.id === q.id)
      );
    }
    if (pool.length === 0) {
      pool = getQuestionPool(category, true).filter(
        q => q.d === difficulty
      );
    }
    if (pool.length === 0) {
      pool = getQuestionPool(category, true).filter(q => !picked.some(p => p.id === q.id));
    }

    const choice = shuffle(pool)[0];
    if (choice) {
      picked.push(choice);
      state.usedQuestionIds.add(choice.id);
    }
  }

  return picked;
}

function pickDailyDoubles(numDD) {
  const positions = [];
  for (let c = 0; c < 6; c++) {
    for (let r = 0; r < 5; r++) positions.push({ cat: c, row: r });
  }
  return shuffle(positions).slice(0, numDD);
}

function generateRound(roundName, multiplier, numDD) {
  const values = multiplier === 1
    ? [200, 400, 600, 800, 1000]
    : [400, 800, 1200, 1600, 2000];

  const categoryNames = getCategoriesForGame();

  const categories = categoryNames.map(name => {
    const questions = pickQuestions(name, 5, multiplier);
    const clues = questions.map((q, i) => ({
      id: q.id,
      clue: q.clue,
      answer: q.answer,
      value: values[i]
    }));
    return { name, clues };
  });

  return { name: roundName, multiplier, dailyDoubles: pickDailyDoubles(numDD), categories };
}

function displayRoundName(roundName) {
  if (roundName === 'DOUBLE JEOPARDY!') return 'Double Jeopardy!';
  if (roundName === 'JEOPARDY!') return 'Jeopardy!';
  return roundName;
}

function pickFinalJeopardy() {
  const tiers = getDifficultyTiers();
  const isValidFinal = (q, allowWeak = false) =>
    tiers.includes(q.d) &&
    !state.usedQuestionIds.has(q.id) &&
    !isFilteredQuestion({ clue: q.clue, answer: q.answer }, q.category, allowWeak);

  let pool = FINAL_JEOPARDY_POOL.filter(q => isValidFinal(q));
  if (state.difficulty === 'easy') {
    const easyFinals = pool.filter(q => q.d === 'easy');
    if (easyFinals.length) pool = easyFinals;
  } else if (state.difficulty === 'medium') {
    const medFinals = pool.filter(q => q.d !== 'hard');
    if (medFinals.length) pool = medFinals;
  }
  if (pool.length === 0) pool = FINAL_JEOPARDY_POOL.filter(q => isValidFinal(q, true));
  if (pool.length === 0) pool = FINAL_JEOPARDY_POOL.filter(q => tiers.includes(q.d));
  if (pool.length === 0) pool = FINAL_JEOPARDY_POOL;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  state.finalJeopardy = pick;
  if (pick) state.usedQuestionIds.add(pick.id);
}

function generateGame() {
  state.rounds = [
    generateRound('JEOPARDY!', 1, 1),
    generateRound('DOUBLE JEOPARDY!', 2, 2)
  ];
  state.used = new Set();
  state.round = 0;
  pickFinalJeopardy();
}

function refreshBoard() {
  generateGame();
  showScreen('board');
  renderBoard();
}

function resetGame() {
  state.teams.forEach(t => { t.score = 0; });
  state.usedQuestionIds = new Set();
  state.activeTeam = 0;
  generateGame();
  updateScores();
  showScreen('board');
  renderBoard();
}

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  const showScore = !['title', 'setup'].includes(name);
  $('score-bar').classList.toggle('visible', showScore);
}

function formatMoney(n) {
  const abs = Math.abs(n);
  const str = '$' + abs.toLocaleString();
  return n < 0 ? '-' + str : str;
}

function updateScores() {
  const bar = $('score-bar');
  if (bar) bar.dataset.teams = String(state.teams.length);
  for (let i = 0; i < MAX_TEAMS; i++) {
    const panel = $('score-' + i);
    const team = state.teams[i];
    if (team) {
      panel.classList.remove('hidden');
      panel.querySelector('.score-name').textContent = team.name;
      const amt = panel.querySelector('.score-amount');
      amt.textContent = formatMoney(team.score);
      amt.classList.toggle('negative', team.score < 0);
      panel.classList.toggle('active-team', i === state.activeTeam);
    } else {
      panel.classList.add('hidden');
      panel.classList.remove('active-team');
    }
  }
}

function getCurrentRound() {
  return state.rounds[state.round];
}

function clueKey(round, cat, row) {
  return `${round}-${cat}-${row}`;
}

function isDD(round, cat, row) {
  return state.rounds[round].dailyDoubles.some(dd => dd.cat === cat && dd.row === row);
}

function renderBoard() {
  const round = getCurrentRound();
  const roundLabel = $('round-label');
  if (state.round === 0) {
    roundLabel.classList.remove('visible');
  } else {
    roundLabel.textContent = displayRoundName(round.name);
    roundLabel.classList.add('visible');
  }
  const board = $('board');
  board.innerHTML = '';

  round.categories.forEach(cat => {
    const catEl = document.createElement('div');
    catEl.className = 'category-cell';
    catEl.textContent = cat.name;
    board.appendChild(catEl);
  });

  for (let row = 0; row < 5; row++) {
    round.categories.forEach((cat, ci) => {
      const key = clueKey(state.round, ci, row);
      const cell = document.createElement('div');
      cell.className = 'clue-cell';
      if (state.used.has(key)) {
        cell.classList.add('used');
      } else {
        const val = cat.clues[row].value;
        cell.textContent = '$' + val.toLocaleString();
        if (isDD(state.round, ci, row)) cell.classList.add('daily-double');
        cell.addEventListener('click', () => selectClue(ci, row));
      }
      board.appendChild(cell);
    });
  }
}

function selectClue(cat, row) {
  const key = clueKey(state.round, cat, row);
  if (state.used.has(key)) return;

  const round = getCurrentRound();
  const clueData = round.categories[cat].clues[row];
  const value = clueData.value;
  const dd = isDD(state.round, cat, row);

  state.currentClue = { cat, row, key, ...clueData, value, category: round.categories[cat].name };
  state.isDailyDouble = dd;
  state.answerRevealed = false;

  if (dd) {
    const team = state.teams[state.activeTeam];
    $('dd-team-name').textContent = team.name + ' — Max wager: ' + formatMoney(Math.max(team.score, value));
    const maxWager = team.score < value ? value : team.score;
    const input = $('dd-wager');
    input.max = maxWager;
    input.min = team.score < 500 ? value : 5;
    input.value = Math.min(500, maxWager);
    showScreen('dailyDouble');
  } else {
    state.currentWager = value;
    showClueScreen();
  }
}

function showClueScreen() {
  const c = state.currentClue;
  $('clue-category').textContent = c.category;
  $('clue-value').textContent = formatMoney(state.currentWager);
  $('clue-text').textContent = c.clue;
  $('clue-text').classList.remove('hidden');
  $('clue-answer').textContent = c.answer;
  $('clue-answer').classList.remove('visible');
  $('btn-reveal').style.display = '';
  $('btn-correct').style.display = 'none';
  $('btn-incorrect').style.display = 'none';
  renderTeamBtns();
  showScreen('clue');
}

function renderTeamBtns() {
  const container = $('player-btns');
  container.innerHTML = '';
  state.teams.forEach((team, i) => {
    const btn = document.createElement('button');
    btn.className = `player-btn p${i + 1}${i === state.activeTeam ? ' active' : ''}`;
    btn.textContent = team.name;
    btn.addEventListener('click', () => { state.activeTeam = i; renderTeamBtns(); updateScores(); });
    container.appendChild(btn);
  });
}

function revealAnswer() {
  if (state.answerRevealed) return;
  state.answerRevealed = true;
  $('clue-text').classList.add('hidden');
  $('clue-answer').classList.add('visible');
  $('btn-reveal').style.display = 'none';
  $('btn-correct').style.display = '';
  $('btn-incorrect').style.display = '';
}

function resolveClue(correct) {
  const wager = state.currentWager;
  if (correct) state.teams[state.activeTeam].score += wager;
  else state.teams[state.activeTeam].score -= wager;
  state.used.add(state.currentClue.key);
  updateScores();
  checkRoundComplete();
}

function usedInRound(roundIdx) {
  return [...state.used].filter(k => k.startsWith(roundIdx + '-')).length;
}

function checkRoundComplete() {
  if (usedInRound(state.round) >= 30) {
    if (state.round < state.rounds.length - 1) {
      state.round++;
      showScreen('board');
      renderBoard();
    } else {
      startFinalJeopardy();
    }
  } else {
    showScreen('board');
    renderBoard();
  }
}

function startFinalJeopardy() {
  showScreen('final');
  document.querySelectorAll('.final-phase').forEach(p => p.classList.remove('active'));
  $('final-intro').classList.add('active');
}

function showFinalPhase(id) {
  document.querySelectorAll('.final-phase').forEach(p => p.classList.remove('active'));
  $(id).classList.add('active');
}

function initGame(teamNames, difficulty) {
  state = {
    difficulty,
    round: 0,
    rounds: [],
    teams: teamNames.map(name => ({ name, score: 0 })),
    activeTeam: 0,
    used: new Set(),
    usedQuestionIds: new Set(),
    currentClue: null,
    currentWager: 0,
    isDailyDouble: false,
    answerRevealed: false,
    finalJeopardy: null,
    finalWagers: teamNames.map(() => 0),
    finalResponses: teamNames.map(() => ''),
    finalGraded: teamNames.map(() => false)
  };
  generateGame();
  updateScores();
  renderBoard();
  syncDifficultyButtons();
  showScreen('board');
}

// ── Event Listeners ──
$('btn-start').addEventListener('click', () => showScreen('setup'));

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const diff = btn.dataset.diff;
    if (screens.board.classList.contains('active') && state.teams.length) {
      changeDifficulty(diff);
      return;
    }
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDifficulty = diff;
  });
});

$('btn-begin').addEventListener('click', () => {
  const teamNames = [1, 2, 3, 4].map(i => $('name-' + i).value.trim()).filter(Boolean);
  if (teamNames.length === 0) {
    $('setup-error').textContent = 'Enter at least one team name to begin.';
    return;
  }
  $('setup-error').textContent = '';
  initGame(teamNames, selectedDifficulty);
});

$('btn-new-board').addEventListener('click', () => {
  if (confirm('Load a fresh board with new questions? Scores will be kept.')) refreshBoard();
});

$('btn-reset-game').addEventListener('click', () => {
  if (confirm('Reset all scores and load new questions?')) resetGame();
});

$('btn-dd-confirm').addEventListener('click', () => {
  const team = state.teams[state.activeTeam];
  const maxWager = team.score < state.currentClue.value ? state.currentClue.value : team.score;
  let wager = parseInt($('dd-wager').value, 10) || 0;
  if (team.score < 500) wager = Math.max(wager, state.currentClue.value);
  wager = Math.max(0, Math.min(wager, maxWager));
  state.currentWager = wager;
  showClueScreen();
});

$('btn-reveal').addEventListener('click', revealAnswer);
$('btn-correct').addEventListener('click', () => resolveClue(true));
$('btn-incorrect').addEventListener('click', () => resolveClue(false));
$('btn-back-board').addEventListener('click', () => {
  if (state.currentClue && !state.used.has(state.currentClue.key)) showScreen('board');
  else checkRoundComplete();
});

for (let i = 0; i < MAX_TEAMS; i++) {
  $('score-' + i).addEventListener('click', () => {
    if (!state.teams[i]) return;
    state.activeTeam = i;
    updateScores();
    if (screens.clue.classList.contains('active')) renderTeamBtns();
  });
}

$('btn-final-reveal-cat').addEventListener('click', () => {
  const fj = state.finalJeopardy;
  $('final-category-text').textContent = fj.category;
  const container = $('final-wager-inputs');
  container.innerHTML = '';
  state.teams.forEach((team, i) => {
    if (team.score <= 0) {
      container.innerHTML += `<div class="final-wager-row"><label>${team.name}</label><span style="color:#888">Cannot wager (score ≤ $0)</span></div>`;
      state.finalWagers[i] = 0;
      return;
    }
    const row = document.createElement('div');
    row.className = 'final-wager-row';
    row.innerHTML = `<label>${team.name}</label><input type="number" id="fw-${i}" min="0" max="${team.score}" step="100" value="0">`;
    container.appendChild(row);
  });
  showFinalPhase('final-category-phase');
});

$('btn-final-wagers-done').addEventListener('click', () => {
  const fj = state.finalJeopardy;
  state.teams.forEach((team, i) => {
    const input = $('fw-' + i);
    if (input) state.finalWagers[i] = Math.max(0, Math.min(parseInt(input.value, 10) || 0, team.score));
  });
  $('final-category-clue').textContent = fj.category;
  $('final-clue-text').textContent = fj.clue;
  showFinalPhase('final-clue-phase');
  let timeLeft = 30;
  $('final-timer').textContent = timeLeft;
  $('btn-final-times-up').style.display = 'none';
  const interval = setInterval(() => {
    timeLeft--;
    $('final-timer').textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(interval);
      $('btn-final-times-up').style.display = '';
    }
  }, 1000);
  $('btn-final-times-up').onclick = () => {
    clearInterval(interval);
    showFinalResponsePhase();
  };
});

function showFinalResponsePhase() {
  const container = $('final-response-inputs');
  container.innerHTML = '<p style="margin-bottom:1.5rem;font-size:clamp(1rem,2.5vw,1.4rem)">Enter each team\'s response (host grades):</p>';
  state.teams.forEach((team, i) => {
    if (state.finalWagers[i] <= 0) return;
    const row = document.createElement('div');
    row.className = 'final-wager-row';
    row.style.marginBottom = '1rem';
    row.innerHTML = `
      <label>${team.name}<br><small>(${formatMoney(state.finalWagers[i])})</small></label>
      <input type="text" class="final-answer-input" id="fr-${i}" placeholder="What is...?">
      <label style="min-width:auto"><input type="checkbox" id="fg-${i}"> Correct</label>
    `;
    container.appendChild(row);
  });
  showFinalPhase('final-response-phase');
}

$('btn-final-grade').addEventListener('click', () => {
  const fj = state.finalJeopardy;
  const results = $('final-results');
  results.innerHTML = '';
  let winner = { idx: 0, score: -Infinity };

  state.teams.forEach((team, i) => {
    const wager = state.finalWagers[i];
    let change = 0;
    let response = '—';
    if (wager > 0) {
      const input = $('fr-' + i);
      const correct = $('fg-' + i)?.checked;
      response = input ? input.value || '(no response)' : '(no response)';
      change = correct ? wager : -wager;
      team.score += change;
    }
    if (team.score > winner.score) winner = { idx: i, score: team.score };

    const row = document.createElement('div');
    row.className = 'final-result-row';
    row.innerHTML = `
      <span class="name">${team.name}</span>
      <span class="response">${response}</span>
      <span class="change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${formatMoney(change)}</span>
    `;
    results.appendChild(row);
  });

  const answerRow = document.createElement('div');
  answerRow.style.cssText = 'text-align:center;margin-top:1.5rem;color:var(--gold);font-size:clamp(1rem,2.5vw,1.4rem)';
  answerRow.textContent = 'Correct response: ' + fj.answer;
  results.appendChild(answerRow);

  $('winner-banner').textContent = '🏆 ' + state.teams[winner.idx].name + ' wins with ' + formatMoney(winner.score) + '!';
  updateScores();
  showFinalPhase('final-results-phase');
});

$('btn-play-again').addEventListener('click', () => showScreen('title'));

document.addEventListener('keydown', e => {
  if (screens.clue.classList.contains('active')) {
    if (e.code === 'Space') { e.preventDefault(); revealAnswer(); }
    for (let i = 0; i < MAX_TEAMS; i++) {
      if (e.key === String(i + 1) && state.teams[i]) {
        state.activeTeam = i;
        renderTeamBtns();
        updateScores();
      }
    }
    if (e.key === 'c' || e.key === 'C') { if (state.answerRevealed) resolveClue(true); }
    if (e.key === 'i' || e.key === 'I') { if (state.answerRevealed) resolveClue(false); }
    if (e.key === 'Escape') showScreen('board');
  }
});
