export function setAvatar(el, value) {
  if (!el) return;
  el.replaceChildren();
  if (typeof value === 'string' && value.startsWith('data:image/')) {
    const image = new Image();
    image.src = value;
    image.alt = 'avatar';
    el.appendChild(image);
    return;
  }
  el.textContent = value || '🎉';
}

export function activeProfileFromState(profiles, activeId) {
  if (!Array.isArray(profiles)) return null;
  return profiles.find((profile) => profile.id === activeId) || null;
}

export function profileSummary(profile) {
  if (!profile) return 'Guest';
  return profile.name || 'Guest';
}
