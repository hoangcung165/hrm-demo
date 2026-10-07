// The ten tabs of an Employee profile, in order. Cá nhân and Công việc are built (HRM-06); the others are
// placeholders until their issues (HRM-08 to HRM-11).
import { Award, Banknote, Briefcase, FileText, FolderOpen, Landmark, ShieldCheck, Users, type LucideIcon } from 'lucide-react';

export const PROFILE_TABS = ['personal', 'job', 'contracts', 'salary', 'insurance', 'bank', 'dependents', 'skills', 'projects', 'documents'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
export type PlaceholderTab = Exclude<ProfileTab, 'personal' | 'job'>;

/** The icon of each placeholder tab's empty state. */
export const PLACEHOLDER_ICONS: Record<PlaceholderTab, LucideIcon> = {
  contracts: FileText,
  salary: Banknote,
  insurance: ShieldCheck,
  bank: Landmark,
  dependents: Users,
  skills: Award,
  projects: Briefcase,
  documents: FolderOpen,
};
