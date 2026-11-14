export function getPreferredVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  const preferred = voices
    .filter((voice) => /^da(?:-|$)/i.test(voice.lang))
    .sort((a, b) => Number(/^da-dk$/i.test(b.lang)) - Number(/^da-dk$/i.test(a.lang)))[0] || null;
  return preferred;
}

export function speakWord(word, selectedVoice = null) {
  if (!word || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'da-DK';
  utterance.rate = 0.88;
  utterance.pitch = 1;

  const preferred = selectedVoice || getPreferredVoice();
  if (preferred) utterance.voice = preferred;

  speechSynthesis.speak(utterance);
}
