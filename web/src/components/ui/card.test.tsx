import { render, screen, within } from '@testing-library/react';
import { Card } from './card';
import { FormGroup } from './form-group';

describe('Card', () => {
  it('is a section named by its title, with description, body and footer', () => {
    render(
      <Card title="Thông tin chung" description="In trên hợp đồng." meta="Cập nhật lần cuối 09:30 · 04/10/2026" actions={<button>Lưu thông tin</button>}>
        <p>Nội dung</p>
      </Card>,
    );
    const card = screen.getByRole('region', { name: 'Thông tin chung' });
    expect(within(card).getByRole('heading', { level: 2, name: 'Thông tin chung' })).toBeInTheDocument();
    expect(within(card).getByText('In trên hợp đồng.')).toBeInTheDocument();
    expect(within(card).getByText('Nội dung')).toBeInTheDocument();
    expect(within(card).getByText('Cập nhật lần cuối 09:30 · 04/10/2026')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Lưu thông tin' })).toBeInTheDocument();
    expect(card).not.toHaveAttribute('aria-busy');
  });

  it('is busy and labelled while loading', () => {
    render(
      <Card busy label="Đang tải thông tin công ty">
        <span />
      </Card>,
    );
    expect(screen.getByRole('region', { name: 'Đang tải thông tin công ty' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('holds a field group with a legend', () => {
    render(
      <Card title="Thông tin chung">
        <FormGroup legend="Người đại diện theo pháp luật">
          <input aria-label="Họ và tên" />
        </FormGroup>
      </Card>,
    );
    expect(within(screen.getByRole('group', { name: 'Người đại diện theo pháp luật' })).getByRole('textbox', { name: 'Họ và tên' })).toBeInTheDocument();
  });
});
