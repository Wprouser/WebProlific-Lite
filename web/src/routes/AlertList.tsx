import { useParams } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/ui/EmptyState';
import { mockAlertBar } from '@/lib/fixtures';

/**
 * Destination for Global Alert Bar clicks (FR-17 Global App Chrome AC:
 * "navigates directly to the correctly filtered underlying list, not a
 * generic alerts page requiring further filtering"). Genuinely filtered by
 * the :type param — but FR-07 (Alerts) and FR-04 (PO/GRN approval) aren't
 * built, so there's no real list to show yet. Honest stub rather than a
 * fake data table.
 */
export function AlertList() {
  const { t } = useTranslation();
  const { type } = useParams<{ type: string }>();
  const alert = mockAlertBar.find((a) => a.type === type);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {alert ? t(`alerts.${alert.type}`) : 'Alerts'}
        </h1>
        <p className="mt-1.5 text-base text-foreground-muted">
          Filtered view: <code className="rounded bg-surface-secondary px-1.5 py-0.5 text-sm">{type}</code>
        </p>
      </div>
      <EmptyState
        icon={<Bell className="h-7 w-7" />}
        title={alert ? `${alert.count} item${alert.count === 1 ? '' : 's'} would show here` : 'Nothing here yet'}
        description="This route is correctly wired from the Global Alert Bar, but the underlying list (FR-07 Alerts / FR-04 approvals) isn't built yet."
      />
    </div>
  );
}
