const PIPER_MODULE_URL = 'https://esm.sh/piper-tts-web@1.1.2?bundle';
const PIPER_ASSETS_URL = 'https://unpkg.com/piper-tts-web@1.1.2/dist/';
const PIPER_MODEL_BASE_URL = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/';
const PIPER_VOICE = 'da_DK-talesyntese-medium';
const PIPER_MODEL_CACHE = 'danish-dictation-piper-da-dk-talesyntese-medium-v1';
const PIPER_MODEL_SIZE = 63201294;

let piperEnginePromise = null;
let piperVoiceReady = false;
let speechRequest = 0;
let activeAudio = null;
let activeAudioUrl = null;
let activeStatusHandler = null;
let voiceCacheWarning = null;

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

function updateSpeechStatus(key, values = {}) {
  if (typeof activeStatusHandler === 'function') activeStatusHandler(key, values);
}

function reportCacheIssue(key, error) {
  voiceCacheWarning = key;
  console.warn('Could not persist the Danish voice model in this browser.', error);
  updateSpeechStatus(key);
}

function createPersistentVoiceProvider() {
  let cachePromise;
  let cacheChecked = false;
  const metadata = new Map();
  const modelUrls = new Map();

  async function getCache() {
    if (!cacheChecked) {
      cacheChecked = true;
      if (!('caches' in window)) {
        reportCacheIssue('voiceCacheUnavailable', new Error('Cache API is unavailable'));
        return null;
      }
      cachePromise = caches.open(PIPER_MODEL_CACHE).catch((error) => {
        reportCacheIssue('voiceCacheUnavailable', error);
        return null;
      });
    }
    return cachePromise;
  }

  async function cacheResponse(cache, url, response) {
    if (!cache) return;
    try {
      await cache.put(url, response);
    } catch (error) {
      reportCacheIssue('voiceCacheFailed', error);
    }
  }

  function makeModelUrl(url, blob) {
    const modelUrl = URL.createObjectURL(blob);
    modelUrls.set(url, modelUrl);
    return modelUrl;
  }

  return {
    async fetch(url) {
      if (metadata.has(url)) return metadata.get(url);
      if (modelUrls.has(url)) return modelUrls.get(url);

      const cache = await getCache();
      let cachedResponse = null;
      if (cache) {
        try {
          cachedResponse = await cache.match(url);
        } catch (error) {
          reportCacheIssue('voiceCacheUnavailable', error);
        }
      }

      if (cachedResponse) {
        if (url.endsWith('.json')) {
          const value = await cachedResponse.json();
          metadata.set(url, value);
          return value;
        }
        updateSpeechStatus('voiceCached');
        return makeModelUrl(url, await cachedResponse.blob());
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not download the Danish voice model (${response.status})`);

      if (url.endsWith('.json')) {
        const value = await response.json();
        metadata.set(url, value);
        await cacheResponse(cache, url, new Response(JSON.stringify(value), {
          headers: { 'Content-Type': 'application/json' }
        }));
        return value;
      }

      const total = Number(response.headers.get('content-length')) || PIPER_MODEL_SIZE;
      const reader = response.body?.getReader();
      let blob;
      if (reader) {
        const chunks = [];
        let loaded = 0;
        let reportedPercent = -1;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.byteLength;
          const percent = Math.min(100, Math.floor(loaded * 100 / total));
          if (percent !== reportedPercent) {
            updateSpeechStatus('voiceDownloading', {
              percent,
              downloaded: (loaded / 1000000).toFixed(1),
              total: (total / 1000000).toFixed(1)
            });
            reportedPercent = percent;
          }
        }
        blob = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
      } else {
        blob = await response.blob();
        updateSpeechStatus('voiceDownloading', {
          percent: 100,
          downloaded: (blob.size / 1000000).toFixed(1),
          total: (total / 1000000).toFixed(1)
        });
      }

      await cacheResponse(cache, url, new Response(blob, {
        headers: { 'Content-Type': blob.type || 'application/octet-stream' }
      }));
      return makeModelUrl(url, blob);
    },
    destroy() {
      modelUrls.forEach((url) => URL.revokeObjectURL(url));
      modelUrls.clear();
      metadata.clear();
    }
  };
}

function getPiperEngine() {
  if (!piperEnginePromise) {
    piperEnginePromise = import(PIPER_MODULE_URL)
      .then(({ PiperWebEngine, OnnxWebRuntime, PhonemizeWebRuntime, HuggingFaceVoiceProvider }) => {
        return new PiperWebEngine({
          onnxRuntime: new OnnxWebRuntime({
            basePath: `${PIPER_ASSETS_URL}onnx/`,
            numThreads: 1
          }),
          phonemizeRuntime: new PhonemizeWebRuntime({
            basePath: `${PIPER_ASSETS_URL}piper/`
          }),
          voiceProvider: new HuggingFaceVoiceProvider({
            baseUrl: PIPER_MODEL_BASE_URL,
            provider: createPersistentVoiceProvider()
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

function setStatus(onStatus, key, values = {}) {
  if (typeof onStatus === 'function') onStatus(key, values);
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
  activeStatusHandler = null;
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
  return preferred?.name || preferred?.lang || 'Browser default';
}

export async function speakWord(word, selectedVoice = null, onStatus = null, mode = 'piper') {
  if (!word) return;

  cancelSpeech();
  const currentRequest = speechRequest;
  activeStatusHandler = onStatus;

  if (mode === 'browser') {
    try {
      setStatus(onStatus, 'browserVoiceUsed', { voice: speakWithBrowser(word, selectedVoice) });
    } catch (error) {
      console.error('Browser speech failed.', error);
      setStatus(onStatus, 'voiceUnavailable');
    }
    return;
  }

  setStatus(onStatus, voiceCacheWarning || (piperVoiceReady ? 'voiceGenerating' : 'voicePreparing'));

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
    if (currentRequest === speechRequest) setStatus(onStatus, voiceCacheWarning || '');
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
