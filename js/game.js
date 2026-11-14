import { K, C, t, colorName, escHtml, avatarSet, randomId, formatDate } from './config.js';
import { readProfiles, saveProfiles, readWordGroups, saveGroups, readHistory, saveHistory } from './storage.js';
import { setAvatar, activeProfileFromState, profileSummary } from './profile.js';
import { getPreferredVoice, speakWord } from './speech.js';
import { handleImageUpload } from './ocr.js';

const appState = {
  lang: localStorage.getItem(K.l) || 'da',
  selected: 'green',
  round: [],
  results: [],
  index: 0,
  locked: false,
  voice: null,
  profiles: [],
  activeId: null,
  avatar: '🎯'
};

function $(id) {
  return document.getElementById(id);
}

function setScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === id);
  });
}

function getActiveProfile() {
  return activeProfileFromState(appState.profiles, appState.activeId);
}

function renderActiveProfileBadge() {
  const badge = $('activeProfileBadge');
  if (!badge) return;
  const profile = getActiveProfile();
  badge.hidden = !profile;
  badge.textContent = profile ? `${profile.avatar || '🎉'} ${profileSummary(profile)}` : '';
}

function renderProfiles() {
  const host = $('profiles');
  if (!host) return;

  host.innerHTML = '';
  appState.profiles.forEach((profile) => {
    const card = document.createElement('article');
    card.className = 'profile-card' + (appState.activeId === profile.id ? ' selected' : '');
    card.innerHTML = `
      <div class="profile-avatar">${profile.avatar || '🎉'}</div>
      <strong>${escHtml(profile.name || 'Guest')}</strong>
      <small>${escHtml(profile.color || '#6854d9')}</small>
    `;
    card.addEventListener('click', () => {
      appState.activeId = profile.id;
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
  avatarSet.forEach((icon) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip' + (appState.avatar === icon ? ' active' : '');
    button.textContent = icon;
    button.addEventListener('click', () => {
      appState.avatar = icon;
      renderAvatarChoices();
    });
    host.appendChild(button);
  });
}

function renderColorChoices() {
  const host = $('colorChoices');
  if (!host) return;

  host.innerHTML = '';
  C.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-card' + (appState.selected === color.id ? ' selected' : '');
    button.innerHTML = `<span class="dot" style="background:${color.hex}"></span>${colorName(appState.lang, color.id)}`;
    button.addEventListener('click', () => {
      appState.selected = color.id;
      renderColorChoices();
    });
    host.appendChild(button);
  });
}

function updateWordCount() {
  const count = $('wordCount');
  if (!count) return;

  const groupMap = readWordGroups();
  count.textContent = C.map((color) => `${colorName(appState.lang, color.id)}: ${(groupMap[color.id] || []).length}`).join(' · ');
}

function renderWordEditors() {
  const host = $('wordEditors');
  if (!host) return;

  const groupMap = readWordGroups();
  host.innerHTML = '';

  C.forEach((color) => {
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = colorName(appState.lang, color.id);

    const area = document.createElement('textarea');
    area.rows = 4;
    area.placeholder = t(appState.lang, 'wordListHolder');
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

    const wrap = document.createElement('div');
    wrap.appendChild(label);
    wrap.appendChild(area);
    host.appendChild(wrap);
  });

  updateWordCount();
}

function openProfileEditor() {
  appState.avatar = avatarSet[0] || '🎯';
  const nameInput = $('profileName');
  if (nameInput) nameInput.value = '';
  const colorInput = $('profileColor');
  if (colorInput) colorInput.value = '#6854d9';

  const heading = $('characterHeading');
  if (heading) heading.textContent = t(appState.lang, 'playerCreate');

  setScreen('characterScreen');
}

function saveProfile() {
  const nameInput = $('profileName');
  const colorInput = $('profileColor');
  const name = nameInput ? nameInput.value.trim() || 'Spiller' : 'Spiller';
  const color = colorInput ? colorInput.value : '#6854d9';

  const profile = {
    id: randomId(),
    name,
    avatar: appState.avatar,
    color
  };

  appState.profiles.push(profile);
  saveProfiles(appState.profiles);
  appState.activeId = profile.id;

  renderProfiles();
  renderActiveProfileBadge();
  setScreen('playersScreen');
}

function startGame() {
  const groupMap = readWordGroups();
  const words = [...new Set((groupMap[appState.selected] || []).map((value) => String(value).trim()).filter(Boolean))];

  if (!words.length) {
    alert(t(appState.lang, 'toastNoWords'));
    return;
  }

  appState.round = words.sort(() => Math.random() - 0.5);
  appState.results = [];
  appState.index = 0;
  appState.locked = false;

  setScreen('gameScreen');
  askQuestion();
}

function askQuestion() {
  if (appState.index >= appState.round.length) {
    finishGame();
    return;
  }

  const progressText = $('progressText');
  const progressFill = $('progressFill');
  const answerInput = $('answerInput');
  const feedback = $('feedback');

  if (progressText) progressText.textContent = t(appState.lang, 'progress', { n: String(appState.index + 1), total: String(appState.round.length) });
  if (progressFill) progressFill.style.width = `${(100 * appState.index) / appState.round.length}%`;
  if (answerInput) answerInput.value = '';
  if (feedback) feedback.textContent = '';

  appState.locked = false;
  speakCurrentWord();
}

function speakCurrentWord() {
  if (!appState.round[appState.index]) return;
  if (!('speechSynthesis' in window)) {
    alert(t(appState.lang, 'toastSpeech'));
    return;
  }

  speakWord(appState.round[appState.index], appState.voice);
}

function finishGame() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();

  const score = appState.results.filter((result) => result.correct).length;
  const active = getActiveProfile();

  const entry = {
    date: new Date().toISOString(),
    player: active ? active.name : '',
    avatar: active ? active.avatar : '🎉',
    color: appState.selected,
    score,
    total: appState.results.length,
    percentage: appState.results.length ? Math.round((100 * score) / appState.results.length) : 0,
    results: appState.results
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
  if (summaryTitle) summaryTitle.textContent = t(appState.lang, 'great', { name: entry.player || 'Spiller' });

  const resultsList = $('resultsList');
  if (resultsList) {
    resultsList.innerHTML = appState.results.map((item) => `
      <div class="result">
        <strong>${escHtml(item.word)}</strong>
        <span>${item.correct ? '✅' : '✏️ ' + escHtml(item.answer || t(appState.lang, 'noAnswer'))}</span>
      </div>
    `).join('');
  }

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
        <small>${formatDate(entry.date)} · ${colorName(appState.lang, entry.color)} · ${entry.score}/${entry.total}</small>
      </span>
      <strong>${entry.percentage}%</strong>
    </button>
  `).join('');

  host.querySelectorAll('[data-attempt]').forEach((button) => {
    button.addEventListener('click', () => {
      const attempt = all[Number(button.dataset.attempt)];
      const dialog = $('attemptDialog');
      const title = $('attemptTitle');
      const meta = $('attemptMeta');
      const review = $('attemptReview');

      if (title) title.textContent = `${t(appState.lang, 'historyTitle')} · ${attempt.player || 'Spiller'}`;
      if (meta) meta.textContent = `${formatDate(attempt.date)} · ${attempt.score}/${attempt.total}`;
      if (review) {
        review.innerHTML = (attempt.results || []).map((result) => `
          <div class="review-row">
            <span>${escHtml(result.word)}</span>
            <strong>${result.correct ? t(appState.lang, 'right') : t(appState.lang, 'wrongMark')}</strong>
            <span>${escHtml(result.answer || t(appState.lang, 'noAnswer'))}</span>
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
    alert(t(appState.lang, 'exportEmpty'));
    return;
  }

  const rows = [['Player', 'Date', 'Colour', 'Score', 'Total', 'Percent']].concat(
    all.map((entry) => [entry.player, formatDate(entry.date), colorName(appState.lang, entry.color), entry.score, entry.total, entry.percentage])
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

function bindEvents() {
  $('newPlayerButton')?.addEventListener('click', openProfileEditor);
  $('saveProfileButton')?.addEventListener('click', saveProfile);
  $('cancelProfileButton')?.addEventListener('click', () => setScreen('playersScreen'));
  $('startButton')?.addEventListener('click', startGame);
  $('playButton')?.addEventListener('click', speakCurrentWord);
  $('exportButton')?.addEventListener('click', exportHistory);
  $('backToSetupButton')?.addEventListener('click', () => setScreen('setupScreen'));

  $('answerForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (appState.locked) return;

    const answerInput = $('answerInput');
    const feedback = $('feedback');
    if (!answerInput || !feedback) return;

    const answer = answerInput.value.trim();
    if (!answer) {
      feedback.textContent = t(appState.lang, 'answerEmpty');
      return;
    }

    const word = appState.round[appState.index];
    const correct = answer.toLocaleLowerCase('da-DK') === word.toLocaleLowerCase('da-DK');
    appState.results.push({ word, answer, correct });
    feedback.textContent = correct ? t(appState.lang, 'correct') : t(appState.lang, 'wrong', { word });
    feedback.className = 'feedback ' + (correct ? 'good' : 'bad');
    appState.locked = true;

    setTimeout(() => {
      appState.index += 1;
      askQuestion();
    }, correct ? 850 : 1400);
  });

  document.querySelectorAll('.letter').forEach((button) => {
    button.addEventListener('click', () => {
      const input = $('answerInput');
      if (!input) return;
      input.setRangeText(button.dataset.letter, input.selectionStart, input.selectionEnd, 'end');
      input.focus();
    });
  });

  $('languageButton')?.addEventListener('click', () => {
    appState.lang = appState.lang === 'da' ? 'en' : 'da';
    localStorage.setItem(K.l, appState.lang);
    applyLanguage();
  });

  $('imageFile')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    handleImageUpload(file, (wordsByColor) => {
      const existing = readWordGroups();
      C.forEach((color) => {
        existing[color.id] = [...new Set([...(existing[color.id] || []), ...(wordsByColor[color.id] || [])])];
      });
      saveGroups(existing);
      renderWordEditors();
    }, (key, values = {}) => {
      const status = $('ocrStatus');
      if (status) status.textContent = t(appState.lang, key, values);
    });
  });
}

function applyLanguage() {
  document.documentElement.lang = appState.lang;
  document.querySelectorAll('[data-t]').forEach((node) => {
    const key = node.dataset.t;
    if (key) node.textContent = t(appState.lang, key);
  });

  const languageButton = $('languageButton');
  if (languageButton) languageButton.textContent = appState.lang === 'da' ? 'EN' : 'DA';

  renderColorChoices();
  renderWordEditors();
  renderHistory();
}

export function initialize() {
  appState.profiles = readProfiles();
  appState.activeId = appState.profiles[0]?.id || null;
  appState.voice = getPreferredVoice();

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
      appState.voice = getPreferredVoice();
    };
  }

  setScreen('playersScreen');
}

export { startGame, speakCurrentWord, renderProfiles, renderHistory, renderColorChoices, renderWordEditors, applyLanguage };
