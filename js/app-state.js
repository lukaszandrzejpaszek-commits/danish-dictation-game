export const appState = {
  lang: localStorage.getItem('danish-dictation-lang') || 'da',
  selected: 'green',
  round: [],
  results: [],
  index: 0,
  locked: false,
  voice: null,
  profiles: [],
  activeId: null,
  editingId: null,
  avatar: '🎯',
  profileColor: '#6854d9'
};
