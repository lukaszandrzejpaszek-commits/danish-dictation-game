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
  avatar: avatarSet[0] || '🎯'
};

const $ = (id) => document.getElementById(id);

function setScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === id);
  });
}

function activeProfile() {
  return activeProfileFromState(appState.profiles, appState.activeId);
}

function makeAvatar(className, value) {
  const avatar = document.createElement('span');
  avatar.className = className;
  setAvatar(avatar, value || '🎉');
  const image = avatar.querySelector('img');
  if (image) {
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.objectFit = 'cover';
    image.style.borderRadius = 'inherit';
  }
  return avatar;
}

function renderActiveProfileBadge() {
  const badge = $('activeProfileBadge');
  if (!badge) return;
  const profile = activeProfile();
  badge.replaceChildren();
  badge.hidden = !profile;
  if (!profile) return;

  badge.appendChild(makeAvatar('profile-badge-avatar', profile.avatar));
  const name = document.createElement('span');
  name.textContent = profileSummary(profile);
  badge.appendChild(name);
}

function renderProfiles() {
  const host = $('profiles');
  if (!host) return;
  host.replaceChildren();

  appState.profiles.forEach((profile) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'profile-card' + (appState.activeId === profile.id ? ' selected' : '');
    card.appendChild(makeAvatar('profile-avatar', profile.avatar));

    const name = document.createElement('strong');
    name.textContent = profile.name || 'Guest';
    card.appendChild(name);

    const color = document.createElement('small');
    color.textContent = profile.color || '#6854d9';
    card.appendChild(color);

    card.addEventListener('click', () => {
      appState.activeId = profile.id;
      renderProfiles();
      renderActiveProfileBadge();
      const heading = $('welcomeTitle');
      if (heading) heading.textContent = t(appState.lang, 'great', { name: profile.name || 'Guest' });
      setScreen('setupScreen');
    });
    host.appendChild(card);
  });
}

function renderAvatarChoices() {
  const host = $('avatarChoices');
  if (!host) return;
  host.replaceChildren();
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
  host.replaceChildren();
  C.forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-card' + (appState.selected === color.id ? ' selected' : '');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.backgroundColor = color.hex;
    button.append(dot, document.createTextNode(colorName(appState.lang, color.id)));
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
  const wordGroups = readWordGroups();
  count.textContent = C.map((color) => `${colorName(appState.lang, color.id)}: ${(wordGroups[color.id] || []).length}`).join(' · ');
}

function renderWordEditors() {
  const host = $('wordEditors');
  if (!host) return;
  const wordGroups = readWordGroups();
  host.replaceChildren();
  C.forEach((color) => {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = colorName(appState.lang, color.id);
    const area = document.createElement('textarea');
    area.rows = 4;
    area.placeholder = t(appState.lang, 'wordListHolder');
    area.value = (wordGroups[color.id] || []).join('\n');
    area.addEventListener('input', () => {
      wordGroups[color.id] = area.value.split(/[\n,;]+/).map((word) => word.trim()).filter(Boolean);
      saveGroups(wordGroups);
      updateWordCount();
    });
    wrapper.append(label, area);
    host.appendChild(wrapper);
  });
  updateWordCount();
}

function openProfileEditor() {
  appState.avatar = avatarSet[0] || '🎯';
  if ($('profileName')) $('profileName').value = '';
  if ($('profileColor')) $('profileColor').value = '#6854d9';
  if ($('profilePhoto')) $('profilePhoto').value = '';
  if ($('characterHeading')) $('characterHeading').textContent = t(appState.lang, 'playerCreate');
  renderAvatarChoices();
  setScreen('characterScreen');
  $('profileName')?.focus();
}

async function readProfilePhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;
  // Downsize profile photos before storing them, keeping localStorage usage modest.
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read profile image'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not decode profile image'));
      image.onload = () => {
        const maxSide = 256;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
  appState.avatar = dataUrl;
  renderAvatarChoices();
  const status = $('profilePhotoStatus');
  if (status) status.textContent = t(appState.lang, 'photoReady');
}

