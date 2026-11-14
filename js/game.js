import { C, colorName, escHtml, formatDate, t } from './config.js';
import { read, save, history, saveHistory } from './storage.js';
import { getPreferredVoice, speakWord } from './speech.js';
import { setAvatar } from './profile.js';

const state = {
  selected: 'green',
  round: [],
  results: [],
  index: 0,
  locked: false,
  voice: null,
  lang: localStorage.getItem('danish-dictation-lang') || 'da',
  profiles: [],
  activeProfileId: null
};

export function getState() {
  return state;
}

export function groups() {
  return read('danish-dictation-words', { green: [], yellow: [], red: [] });
}

export function saveGroups(groupMap) {
  return save('danish-dictation-words', groupMap);
}

export function renderWordEditors() {
  const host = document.getElementById('wordEditors');
  if (!host) return;
  const groupMap = groups();
  host.innerHTML = '';

  C.forEach((color) => {
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = colorName(state.lang, color.id);

    const area = document.createElement('textarea');
    area.rows = 4;
    area.placeholder = t(state.lang, 'wordListHolder');
    area.value = (groupMap[color.id] || []).join('\n');
    area.oninput = () => {
      const updated = area.value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
      groupMap[color.id] = updated;
      saveGroups(groupMap);
      updateWordCount();
    };
    host.appendChild(label);
    host.appendChild(area);
  });

  updateWordCount();
}

export function updateWordCount() {
  const count = document.getElementById('wordCount');
  if (!count) return;
  const groupMap = groups();
  count.textContent = C.map((color) => `${colorName(state.lang, color.id)}: ${(groupMap[color.id] || []).length}`).join(' · ');
}

export function renderColorChoices() {
  const host = document.getElementById('colorChoices');
  if (!host) return;
  host.innerHTML = '';

  C.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-card' + (state.selected === color.id ? ' selected' : '');
    button.innerHTML = `<span class="dot" style="background:${color.hex}"></span>${colorName(state.lang, color.id)}`;
    button.onclick = () => {
      state.selected = color.id;
      renderColorChoices();
    };
    host.appendChild(button);
  });
}

export function startGame() {
  const groupMap = groups();
  const words = [...new Set((groupMap[state.selected] || []).map((value) => String(value).trim()).filter(Boolean))];

  if (!words.length) {
    alert(t(state.lang, 'toastNoWords'));
    return;
  }

  state.round = words.sort(() => Math.random() - 0.5);
  state.results = [];
  state.index = 0;
  state.locked = false;
  document.getElementById('gameScreen')?.classList.add('active');
  askQuestion();
}

export function askQuestion() {
  if (state.index >= state.round.length) {
    finishGame();
    return;
  }

  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');
  const answerInput = document.getElementById('answerInput');
  const feedback = document.getElementById('feedback');

  if (progressText) progressText.textContent = t(state.lang, 'progress', { n: String(state.index + 1), total: String(state.round.length) });
  if (progressFill) progressFill.style.width = `${(100 * state.index) / state.round.length}%`;
  if (answerInput) answerInput.value = '';
  if (feedback) feedback.textContent = '';
  state.locked = false;
  speakCurrentWord();
}

export function speakCurrentWord() {
  if (!state.round[state.index]) return;
  speakWord(state.round[state.index], state.voice);
}

export function finishGame() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();

  const score = state.results.filter((result) => result.correct).length;
  const entry = {
    date: new Date().toISOString(),
    player: state.activeProfileId ? (state.profiles.find((p) => p.id === state.activeProfileId)?.name || '') : '',
    avatar: state.activeProfileId ? (state.profiles.find((p) => p.id === state.activeProfileId)?.avatar || '🎉') : '🎉',
    color: state.selected,
    score,
    total: state.results.length,
    percentage: state.results.length ? Math.round((100 * score) / state.results.length) : 0,
    results: state.results
  };

  const all = history();
  all.unshift(entry);
  saveHistory(all);

  const summaryAvatar = document.getElementById('summaryAvatar');
  if (summaryAvatar) {
    summaryAvatar.textContent = '';
    setAvatar(summaryAvatar, entry.avatar);
  }

  const summaryTitle = document.getElementById('summaryTitle');
  if (summaryTitle) summaryTitle.textContent = t(state.lang, 'great', { name: entry.player });

  const summaryDetails = document.getElementById('summaryDetails');
  if (summaryDetails) summaryDetails.textContent = `${colorName(state.lang, entry.color)} · ${formatDate(entry.date)}`;

  const scoreDisplay = document.getElementById('scoreDisplay');
  if (scoreDisplay) scoreDisplay.textContent = `${score}/${entry.total} (${entry.percentage}%)`;

  const resultsList = document.getElementById('resultsList');
  if (resultsList) {
    resultsList.innerHTML = (state.results || []).map((item) => `
      <div class="result">
        <strong>${escHtml(item.word)}</strong>
        <span>${item.correct ? '✅' : '✏️ ' + escHtml(item.answer)}</span>
      </div>
    `).join('');
  }

  renderHistory();
  document.getElementById('summaryScreen')?.classList.add('active');
}

