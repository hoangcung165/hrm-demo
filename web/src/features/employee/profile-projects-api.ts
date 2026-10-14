// Tab Dự án of the Employee profile (HRM-17/BE-4): the allocations across all projects and the 12-week load strip.
// Contract: "## API contract" comment on issue #207.
import { useQuery } from '@tanstack/react-query';
import type { AllocationStatus, EmployeeCard, LoadPeriod, ProjectRoleRef, ProjectStatus } from '@/features/project/api';
import { api } from '@/lib/api';
import { profileRecordsKey } from './profile-records-api';

/** Mirrors `EmployeeProjectsResponse.Item`: one allocation with its project. Dates are ISO. */
export type EmployeeProjectItem = {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  client: string | null;
  projectStatus: ProjectStatus;
  pm: EmployeeCard | null;
  projectRole: ProjectRoleRef | null;
  percent: number;
  startDate: string;
  endDate: string;
  status: AllocationStatus;
};

/** Mirrors `EmployeeProjectsResponse.Cell`: the highest Tải phân bổ of a week, as the heatmap row has it. */
export type StripCell = { from: string; to: string; peak: number };

/** Mirrors `EmployeeProjectsResponse.Strip`: 12 weeks from the current Monday and the first period above 100%. */
export type LoadStrip = { from: string; to: string; cells: StripCell[]; overloaded: boolean; firstOverload: LoadPeriod | null };

/** Mirrors the backend record `EmployeeProjectsResponse`. `items` are newest first. */
export type EmployeeProjects = { items: EmployeeProjectItem[]; strip: LoadStrip };

export const projectsKey = (employeeId: string) => profileRecordsKey(employeeId, 'projects');

export function useEmployeeProjects(employeeId: string) {
  return useQuery({ queryKey: projectsKey(employeeId), queryFn: () => api<EmployeeProjects>(`/api/employees/${employeeId}/projects`) });
}
