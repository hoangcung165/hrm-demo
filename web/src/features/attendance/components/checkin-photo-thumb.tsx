// "Photo thumb button" of a mobile punch row (HRM-39, proposed on the main canvas row `#39`), on the Chấm công hôm nay
// card and in the day drawer of Công theo ngày. The photo of a punch is not fetched with the list, only when tapped:
// every read of a photo is recorded in the Audit log (design decision 5), so rows never load them on their own. The
// photo opens in a Dialog.
import { Camera } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Loading } from '@/components/ui/loading';
import { ApiError } from '@/lib/api';
import { formatCompanyTime } from '@/lib/format';
import { usePunchPhoto, type CheckinPunch } from '../mobile-checkin-api';

/** Only the id and the instant are needed: the card's punch and a punch of the day drawer both fit. */
export type CheckinPhotoThumbProps = { punch: Pick<CheckinPunch, 'id' | 'at'> };

/** Mounted only while the Dialog is open: each opening reads the photo again, and the object URL is released on close. */
function PunchPhoto({ punch }: CheckinPhotoThumbProps) {
  const { t } = useTranslation();
  const photo = usePunchPhoto(punch.id, true);
  const url = photo.data;
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  if (photo.isPending) return <Loading rows={1} label={t('mobileCheckin.photo.loading')} />;
  if (url) return <img src={url} alt={t('mobileCheckin.photo.alt', { time: formatCompanyTime(punch.at) })} className="mx-auto max-h-[60dvh] rounded-md" />;
  // The API answers 404 for a photo the caller may not see as for one that is gone: the words say both.
  const hidden = photo.error instanceof ApiError && photo.error.status === 404;
  return (
    <p role="alert" className="text-body-small text-danger">
      {t(hidden ? 'mobileCheckin.photo.notFound' : 'mobileCheckin.photo.error')}
    </p>
  );
}

export function CheckinPhotoThumb({ punch }: CheckinPhotoThumbProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const time = formatCompanyTime(punch.at);
  return (
    <>
      <Button variant="secondary" size="icon" aria-label={t('mobileCheckin.photo.open', { time })} onClick={() => setOpen(true)} className="shrink-0 max-md:size-11">
        <Camera aria-hidden="true" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t('mobileCheckin.photo.title', { time })}
        description={t('mobileCheckin.photo.audited')}
        footer={<Button variant="secondary" onClick={() => setOpen(false)}>{t('dialog.close')}</Button>}
      >
        {open ? <PunchPhoto punch={punch} /> : null}
      </Dialog>
    </>
  );
}
