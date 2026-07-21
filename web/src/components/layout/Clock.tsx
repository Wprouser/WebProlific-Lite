import { useEffect, useState } from 'react';

const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** Global Header's Date/Time segment — updates every minute, not every
 * second (nothing here needs second-level precision, and it avoids
 * needless re-renders). */
export function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return <span>{formatter.format(now)}</span>;
}
