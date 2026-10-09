// Step 1 of the import, "Tải lên": the drop zone (the check starts as soon as a file is chosen) and the template.
import { FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { importFileMessage } from '../import-messages';
import type { EmployeeImport } from '../use-employee-import';
import { EmployeeTemplateAlert } from './employee-template-alert';

export function ImportUploadStep({ wizard }: { wizard: EmployeeImport }) {
  const { t } = useTranslation();
  const { file, fileProblem, checkingFile } = wizard;
  return (
    <Card
      title={t('employees.import.chooseFile')}
      actions={
        <Link to="/employees" className={buttonVariants({ variant: 'secondary' })}>
          {t('employees.import.cancel')}
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:items-start">
        <FileDropZone
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          icon={<FileSpreadsheet />}
          title={t('employees.import.dropTitle')}
          helper={t('employees.import.dropHelper')}
          state={checkingFile ? 'busy' : fileProblem !== null ? 'error' : 'idle'}
          fileName={file?.name}
          fileSize={file?.size}
          statusText={t('employees.import.reading')}
          error={fileProblem !== null ? importFileMessage(fileProblem, file, t) : undefined}
          onSelect={wizard.select}
          onCancel={wizard.cancelCheck}
        />
        <EmployeeTemplateAlert />
      </div>
    </Card>
  );
}
