export function $(id) {
  return document.getElementById(id);
}

export function setScreen(screenId) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === screenId);
  });
}
