// The ten tabs of an Employee profile, in order. HRM-06, HRM-08 and skills (HRM-09) are built; remaining tabs are
// placeholders until their issues are implemented.
import { Banknote, type LucideIcon } from 'lucide-react';

export const PROFILE_TABS = ['personal', 'job', 'contracts', 'salary', 'insurance', 'bank', 'dependents', 'skills', 'projects', 'documents'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
export type PlaceholderTab = Exclude<ProfileTab, 'personal' | 'job' | 'contracts' | 'insurance' | 'bank' | 'dependents' | 'skills' | 'projects' | 'documents'>;

/** The icon of each placeholder tab's empty state. */
export const PLACEHOLDER_ICONS: Record<PlaceholderTab, LucideIcon> = {
  salary: Banknote,
};
