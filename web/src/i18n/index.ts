import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';

export const LANGUAGES = ['vi', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = 'hrm.lang';

function storedLanguage(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

export function setLanguage(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage unavailable (private mode): keep the choice for this session only.
  }
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: storedLanguage(),
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },
});

export default i18n;
