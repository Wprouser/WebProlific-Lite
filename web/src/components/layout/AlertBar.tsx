import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { mockAlertBar } from '@/lib/fixtures';
import { cn } from '@/lib/cn';

// Pastel-tinted, not solid-fill — refined status pills rather than loud
// ones, while the amber/red hue families still keep severities distinct.
const severityClasses: Record<'warning' | 'danger', string> = {
  warning: 'bg-warning/15 text-warning hover:bg-warning/25',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
};

/**
 * FR-17 Global App Chrome, Global Alert Bar: "sourced directly from FR-07
 * (Alerts) and FR-04's variance-approval workflow... each badge shows a
 * count and is clickable, jumping straight to the filtered list." Mocked
 * via fixtures.mockAlertBar since neither backend exists yet. Collapses to
 * a single summary chip below `tablet:` — five separate badges don't fit a
 * phone width without cramming, and a chef mid-service needs "something
 * needs attention, tap here," not five simultaneous labels.
 */
export function AlertBar() {
  const total = mockAlertBar.reduce((sum, a) => sum + a.count, 0);
  const mostUrgent = mockAlertBar.find((a) => a.severity === 'danger') ?? mockAlertBar[0];

  return (
    <div className="border-b border-border bg-surface px-5 py-2 tablet:px-8">
      <div className="tablet:hidden">
        {total === 0 || !mostUrgent ? (
          <span className="text-sm text-foreground-muted">No alerts right now</span>
        ) : (
          <Link
            to={`/alerts/${mostUrgent.type}`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200',
              severityClasses[mostUrgent.severity],
            )}
          >
            <Bell className="h-3.5 w-3.5" />
            {total} alert{total === 1 ? '' : 's'} need attention
          </Link>
        )}
      </div>

      <div className="hidden flex-wrap items-center gap-2 tablet:flex">
        {total === 0 ? (
          <span className="text-sm text-foreground-muted">No alerts right now</span>
        ) : (
          mockAlertBar.map((alert) => (
            <Link
              key={alert.type}
              to={`/alerts/${alert.type}`}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-200',
                severityClasses[alert.severity],
              )}
            >
              {alert.label} <span className="font-semibold">{alert.count}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
