// The ten tabs of an Employee profile, in order. HRM-06, HRM-08 and skills (HRM-09) are built; remaining tabs are
// placeholders until their issues are implemented.

export const PROFILE_TABS = ['personal', 'job', 'contracts', 'salary', 'insurance', 'bank', 'dependents', 'skills', 'projects', 'documents'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