function saveProfile() {
  const name = $('profileName')?.value.trim() || 'Spiller';
  const color = $('profileColor')?.value || '#6854d9';
  const profile = { id: randomId(), name, avatar: appState.avatar, color };
  appState.profiles.push(profile);
  saveProfiles(appState.profiles);
  appState.activeId = profile.id;
  renderProfiles();
  renderActiveProfileBadge();
  setScreen('playersScreen');
}

function speakCurrentWord() {
  const word = appState.round[appState.index];
  if (!word) return;
  if (!('speechSynthesis' in window)) {
    alert(t(appState.lang, 'toastSpeech'));
    return;
  }
  speakWord(word, appState.voice);
}

function askQuestion() {
  if (appState.index >= appState.round.length) return finishGame();
  const progressText = $('progressText');
  const progressFill = $('progressFill');
  const answerInput = $('answerInput');
  const feedback = $('feedback');
  if (progressText) progressText.textContent = t(appState.lang, 'progress', { n: String(appState.index + 1), total: String(appState.round.length) });
  if (progressFill) progressFill.style.width = `${100 * appState.index / appState.round.length}%`;
  if (answerInput) answerInput.value = '';
  if (feedback) feedback.textContent = '';
  appState.locked = false;
  speakCurrentWord();
}

function startGame() {
  const wordGroups = readWordGroups();
  const words = [...new Set((wordGroups[appState.selected] || []).map((word) => String(word).trim()).filter(Boolean))];
  if (!words.length) return alert(t(appState.lang, 'toastNoWords'));
  appState.round = words.sort(() => Math.random() - 0.5);
  appState.results = [];
  appState.index = 0;
  appState.locked = false;
  setScreen('gameScreen');
  askQuestion();
}

