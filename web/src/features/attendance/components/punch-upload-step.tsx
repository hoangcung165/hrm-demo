// Step 1 of the import, "Tải lên": the drop zone (the check starts as soon as a file is chosen), the recent imports under
// it, and what the file needs on the side.
import { FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { fileProblemMessage } from '../import-messages';
import type { PunchImport } from '../use-punch-import';
import { PunchColumnsHelp } from './punch-columns-help';
import { RecentPunchImports } from './recent-punch-imports';

export function PunchUploadStep({ wizard }: { wizard: PunchImport }) {
  const { t } = useTranslation();
  const { file, fileProblem, checkingFile } = wizard;
  return (
    <Card
      title={t('attendanceImport.chooseFile')}
      description={t('attendanceImport.chooseFileText')}
      actions={
        <Link to="/attendance" className={buttonVariants({ variant: 'secondary' })}>
          {t('attendanceImport.cancel')}
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start">
        <div className="flex flex-col gap-6">
          <FileDropZone
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            icon={<FileSpreadsheet />}
            title={t('attendanceImport.dropTitle')}
            helper={t('attendanceImport.dropHelper')}
            state={checkingFile ? 'busy' : fileProblem !== null ? 'error' : 'idle'}
            fileName={file?.name}
            fileSize={file?.size}
            statusText={t('attendanceImport.reading')}
            error={fileProblem !== null ? fileProblemMessage(fileProblem, file, t) : undefined}
            onSelect={wizard.select}
            onCancel={wizard.cancelCheck}
          />
          <RecentPunchImports />
        </div>
        <PunchColumnsHelp />
      </div>
    </Card>
  );
}
