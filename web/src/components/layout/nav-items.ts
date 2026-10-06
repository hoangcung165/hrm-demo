// Sidebar navigation of the app shell (pattern P1). Labels are i18n keys. An item whose feature has a permission shows
// by that permission (GET /api/me); the others keep a role list until their own issue adds a permission.
import {
  Banknote,
  Briefcase,
  Building,
  Calendar,
  Clock,
  FileText,
  Inbox,
  LayoutDashboard,
  List,
  Network,
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
      { id: 'employees', labelKey: 'nav.employees', to: '/employees', icon: Users, roles: ['ADMIN', 'HR', 'LINE_MANAGER', 'DIRECTOR'] },
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
        roles: ['ADMIN', 'HR', 'LINE_MANAGER', 'PROJECT_MANAGER', 'DIRECTOR'],
      },
    ],
  },
  {
    id: 'time',
    labelKey: 'nav.group.time',
    items: [
      { id: 'leave', labelKey: 'nav.leave', to: '/leave', icon: Calendar },
      { id: 'attendance', labelKey: 'nav.attendance', to: '/attendance', icon: Clock },
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
        roles: ['ADMIN', 'HR', 'LINE_MANAGER', 'PROJECT_MANAGER', 'DIRECTOR'],
      },
    ],
  },
  {
    id: 'system',
    labelKey: 'nav.group.system',
    items: [
      { id: 'accounts', labelKey: 'nav.accounts', to: '/accounts', icon: ShieldCheck, permission: 'ACCOUNT_LIST' },
      { id: 'catalogs', labelKey: 'nav.catalogs', to: '/catalogs', icon: List, permission: 'CATALOG_EDIT' },
      { id: 'company', labelKey: 'nav.company', to: '/company', icon: Building, permission: 'COMPANY_EDIT' },
    ],
  },
];

type Viewer = Pick<Account, 'roles' | 'permissions'>;

function sees({ roles, permissions }: Viewer, item: NavItem): boolean {
  if (item.permission) return permissions.includes(item.permission);
  return !item.roles || item.roles.some((role) => roles.includes(role));
}

/** Groups and items the Account may see; a group with no visible item is dropped. */
export function visibleNavGroups(viewer: Viewer, groups: NavGroup[] = NAV_GROUPS): NavGroup[] {
  return groups.map((group) => ({ ...group, items: group.items.filter((item) => sees(viewer, item)) })).filter((group) => group.items.length > 0);
}
