import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { routes } from '@/app';
import i18n from '@/i18n';
import { employeeId } from '@/test/employee-fixtures';
import { employeeProfileApi } from '@/test/employee-profile-handlers';
import { HR_ACCOUNT, renderRoutes } from '@/test/render';
import { server } from '@/test/server';

const id = employeeId(7);
const endpoint = `/api/employees/${id}/work-history`;
const hire = { sourceId: null, kind: 'HIRE', decisionNumber: null, signedOn: null,
  effectiveOn: '2018-08-01', description: 'Hired', previousOrgUnitId: null, orgUnitId: null,
  previousPositionId: null, positionId: null, actorId: null };
const reward = { ...hire, sourceId: 'b9a336b0-dd27-457e-92d0-dce28e7bd01c', kind: 'REWARD',
  decisionNumber: 'QD-32', signedOn: '2026-09-10', effectiveOn: '2026-09-12',
  description: 'Khen thưởng hoàn thành dự án', actorId: 'ed00c734-0b79-4793-9a80-d5b516e014f0' };

function open(handler: ReturnType<typeof http.get>) {
  server.use(employeeProfileApi().handler, handler);
  return renderRoutes(routes, { session: HR_ACCOUNT, path: `/employees/${id}?tab=history` });
}

describe('Employee work history', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('vi'); });

  it('announces loading, then orders accessible milestones with source, dates and actor', async () => {
    let resolve!: (value: Response) => void;
    open(http.get(endpoint, () => new Promise<Response>((done) => { resolve = done; })));
    expect(await screen.findByRole('status', { name: 'Đang tải Quá trình công tác' })).toBeInTheDocument();
    resolve(HttpResponse.json([reward, hire]));
    const timeline = await screen.findByRole('list', { name: 'Dòng thời gian công tác' });
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(2);
    expect(within(timeline).getAllByRole('heading', { level: 3 }).map((each) => each.textContent)).toEqual(['Khen thưởng', 'Vào làm']);
    expect(within(timeline).getByText('Khen thưởng hoàn thành dự án')).toBeInTheDocument();
    expect(within(timeline).getByText('QD-32')).toBeInTheDocument();
    expect(within(timeline).getByText('10/09/2026')).toBeInTheDocument();
    expect(within(timeline).getByText('Quyết định nhân sự')).toBeInTheDocument();
    expect(within(timeline).getByText(reward.actorId!)).toBeInTheDocument();
    expect(within(timeline).getByText('Hiệu lực 12/09/2026')).toHaveAttribute('datetime', reward.effectiveOn);
  });

  it('explains the hiring-only state', async () => {
    open(http.get(endpoint, () => HttpResponse.json([hire])));
    expect(await screen.findByText('Chưa có quyết định hoặc đánh giá công tác nào sau khi vào làm.')).toBeInTheDocument();
  });

  it('shows an empty API response', async () => {
    open(http.get(endpoint, () => HttpResponse.json([])));
    expect(await screen.findByText('Chưa có mốc công tác')).toBeInTheDocument();
  });

  it('shows permission denied for a 403 response', async () => {
    open(http.get(endpoint, () => new HttpResponse(null, { status: 403 })));
    expect(await screen.findByText('Bạn không xem được quá trình công tác')).toBeInTheDocument();
  });

  it('shows a retry action after a server failure', async () => {
    open(http.get(endpoint, () => new HttpResponse(null, { status: 500 })));
    expect(await screen.findByText('Không tải được thông tin Quá trình công tác')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
  });
});
