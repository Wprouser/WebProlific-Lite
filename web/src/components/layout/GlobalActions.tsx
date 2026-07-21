import { type ComponentType } from 'react';
import { Link } from 'react-router-dom';
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

export type Language = 'en' | 'ar';

export interface GlobalActionsProps {
  onOpenHelp: () => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
}

const dropdownItemClass =
  'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-150 hover:bg-surface-secondary data-[highlighted]:bg-surface-secondary';

/**
 * FR-17 Global App Chrome, Global Actions: "Print, Export, Refresh,
 * Language: EN/AR, Help, Back to Dashboard." Print/Refresh are genuinely
 * functional (window.print / reload) since those work regardless of what
 * screen exists; Export is honestly a stub — there's no report/PO/GRN
 * screen yet to export from (FR-04/FR-10). Language flips document
 * dir/lang for real, but translates nothing — that's FR-15, not built.
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
  const print = () => window.print();
  const refresh = () => window.location.reload();

  return (
    <div className="flex items-center gap-1">
      <IconActionButton label="Print" icon={Printer} onClick={print} />
      <ExportButton />
      <IconActionButton label="Refresh" icon={RefreshCw} onClick={refresh} />
      <LanguageSwitcher language={language} onChange={onChangeLanguage} />
      <IconActionButton label="Help" icon={HelpCircle} onClick={onOpenHelp} />
      <Link
        to="/"
        aria-label="Back to Dashboard"
        title="Back to Dashboard"
        className="flex h-12 w-12 items-center justify-center rounded-md text-foreground-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <LayoutDashboard className="h-5 w-5" />
      </Link>
    </div>
  );
}

export function GlobalActionsMenu({ onOpenHelp, language, onChangeLanguage }: GlobalActionsProps) {
  const print = () => window.print();
  const refresh = () => window.location.reload();
  const toggleLanguage = () => onChangeLanguage(language === 'en' ? 'ar' : 'en');

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="More actions"
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
            <Printer className="h-4 w-4 text-foreground-muted" /> Print
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={(e) => e.preventDefault()}
            className={cn(dropdownItemClass, 'text-foreground-muted')}
          >
            <Download className="h-4 w-4 text-foreground-muted" />
            Export (nothing to export here)
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={refresh} className={dropdownItemClass}>
            <RefreshCw className="h-4 w-4 text-foreground-muted" /> Refresh
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={toggleLanguage} className={dropdownItemClass}>
            <Globe className="h-4 w-4 text-foreground-muted" />
            Language: {language === 'en' ? 'English' : 'العربية'}
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={onOpenHelp} className={dropdownItemClass}>
            <HelpCircle className="h-4 w-4 text-foreground-muted" /> Help
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild className={dropdownItemClass}>
            <Link to="/">
              <LayoutDashboard className="h-4 w-4 text-foreground-muted" /> Back to Dashboard
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
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          aria-label="Export"
          title="Export"
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
          Nothing to export on this screen yet — Print/Export apply contextually once a real report/PO/GRN screen exists.
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function LanguageSwitcher({
  language,
  onChange,
}: {
  language: Language;
  onChange: (lang: Language) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Change language"
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
          className="z-50 w-40 rounded-lg border border-border bg-surface p-1.5 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item
            onSelect={() => onChange('en')}
            className={cn(dropdownItemClass, language === 'en' && 'text-primary')}
          >
            English
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => onChange('ar')}
            className={cn(dropdownItemClass, language === 'ar' && 'text-primary')}
          >
            العربية
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
