import { render, screen, within } from '@testing-library/react';
import { ProfileHeader } from './profile-header';

describe('ProfileHeader', () => {
  it('names the record as the h1, with its badge, caption and facts', () => {
    render(
      <ProfileHeader
        name="Nguyễn Thị Minh Anh"
        badge={<span>Chính thức</span>}
        caption="NV00042 · Chuyên viên · Nhóm Mobile"
        facts={[
          { label: 'Ngày vào làm', value: '12/08/2021' },
          { label: 'Email', value: 'minhanh.nt94@mail.vn' },
        ]}
      />,
    );
    const region = screen.getByRole('region', { name: 'Nguyễn Thị Minh Anh' });
    expect(within(region).getByRole('heading', { level: 1, name: 'Nguyễn Thị Minh Anh' })).toBeInTheDocument();
    expect(within(region).getByText('Chính thức')).toBeInTheDocument();
    expect(within(region).getByText('NV00042 · Chuyên viên · Nhóm Mobile')).toBeInTheDocument();
    expect(within(region).getByText('Ngày vào làm').nextElementSibling).toHaveTextContent('12/08/2021');
  });
});
