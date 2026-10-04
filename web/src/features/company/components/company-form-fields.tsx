// Fields of the company form, inside a FormProvider: two-column grid, then the legal representative group.
import { useTranslation } from 'react-i18next';
import { FormField } from '@/components/ui/form-field';
import { FormGrid } from '@/components/ui/form-grid';
import { FormGroup } from '@/components/ui/form-group';
import { ADDRESS_MAX, NAME_MAX, REPRESENTATIVE_MAX, type CompanyValues } from '../schemas';

export function CompanyFormFields() {
  const { t } = useTranslation();
  return (
    <>
      <FormGrid>
        <FormField<CompanyValues>
          name="name"
          label={t('company.field.name')}
          helper={t('company.field.nameHelper')}
          required
          maxLength={NAME_MAX}
          autoComplete="organization"
          className="md:col-span-2"
        />
        <FormField<CompanyValues>
          name="taxCode"
          label={t('company.field.taxCode')}
          helper={t('company.field.taxCodeHelper')}
          autoComplete="off"
          className="[&_input]:tabular-nums"
        />
        <FormField<CompanyValues>
          name="address"
          label={t('company.field.address')}
          helper={t('company.field.addressHelper')}
          multiline
          rows={3}
          maxLength={ADDRESS_MAX}
          className="md:col-span-2"
        />
      </FormGrid>
      <FormGroup legend={t('company.field.representative')}>
        <FormGrid>
          <FormField<CompanyValues> name="legalRepresentativeName" label={t('company.field.representativeName')} maxLength={REPRESENTATIVE_MAX} autoComplete="off" />
          <FormField<CompanyValues>
            name="legalRepresentativeTitle"
            label={t('company.field.representativeTitle')}
            helper={t('company.field.representativeTitleHelper')}
            maxLength={REPRESENTATIVE_MAX}
            autoComplete="off"
          />
        </FormGrid>
      </FormGroup>
    </>
  );
}
