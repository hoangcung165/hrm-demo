import { ProfileExpatSection } from './profile-expat-section';
import { ProfileAttachmentsSection } from './profile-attachments-section';

export function ProfileDocumentsSection({ employeeId, canEdit, canReadFiles, onDirtyChange }: {
  employeeId: string; canEdit: boolean; canReadFiles: boolean; onDirtyChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <ProfileExpatSection employeeId={employeeId} canEdit={canEdit} onDirtyChange={onDirtyChange} />
      <ProfileAttachmentsSection employeeId={employeeId} canEdit={canEdit} canRead={canReadFiles} />
    </div>
  );
}
