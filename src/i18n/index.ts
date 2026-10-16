// ─── Настройка i18next ────────────────────────────────────────────────────────
// Все строки UI проходят через t('ключ'). Никакого хардкода на русском/английском в компонентах.

import 'intl-pluralrules'; // полифилл для Intl.PluralRules на Android
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './ru.json';
import en from './en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
    },
    lng: 'ru',           // язык по умолчанию — русский (основная аудитория СНГ)
    fallbackLng: 'en',   // если ключ не найден в ru, берём из en
    interpolation: {
      escapeValue: false, // React уже экранирует XSS
    },
  });

export default i18n;
