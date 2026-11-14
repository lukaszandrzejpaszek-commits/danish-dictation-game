export const K = {
  p: 'danish-dictation-profiles',
  h: 'danish-dictation-history',
  l: 'danish-dictation-lang',
  w: 'danish-dictation-words'
};

export const C = [
  { id: 'green', name: { da: 'Grøn', en: 'Green' }, hex: '#249867' },
  { id: 'yellow', name: { da: 'Gul', en: 'Yellow' }, hex: '#d4a52a' },
  { id: 'red', name: { da: 'Rød', en: 'Red' }, hex: '#d34d4d' }
];

export const wordsT = {
  da: {
    playersTitle: 'Hvem vil øve i dag?', playersSub: 'Vælg en spiller, eller lav en ny figur! ✨',
    choosePlayer: 'Vælg en spiller', playerHelp: 'Vælg en profil, eller opret en ny.',
    newPlayer: 'Ny spiller', save: 'Gem', cancel: 'Annuller', setupSub: 'Upload din ordliste, vælg en farve, og lyt godt efter 🎧',
    dictation: 'Diktat', progress: 'Ord {n}/{total}', answerEmpty: 'Skriv et svar først.', correct: 'Korrekt!',
    wrong: 'Forkert — det rigtige ord var {word}', right: 'Rigtigt', wrongMark: 'Forkert', noAnswer: 'Intet svar',
    exportCsv: 'Hent CSV', historyTitle: 'Tidligere forsøg', close: 'Luk', great: 'Fantastisk, {name}!',
    wordListHolder: 'Skriv eller indsæt ord her…', ocrLoading: 'Læser ordliste…', ocrDone: 'Klar: {n} ord fundet.',
    ocrError: 'Kunne ikke læse billedet.', toastNoWords: 'Ingen ord i denne farve. Tilføj først nogle ord.',
    toastSpeech: 'Denne browser understøtter ikke tale.', exportEmpty: 'Der er ingen forsøg at eksportere endnu.',
    languageLabel: 'DA / EN', playerCreate: 'Opret profil', playerEdit: 'Rediger', profileName: 'Navn',
    profileColor: 'Farve', profileAvatar: 'Avatar', choosePhoto: 'Vælg billede', uploadWordList: 'Upload ordliste',
    chooseColor: 'Vælg farve', startPractice: 'Start øvelse', continueWithPlayer: 'Fortsæt med valgt spiller',
    deletePlayer: 'Slet', confirmDeletePlayer: 'Slet profilen for {name}?', photoReady: 'Billede valgt.', photoError: 'Kunne ikke indlæse billedet.'
  },
  en: {
    playersTitle: 'Who wants to practise today?', playersSub: 'Choose a player or create a new character! ✨',
    choosePlayer: 'Choose a player', playerHelp: 'Pick a profile or make a new one.',
    newPlayer: 'New player', save: 'Save', cancel: 'Cancel', setupSub: 'Upload your word list, choose a colour, and listen carefully 🎧',
    dictation: 'Dictation', progress: 'Word {n}/{total}', answerEmpty: 'Type an answer first.', correct: 'Correct!',
    wrong: 'Wrong — the correct word was {word}', right: 'Right', wrongMark: 'Wrong', noAnswer: 'No answer',
    exportCsv: 'Export CSV', historyTitle: 'Previous attempts', close: 'Close', great: 'Great job, {name}!',
    wordListHolder: 'Type or paste words here…', ocrLoading: 'Reading the word list…', ocrDone: 'Done: {n} words found.',
    ocrError: 'Could not read the image.', toastNoWords: 'No words in this colour yet. Add some first.',
    toastSpeech: 'This browser does not support speech output.', exportEmpty: 'There are no results to export yet.',
    languageLabel: 'DA / EN', playerCreate: 'Create profile', playerEdit: 'Edit', profileName: 'Name',
    profileColor: 'Colour', profileAvatar: 'Avatar', choosePhoto: 'Choose photo', uploadWordList: 'Upload word list',
    chooseColor: 'Choose colour', startPractice: 'Start practice', continueWithPlayer: 'Continue with selected player',
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