function finishGame() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const score = appState.results.filter((result) => result.correct).length;
  const profile = activeProfile();
  const entry = {
    date: new Date().toISOString(),
    player: profile?.name || '',
    avatar: profile?.avatar || '🎉',
    color: appState.selected,
    score,
    total: appState.results.length,
    percentage: appState.results.length ? Math.round(100 * score / appState.results.length) : 0,
    results: appState.results
  };
  const entries = readHistory();
  entries.unshift(entry);
  saveHistory(entries);
  const summaryAvatar = $('summaryAvatar');
  if (summaryAvatar) {
    summaryAvatar.replaceChildren();
    setAvatar(summaryAvatar, entry.avatar);
    const image = summaryAvatar.querySelector('img');
    if (image) Object.assign(image.style, { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' });
  }
  if ($('summaryTitle')) $('summaryTitle').textContent = t(appState.lang, 'great', { name: entry.player || 'Spiller' });
  if ($('summaryDetails')) $('summaryDetails').textContent = `${colorName(appState.lang, entry.color)} · ${formatDate(entry.date)}`;
  if ($('scoreDisplay')) $('scoreDisplay').textContent = `${score}/${entry.total} (${entry.percentage}%)`;
  const list = $('resultsList');
  if (list) list.innerHTML = appState.results.map((item) => `<div class="result"><strong>${escHtml(item.word)}</strong><span>${item.correct ? '✅' : '✏️ ' + escHtml(item.answer || t(appState.lang, 'noAnswer'))}</span></div>`).join('');
  renderHistory();
  setScreen('summaryScreen');
}

function renderHistory() {
  const host = $('historyContent');
  if (!host) return;
  const entries = readHistory();
  host.innerHTML = entries.slice(0, 10).map((entry, index) => `
    <button class="attempt-card" data-attempt="${index}" type="button">
      <span><strong>${escHtml(entry.player || 'Spiller')}</strong><small>${formatDate(entry.date)} · ${colorName(appState.lang, entry.color)} · ${entry.score}/${entry.total}</small></span>
      <strong>${entry.percentage}%</strong>
    </button>`).join('');
  host.querySelectorAll('[data-attempt]').forEach((button) => button.addEventListener('click', () => {
    const entry = entries[Number(button.dataset.attempt)];
    if ($('attemptTitle')) $('attemptTitle').textContent = `${t(appState.lang, 'historyTitle')} · ${entry.player || 'Spiller'}`;
    if ($('attemptMeta')) $('attemptMeta').textContent = `${formatDate(entry.date)} · ${entry.score}/${entry.total}`;
    if ($('attemptReview')) $('attemptReview').innerHTML = (entry.results || []).map((result) => `<div class="review-row"><span>${escHtml(result.word)}</span><strong>${result.correct ? t(appState.lang, 'right') : t(appState.lang, 'wrongMark')}</strong><span>${escHtml(result.answer || t(appState.lang, 'noAnswer'))}</span></div>`).join('');
    $('attemptDialog')?.showModal();
  }));
}

function exportHistory() {
  const entries = readHistory();
  if (!entries.length) return alert(t(appState.lang, 'exportEmpty'));
  const rows = [['Player', 'Date', 'Colour', 'Score', 'Total', 'Percent'], ...entries.map((entry) => [entry.player, formatDate(entry.date), colorName(appState.lang, entry.color), entry.score, entry.total, entry.percentage])];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ord-eventyr-resultater.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function applyLanguage() {
  document.documentElement.lang = appState.lang;
  document.querySelectorAll('[data-t]').forEach((node) => {
    node.textContent = t(appState.lang, node.dataset.t);
  });
  if ($('languageButton')) $('languageButton').textContent = appState.lang === 'da' ? 'EN' : 'DA';
  renderProfiles();
  renderActiveProfileBadge();
  renderAvatarChoices();
  renderColorChoices();
  renderWordEditors();
  renderHistory();
}

function bindEvents() {
  $('newPlayerButton')?.addEventListener('click', openProfileEditor);
  $('saveProfileButton')?.addEventListener('click', saveProfile);
  $('cancelProfileButton')?.addEventListener('click', () => setScreen('playersScreen'));
  $('startButton')?.addEventListener('click', startGame);
  $('playButton')?.addEventListener('click', speakCurrentWord);
  $('exportButton')?.addEventListener('click', exportHistory);
  $('backToSetupButton')?.addEventListener('click', () => setScreen('setupScreen'));

  $('profilePhoto')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await readProfilePhoto(file);
    } catch (error) {
      console.error(error);
      alert(t(appState.lang, 'photoError'));
    }
  });

  $('answerForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (appState.locked) return;
    const input = $('answerInput');
    const feedback = $('feedback');
    if (!input || !feedback) return;
    const answer = input.value.trim();
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
    setTimeout(() => { appState.index += 1; askQuestion(); }, correct ? 850 : 1400);
  });

  document.querySelectorAll('.letter').forEach((button) => button.addEventListener('click', () => {
    const input = $('answerInput');
    if (!input) return;
    input.setRangeText(button.dataset.letter, input.selectionStart, input.selectionEnd, 'end');
    input.focus();
  }));

  $('languageButton')?.addEventListener('click', () => {
    appState.lang = appState.lang === 'da' ? 'en' : 'da';
    localStorage.setItem(K.l, appState.lang);
    applyLanguage();
  });

  $('imageFile')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleImageUpload(file, (wordsByColor) => {
      const groups = readWordGroups();
      C.forEach((color) => { groups[color.id] = [...new Set([...(groups[color.id] || []), ...(wordsByColor[color.id] || [])])]; });
      saveGroups(groups);
      renderWordEditors();
    }, (key, values = {}) => {
      const status = $('ocrStatus');
      if (status) status.textContent = t(appState.lang, key, values);
    });
  });
}

export function initialize() {
  appState.profiles = readProfiles();
  appState.activeId = appState.profiles[0]?.id || null;
  appState.voice = getPreferredVoice();
  renderProfiles();
  renderActiveProfileBadge();
  renderAvatarChoices();
  renderColorChoices();
  renderWordEditors();
  renderHistory();
  applyLanguage();
  bindEvents();
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { appState.voice = getPreferredVoice(); };
  setScreen('playersScreen');
}
