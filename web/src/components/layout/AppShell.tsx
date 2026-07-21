import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';
import { AlertBar } from './AlertBar';
import { NavDrawer } from './NavDrawer';
import { NavList } from './nav-items';
import { GlobalSearchDialog } from './GlobalSearch';
import { ShortcutsHelp } from './ShortcutsHelp';
import type { Language } from './GlobalActions';
import { useKeyboardShortcut } from '@/lib/use-keyboard-shortcut';
import { mockCurrentUser } from '@/lib/fixtures';

/**
 * FR-17's dashboard/navigation shell, now also the Global App Chrome
 * container: GlobalHeader (breadcrumb/search/user), AlertBar, the
 * persistent sidebar (`lg:`+) / hamburger-drawer (below it), and the two
 * app-wide overlays (search command palette, shortcuts help) plus their
 * keyboard shortcuts.
 */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('en');

  // Real dir/lang flip — genuinely functional. No translated strings yet
  // (that's FR-15), so English text will render right-to-left when AR is
  // selected; this proves the mechanism, not the translations.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useKeyboardShortcut({ key: 'k', ctrlOrCmd: true, ignoreWhenTyping: false, handler: () => setSearchOpen(true) });
  useKeyboardShortcut({ key: '/', handler: () => setSearchOpen(true) });
  useKeyboardShortcut({ key: '?', handler: () => setHelpOpen(true) });

  return (
    // Flush, full-bleed layout on a clean light-gray background — the v3
    // lavender-canvas/floating-panel treatment is reverted per feedback.
    <div className="min-h-dvh bg-background">
      <GlobalHeader
        onOpenDrawer={() => setDrawerOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenHelp={() => setHelpOpen(true)}
        language={language}
        onChangeLanguage={setLanguage}
      />
      <AlertBar />

      <div className="flex">
        <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface p-4 lg:flex">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue-light to-accent-blue text-sm font-bold text-white shadow-sm">
              W
            </span>
            <span className="font-display text-lg font-semibold text-foreground">WebProlific</span>
          </div>

          <div className="flex items-center gap-3 rounded-md bg-surface-secondary p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-sm font-semibold text-accent-blue">
              {mockCurrentUser.initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">{mockCurrentUser.name}</span>
              <span className="block truncate text-xs text-foreground-muted">{mockCurrentUser.effectiveRole}</span>
            </span>
          </div>

          <NavList />
        </aside>
        <main className="min-w-0 flex-1 p-4 tablet:p-6">
          <Outlet />
        </main>
      </div>

      <NavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
