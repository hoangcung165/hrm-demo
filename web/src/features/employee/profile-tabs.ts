// The Employee profile tabs, in order.

export const PROFILE_TABS = ['personal', 'job', 'history', 'contracts', 'salary', 'insurance', 'bank', 'dependents', 'skills', 'projects', 'documents'] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];
