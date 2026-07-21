import { Modal } from '@/components/ui/Modal';

const shortcuts: { keys: string; description: string }[] = [
  { keys: 'Ctrl K', description: 'Open global search' },
  { keys: '/', description: 'Open global search (when not typing in a field)' },
  { keys: 'Esc', description: 'Close the open modal or drawer' },
  { keys: '?', description: 'Show this shortcuts panel' },
];

export interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * FR-17 "Keyboard-Driven Operation": the `?` overlay showing shortcuts for
 * the current screen. Only the app-wide shortcuts are listed for now —
 * per-screen ones (Ctrl+N, grid navigation) get added as those screens
 * exist; there's nothing to create yet, so Ctrl+N isn't wired anywhere.
 */
export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Keyboard shortcuts">
      <dl className="flex flex-col gap-3">
        {shortcuts.map((s) => (
          <div key={s.keys} className="flex items-center justify-between gap-4">
            <dt className="text-sm text-foreground-muted">{s.description}</dt>
            <dd>
              <kbd className="rounded border border-border-strong bg-surface-secondary px-2 py-1 text-xs font-medium text-foreground">
                {s.keys}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
