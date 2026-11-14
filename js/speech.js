export function getPreferredVoice() {
  if (!('speechSynthesis' in window)) return null;

  const voices = speechSynthesis.getVoices();
  const normalized = voices.map((voice) => {
    const name = (voice.name || '').toLowerCase();
    const lang = (voice.lang || '').toLowerCase();
    const isDanish = /^da(?:-|$)/.test(lang);
    const isPiper = name.includes('piper');
    const isBestOffline = name.includes('best offline choice') || name.includes('offline choice');
    const isLocal = Boolean(voice.localService);

    let score = 0;
    if (isDanish) score += 40;
    if (isPiper) score += 60;
    if (isBestOffline) score += 70;
    if (isLocal) score += 20;
    if (/^da-dk$/i.test(voice.lang)) score += 25;

    return { voice, score };
  });

  const preferred = normalized
    .filter(({ voice }) => /^da(?:-|$)/i.test(voice.lang) || /piper|offline|best offline choice/i.test(voice.name))
    .sort((a, b) => b.score - a.score || Number(/^da-dk$/i.test(b.voice.lang)) - Number(/^da-dk$/i.test(a.voice.lang)))
    [0]?.voice || voices.find((voice) => /^da(?:-|$)/i.test(voice.lang)) || voices[0] || null;

  return preferred;
}

export function speakWord(word, selectedVoice = null) {
  if (!word || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  const preferred = selectedVoice || getPreferredVoice();
  utterance.lang = preferred?.lang || 'da-DK';
  utterance.rate = 0.88;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (preferred) utterance.voice = preferred;
  speechSynthesis.speak(utterance);
}
