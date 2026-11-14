import {
  C,
  t,
  colorName,
  formatDate,
  escHtml,
  avatarSet,
  randomId,
  normalizeColorId
} from './config.js';
import {
  read,
  save,
  groups as readWordGroups,
  saveGroups,
  history as readHistory,
  saveHistory,
  profiles as readProfiles,
  saveProfiles
} from './storage.js';
import { setAvatar, activeProfileFromState, profileSummary } from './profile.js';
import { getPreferredVoice, speakWord } from './speech.js';
import { handleImageUpload } from './ocr.js';

const K = {
  p: 'danish-dictation-profiles',
  h: 'danish-dictation-history',
  l: 'danish-dictation-lang',
  w: 'danish-dictation-words'
};

const state = {
  lang: localStorage.getItem(K.l) || 'da',
  selected: 'green',
  round: [],
  results: [],
  index: 0,
  locked: false,
  voice: null,
  profiles: [],
  activeId: null,
  editingId: null,
  avatar: avatarSet[0] || '🎯',
  profileColor: '#6854d9'
};

function $(id) {
  return document.getElementById(id);
}

function setScreen(screenId) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === screenId);
  });
}

function getActiveProfile() {
  return activeProfileFromState(state.profiles, state.activeId);
}

function saveCurrentProfiles() {
  saveProfiles(state.profiles);
}

function renderActiveProfileBadge() {
  const badge = $('activeProfileBadge');
  if (!badge) return;

  const active = getActiveProfile();
  if (!active) {
    badge.hidden = true;
    badge.textContent = '';
    return;
  }

  badge.hidden = false;
  badge.textContent = `${active.avatar || '🎉'} ${profileSummary(active)}`;
}

function renderProfiles() {
  const host = $('profiles');
  if (!host) return;

  host.innerHTML = '';
  state.profiles.forEach((profile) => {
    const card = document.createElement('article');
    card.className = 'profile-card' + (state.activeId === profile.id ? ' selected' : '');
    card.innerHTML = `
      <div class="profile-avatar">${profile.avatar || '🎉'}</div>
      <strong>${escHtml(profile.name || 'Guest')}</strong>
      <small>${escHtml(profile.color || '#6854d9')}</small>
    `;
    card.addEventListener('click', () => {
      state.activeId = profile.id;
      renderProfiles();
      renderActiveProfileBadge();
      setScreen('setupScreen');
    });
    host.appendChild(card);
  });
}

function renderAvatarChoices() {
  const host = $('avatarChoices');
  if (!host) return;

  host.innerHTML = '';
  avatarSet.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip' + (state.avatar === item ? ' active' : '');
    button.textContent = item;
    button.addEventListener('click', () => {
      state.avatar = item;
      renderAvatarChoices();
    });
    host.appendChild(button);
  });
}

function renderWordEditors() {
  const host = $('wordEditors');
  if (!host) return;

  const groupMap = readWordGroups();
  host.innerHTML = '';

  C.forEach((color) => {
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = colorName(state.lang, color.id);

    const area = document.createElement('textarea');
    area.rows = 4;
    area.placeholder = t(state.lang, 'wordListHolder');
    area.value = (groupMap[color.id] || []).join('\n');
    area.addEventListener('input', () => {
      const updated = area.value
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      groupMap[color.id] = updated;
      saveGroups(groupMap);
      updateWordCount();
    });

    const wrapper = document.createElement('div');
    wrapper.appendChild(label);
    wrapper.appendChild(area);
    host.appendChild(wrapper);
  });

  updateWordCount();
}

function renderColorChoices() {
  const host = $('colorChoices');
  if (!host) return;

  host.innerHTML = '';
  C.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-card' + (state.selected === color.id ? ' selected' : '');
    button.innerHTML = `<span class="dot" style="background:${color.hex}"></span>${colorName(state.lang, color.id)}`;
    button.addEventListener('click', () => {
      state.selected = color.id;
      renderColorChoices();
    });
    host.appendChild(button);
  });
}

function updateWordCount() {
  const count = $('wordCount');
  if (!count) return;

  const groupMap = readWordGroups();
  count.textContent = C.map((color) => `${colorName(state.lang, color.id)}: ${(groupMap[color.id] || []).length}`).join(' · ');
}

