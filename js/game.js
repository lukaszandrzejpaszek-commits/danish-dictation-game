window.GameApp = window.GameApp || {};

(function () {
  const G = window.GameApp;

  const state = {
    selected: 'green',
    round: [],
    results: [],
    index: 0,
    locked: false,
    voice: null
  };

  function groups() {
    return G.Storage.groups();
  }

  function saveGroups(groupMap) {
    return G.Storage.saveGroups(groupMap);
  }

  function updateWordCount() {
    const count = G.$('wordCount');
    if (!count) return;

    const groupMap = groups();
    count.textContent = G.C.map((color) => `${G.colorName(color.id)}: ${(groupMap[color.id] || []).length}`).join(' · ');
  }

  function renderWordEditors() {
    const host = G.$('wordEditors');
    if (!host) return;

    const groupMap = groups();
    host.innerHTML = '';

    G.C.forEach((color) => {
      const label = document.createElement('label');
      label.className = 'label';
      label.textContent = G.colorName(color.id);

      const area = document.createElement('textarea');
      area.rows = 4;
      area.placeholder = G.t('wordListHolder');
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

  function renderColorChoices() {
    const host = G.$('colorChoices');
    if (!host) return;
    host.innerHTML = '';

    G.C.forEach((color) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'color-card' + (state.selected === color.id ? ' selected' : '');
      button.innerHTML = `<span class="dot" style="background:${color.hex}"></span>${G.colorName(color.id)}`;
      button.onclick = () => {
        state.selected = color.id;
        renderColorChoices();
      };
      host.appendChild(button);
    });
  }

  function startGame() {
    const groupMap = groups();
    const words = [...new Set((groupMap[state.selected] || []).map((value) => String(value).trim()).filter(Boolean))];

    if (!words.length) {
      alert(G.t('toastNoWords'));
      return;
    }

    state.round = words.sort(() => Math.random() - 0.5);
    state.results = [];
    state.index = 0;
    state.locked = false;
    G.show('gameScreen');
    askQuestion();
  }

  function askQuestion() {
    if (state.index >= state.round.length) {
      finishGame();
      return;
    }

    const progressText = G.$('progressText');
    const progressFill = G.$('progressFill');
    const answerInput = G.$('answerInput');
    const feedback = G.$('feedback');

    if (progressText) {
      progressText.textContent = G.t('progress', { n: String(state.index + 1), total: String(state.round.length) });
    }
    if (progressFill) {
      progressFill.style.width = `${(100 * state.index) / state.round.length}%`;
    }
    if (answerInput) answerInput.value = '';
    if (feedback) feedback.textContent = '';
    state.locked = false;
    speakWord();
  }

  function speakWord() {
    if (!state.round[state.index]) return;
    if (!('speechSynthesis' in window)) {
      alert(G.t('toastSpeech'));
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(state.round[state.index]);
    utterance.lang = 'da-DK';
    utterance.rate = 0.88;
    utterance.pitch = 1;
    const voices = speechSynthesis.getVoices();
    const preferred = voices.filter((voice) => /^da(?:-|$)/i.test(voice.lang)).sort((a, b) => Number(/^da-dk$/i.test(b.lang)) - Number(/^da-dk$/i.test(a.lang)))[0] || null;
    if (preferred) utterance.voice = preferred;
    speechSynthesis.speak(utterance);
  }

  function finishGame() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();

    const score = state.results.filter((result) => result.correct).length;
    const entry = {
      date: new Date().toISOString(),
      player: (G.Profiles && G.Profiles.state && G.Profiles.state.active ? G.Profiles.state.active.name : '') || '',
      avatar: (G.Profiles && G.Profiles.state && G.Profiles.state.active ? G.Profiles.state.active.avatar : '🎉') || '🎉',
      color: state.selected,
      score,
      total: state.results.length,
      percentage: state.results.length ? Math.round((100 * score) / state.results.length) : 0,
      results: state.results
    };

    const all = G.Storage.history();
    all.unshift(entry);
    G.Storage.saveHistory(all);

    const summaryAvatar = G.$('summaryAvatar');
    if (summaryAvatar) {
      summaryAvatar.textContent = '';
      G.setAvatar(summaryAvatar, entry.avatar);
    }

    const summaryTitle = G.$('summaryTitle');
    if (summaryTitle) summaryTitle.textContent = G.t('great', { name: entry.player });

    const summaryDetails = G.$('summaryDetails');
    if (summaryDetails) summaryDetails.textContent = `${G.colorName(entry.color)} · ${G.formatDate(entry.date)}`;

    const scoreDisplay = G.$('scoreDisplay');
    if (scoreDisplay) scoreDisplay.textContent = `${score}/${entry.total} (${entry.percentage}%)`;

    const resultsList = G.$('resultsList');
    if (resultsList) {
      resultsList.innerHTML = state.results.map((item) => `<div class="result"><strong>${G.esc(item.word)}</strong><span>${item.correct ? '✅' : '✏️ ' + G.esc(item.answer)}</span></div>`).join('');
    }

    renderHistory();
    G.show('summaryScreen');
  }

  function renderHistory() {
    const host = G.$('historyContent');
    if (!host) return;

    const all = G.Storage.history();
    if (!all.length) {
      host.innerHTML = '';
      return;
    }

    host.innerHTML = all.slice(0, 10).map((entry, index) => `
      <button class="attempt-card" data-attempt="${index}" type="button">
        <span>
          <strong>${G.esc(entry.player)}</strong>
          <small>${G.formatDate(entry.date)} · ${G.colorName(entry.color)} · ${entry.score}/${entry.total}</small>
        </span>
        <strong>${entry.percentage}%</strong>
      </button>
    `).join('');

    host.querySelectorAll('[data-attempt]').forEach((button) => {
      button.onclick = () => {
        const attempt = all[Number(button.dataset.attempt)];
        const title = G.$('attemptTitle');
        const meta = G.$('attemptMeta');
        const review = G.$('attemptReview');
        const dialog = G.$('attemptDialog');

        if (title) title.textContent = `${G.t('historyTitle')} · ${attempt.player}`;
        if (meta) meta.textContent = `${G.formatDate(attempt.date)} · ${attempt.score}/${attempt.total}`;
        if (review) {
          review.innerHTML = (attempt.results || []).map((result) => `
            <div class="review-row">
              <span>${G.esc(result.word)}</span>
              <strong>${result.correct ? G.t('right') : G.t('wrongMark')}</strong>
              <span>${G.esc(result.answer || G.t('noAnswer'))}</span>
            </div>
          `).join('');
        }
        if (dialog) dialog.showModal();
      };
    });
  }

  function exportHistory() {
    const all = G.Storage.history();
    if (!all.length) {
      alert(G.t('exportEmpty'));
      return;
    }

    const rows = [['Player', 'Date', 'Colour', 'Score', 'Total', 'Percent']].concat(
      all.map((entry) => [entry.player, G.formatDate(entry.date), G.colorName(entry.color), entry.score, entry.total, entry.percentage])
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

  function classifyWordFromImage(image, bbox) {
    if (!bbox) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.width = 1;
    canvas.height = 1;

    try {
      ctx.drawImage(image, Math.max(0, bbox.x0), Math.max(0, bbox.y0), Math.max(1, bbox.x1 - bbox.x0), Math.max(1, bbox.y1 - bbox.y0), 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;

      if (delta < 35) return null;

      let hue = 0;
      if (max === r) hue = 60 * (((g - b) / delta) % 6);
      else if (max === g) hue = 60 * (((b - r) / delta) + 2);
      else hue = 60 * (((r - g) / delta) + 4);

      if (hue >= 75 && hue < 170) return 'green';
      if (hue >= 35 && hue < 75) return 'yellow';
      if (hue < 25 || hue >= 330) return 'red';
      return null;
    } catch (error) {
      return null;
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.Tesseract) {
      G.$('ocrStatus').textContent = G.t('ocrError');
      return;
    }

    const status = G.$('ocrStatus');
    if (status) status.textContent = G.t('ocrLoading');

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = async () => {
      try {
        const result = await Tesseract.recognize(file, 'dan+eng');
        const wordsByColor = { green: [], yellow: [], red: [] };

        (result.data.words || []).forEach((word) => {
          const cleaned = (word.text || '').replace(/[^\p{L}\p{N}-]/gu, '').trim();
          if (cleaned.length < 2 || word.confidence < 35) return;
          const bucket = classifyWordFromImage(image, word.bbox) || state.selected;
          wordsByColor[bucket] = wordsByColor[bucket] || [];
          wordsByColor[bucket].push(cleaned);
        });

        const existing = groups();
        G.C.forEach((color) => {
          const unique = [...new Set([...(existing[color.id] || []), ...wordsByColor[color.id]])];
          existing[color.id] = unique;
        });

        saveGroups(existing);
        renderWordEditors();

        if (status) status.textContent = G.t('ocrDone', { n: Object.values(wordsByColor).flat().length });
      } catch (error) {
        console.error(error);
        if (status) status.textContent = G.t('ocrError');
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      if (status) status.textContent = G.t('ocrError');
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  }

  function bindEvents() {
    const startButton = G.$('startButton');
    if (startButton) startButton.onclick = startGame;

    const playButton = G.$('playButton');
    if (playButton) playButton.onclick = speakWord;

    const answerForm = G.$('answerForm');
    if (answerForm) {
      answerForm.onsubmit = (event) => {
        event.preventDefault();
        if (state.locked) return;

        const answerInput = G.$('answerInput');
        const feedback = G.$('feedback');
        if (!answerInput || !feedback) return;

        const answer = answerInput.value.trim();
        if (!answer) {
          feedback.textContent = G.t('answerEmpty');
          return;
        }

        const word = state.round[state.index];
        const correct = answer.toLocaleLowerCase('da-DK') === word.toLocaleLowerCase('da-DK');
        state.results.push({ word, answer, correct });
        feedback.textContent = correct ? G.t('correct') : G.t('wrong', { word });
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
        const input = G.$('answerInput');
        if (!input) return;
        input.setRangeText(button.dataset.letter, input.selectionStart, input.selectionEnd, 'end');
        input.focus();
      };
    });

    const exportButton = G.$('exportButton');
    if (exportButton) exportButton.onclick = exportHistory;

    const languageButton = G.$('languageButton');
    if (languageButton) {
      languageButton.onclick = () => {
        G.lang = G.lang === 'da' ? 'en' : 'da';
        localStorage.setItem(G.K.l, G.lang);
        applyLanguage();
      };
    }

    const imageInput = G.$('imageFile');
    if (imageInput) imageInput.onchange = handleImageUpload;
  }

  function applyLanguage() {
    document.documentElement.lang = G.lang;
    document.querySelectorAll('[data-t]').forEach((node) => {
      const key = node.dataset.t;
      if (key) node.textContent = G.t(key);
    });

    const languageButton = G.$('languageButton');
    if (languageButton) languageButton.textContent = G.lang === 'da' ? 'EN' : 'DA';

    renderColorChoices();
    renderWordEditors();
    renderHistory();
  }

  G.Game = {
    state,
    groups,
    renderColorChoices,
    renderWordEditors,
    startGame,
    speakWord,
    renderHistory,
    applyLanguage,
    init: function () {
      bindEvents();
      renderColorChoices();
      renderWordEditors();
      renderHistory();
      applyLanguage();
      if ('speechSynthesis' in window) {
        speechSynthesis.onvoiceschanged = () => {};
      }
    }
  };
})();
