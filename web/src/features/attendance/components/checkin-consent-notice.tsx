// The notice of the consent screen (Decree 13/2023): what is collected, who can see it and how long it is kept.
import { Camera, Eye, History, MapPin, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ITEMS: Array<{ key: 'location' | 'photo' | 'viewers' | 'retention'; icon: LucideIcon }> = [
  { key: 'location', icon: MapPin },
  { key: 'photo', icon: Camera },
  { key: 'viewers', icon: Eye },
  { key: 'retention', icon: History },
];

export function CheckinConsentNotice() {
  const { t } = useTranslation();
  return (
    <ul aria-label={t('mobileCheckin.consent.noticeLabel')} className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      {ITEMS.map(({ key, icon: Icon }) => (
        <li key={key} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-brand-blue-soft text-brand-blue [&_svg]:size-4 [&_svg]:stroke-[1.5]">
            <Icon />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold">{t(`mobileCheckin.consent.notice.${key}.title`)}</span>
            <span className="text-body-small text-ink-muted">{t(`mobileCheckin.consent.notice.${key}.text`)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