function startGame() {
  const groupMap = readWordGroups();
  const words = [...new Set((groupMap[state.selected] || []).map((value) => String(value).trim()).filter(Boolean))];

  if (!words.length) {
    alert(t(state.lang, 'toastNoWords'));
    return;
  }

  state.round = words.sort(() => Math.random() - 0.5);
  state.results = [];
  state.index = 0;
  state.locked = false;

  setScreen('gameScreen');
  askQuestion();
}

function askQuestion() {
  if (state.index >= state.round.length) {
    finishGame();
    return;
  }

  const progressText = $('progressText');
  const progressFill = $('progressFill');
  const answerInput = $('answerInput');
  const feedback = $('feedback');

  if (progressText) progressText.textContent = t(state.lang, 'progress', { n: String(state.index + 1), total: String(state.round.length) });
  if (progressFill) progressFill.style.width = `${(100 * state.index) / state.round.length}%`;
  if (answerInput) answerInput.value = '';
  if (feedback) feedback.textContent = '';

  state.locked = false;
  speakCurrentWord();
}

function speakCurrentWord() {
  if (!state.round[state.index]) return;
  if (!('speechSynthesis' in window)) {
    alert(t(state.lang, 'toastSpeech'));
    return;
  }
  speakWord(state.round[state.index], state.voice);
}

function finishGame() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();

  const score = state.results.filter((result) => result.correct).length;
  const active = getActiveProfile();
  const entry = {
    date: new Date().toISOString(),
    player: active ? active.name : '',
    avatar: active ? active.avatar : '🎉',
    color: state.selected,
    score,
    total: state.results.length,
    percentage: state.results.length ? Math.round((100 * score) / state.results.length) : 0,
    results: state.results
  };

  const all = readHistory();
  all.unshift(entry);
  saveHistory(all);

  const summaryAvatar = $('summaryAvatar');
  if (summaryAvatar) {
    summaryAvatar.textContent = '';
    setAvatar(summaryAvatar, entry.avatar);
  }

  const summaryTitle = $('summaryTitle');
  if (summaryTitle) summaryTitle.textContent = t(state.lang, 'great', { name: entry.player || 'Spiller' });

  const summaryDetails = $('summaryDetails');
  if (summaryDetails) summaryDetails.textContent = `${colorName(state.lang, entry.color)} · ${formatDate(entry.date)}`;

  const scoreDisplay = $('scoreDisplay');
  if (scoreDisplay) scoreDisplay.textContent = `${score}/${entry.total} (${entry.percentage}%)`;

  const resultsList = $('resultsList');
  if (resultsList) {
    resultsList.innerHTML = (state.results || []).map((item) => `
      <div class="result">
        <strong>${escHtml(item.word)}</strong>
        <span>${item.correct ? '✅' : '✏️ ' + escHtml(item.answer || t(state.lang, 'noAnswer'))}</span>
      </div>
    `).join('');
  }

  renderHistory();
  setScreen('summaryScreen');
}

function renderHistory() {
  const host = $('historyContent');
  if (!host) return;

  const all = readHistory();
  if (!all.length) {
    host.innerHTML = '';
    return;
  }

  host.innerHTML = all.slice(0, 10).map((entry, index) => `
    <button class="attempt-card" data-attempt="${index}" type="button">
      <span>
        <strong>${escHtml(entry.player || 'Spiller')}</strong>
        <small>${formatDate(entry.date)} · ${colorName(state.lang, entry.color)} · ${entry.score}/${entry.total}</small>
      </span>
      <strong>${entry.percentage}%</strong>
    </button>
  `).join('');

  host.querySelectorAll('[data-attempt]').forEach((button) => {
    button.addEventListener('click', () => {
      const attempt = all[Number(button.dataset.attempt)];
      const title = $('attemptTitle');
      const meta = $('attemptMeta');
      const review = $('attemptReview');
      const dialog = $('attemptDialog');

      if (title) title.textContent = `${t(state.lang, 'historyTitle')} · ${attempt.player || 'Spiller'}`;
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
    });
  });
}

function exportHistory() {
  const all = readHistory();
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

function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-t]').forEach((node) => {
    const key = node.dataset.t;
    if (key) node.textContent = t(state.lang, key);
  });

  const languageButton = $('languageButton');
  if (languageButton) languageButton.textContent = state.lang === 'da' ? 'EN' : 'DA';

  renderColorChoices();
  renderWordEditors();
  renderHistory();
}

