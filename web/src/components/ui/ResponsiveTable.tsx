import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ResponsiveTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface ResponsiveTableProps<T> {
  columns: ResponsiveTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  emptyState?: ReactNode;
}

/**
 * FR-17's "explicit narrow-viewport strategy decided per-screen up front":
 * a normal table at `md:`+, stacked label/value cards below it — built once
 * here so item lists, PO tables, and reports (FR-01+) consume this instead
 * of each screen re-deciding (or forgetting) a strategy and letting a wide
 * table overflow.
 *
 * Both markups render into the DOM simultaneously; CSS (`hidden md:block` /
 * `md:hidden`) picks the visible one per viewport — no JS media-query
 * tracking needed, and it degrades gracefully with CSS disabled.
 */
export function ResponsiveTable<T>({ columns, data, getRowKey, emptyState }: ResponsiveTableProps<T>) {
  if (data.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary text-left text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn('px-5 py-4', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => (
              <tr
                key={getRowKey(row)}
                className="transition-colors duration-150 hover:bg-surface-secondary/70"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-5 py-4 text-foreground', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {data.map((row) => (
          <div
            key={getRowKey(row)}
            className="rounded-lg border border-border bg-surface p-5 shadow-sm transition-colors duration-150"
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex items-center justify-between gap-4 py-1.5 first:pt-0 last:pb-0"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  {col.header}
                </span>
                <span className="text-right text-base text-foreground">{col.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
