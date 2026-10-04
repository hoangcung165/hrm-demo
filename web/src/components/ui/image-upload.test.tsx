import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { ImageUpload, type ImageUploadProps } from './image-upload';

const props: ImageUploadProps = {
  alt: 'Logo Công ty Cổ phần Công nghệ Mẫu',
  accept: 'image/png,image/jpeg,image/webp',
  uploadLabel: 'Tải logo lên',
  replaceLabel: 'Đổi logo',
  removeLabel: 'Xóa logo',
  helper: 'PNG, JPEG hoặc WebP, tối đa 1 MB.',
  dropHint: 'Thả ảnh vào đây để tải lên.',
  onSelect: () => {},
  onRemove: () => {},
};
const file = new File(['x'], 'logo.png', { type: 'image/png' });

describe('ImageUpload', () => {
  it('empty: offers to upload only, and passes the chosen file on', async () => {
    const onSelect = vi.fn();
    render(<ImageUpload {...props} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Tải logo lên' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Xóa logo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tải logo lên' })).toHaveAccessibleDescription('PNG, JPEG hoặc WebP, tối đa 1 MB.');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await userEvent.upload(screen.getByLabelText('Tải logo lên', { selector: 'input' }), file);
    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it('with image: shows it and offers to replace or remove', async () => {
    const onRemove = vi.fn();
    render(<ImageUpload {...props} src="/logo.png" onRemove={onRemove} />);
    expect(screen.getByRole('img', { name: props.alt })).toHaveAttribute('src', '/logo.png');
    expect(screen.getByRole('button', { name: 'Đổi logo' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Xóa logo' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('uploading: busy, buttons disabled with their labels kept', () => {
    const { container } = render(<ImageUpload {...props} src="/logo.png" uploading helper="Đang tải logo lên…" />);
    expect(container.firstChild).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Đổi logo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xóa logo' })).toBeDisabled();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('uploading: the status is announced through a live region that was already there', () => {
    const { rerender } = render(<ImageUpload {...props} src="/logo.png" />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    rerender(<ImageUpload {...props} src="/logo.png" uploading helper="Đang tải logo lên…" />);
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveTextContent('Đang tải logo lên…');
    // Said once: the visible copy is hidden from assistive tech while the status holds the text.
    expect(screen.getAllByText('Đang tải logo lên…').filter((node) => node !== status)[0]).toHaveAttribute('aria-hidden', 'true');
    rerender(<ImageUpload {...props} src="/logo.png" />);
    expect(status).toBeEmptyDOMElement();
  });

  it('the consumer can focus the upload button through `ref`', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<ImageUpload {...props} ref={ref} />);
    ref.current?.focus();
    expect(screen.getByRole('button', { name: 'Tải logo lên' })).toHaveFocus();
  });

  it('rejected: the error replaces the helper and the image stays', () => {
    render(<ImageUpload {...props} src="/logo.png" error="Tệp logo.pdf không phải ảnh PNG, JPEG hoặc WebP. Chọn tệp khác." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Tệp logo.pdf không phải ảnh');
    expect(screen.getByRole('button', { name: 'Đổi logo' })).toHaveAccessibleDescription('Tệp logo.pdf không phải ảnh PNG, JPEG hoặc WebP. Chọn tệp khác.');
    expect(screen.queryByText(props.helper)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: props.alt })).toBeInTheDocument();
  });

  it('drag over shows the drop hint; dropping a file is the same as choosing one', () => {
    const onSelect = vi.fn();
    const { container } = render(<ImageUpload {...props} onSelect={onSelect} />);
    const block = container.firstChild as HTMLElement;
    fireEvent.dragOver(block, { dataTransfer: { files: [] } });
    expect(screen.getByText('Thả ảnh vào đây để tải lên.')).toBeInTheDocument();
    fireEvent.drop(block, { dataTransfer: { files: [file] } });
    expect(onSelect).toHaveBeenCalledWith(file);
    expect(screen.getByText(props.helper)).toBeInTheDocument();
  });

  it('disabled: the image stays visible, nothing can be chosen', () => {
    render(<ImageUpload {...props} src="/logo.png" disabled onRemove={undefined} />);
    expect(screen.getByRole('button', { name: 'Đổi logo' })).toBeDisabled();
    expect(screen.getByRole('img', { name: props.alt })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa logo' })).not.toBeInTheDocument();
  });
});
