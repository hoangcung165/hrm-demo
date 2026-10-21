// Sidebar navigation of the app shell (pattern P1). Labels are i18n keys. An item whose feature has a permission shows
// by that permission (GET /api/me); the others keep a role list until their own issue adds a permission.
import {
  Banknote,
  Briefcase,
  Building,
  CalendarClock,
  CalendarRange,
  CalendarCog,
  Calendar,
  Clock,
  FileText,
  History,
  Gauge,
  Inbox,
  LayoutDashboard,
  List,
  Network,
  Route,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { Account, Permission, Role } from '@/features/auth/account';

export type NavItem = {
  id: string;
  labelKey: string;
  to: string;
  icon: LucideIcon;
  /** The permission that shows the item; it wins over `roles`. */
  permission?: Permission;
  /** Roles that see the item; with neither this nor `permission`, every signed-in Account does. */
  roles?: Role[];
  /** Only Accounts linked to an Employee see the item: the feature acts as that Employee (approvals). */
  employeeOnly?: boolean;
  /** A count next to the label, e.g. the requests waiting for the caller; the sidebar fills it in. */
  count?: 'approvalsWaiting';
};

export type NavGroup = {
  id: string;
  /** Group heading; the first group has none. */
  labelKey?: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  { id: 'main', items: [{ id: 'overview', labelKey: 'nav.overview', to: '/', icon: LayoutDashboard }] },
  {
    id: 'people',
    labelKey: 'nav.group.people',
    items: [
      { id: 'employees', labelKey: 'nav.employees', to: '/employees', icon: Users, permission: 'EMPLOYEE_VIEW' },
      { id: 'contracts', labelKey: 'nav.contracts', to: '/contracts', icon: FileText, roles: ['ADMIN', 'HR'] },
      { id: 'org', labelKey: 'nav.org', to: '/org', icon: Network, permission: 'ORG_VIEW' },
    ],
  },
  {
    id: 'projects',
    labelKey: 'nav.group.projects',
    items: [
      {
        id: 'projects',
        labelKey: 'nav.projects',
        to: '/projects',
        icon: Briefcase,
        permission: 'PROJECT_VIEW',
      },
      { id: 'resources', labelKey: 'nav.resources', to: '/resources', icon: Gauge, permission: 'RESOURCE_VIEW' },
    ],
  },
  {
    id: 'time',
    labelKey: 'nav.group.time',
    items: [
      { id: 'leave', labelKey: 'nav.leave', to: '/leave', icon: Calendar },
      { id: 'attendance', labelKey: 'nav.attendance', to: '/attendance', icon: Clock },
      { id: 'shiftCalendar', labelKey: 'nav.shiftCalendar', to: '/shift-calendar', icon: CalendarRange, permission: 'SHIFT_VIEW' },
      { id: 'shifts', labelKey: 'nav.shifts', to: '/shifts', icon: CalendarClock, permission: 'SHIFT_VIEW' },
    ],
  },
  {
    id: 'payroll',
    labelKey: 'nav.group.payroll',
    items: [
      { id: 'payroll', labelKey: 'nav.payroll', to: '/payroll', icon: Banknote, roles: ['ADMIN', 'HR', 'ACCOUNTANT', 'DIRECTOR'] },
    ],
  },
  {
    id: 'approvals',
    labelKey: 'nav.group.approvals',
    items: [
      {
        id: 'approvals',
        labelKey: 'nav.approvals',
        to: '/approvals',
        icon: Inbox,
        // Everyone sends requests and may be asked to approve; the flow decides, not a role.
        employeeOnly: true,
        count: 'approvalsWaiting',
      },
    ],
  },
  {
    id: 'system',
    labelKey: 'nav.group.system',
    items: [
      { id: 'accounts', labelKey: 'nav.accounts', to: '/accounts', icon: ShieldCheck, permission: 'ACCOUNT_LIST' },
      { id: 'approvalFlows', labelKey: 'nav.approvalFlows', to: '/approval-flows', icon: Route, permission: 'APPROVAL_FLOW_EDIT' },
      { id: 'catalogs', labelKey: 'nav.catalogs', to: '/catalogs', icon: List, permission: 'CATALOG_EDIT' },
      { id: 'contractTemplates', labelKey: 'nav.contractTemplates', to: '/contract-templates', icon: FileText, roles: ['ADMIN', 'HR'] },
      { id: 'leavePolicies', labelKey: 'nav.leavePolicies', to: '/leave-policies', icon: CalendarCog, permission: 'LEAVE_POLICY_EDIT' },
      { id: 'company', labelKey: 'nav.company', to: '/company', icon: Building, permission: 'COMPANY_EDIT' },
      { id: 'auditLog', labelKey: 'nav.auditLog', to: '/audit-log', icon: History, permission: 'AUDIT_VIEW' },
    ],
  },
];

type Viewer = Pick<Account, 'roles' | 'permissions'> & Partial<Pick<Account, 'employeeId'>>;

function sees({ roles, permissions, employeeId }: Viewer, item: NavItem): boolean {
  if (item.employeeOnly) return Boolean(employeeId);
  if (item.permission) return permissions.includes(item.permission);
  return !item.roles || item.roles.some((role) => roles.includes(role));
}

/** Groups and items the Account may see; a group with no visible item is dropped. */
export function visibleNavGroups(viewer: Viewer, groups: NavGroup[] = NAV_GROUPS): NavGroup[] {
  return groups.map((group) => ({ ...group, items: group.items.filter((item) => sees(viewer, item)) })).filter((group) => group.items.length > 0);
}
