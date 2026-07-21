import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, ClipboardList, LayoutDashboard, Package, Palette, Truck, Users } from 'lucide-react';
import { cn } from '@/lib/cn';

interface NavItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Undefined = not built yet (FR-01 etc.) — rendered disabled rather than
   * linking somewhere broken. */
  to?: string;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
  { label: 'Items', icon: Package },
  { label: 'Stock', icon: ClipboardList },
  { label: 'Suppliers', icon: Truck },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Users', icon: Users },
  { label: 'Styleguide', icon: Palette, to: '/styleguide' },
];

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        if (!item.to) {
          return (
            <div
              key={item.label}
              className="flex min-h-11 items-center gap-3 rounded-full px-4 py-2.5 text-sm text-foreground-muted opacity-50"
              aria-disabled
            >
              <Icon className="h-4 w-4" />
              {item.label}
              <span className="ml-auto rounded-full bg-surface-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                Soon
              </span>
            </div>
          );
        }
        return (
          <NavLink
            key={item.label}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-foreground-muted transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground',
                isActive && 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/10 hover:text-accent-blue',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
