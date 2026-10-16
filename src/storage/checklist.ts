// ─── Хранилище прогресса чек-листов ──────────────────────────────────────────
// Прогресс каждого чек-листа хранится отдельным ключом, чтобы не засорять один объект.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChecklistProgress } from '../types';

// Ключ строится из id чек-листа, напр. "checklist_progress_d2-extension"
const progressKey = (checklistId: string) =>
  `checklist_progress_${checklistId}`;

// Получить прогресс чек-листа. Возвращает пустой массив если ещё не начат.
export async function getChecklistProgress(
  checklistId: string
): Promise<ChecklistProgress> {
  const raw = await AsyncStorage.getItem(progressKey(checklistId));
  if (!raw) {
    return { checklistId, completedDocumentIds: [], updatedAt: new Date().toISOString() };
  }
  return JSON.parse(raw) as ChecklistProgress;
}

// Отметить документ как выполненный / снять отметку (тоггл).
export async function toggleDocumentComplete(
  checklistId: string,
  documentId: string
): Promise<ChecklistProgress> {
  const progress = await getChecklistProgress(checklistId);
  const isComplete = progress.completedDocumentIds.includes(documentId);

  const updated: ChecklistProgress = {
    ...progress,
    completedDocumentIds: isComplete
      ? progress.completedDocumentIds.filter((id) => id !== documentId)
      : [...progress.completedDocumentIds, documentId],
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(progressKey(checklistId), JSON.stringify(updated));
  return updated;
}

// Сбросить прогресс чек-листа.
export async function clearChecklistProgress(checklistId: string): Promise<void> {
  await AsyncStorage.removeItem(progressKey(checklistId));
}
