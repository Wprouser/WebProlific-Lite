import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LanguageSwitcher } from '@/components/layout/GlobalActions';
import { useAppLanguage } from '@/i18n/useAppLanguage';

/**
 * Minimal FR-13 Login screen — just enough to be a real pre-auth screen to
 * hang FR-15's "language switcher available before authentication"
 * requirement on. Not wired to the real `/auth/login` + `/auth/2fa/verify`
 * backend flow (LoginDto/VerifyTwoFactorDto) yet — that's the rest of
 * FR-13's frontend, still to be built. Local state + a no-op submit only,
 * same "mock until the real backend is wired" scope as every other screen
 * in web/ so far.
 */
export function Login() {
  const { t } = useTranslation();
  const { language, changeLanguage } = useAppLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // No backend wiring yet — this is a UI-only stub (see file header).
    window.setTimeout(() => setSubmitting(false), 600);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex justify-end p-4">
        <LanguageSwitcher language={language} onChange={changeLanguage} />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="flex flex-col gap-6 pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue-light to-accent-blue text-base font-bold text-white shadow-sm">
                W
              </span>
              <div>
                <h1 className="font-display text-xl font-semibold text-foreground">{t('login.title')}</h1>
                <p className="mt-1 text-sm text-foreground-muted">{t('login.subtitle')}</p>
              </div>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                  {t('login.email')}
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                    {t('login.password')}
                  </label>
                  <a href="#" className="text-sm text-accent-blue hover:underline">
                    {t('login.forgotPassword')}
                  </a>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" size="lg" disabled={submitting} className="mt-2">
                {submitting ? t('login.signingIn') : t('login.signIn')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
