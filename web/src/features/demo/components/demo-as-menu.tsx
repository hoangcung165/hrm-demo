// "Demo as…" (design spec 1.6 and the `#04 Demo as…` artboards on issue #6): a button that opens the persona
// Menu. Not rendered at all while the demo flag is off. `header` names the active persona by title; `drawer`
// (the nav drawer below md) by role, full width.
import { ChevronDown, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PersonMenu, type PersonMenuItem } from '@/components/ui/person-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DemoPersona } from '../api';
import { useDemoSwitch } from '../use-demo-switch';

export type DemoAsMenuProps = {
  variant?: 'header' | 'drawer';
  /** Called after a switch went through, e.g. to close the drawer. */
  onSwitched?: () => void;
  className?: string;
};

export function DemoAsMenu({ variant = 'header', onSwitched, className }: DemoAsMenuProps) {
  const { t } = useTranslation();
  const demo = useDemoSwitch();
  if (!demo.enabled) return null;

  const activeName = variant === 'drawer' ? (demo.activeKey ? t(`role.${demo.activeKey}`) : null) : (demo.active?.title ?? null);
  const label = activeName ? t('demo.buttonActive', { title: activeName }) : t('demo.button');
  const caption = (persona: DemoPersona) => {
    if (!persona.available) return t('demo.unavailable');
    const role = t(`role.${persona.persona}`);
    return role.toLocaleLowerCase() === persona.title.toLocaleLowerCase() ? persona.title : t('demo.personaCaption', { role, title: persona.title });
  };
  const items: PersonMenuItem[] = (demo.personas.data ?? []).map((persona) => ({
    id: persona.persona,
    name: persona.fullName,
    caption: caption(persona),
    current: persona.persona === demo.activeKey,
    disabled: !persona.available,
    onSelect: () => demo.switchTo(persona, onSwitched),
  }));

  return (
    <PersonMenu
      heading={t('demo.menuLabel')}
      items={items}
      status={items.length === 0 ? <DemoAsStatus loading={demo.personas.isPending} failed={demo.personas.isError} /> : undefined}
      onOpenChange={(open) => open && demo.refresh()}
      trigger={
        <Button
          variant="secondary"
          size={variant === 'drawer' ? 'md' : 'sm'}
          disabled={demo.switching}
          // The trailing chevron is 16px, the Users icon keeps the 20px of button icons.
          className={cn('[&_svg:last-child]:size-4', variant === 'drawer' ? 'h-11 w-full justify-start' : 'max-w-60 shrink-0', className)}
        >
          <Users aria-hidden="true" />
          <span className={cn('truncate', variant === 'drawer' && 'flex-1 text-left')}>{label}</span>
          <ChevronDown aria-hidden="true" className="text-ink-muted" />
        </Button>
      }
    />
  );
}

/** What the Menu shows while there is no persona to list: loading, a load error, or none at all. */
function DemoAsStatus({ loading, failed }: { loading: boolean; failed: boolean }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div role="status" aria-label={t('state.loading')} className="flex flex-col">
        {[0, 1, 2].map((row) => (
          <span key={row} className="flex h-14 items-center gap-3 px-3">
            <Skeleton shape="circle" />
            <span className="flex flex-1 flex-col gap-2">
              <Skeleton className="w-32" />
              <Skeleton className="w-44" />
            </span>
          </span>
        ))}
      </div>
    );
  }
  if (failed) return <p className="px-3 py-3 text-body-small text-danger">{t('demo.loadError')}</p>;
  return <p className="px-3 py-3 text-body-small text-ink-muted">{t('demo.empty')}</p>;
}
