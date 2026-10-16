// ─── Хранилище профиля пользователя ──────────────────────────────────────────
// Все компоненты работают с профилем ТОЛЬКО через эти функции.
// Прямых вызовов AsyncStorage в компонентах быть не должно.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

const PROFILE_KEY = 'userProfile';

// Получить профиль. Возвращает null если профиль ещё не создан (первый запуск).
export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as UserProfile;
}

// Сохранить профиль целиком (используется после онбординга).
export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// Обновить отдельные поля профиля (используется например при смене даты визы).
export async function updateProfile(
  partial: Partial<UserProfile>
): Promise<void> {
  const existing = await getProfile();
  if (!existing) return;
  const updated = { ...existing, ...partial };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
}

// Удалить профиль (сброс приложения / выход из аккаунта — для будущего релиза).
export async function clearProfile(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
}
