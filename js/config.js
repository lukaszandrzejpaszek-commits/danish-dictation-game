export const K = { p: 'danish-dictation-profiles', h: 'danish-dictation-history', l: 'danish-dictation-lang', w: 'danish-dictation-words' };
export const C = [
  { id: 'green', name: { da: 'Grøn', en: 'Green' }, hex: '#249867' },
  { id: 'yellow', name: { da: 'Gul', en: 'Yellow' }, hex: '#d4a52a' },
  { id: 'red', name: { da: 'Rød', en: 'Red' }, hex: '#d34d4d' }
];
export const wordsT = {
  da: {
    playersTitle: 'Hvem vil øve i dag?', playersSub: 'Vælg en spiller, eller lav en ny figur! ✨', choosePlayer: 'Vælg en spiller', playerHelp: 'Vælg en profil, eller opret en ny.',
    newPlayer: 'Ny spiller', save: 'Gem', cancel: 'Annuller', setupSub: 'Upload din ordliste, vælg en farve, og lyt godt efter 🎧', dictation: 'Diktat', progress: 'Ord {n}/{total}',
    answerEmpty: 'Skriv et svar først.', correct: 'Korrekt!', wrong: 'Forkert — det rigtige ord var {word}', right: 'Rigtigt', wrongMark: 'Forkert', noAnswer: 'Intet svar', exportCsv: 'Hent CSV', historyTitle: 'Tidligere forsøg', close: 'Luk',
    great: 'Fantastisk, {name}!', wordListHolder: 'Skriv eller indsæt ord her…', ocrLoading: 'Læser ordliste…', ocrDone: 'Klar: {n} ord fundet.', ocrError: 'Kunne ikke læse billedet.',
    toastNoWords: 'Ingen ord i denne farve. Tilføj først nogle ord.', toastSpeech: 'Denne browser understøtter ikke tale.', exportEmpty: 'Der er ingen forsøg at eksportere endnu.', languageLabel: 'DA / EN',
    playerCreate: 'Opret profil', playerEdit: 'Rediger', profileName: 'Navn', profileColor: 'Farve', profileAvatar: 'Avatar', choosePhoto: 'Vælg billede', uploadWordList: 'Upload ordliste', chooseColor: 'Vælg farve', startPractice: 'Start øvelse', startGame: 'Start spillet', backToPlayers: 'Tilbage',
    voiceChoice: 'Stemme til denne øvelse', voiceForWord: 'Stemme for dette ord', voiceCompareHelp: 'Skift stemme for at høre det aktuelle ord igen.',
    piperVoiceShort: 'Piper', browserVoiceShort: 'Browser',
    voiceModelInfo: 'Valgt Piper-model: da_DK-talesyntese-medium (medium, v1.0.0). Gemmes i browseren efter download.',
    voicePreparing: 'Klargør dansk Piper-stemme…', voiceDownloading: 'Henter Piper-modellen: {percent}% ({downloaded} / {total} MB)…', voiceCached: 'Piper-modellen findes allerede i browseren.',
    voiceCacheFailed: 'Modellen blev hentet, men kunne ikke gemmes. Den kan blive hentet igen næste gang.', voiceCacheUnavailable: 'Browserens cache er ikke tilgængelig; modellen kan blive hentet igen næste gang.',
    voiceGenerating: 'Laver lyd…', browserVoiceUsed: 'Bruger browserstemme: {voice}', voiceFallback: 'Den lokale stemme kunne ikke bruges. Bruger browserens stemme.', voiceUnavailable: 'Der kunne ikke afspilles lyd i denne browser.',
    deletePlayer: 'Slet', confirmDeletePlayer: 'Slet profilen for {name}?', photoReady: 'Billede valgt.', photoError: 'Kunne ikke indlæse billedet.'
  },
  en: {
    playersTitle: 'Who wants to practise today?', playersSub: 'Choose a player or create a new character! ✨', choosePlayer: 'Choose a player', playerHelp: 'Pick a profile or make a new one.',
    newPlayer: 'New player', save: 'Save', cancel: 'Cancel', setupSub: 'Upload your word list, choose a colour, and listen carefully 🎧', dictation: 'Dictation', progress: 'Word {n}/{total}',
    answerEmpty: 'Type an answer first.', correct: 'Correct!', wrong: 'Wrong — the correct word was {word}', right: 'Right', wrongMark: 'Wrong', noAnswer: 'No answer', exportCsv: 'Export CSV', historyTitle: 'Previous attempts', close: 'Close',
    great: 'Great job, {name}!', wordListHolder: 'Type or paste words here…', ocrLoading: 'Reading the word list…', ocrDone: 'Done: {n} words found.', ocrError: 'Could not read the image.',
    toastNoWords: 'No words in this colour yet. Add some first.', toastSpeech: 'This browser does not support speech output.', exportEmpty: 'There are no results to export yet.', languageLabel: 'DA / EN',
    playerCreate: 'Create profile', playerEdit: 'Edit', profileName: 'Name', profileColor: 'Colour', profileAvatar: 'Avatar', choosePhoto: 'Choose photo', uploadWordList: 'Upload word list', chooseColor: 'Choose colour', startPractice: 'Start practice', startGame: 'Start game', backToPlayers: 'Back',
    voiceChoice: 'Voice for this practice', voiceForWord: 'Voice for this word', voiceCompareHelp: 'Change the voice to hear the current word again.',
    piperVoiceShort: 'Piper', browserVoiceShort: 'Browser',
    voiceModelInfo: 'Selected Piper model: da_DK-talesyntese-medium (medium, v1.0.0). Saved in this browser after download.',
    voicePreparing: 'Preparing Danish Piper voice…', voiceDownloading: 'Downloading Piper model: {percent}% ({downloaded} / {total} MB)…', voiceCached: 'Piper model is already saved in this browser.',
    voiceCacheFailed: 'Model downloaded but could not be saved; it may need to be downloaded again next time.', voiceCacheUnavailable: 'Browser cache is unavailable; the model may need to be downloaded again next time.',
    voiceGenerating: 'Generating audio…', browserVoiceUsed: 'Using browser voice: {voice}', voiceFallback: 'Local voice unavailable. Using browser speech instead.', voiceUnavailable: 'Audio could not be played in this browser.',
    deletePlayer: 'Delete', confirmDeletePlayer: 'Delete the profile for {name}?', photoReady: 'Photo selected.', photoError: 'Could not load the image.'
  }
};
export function t(lang, key, values = {}) {
  const list = wordsT[lang] || wordsT.da;
  let text = list[key] || wordsT.da[key] || key;
  Object.entries(values).forEach(([name, value]) => { text = text.replaceAll(`{${name}}`, String(value)); });
  return text;
}
export function colorName(lang, colorId) {
  const map = C.find((item) => item.id === colorId);
  if (!map) return colorId;
  return map.name[lang] || map.name.da || colorId;
}
export function escHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
export function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}
export function randomId() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
export function avatarOptions() { return ['🎯', '🦊', '🐼', '🐸', '🦄', '🐻', '🐯', '🦁', '🎲', '⭐']; }
export function accentPalette() { return ['#f8d66d', '#ff8a5b', '#7ac9c4', '#8b6cf6', '#4ecdc4', '#ff6b6b']; }
export function normalizeColorId(value) { return C.some((color) => color.id === value) ? value : 'green'; }
export const avatarSet = avatarOptions();
export const accentSet = accentPalette();
