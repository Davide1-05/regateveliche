import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations for all 5 languages
import enTranslations from './locales/en.json';
import itTranslations from './locales/it.json';
import deTranslations from './locales/de.json';
import frTranslations from './locales/fr.json';
import esTranslations from './locales/es.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      it: { translation: itTranslations },
      de: { translation: deTranslations },
      fr: { translation: frTranslations },
      es: { translation: esTranslations },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'it', 'de', 'fr', 'es'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;