export function renderHistory() {
  const host = document.getElementById('historyContent');
  if (!host) return;

  const all = history();
  if (!all.length) {
    host.innerHTML = '';
    return;
  }

  host.innerHTML = all.slice(0, 10).map((entry, index) => `
    <button class="attempt-card" data-attempt="${index}" type="button">
      <span>
        <strong>${escHtml(entry.player)}</strong>
        <small>${formatDate(entry.date)} · ${colorName(state.lang, entry.color)} · ${entry.score}/${entry.total}</small>
      </span>
      <strong>${entry.percentage}%</strong>
    </button>
  `).join('');

  host.querySelectorAll('[data-attempt]').forEach((button) => {
    button.onclick = () => {
      const attempt = all[Number(button.dataset.attempt)];
      const title = document.getElementById('attemptTitle');
      const meta = document.getElementById('attemptMeta');
      const review = document.getElementById('attemptReview');
      const dialog = document.getElementById('attemptDialog');

      if (title) title.textContent = `${t(state.lang, 'historyTitle')} · ${attempt.player}`;
      if (meta) meta.textContent = `${formatDate(attempt.date)} · ${attempt.score}/${attempt.total}`;
      if (review) {
        review.innerHTML = (attempt.results || []).map((result) => `
          <div class="review-row">
            <span>${escHtml(result.word)}</span>
            <strong>${result.correct ? t(state.lang, 'right') : t(state.lang, 'wrongMark')}</strong>
            <span>${escHtml(result.answer || t(state.lang, 'noAnswer'))}</span>
          </div>
        `).join('');
      }
      if (dialog) dialog.showModal();
    };
  });
}

export function exportHistoryCsv() {
  const all = history();
  if (!all.length) {
    alert(t(state.lang, 'exportEmpty'));
    return;
  }

  const rows = [['Player', 'Date', 'Colour', 'Score', 'Total', 'Percent']].concat(
    all.map((entry) => [entry.player, formatDate(entry.date), colorName(state.lang, entry.color), entry.score, entry.total, entry.percentage])
  );

  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ord-eventyr-resultater.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function initGameState() {
  state.lang = localStorage.getItem('danish-dictation-lang') || 'da';
  state.profiles = read('danish-dictation-profiles', []);
  state.activeProfileId = state.profiles[0]?.id || null;
  state.voice = getPreferredVoice();
}

export function setLanguage(nextLang) {
  state.lang = nextLang;
  localStorage.setItem('danish-dictation-lang', nextLang);
  applyLanguage();
}

export function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-t]').forEach((node) => {
    const key = node.dataset.t;
    if (key) node.textContent = t(state.lang, key);
  });

  const languageButton = document.getElementById('languageButton');
  if (languageButton) languageButton.textContent = state.lang === 'da' ? 'EN' : 'DA';

  renderColorChoices();
  renderWordEditors();
  renderHistory();
}

export function bindEvents() {
  const startButton = document.getElementById('startButton');
  if (startButton) startButton.onclick = startGame;

  const playButton = document.getElementById('playButton');
  if (playButton) playButton.onclick = () => speakCurrentWord();

  const answerForm = document.getElementById('answerForm');
  if (answerForm) {
    answerForm.onsubmit = (event) => {
      event.preventDefault();
      if (state.locked) return;

      const answerInput = document.getElementById('answerInput');
      const feedback = document.getElementById('feedback');
      if (!answerInput || !feedback) return;

      const answer = answerInput.value.trim();
      if (!answer) {
        feedback.textContent = t(state.lang, 'answerEmpty');
        return;
      }

      const word = state.round[state.index];
      const correct = answer.toLocaleLowerCase('da-DK') === word.toLocaleLowerCase('da-DK');
      state.results.push({ word, answer, correct });
      feedback.textContent = correct ? t(state.lang, 'correct') : t(state.lang, 'wrong', { word });
      feedback.className = 'feedback ' + (correct ? 'good' : 'bad');
      state.locked = true;

      setTimeout(() => {
        state.index += 1;
        askQuestion();
      }, correct ? 850 : 1400);
    };
  }

  document.querySelectorAll('.letter').forEach((button) => {
    button.onclick = () => {
      const input = document.getElementById('answerInput');
      if (!input) return;
      input.setRangeText(button.dataset.letter, input.selectionStart, input.selectionEnd, 'end');
      input.focus();
    };
  });

  const exportButton = document.getElementById('exportButton');
  if (exportButton) exportButton.onclick = exportHistoryCsv;

  const languageButton = document.getElementById('languageButton');
  if (languageButton) {
    languageButton.onclick = () => {
      setLanguage(state.lang === 'da' ? 'en' : 'da');
    };
  }
}

export function initApp() {
  initGameState();
  bindEvents();
  renderColorChoices();
  renderWordEditors();
  renderHistory();
  applyLanguage();

  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
      state.voice = getPreferredVoice();
    };
  }

  window.GameApp = window.GameApp || {};
  window.GameApp.Game = {
    state,
    renderColorChoices,
    renderWordEditors,
    startGame,
    speakCurrentWord,
    renderHistory,
    applyLanguage,
    init: initApp
  };
}
