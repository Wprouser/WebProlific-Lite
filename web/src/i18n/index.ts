import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import ur from './locales/ur.json';

/**
 * FR-15: data-driven language packs (one JSON resource file per language +
 * the `languages` registry) so adding a language later is a content task,
 * not a code change — see `./languages` for the registry entries this
 * resources map must stay in sync with.
 *
 * LanguageDetector persists the choice to localStorage (falling back to
 * `en`) so a real page reload — not just client-side navigation — keeps
 * the selected language, which is what "selectable from the Login screen"
 * implies in practice.
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      hi: { translation: hi },
      ur: { translation: ur },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar', 'hi', 'ur'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    // Missing keys still render (falling back to `en`, or the raw key if
    // even `en` lacks it) but get flagged here for translator follow-up —
    // "logged," not silently swallowed. A real backend would forward this
    // to a translation-ops queue instead of console.warn.
    saveMissing: true,
    missingKeyHandler: (languages, namespace, key) => {
      console.warn(`[i18n] Missing translation key "${key}" in namespace "${namespace}" for: ${languages.join(', ')}`);
    },
  });

export default i18n;
