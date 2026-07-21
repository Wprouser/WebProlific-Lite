import { AlertTriangle, DollarSign, Package, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

const stats = [
  {
    // Kept short (matches sibling label lengths) so it never wraps to a
    // second line at any grid width — that wrap was what made the hero
    // card taller than its siblings, not its padding.
    label: 'Low stock items',
    value: '3',
    icon: AlertTriangle,
    hero: true,
  },
  { label: 'Total items', value: '482', icon: Package, accentClass: 'bg-accent-blue/10 text-accent-blue' },
  { label: 'Stock valuation', value: '$128,940', icon: DollarSign, accentClass: 'bg-info/10 text-info' },
  {
    label: 'Wastage (7d)',
    value: '$1,240',
    icon: TrendingDown,
    accentClass: 'bg-accent-blue/10 text-accent-blue',
    trend: { label: '-4%', variant: 'success-solid' as const },
  },
];

/**
 * FR-17 demo screen: "the single most important number on any screen ...
 * should be the most visually prominent element." All four KPI cards are
 * equal-sized siblings in one compact row — the hero card earns its focal
 * status from the solid light-blue/periwinkle gradient + white text alone,
 * not from extra height or a separate section above the fold. Mock data —
 * no FR-01/FR-07 backend to read from yet.
 */
export function Dashboard() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-xl font-semibold text-foreground">
        Overview <span className="font-sans text-sm font-normal text-foreground-muted">— Jeddah Hotel, Main Restaurant</span>
      </h1>

      <div className="grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 tablet:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              'shadow-md transition-shadow duration-200',
              stat.hero
                ? 'border-none bg-gradient-to-br from-accent-blue-light to-accent-blue shadow-lg'
                : 'hover:shadow-lg',
            )}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-0">
              <CardDescription className={cn('truncate', stat.hero && 'text-white/80')}>{stat.label}</CardDescription>
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  stat.hero ? 'bg-white/15 text-white' : stat.accentClass,
                )}
              >
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <p className={cn('font-display text-2xl font-bold', stat.hero ? 'text-white' : 'text-foreground')}>
                {stat.value}
              </p>
              {stat.trend && <Badge variant={stat.trend.variant}>{stat.trend.label}</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
