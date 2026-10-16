import AsyncStorage from '@react-native-async-storage/async-storage';
import { LiveChecklistData } from '../services/HiKoreaService';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 дней

const key = (id: string) => `hikorea_live_${id}`;

export async function getCachedLiveData(checklistId: string): Promise<LiveChecklistData | null> {
  try {
    const raw = await AsyncStorage.getItem(key(checklistId));
    if (!raw) return null;
    const data: LiveChecklistData = JSON.parse(raw);
    const expired = Date.now() - new Date(data.fetchedAt).getTime() > TTL_MS;
    return expired ? null : data;
  } catch {
    return null;
  }
}

export async function setCachedLiveData(checklistId: string, data: LiveChecklistData): Promise<void> {
  try {
    await AsyncStorage.setItem(key(checklistId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function daysAgo(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}
