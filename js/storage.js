import { K } from './config.js?v=20261114-2';

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    console.warn('Storage parse failed', key, error);
    return fallback;
  }
}

export function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

export function groups() {
  return read(K.w, { green: [], yellow: [], red: [] });
}

export function saveGroups(groupMap) {
  return save(K.w, groupMap);
}

export function history() {
  return read(K.h, []);
}

export function saveHistory(entries) {
  return save(K.h, entries);
}

export function profiles() {
  return read(K.p, []);
}

export function saveProfiles(entries) {
  return save(K.p, entries);
}

// Explicit domain names used by the app modules.
export const readWordGroups = groups;
export const readHistory = history;
export const readProfiles = profiles;
