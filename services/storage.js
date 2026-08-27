import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEY } from '../constants/appConstants';

export async function loadAppState() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveAppState(state) {
  return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearAppState() {
  return AsyncStorage.removeItem(STORAGE_KEY);
}
