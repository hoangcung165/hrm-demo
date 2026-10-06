// MSW handlers for "Demo as…" ("## API contract" on issue #6, section "Demo as…"; PR #109), over the seven
// demo personas the backend seeds (`DemoPersona.java`).
import { http, HttpResponse, type HttpHandler } from 'msw';
import type { Account, Role } from '@/features/auth/account';
import type { DemoPersona } from '@/features/demo/api';
import { problem, tokens } from './auth-handlers';
import { ADMIN_ACCOUNT, DIRECTOR_ACCOUNT, EMPLOYEE_ACCOUNT, HR_ACCOUNT } from './render';

export const PERSONAS: DemoPersona[] = [
  { persona: 'ADMIN', fullName: 'Đỗ Minh Quân', title: 'Quản trị hệ thống', roles: ['ADMIN'], available: true },
  { persona: 'HR', fullName: 'Trần Thị Mai', title: 'Trưởng phòng nhân sự', roles: ['HR', 'EMPLOYEE'], available: true },
  { persona: 'LINE_MANAGER', fullName: 'Lê Văn Hùng', title: 'Trưởng nhóm Web', roles: ['LINE_MANAGER', 'EMPLOYEE'], available: true },
  { persona: 'PROJECT_MANAGER', fullName: 'Vũ Thị Lan', title: 'Quản lý dự án', roles: ['PROJECT_MANAGER', 'EMPLOYEE'], available: true },
  { persona: 'ACCOUNTANT', fullName: 'Hoàng Thị Thu', title: 'Kế toán trưởng', roles: ['ACCOUNTANT', 'EMPLOYEE'], available: false },
  { persona: 'DIRECTOR', fullName: 'Phạm Quốc Bảo', title: 'Giám đốc', roles: ['DIRECTOR', 'EMPLOYEE'], available: true },
  { persona: 'EMPLOYEE', fullName: 'Nguyễn Văn An', title: 'Lập trình viên', roles: ['EMPLOYEE'], available: true },
];

/** The rights of a role as the fixtures know them; enough for the shell to draw its navigation. */
const BASE: Partial<Record<Role, Account>> = { ADMIN: ADMIN_ACCOUNT, HR: HR_ACCOUNT, DIRECTOR: DIRECTOR_ACCOUNT };

/** The Account `GET /api/me` answers for a persona, with the demo flag on. */
export function personaAccount(key: Role): Account {
  const persona = PERSONAS.find((each) => each.persona === key)!;
  const base = BASE[key] ?? EMPLOYEE_ACCOUNT;
  return {
    ...base,
    id: `00000000-0000-4000-9000-00000000000${PERSONAS.indexOf(persona) + 1}`,
    email: `demo.${key.toLowerCase().replace('_', '-')}@hrm.local`,
    fullName: persona.fullName,
    roles: persona.roles,
    demo: { enabled: true, persona: key },
  };
}

export type DemoApi = {
  handlers: HttpHandler[];
  /** How many times the persona list was read. */
  listReads: () => number;
  /** The persona key of every sign-in request, in order. */
  signIns: string[];
};

/**
 * The persona list and the switch. `personas` is read at every request, so a test can change it between
 * calls; a persona that is not available answers 409 `demo.persona_unavailable`, as the backend does.
 */
export function demoApi({ personas = () => PERSONAS, listFails = false }: { personas?: () => DemoPersona[]; listFails?: boolean } = {}): DemoApi {
  let reads = 0;
  let current: Role | null = null;
  const signIns: string[] = [];
  const handlers = [
    http.get('*/api/auth/demo/personas', () => {
      reads += 1;
      return listFails ? problem(500, 'unknown') : HttpResponse.json({ personas: personas() });
    }),
    http.post('*/api/auth/demo/sign-in', async ({ request }) => {
      const { persona } = (await request.json()) as { persona: Role };
      signIns.push(persona);
      if (!personas().find((each) => each.persona === persona)?.available) return problem(409, 'demo.persona_unavailable');
      current = persona;
      return tokens(`access-${persona}`);
    }),
    http.get('*/api/me', () => (current ? HttpResponse.json(personaAccount(current)) : problem(401, 'auth.unauthenticated'))),
  ];
  return { handlers, listReads: () => reads, signIns };
}
