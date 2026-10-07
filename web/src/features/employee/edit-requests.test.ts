import { EMPLOYEES } from '@/test/employee-fixtures';
import { employeeProfile, maskedIdentity } from '@/test/employee-profile-handlers';
import { identityPart, jobPart } from './create-request';
import { profileToValues } from './edit-requests';

const profile = employeeProfile(EMPLOYEES.find((each) => each.code === 'NV00019')!);

describe('profileToValues', () => {
  it('starts the identity fields from the full numbers, the MST box ticked when the MST is the CCCD', () => {
    const values = profileToValues(profile);
    expect(values).toMatchObject({ idNumber: '001194000019', taxCodeFromId: true, taxCode: '', socialInsuranceNumber: '0194000019' });
    expect(identityPart(values)).toMatchObject({ idNumber: '001194000019', taxCode: '001194000019' });
  });

  it('never puts a masked number in a field', () => {
    const values = profileToValues({ ...profile, identity: maskedIdentity(profile.identity) });
    expect(values).toMatchObject({ idNumber: '', taxCode: '', socialInsuranceNumber: '', taxCodeFromId: false });
  });

  it('keeps a 10-digit MST in its own field, and an assigned manager as chosen', () => {
    const values = profileToValues({ ...profile, identity: { ...profile.identity, taxCode: '8012345678' } });
    expect(values).toMatchObject({ taxCodeFromId: false, taxCode: '8012345678' });
    // Võ Mạnh Cường's manager was chosen by HR.
    expect(values).toMatchObject({ managerMode: 'ASSIGNED', managerId: profile.job.manager!.id });
    expect(jobPart(values)).toMatchObject({ managerId: profile.job.manager!.id, status: 'OFFICIAL' });
  });
});
