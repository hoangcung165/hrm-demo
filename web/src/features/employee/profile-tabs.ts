// The ten tabs of an Employee profile, in order. Cá nhân and Công việc (HRM-06), plus insurance/bank/dependents (HRM-08), are built; remaining tabs are
// placeholders until their issues are implemented.
import { Award, Banknote, Briefcase, FileText, FolderOpen, type LucideIcon } from 'lucide-react';

export const PROFILE_TABS = ['personal', 'job', 'contracts', 'salary', 'insurance', 'bank', 'dependents', 'skills', 'projects', 'documents'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
export type PlaceholderTab = Exclude<ProfileTab, 'personal' | 'job' | 'insurance' | 'bank' | 'dependents'>;

/** The icon of each placeholder tab's empty state. */
export const PLACEHOLDER_ICONS: Record<PlaceholderTab, LucideIcon> = {
  contracts: FileText,
  salary: Banknote,
  skills: Award,
  projects: Briefcase,
  documents: FolderOpen,
};
