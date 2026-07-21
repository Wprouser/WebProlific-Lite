import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguageDirection, type LanguageCode } from './languages';

/**
 * Shared by every screen that needs to read/change the active language
 * (`AppShell` for authenticated screens, `Login` pre-auth) so the dir/lang
 * flip logic lives in one place instead of being reimplemented per screen.
 */
export function useAppLanguage() {
  const { i18n } = useTranslation();
  const language = i18n.language as LanguageCode;

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = getLanguageDirection(language);
  }, [language]);

  function changeLanguage(lang: LanguageCode) {
    void i18n.changeLanguage(lang);
  }

  return { language, changeLanguage };
}
