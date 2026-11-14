const PIPER_MODULE_URL = 'https://esm.sh/piper-tts-web@1.1.2?bundle';
const PIPER_ASSETS_URL = 'https://unpkg.com/piper-tts-web@1.1.2/dist/';
const PIPER_VOICE = 'da_DK-talesyntese-medium';

let piperEnginePromise = null;
let piperVoiceReady = false;
let speechRequest = 0;
let activeAudio = null;
let activeAudioUrl = null;

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

function getPiperEngine() {
  if (!piperEnginePromise) {
    piperEnginePromise = import(PIPER_MODULE_URL)
      .then(({ PiperWebEngine, OnnxWebRuntime, PhonemizeWebRuntime }) => {
        return new PiperWebEngine({
          onnxRuntime: new OnnxWebRuntime({
            basePath: `${PIPER_ASSETS_URL}onnx/`,
            numThreads: 1
          }),
          phonemizeRuntime: new PhonemizeWebRuntime({
            basePath: `${PIPER_ASSETS_URL}piper/`
          })
        });
      })
      .catch((error) => {
        piperEnginePromise = null;
        throw error;
      });
  }
  return piperEnginePromise;
}

function setStatus(onStatus, key) {
  if (typeof onStatus === 'function') onStatus(key);
}

function releaseActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute('src');
    activeAudio = null;
  }
  if (activeAudioUrl) {
    URL.revokeObjectURL(activeAudioUrl);
    activeAudioUrl = null;
  }
}

export function cancelSpeech() {
  speechRequest += 1;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  releaseActiveAudio();
}

function speakWithBrowser(word, selectedVoice) {
  if (!('speechSynthesis' in window)) throw new Error('Speech synthesis is not available');

  const utterance = new SpeechSynthesisUtterance(word);
  const preferred = selectedVoice || getPreferredVoice();
  utterance.lang = preferred?.lang || 'da-DK';
  utterance.rate = 0.88;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (preferred) utterance.voice = preferred;
  speechSynthesis.speak(utterance);
}

export async function speakWord(word, selectedVoice = null, onStatus = null) {
  if (!word) return;

  cancelSpeech();
  const currentRequest = speechRequest;
  setStatus(onStatus, piperVoiceReady ? 'voiceGenerating' : 'voiceLoading');

  try {
    const engine = await getPiperEngine();
    const result = await engine.generate(word, PIPER_VOICE);
    if (currentRequest !== speechRequest) return;

    piperVoiceReady = true;
    activeAudioUrl = URL.createObjectURL(result.file);
    activeAudio = new Audio(activeAudioUrl);
    activeAudio.addEventListener('ended', () => {
      if (currentRequest === speechRequest) releaseActiveAudio();
    }, { once: true });

    await activeAudio.play();
    if (currentRequest === speechRequest) setStatus(onStatus, '');
  } catch (error) {
    if (currentRequest !== speechRequest) return;
    console.error('Local Danish speech failed; using browser speech instead.', error);
    releaseActiveAudio();
    try {
      speakWithBrowser(word, selectedVoice);
      setStatus(onStatus, 'voiceFallback');
    } catch (fallbackError) {
      console.error('Browser speech fallback failed.', fallbackError);
      setStatus(onStatus, 'voiceUnavailable');
    }
  }
}
