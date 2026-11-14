import { K, C, t, colorName, escHtml, avatarSet, randomId, formatDate } from './config.js';
import { readProfiles, saveProfiles, readWordGroups, saveGroups, readHistory, saveHistory } from './storage.js';
import { setAvatar, activeProfileFromState, profileSummary } from './profile.js';
import { getPreferredVoice, speakWord, cancelSpeech } from './speech.js';
import { handleImageUpload } from './ocr.js';

const appState = {
  lang: localStorage.getItem(K.l) || 'da', selected: 'green', round: [], results: [], index: 0,
  locked: false, voice: null, speechMode: 'piper', profiles: [], activeId: null, editingId: null, avatar: avatarSet[0] || '🎯', questionTimer: null
};
const $ = (id) => document.getElementById(id);

function setScreen(id) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === id));
}
function activeProfile() { return activeProfileFromState(appState.profiles, appState.activeId); }
function appendAvatar(target, value) {
  setAvatar(target, value || '🎉');
  const image = target.querySelector('img');
  if (image) Object.assign(image.style, { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' });
}
function makeAvatar(className, value) {
  const avatar = document.createElement('span');
  avatar.className = className;
  appendAvatar(avatar, value);
  return avatar;
}
function renderActiveProfileBadge() {
  const badge = $('activeProfileBadge');
  const profile = activeProfile();
  document.documentElement.style.setProperty('--accent', profile?.color || '#6854d9');
  if (!badge) return;
  badge.replaceChildren();
  badge.hidden = !profile;
  if (!profile) return;
  badge.append(makeAvatar('profile-badge-avatar', profile.avatar));
  const name = document.createElement('span');
  name.textContent = profileSummary(profile);
  badge.appendChild(name);
}
function renderProfiles() {
  const host = $('profiles');
  if (!host) return;
  host.replaceChildren();
  appState.profiles.forEach((profile) => {
    const card = document.createElement('article');
    const selected = appState.activeId === profile.id;
    card.className = 'profile-card' + (selected ? ' selected' : '');

    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'profile-select';
    select.setAttribute('aria-pressed', String(selected));
    select.appendChild(makeAvatar('profile-avatar', profile.avatar));
    const details = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = profile.name || 'Guest';
    const color = document.createElement('small');
    color.textContent = profile.color || '#6854d9';
    details.append(name, color);
    select.appendChild(details);
    // Selecting only highlights the card; it must never navigate or start a game.
    select.addEventListener('click', () => {
      appState.activeId = profile.id;
      renderProfiles();
      renderActiveProfileBadge();
    });

    const actions = document.createElement('div');
    actions.className = 'profile-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn secondary small';
    edit.textContent = t(appState.lang, 'playerEdit');
    edit.addEventListener('click', () => openProfileEditor(profile));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn secondary small';
    remove.textContent = t(appState.lang, 'deletePlayer');
    remove.addEventListener('click', () => deleteProfile(profile));
    actions.append(edit, remove);
    card.append(select, actions);
    host.appendChild(card);
  });
  const start = $('continueWithPlayerButton');
  if (start) {
    start.disabled = !activeProfile();
    start.hidden = !activeProfile();
  }
}
function deleteProfile(profile) {
  if (!window.confirm(t(appState.lang, 'confirmDeletePlayer', { name: profile.name || 'Guest' }))) return;
  appState.profiles = appState.profiles.filter((item) => item.id !== profile.id);
  saveProfiles(appState.profiles);
  if (appState.activeId === profile.id) appState.activeId = null;
  renderProfiles();
  renderActiveProfileBadge();
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
    button.addEventListener('click', () => { appState.avatar = icon; renderAvatarChoices(); });
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
    const count = document.createElement('span');
    count.className = 'color-count';
    count.dataset.colorCount = color.id;
    button.append(dot, document.createTextNode(colorName(appState.lang, color.id)), count);
    button.addEventListener('click', () => { appState.selected = color.id; renderColorChoices(); });
    host.appendChild(button);
  });
  updateWordCount();
}
function updateWordCount() {
  const host = $('colorChoices');
  if (!host) return;
  const groups = readWordGroups();
  C.forEach((color) => {
    const count = host.querySelector(`[data-color-count="${color.id}"]`);
    if (!count) return;
    const words = new Set((groups[color.id] || []).map((word) => String(word).trim()).filter(Boolean));
    count.textContent = String(words.size);
  });
}
function renderWordEditors() {
  const host = $('wordEditors');
  if (!host) return;
  const groups = readWordGroups();
  host.replaceChildren();
  C.forEach((color) => {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.className = 'label';
    label.textContent = colorName(appState.lang, color.id);
    const area = document.createElement('textarea');
    area.rows = 4;
    area.placeholder = t(appState.lang, 'wordListHolder');
    area.value = (groups[color.id] || []).join('\n');
    area.addEventListener('input', () => {
      groups[color.id] = area.value.split(/[\n,;]+/).map((word) => word.trim()).filter(Boolean);
      saveGroups(groups);
      updateWordCount();
    });
    wrapper.append(label, area);
    host.appendChild(wrapper);
  });
  updateWordCount();
}
function openProfileEditor(profile = null) {
  appState.editingId = profile?.id || null;
  appState.avatar = profile?.avatar || avatarSet[0] || '🎯';
  if ($('profileName')) $('profileName').value = profile?.name || '';
  if ($('profileColor')) $('profileColor').value = profile?.color || '#6854d9';
  if ($('profilePhoto')) $('profilePhoto').value = '';
  if ($('profilePhotoStatus')) $('profilePhotoStatus').textContent = '';
  if ($('characterHeading')) $('characterHeading').textContent = t(appState.lang, profile ? 'playerEdit' : 'playerCreate');
  renderAvatarChoices();
  setScreen('characterScreen');
  $('profileName')?.focus();
}
async function readProfilePhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read profile image'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not decode profile image'));
      image.onload = () => {
        const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
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
  if ($('profilePhotoStatus')) $('profilePhotoStatus').textContent = t(appState.lang, 'photoReady');
}
function saveProfile() {
  const profile = {
    id: appState.editingId || randomId(),
    name: $('profileName')?.value.trim() || 'Spiller',
    color: $('profileColor')?.value || '#6854d9',
    avatar: appState.avatar || '🎉'
  };
  if (appState.editingId) appState.profiles = appState.profiles.map((item) => item.id === appState.editingId ? profile : item);
  else appState.profiles.push(profile);
  saveProfiles(appState.profiles);
  appState.activeId = profile.id;
  appState.editingId = null;
  renderProfiles();
  renderActiveProfileBadge();
  setScreen('playersScreen');
}
function continueWithPlayer() {
  if (!activeProfile()) return;
  const heading = $('welcomeTitle');
  if (heading) heading.textContent = t(appState.lang, 'great', { name: activeProfile().name || 'Guest' });
  setScreen('setupScreen');
}
function returnToPlayers() {
  cancelSpeech();
  clearTimeout(appState.questionTimer);
  appState.questionTimer = null;
  appState.round = [];
  appState.results = [];
  appState.index = 0;
  appState.locked = false;
  appState.activeId = null;
  if ($('speechStatus')) $('speechStatus').textContent = '';
  if ($('speechDownloadProgress')) {
    $('speechDownloadProgress').hidden = true;
    $('speechDownloadProgress').value = 0;
  }
  renderProfiles();
  renderActiveProfileBadge();
  setScreen('playersScreen');
}
function speakCurrentWord() {
  const word = appState.round[appState.index];
  if (!word) return;
  speakWord(word, appState.voice, (key, values) => {
    const status = $('speechStatus');
    const downloadProgress = $('speechDownloadProgress');
    if (status) status.textContent = key ? t(appState.lang, key, values) : '';
    if (downloadProgress) {
      const isDownloading = key === 'voiceDownloading' && Number.isFinite(values.percent);
      downloadProgress.hidden = !isDownloading;
      if (isDownloading) downloadProgress.value = values.percent;
    }
  }, appState.speechMode);
}
function updateVoiceToggle(groupName, toggleId) {
  const mode = document.querySelector(`input[name="${groupName}"]:checked`)?.value === 'browser' ? 'browser' : 'piper';
  const toggle = $(toggleId);
  if (toggle) {
    toggle.classList.toggle('browser-selected', mode === 'browser');
    toggle.querySelectorAll('.voice-option').forEach((option) => {
      option.classList.toggle('selected', option.querySelector('input')?.checked === true);
    });
  }
  return mode;
}
function updateGameVoiceChoice(replayCurrentWord = true) {
  appState.speechMode = updateVoiceToggle('gameSpeechMode', 'gameSpeechModeToggle');
  const info = $('gameVoiceModelInfo');
  if (info) info.hidden = appState.speechMode !== 'piper';
  if (replayCurrentWord) speakCurrentWord();
}
function askQuestion() {
  if (appState.index >= appState.round.length) return finishGame();
  if ($('progressText')) $('progressText').textContent = t(appState.lang, 'progress', { n: String(appState.index + 1), total: String(appState.round.length) });
  if ($('progressFill')) $('progressFill').style.width = `${100 * appState.index / appState.round.length}%`;
  if ($('answerInput')) $('answerInput').value = '';
  if ($('feedback')) $('feedback').textContent = '';
  appState.locked = false;
  speakCurrentWord();
}
function startGame() {
  const groups = readWordGroups();
  const words = [...new Set((groups[appState.selected] || []).map((word) => String(word).trim()).filter(Boolean))];
  if (!words.length) return alert(t(appState.lang, 'toastNoWords'));
  appState.speechMode = updateVoiceToggle('speechMode', 'speechModeToggle');
  const gameVoiceInput = document.querySelector(`input[name="gameSpeechMode"][value="${appState.speechMode}"]`);
  if (gameVoiceInput) gameVoiceInput.checked = true;
  updateGameVoiceChoice(false);
  appState.round = words.sort(() => Math.random() - 0.5);
  appState.results = [];
  appState.index = 0;
  appState.locked = false;
  setScreen('gameScreen');
  askQuestion();
}
function updateVoiceChoice() {
  const mode = updateVoiceToggle('speechMode', 'speechModeToggle');
  const info = $('voiceModelInfo');
  if (info) info.hidden = mode !== 'piper';
}
function finishGame() {
  cancelSpeech();
  const score = appState.results.filter((result) => result.correct).length;
  const profile = activeProfile();
  const entry = { date: new Date().toISOString(), player: profile?.name || '', avatar: profile?.avatar || '🎉', color: appState.selected, score, total: appState.results.length, percentage: appState.results.length ? Math.round(100 * score / appState.results.length) : 0, results: appState.results };
  const entries = readHistory();
  entries.unshift(entry);
  saveHistory(entries);
  if ($('summaryAvatar')) appendAvatar($('summaryAvatar'), entry.avatar);
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
  host.innerHTML = entries.slice(0, 10).map((entry, index) => `<button class="attempt-card" data-attempt="${index}" type="button"><span><strong>${escHtml(entry.player || 'Spiller')}</strong><small>${formatDate(entry.date)} · ${colorName(appState.lang, entry.color)} · ${entry.score}/${entry.total}</small></span><strong>${entry.percentage}%</strong></button>`).join('');
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
  document.querySelectorAll('[data-t]').forEach((node) => { node.textContent = t(appState.lang, node.dataset.t); });
  if ($('languageButton')) $('languageButton').textContent = appState.lang === 'da' ? 'EN' : 'DA';
  renderProfiles();
  renderActiveProfileBadge();
  renderAvatarChoices();
  renderColorChoices();
  renderWordEditors();
  renderHistory();
}
function bindEvents() {
  $('newPlayerButton')?.addEventListener('click', () => openProfileEditor());
  $('saveProfileButton')?.addEventListener('click', saveProfile);
  $('cancelProfileButton')?.addEventListener('click', () => { appState.editingId = null; setScreen('playersScreen'); });
  $('continueWithPlayerButton')?.addEventListener('click', continueWithPlayer);
  $('backToPlayersFromSetupButton')?.addEventListener('click', returnToPlayers);
  document.querySelectorAll('input[name="speechMode"]').forEach((input) => input.addEventListener('change', updateVoiceChoice));
  document.querySelectorAll('input[name="gameSpeechMode"]').forEach((input) => input.addEventListener('change', () => updateGameVoiceChoice()));
  $('startButton')?.addEventListener('click', startGame);
  $('backToPlayersButton')?.addEventListener('click', returnToPlayers);
  $('playButton')?.addEventListener('click', speakCurrentWord);
  $('exportButton')?.addEventListener('click', exportHistory);
  $('backToSetupButton')?.addEventListener('click', () => setScreen('setupScreen'));
  $('profilePhoto')?.addEventListener('change', async (event) => {
    try { await readProfilePhoto(event.target.files?.[0]); }
    catch (error) { console.error(error); alert(t(appState.lang, 'photoError')); }
  });
  $('answerForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (appState.locked) return;
    const input = $('answerInput');
    const feedback = $('feedback');
    if (!input || !feedback) return;
    const answer = input.value.trim();
    if (!answer) { feedback.textContent = t(appState.lang, 'answerEmpty'); return; }
    const word = appState.round[appState.index];
    const correct = answer.toLocaleLowerCase('da-DK') === word.toLocaleLowerCase('da-DK');
    appState.results.push({ word, answer, correct });
    feedback.textContent = correct ? t(appState.lang, 'correct') : t(appState.lang, 'wrong', { word });
    feedback.className = 'feedback ' + (correct ? 'good' : 'bad');
    appState.locked = true;
    clearTimeout(appState.questionTimer);
    appState.questionTimer = setTimeout(() => {
      appState.questionTimer = null;
      appState.index += 1;
      askQuestion();
    }, correct ? 850 : 1400);
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
    }, (key, values = {}) => { if ($('ocrStatus')) $('ocrStatus').textContent = t(appState.lang, key, values); });
  });
}
export function initialize() {
  appState.profiles = readProfiles();
  appState.activeId = null;
  appState.voice = getPreferredVoice();
  renderProfiles();
  renderActiveProfileBadge();
  renderAvatarChoices();
  renderColorChoices();
  renderWordEditors();
  renderHistory();
  applyLanguage();
  updateVoiceChoice();
  bindEvents();
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { appState.voice = getPreferredVoice(); };
  setScreen('playersScreen');
}