function openProfileEditor() {
  state.editingId = null;
  state.avatar = avatarSet[0] || '🎯';
  const nameInput = $('profileName');
  if (nameInput) nameInput.value = '';

  const colorInput = $('profileColor');
  if (colorInput) colorInput.value = '#6854d9';

  const heading = $('characterHeading');
  if (heading) heading.textContent = t(state.lang, 'playerCreate');

  setScreen('characterScreen');
}

function saveProfile() {
  const nameInput = $('profileName');
  const colorInput = $('profileColor');
  const name = (nameInput ? nameInput.value.trim() : '') || 'Spiller';
  const color = colorInput ? colorInput.value : '#6854d9';
  const profile = {
    id: state.editingId || randomId(),
    name,
    avatar: state.avatar,
    color
  };

  if (state.editingId) {
    state.profiles = state.profiles.map((item) => item.id === state.editingId ? profile : item);
  } else {
    state.profiles.push(profile);
  }

  saveCurrentProfiles();
  state.activeId = profile.id;
  renderProfiles();
  renderActiveProfileBadge();
  setScreen('playersScreen');
}

function addImageWords(file) {
  if (!file) return;

  const status = $('ocrStatus');
  const setStatus = (code, values = {}) => {
    if (status) status.textContent = t(state.lang, code, values);
  };

  handleImageUpload(file, (wordsByColor) => {
    const existing = readWordGroups();
    C.forEach((color) => {
      const merged = [...new Set([...(existing[color.id] || []), ...(wordsByColor[color.id] || [])])];
      existing[color.id] = merged;
    });
    saveGroups(existing);
    renderWordEditors();
  }, setStatus);
}

function bindEvents() {
  const newPlayerButton = $('newPlayerButton');
  if (newPlayerButton) newPlayerButton.addEventListener('click', openProfileEditor);

  const saveProfileButton = $('saveProfileButton');
  if (saveProfileButton) saveProfileButton.addEventListener('click', saveProfile);

  const cancelProfileButton = $('cancelProfileButton');
  if (cancelProfileButton) cancelProfileButton.addEventListener('click', () => setScreen('playersScreen'));

  const startButton = $('startButton');
  if (startButton) startButton.addEventListener('click', startGame);

  const backToSetupButton = $('backToSetupButton');
  if (backToSetupButton) backToSetupButton.addEventListener('click', () => setScreen('setupScreen'));

  const playButton = $('playButton');
  if (playButton) playButton.addEventListener('click', speakCurrentWord);

  const answerForm = $('answerForm');
  if (answerForm) {
    answerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (state.locked) return;

      const answerInput = $('answerInput');
      const feedback = $('feedback');
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
    });
  }

  document.querySelectorAll('.letter').forEach((button) => {
    button.addEventListener('click', () => {
      const input = $('answerInput');
      if (!input) return;
      input.setRangeText(button.dataset.letter, input.selectionStart, input.selectionEnd, 'end');
      input.focus();
    });
  });

  const exportButton = $('exportButton');
  if (exportButton) exportButton.addEventListener('click', exportHistory);

  const languageButton = $('languageButton');
  if (languageButton) {
    languageButton.addEventListener('click', () => {
      state.lang = state.lang === 'da' ? 'en' : 'da';
      localStorage.setItem(K.l, state.lang);
      applyLanguage();
    });
  }

  const imageInput = $('imageFile');
  if (imageInput) {
    imageInput.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      addImageWords(file);
    });
  }
}

function initialize() {
  state.profiles = readProfiles();
  state.activeId = state.profiles[0]?.id || null;
  state.voice = getPreferredVoice();

  renderProfiles();
  renderAvatarChoices();
  renderColorChoices();
  renderWordEditors();
  renderHistory();
  renderActiveProfileBadge();
  applyLanguage();
  bindEvents();

  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => {
      state.voice = getPreferredVoice();
    };
  }

  setScreen('playersScreen');
}

initialize();

export { initialize, renderProfiles, renderHistory, renderColorChoices, renderWordEditors, startGame, speakCurrentWord, applyLanguage };
