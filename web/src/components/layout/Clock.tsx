import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Global Header's Date/Time segment — updates every minute, not every
 * second (nothing here needs second-level precision, and it avoids
 * needless re-renders). Formats using the active UI language, per FR-15's
 * "numbers, dates, and currency amounts remain correctly formatted and
 * left-to-right" — the `-u-nu-latn` extension keeps digits Western even
 * in locales (like Arabic) that would otherwise default to native
 * numerals. */
export function Clock() {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(`${i18n.language}-u-nu-latn`, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }),
    [i18n.language],
  );

  return <span>{formatter.format(now)}</span>;
}
