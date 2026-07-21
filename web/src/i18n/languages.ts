/**
 * FR-15's `Language` registry, frontend-side. Mirrors the shape of the
 * spec's `Language` Prisma model (code, label, direction) without the
 * backend model/API — those are out of scope here since nothing in web/
 * talks to the real backend yet (same "mock/local" scope as every other
 * screen built so far). Adding a language later means adding one entry
 * here + one resource file in `./locales`, no component changes.
 */
export interface LanguageDefinition {
  code: 'en' | 'ar' | 'hi' | 'ur';
  label: string;
  nativeLabel: string;
  direction: 'ltr' | 'rtl';
}

export const languages: LanguageDefinition[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', direction: 'rtl' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', direction: 'ltr' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', direction: 'rtl' },
];

export type LanguageCode = LanguageDefinition['code'];

export function getLanguageDirection(code: string): 'ltr' | 'rtl' {
  return languages.find((l) => l.code === code)?.direction ?? 'ltr';
}
