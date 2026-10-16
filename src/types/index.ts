// ─── Все общие типы проекта ─────────────────────────────────────────────────
// Меняй здесь — изменения подтянутся по всему проекту автоматически.

// Гражданство пользователя (коды стран ISO)
export type Citizenship = 'RU' | 'KZ' | 'UZ' | 'KG' | 'OTHER';

// Статус визы
export type VisaStatus =
  | 'D-2'        // студенческая
  | 'D-4'        // языковые курсы
  | 'D-10'       // поиск работы
  | 'E-7'        // специалист (рабочая)
  | 'F-4'        // этнический кореец (고려인)
  | 'F-2'        // резидент
  | 'F-5'        // постоянный резидент
  | 'F-6'        // супруг/а гражданина Кореи
  | 'G-1'        // беженец / гуманитарная
  | 'H-2'        // рабочий отпуск для этнических корейцев
  | 'NOT_ARRIVED'; // ещё не приехал

// Цель визита — выбирается на шаге 3 онбординга (опционально)
export type UserIntent =
  | 'EXTEND'
  | 'CHANGE_STATUS'
  | 'REGISTER_ARC'
  | 'FIND_JOB';

// Язык интерфейса
export type AppLanguage = 'ru' | 'en';

// Профиль пользователя — хранится в AsyncStorage под ключом "userProfile"
export interface UserProfile {
  citizenship: Citizenship;
  visaStatus: VisaStatus;
  intent?: UserIntent;
  visaExpiryDate?: string; // ISO-дата, напр. "2025-12-31"
  language: AppLanguage;
  createdAt: string;       // ISO-дата создания профиля
}

// Локализованная строка (русский + английский)
export interface LocalizedString {
  ru: string;
  en: string;
}

// Детальная информация по одному документу — отображается при нажатии ℹ
export interface DocumentDetail {
  how: LocalizedString;           // как получить
  where: LocalizedString;         // где получить
  hours?: LocalizedString;        // часы работы (текст)
  hoursType?: 'immigration' | 'bank' | 'photo' | 'school'; // для авто-расчёта открыто/закрыто
  mapQuery?: string;              // поисковый запрос для карт (на корейском)
  koreanPhrase?: LocalizedString; // что сказать — текст + транслитерация + перевод
  onlineUrl?: string;             // если можно оформить онлайн
  tip?: LocalizedString;          // дополнительный совет
}

// Один документ в чек-листе
export interface ChecklistDocument {
  id: string;
  label: LocalizedString;
  detail?: DocumentDetail;
}

// Полный чек-лист одной процедуры (берётся из /content/checklists/*.json)
export interface Checklist {
  id: string;                            // напр. "d2-extension"
  visaStatus: VisaStatus;
  procedure: 'EXTEND' | 'CHANGE_STATUS' | 'REGISTER_ARC' | 'PART_TIME_WORK' | 'REENTRY_PERMIT' | 'ADDRESS_CHANGE';
  title: LocalizedString;
  documents: ChecklistDocument[];
  when: LocalizedString;                 // когда подавать
  fee: LocalizedString;                  // размер пошлины
  whereUrl: string;                      // ссылка на hikorea
  source: string;                        // напр. "HiKorea"
  lastUpdated: string;                   // ISO-дата последней проверки данных
}

// Один вопрос-ответ для бота (берётся из /content/qa.json)
export interface QAItem {
  id: string;
  question: LocalizedString;
  answer: LocalizedString;
  visaStatus?: VisaStatus;  // если вопрос специфичен для одной визы
  sourceUrl?: string;       // ссылка на источник (hikorea или другой)
}

// Прогресс чек-листа — хранится в AsyncStorage
// Ключ: "checklist_progress_{checklistId}", значение: массив id выполненных документов
export interface ChecklistProgress {
  checklistId: string;
  completedDocumentIds: string[];
  updatedAt: string; // ISO
}
