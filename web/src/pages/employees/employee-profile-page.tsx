// Hồ sơ nhân viên (HRM-06, pattern P3): the header and ten tabs, the tab in `?tab=`. Cá nhân and Công việc have
// read views, and their cards are edited in place one at a time; the other tabs say what they will hold. Readable
// with EMPLOYEE_VIEW within the data scope, and by every Account for its own Employee. "Sửa" needs EMPLOYEE_EDIT
// (identity numbers also EMPLOYEE_SENSITIVE_VIEW). Leaving or switching tab with unsaved changes asks first.
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { UnsavedChangesGuard } from '@/components/layout/unsaved-changes-guard';
import { buttonVariants } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { useCurrentAccount } from '@/features/auth/account-context';
import { useEmployee } from '@/features/employee/api';
import { ProfileContractsSection } from '@/features/contract/components/profile-contracts-section';
import { EmployeeProfileHeader } from '@/features/employee/components/employee-profile-header';
import { EmployeeTabPlaceholder } from '@/features/employee/components/employee-tab-placeholder';
import { ProfileBankSection } from '@/features/employee/components/profile-bank-section';
import { ProfileCertificatesSection } from '@/features/employee/components/profile-certificates-section';
import { ProfileDependentsSection } from '@/features/employee/components/profile-dependents-section';
import { ProfileInsuranceSection } from '@/features/employee/components/profile-insurance-section';
import { ProfileDocumentsSection } from '@/features/employee/components/profile-documents-section';
import { ProfileProjectsSection } from '@/features/employee/components/profile-projects-section';
import { ProfileSkillsSection } from '@/features/employee/components/profile-skills-section';
import { ProfileEditContext, useProfileEditState } from '@/features/employee/profile-edit-context';
import { PROFILE_TABS } from '@/features/employee/profile-tabs';
import { useProfileNavigation } from '@/features/employee/use-profile-navigation';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmployeeProfileState } from './employee-profile-state';
import { ProfileJobSection } from './profile-job-section';
import { ProfilePersonalSection } from './profile-personal-section';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function EmployeeProfilePage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { permissions, employeeId } = useCurrentAccount();
  const known = UUID.test(id);
  const employee = useEmployee(id, known);
  const { tab, setTab, listHref } = useProfileNavigation();
  const canList = permissions.includes('EMPLOYEE_VIEW');
  const canEdit = permissions.includes('EMPLOYEE_EDIT');
  const own = employeeId === id;
  const status = employee.error instanceof ApiError ? employee.error.status : null;
  const edit = useProfileEditState();
  const [recordDirty, setRecordDirty] = useState(false);
  const { stop } = edit;
  // Another tab or another Employee: no card stays open.
  useEffect(() => { stop(); setRecordDirty(false); }, [tab, id]);

  const back = canList ? (
    <Link to={listHref} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), '-ml-3 self-start max-md:h-11')}>
      <ArrowLeft aria-hidden="true" className="!size-4" />
      {t('employees.title')}
    </Link>
  ) : null;
  const shell = (content: ReactNode) => (
    <div className="flex flex-col gap-4">
      {back}
      {content}
    </div>
  );

  // An id that is no UUID cannot be an Employee: no request.
  if (!known || status === 404) return shell(<EmployeeProfileState state="notFound" listHref={canList ? listHref : undefined} />);
  if (status === 403) return shell(<EmployeeProfileState state="denied" listHref={canList ? listHref : undefined} />);
  if (employee.isError) return shell(<EmployeeProfileState state="error" onRetry={() => void employee.refetch()} />);
  if (!employee.data) return shell(<EmployeeProfileState state="loading" />);

  const profile = employee.data;
  return (
    <ProfileEditContext value={edit}>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-4">
          {back}
          <EmployeeProfileHeader employee={profile} />
          {own && !canEdit ? <p className="text-caption text-ink-muted">{t('employees.profile.ownNote')}</p> : null}
        </div>
        <Tabs
          label={t('employees.profile.tabs')}
          tabs={PROFILE_TABS.map((each) => ({ id: each, label: t(`employees.profile.tab.${each}`) }))}
          active={tab}
          onChange={setTab}
          panelClassName="flex flex-col gap-4 pt-4 md:pt-6"
          scrollable
        >
          {tab === 'personal' || tab === 'job' ? (
            <p className="text-caption text-ink-muted">{t('employees.profile.updated', { date: formatDate(profile.updatedAt) })}</p>
          ) : null}
          {tab === 'personal' ? (
            <ProfilePersonalSection key={profile.id} employee={profile} own={own} canEdit={canEdit} canEditIdentity={canEdit && permissions.includes('EMPLOYEE_SENSITIVE_VIEW')} />
          ) : tab === 'job' ? (
            <ProfileJobSection employee={profile} canEdit={canEdit} />
          ) : tab === 'contracts' ? (
            <ProfileContractsSection key={profile.id} employeeId={profile.id}
              canReadContracts={canList && permissions.includes('EMPLOYEE_SENSITIVE_VIEW')}
              canEdit={canEdit && permissions.includes('EMPLOYEE_SENSITIVE_VIEW')}
              onDirtyChange={setRecordDirty} />
          ) : tab === 'insurance' ? (
            <ProfileInsuranceSection key={profile.id} employeeId={profile.id}
              canEdit={canEdit && permissions.includes('EMPLOYEE_SENSITIVE_VIEW')}
              onDirtyChange={setRecordDirty} />
          ) : tab === 'bank' ? (
            <ProfileBankSection key={profile.id} employeeId={profile.id}
              canEdit={canEdit && permissions.includes('EMPLOYEE_SENSITIVE_VIEW')}
              onDirtyChange={setRecordDirty} />
          ) : tab === 'documents' ? (
            <ProfileDocumentsSection employeeId={profile.id}
              canEdit={canEdit && permissions.includes('EMPLOYEE_SENSITIVE_VIEW')}
              canReadFiles={own || permissions.includes('EMPLOYEE_SENSITIVE_VIEW')}
              onDirtyChange={setRecordDirty} />
          ) : tab === 'dependents' ? (
            <ProfileDependentsSection key={profile.id} employeeId={profile.id}
              canEdit={canEdit} onDirtyChange={setRecordDirty} />
          ) : tab === 'skills' ? (
            <div className="flex flex-col gap-8">
              <ProfileSkillsSection key={`${profile.id}-skills`} employeeId={profile.id}
                canEdit={canEdit} onDirtyChange={setRecordDirty} />
              <ProfileCertificatesSection key={`${profile.id}-certificates`} employeeId={profile.id}
                canEdit={canEdit} canReadFiles={own || permissions.includes('EMPLOYEE_SENSITIVE_VIEW')}
                canEditFiles={canEdit && permissions.includes('EMPLOYEE_SENSITIVE_VIEW')}
                onDirtyChange={setRecordDirty} />
            </div>
          ) : tab === 'projects' ? (
            <ProfileProjectsSection key={profile.id} employeeId={profile.id} fullName={profile.fullName} code={profile.code} />
          ) : (
            <EmployeeTabPlaceholder tab={tab} fullName={profile.fullName} />
          )}
        </Tabs>
        <UnsavedChangesGuard
          when={edit.dirty || recordDirty}
          includeSearch
          title={t('employees.edit.leave.title')}
          description={recordDirty ? t(tab === 'insurance' ? 'employees.profile.records.insuranceEdit.unsaved' : tab === 'documents' ? 'employees.profile.documents.unsaved' : tab === 'skills' ? 'employees.profile.qualifications.unsaved' : 'employees.profile.records.edit.unsaved') : t('employees.edit.leave.text', { part: t(`employees.edit.title.${edit.editing ?? 'personal'}`), name: profile.fullName })}
          confirmLabel={t('employees.create.leave.confirm')}
        />
      </div>
    </ProfileEditContext>
  );
}
