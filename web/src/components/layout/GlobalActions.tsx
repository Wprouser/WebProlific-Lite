import { type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import {
  Download,
  Globe,
  HelpCircle,
  LayoutDashboard,
  MoreHorizontal,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { languages, type LanguageCode } from '@/i18n/languages';

export type Language = LanguageCode;

export interface GlobalActionsProps {
  onOpenHelp: () => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

const dropdownItemClass =
  'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-150 hover:bg-surface-secondary data-[highlighted]:bg-surface-secondary';

/**
 * FR-17 Global App Chrome, Global Actions: "Print, Export, Refresh,
 * Language, Help, Back to Dashboard." Print/Refresh are genuinely
 * functional (window.print / reload) since those work regardless of what
 * screen exists; Export is honestly a stub — there's no report/PO/GRN
 * screen yet to export from (FR-04/FR-10). Language switches via i18next
 * (FR-15) — real translations across all four launch languages, not just
 * a dir/lang flip.
 *
 * Six actions don't fit a phone *or tablet* header without cramming — a
 * kitchen tablet at ~768-1024px is exactly the constrained case this
 * product cares about. Exported as two pieces so GlobalHeader can place
 * them in different rows (`GlobalActionsRow` in the desktop-only utility
 * row, `GlobalActionsMenu` inline in the primary row on phone/tablet) —
 * this component doesn't decide visibility itself. Theme toggle stays
 * outside both (always visible, already-shipped UX, not disrupting it).
 */
export function GlobalActionsRow({ onOpenHelp, language, onChangeLanguage }: GlobalActionsProps) {
  const { t } = useTranslation();
  const print = () => window.print();
  const refresh = () => window.location.reload();

  return (
    <div className="flex items-center gap-1">
      <IconActionButton label={t('common.print')} icon={Printer} onClick={print} />
      <ExportButton />
      <IconActionButton label={t('common.refresh')} icon={RefreshCw} onClick={refresh} />
      <LanguageSwitcher language={language} onChange={onChangeLanguage} />
      <IconActionButton label={t('common.help')} icon={HelpCircle} onClick={onOpenHelp} />
      <Link
        to="/"
        aria-label={t('common.backToDashboard')}
        title={t('common.backToDashboard')}
        className="flex h-12 w-12 items-center justify-center rounded-md text-foreground-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <LayoutDashboard className="h-5 w-5" />
      </Link>
    </div>
  );
}

export function GlobalActionsMenu({ onOpenHelp, language, onChangeLanguage }: GlobalActionsProps) {
  const { t } = useTranslation();
  const print = () => window.print();
  const refresh = () => window.location.reload();
  const currentLanguage = languages.find((l) => l.code === language) ?? languages[0]!;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={t('common.moreActions')}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-lg border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item onSelect={print} className={dropdownItemClass}>
            <Printer className="h-4 w-4 text-foreground-muted" /> {t('common.print')}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={(e) => e.preventDefault()}
            className={cn(dropdownItemClass, 'text-foreground-muted')}
          >
            <Download className="h-4 w-4 text-foreground-muted" />
            {t('common.export')} {t('export.menuItemSuffix')}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={refresh} className={dropdownItemClass}>
            <RefreshCw className="h-4 w-4 text-foreground-muted" /> {t('common.refresh')}
          </DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={dropdownItemClass}>
              <Globe className="h-4 w-4 text-foreground-muted" />
              {t('common.language')}: {currentLanguage.nativeLabel}
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                className="z-50 w-44 rounded-lg border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
              >
                {languages.map((l) => (
                  <DropdownMenu.Item
                    key={l.code}
                    onSelect={() => onChangeLanguage(l.code)}
                    className={cn(dropdownItemClass, l.code === language && 'text-accent-blue')}
                  >
                    {l.nativeLabel}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <DropdownMenu.Item onSelect={onOpenHelp} className={dropdownItemClass}>
            <HelpCircle className="h-4 w-4 text-foreground-muted" /> {t('common.help')}
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={dropdownItemClass}>
            <Link to="/">
              <LayoutDashboard className="h-4 w-4 text-foreground-muted" /> {t('common.backToDashboard')}
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function IconActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-12 w-12 items-center justify-center rounded-md text-foreground-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function ExportButton() {
  const { t } = useTranslation();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label={t('common.export')}
          title={t('common.export')}
          className="flex h-12 w-12 items-center justify-center rounded-md text-foreground-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Download className="h-5 w-5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 max-w-64 rounded-lg border border-border bg-surface p-3 text-sm text-foreground-muted shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          {t('export.popoverBody')}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * The FR-15 language switcher — exported so the pre-auth Login screen can
 * reuse the exact same control/mechanism the authenticated Global Actions
 * bar uses, per the spec's "always reachable, not buried" requirement now
 * extending to before sign-in too.
 */
export function LanguageSwitcher({
  language,
  onChange,
}: {
  language: Language;
  onChange: (lang: Language) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={t('common.language')}
          className="flex h-12 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-foreground-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Globe className="h-4 w-4" />
          {language.toUpperCase()}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-44 rounded-lg border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          {languages.map((l) => (
            <DropdownMenu.Item
              key={l.code}
              onSelect={() => onChange(l.code)}
              className={cn(dropdownItemClass, l.code === language && 'text-accent-blue')}
            >
              {l.nativeLabel}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
