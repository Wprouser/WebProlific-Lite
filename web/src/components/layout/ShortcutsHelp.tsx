import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';

const shortcuts: { keys: string; descriptionKey: string }[] = [
  { keys: 'Ctrl K', descriptionKey: 'openSearch' },
  { keys: '/', descriptionKey: 'openSearchNotTyping' },
  { keys: 'Esc', descriptionKey: 'closeModal' },
  { keys: '?', descriptionKey: 'showPanel' },
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
  const { t } = useTranslation();
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('shortcuts.title')}>
      <dl className="flex flex-col gap-3">
        {shortcuts.map((s) => (
          <div key={s.keys} className="flex items-center justify-between gap-4">
            <dt className="text-sm text-foreground-muted">{t(`shortcuts.${s.descriptionKey}`)}</dt>
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
