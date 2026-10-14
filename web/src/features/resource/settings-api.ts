// Ngưỡng nguồn lực API (HRM-17): the company's thresholds. Contract: issue #204.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { RESOURCES_KEY, type ResourceThresholds } from './api';

/** Mirrors the backend record `ResourceSettingsResponse`. `updatedAt` and `updatedByName` are null for the defaults. */
export type ResourceSettings = ResourceThresholds & {
  customized: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
  canEdit: boolean;
};

/** The thresholds a company has until it saves its own (`ResourceThresholds.DEFAULTS` in the backend). */
export const DEFAULT_RESOURCE_THRESHOLDS: ResourceThresholds = { benchPercent: 50, nearFullPercent: 90, endingWeeks: 4 };

const SETTINGS_KEY = [...RESOURCES_KEY, 'settings'] as const;

/** The thresholds in force, read when the dialog opens. */
export function useResourceSettings(enabled = true) {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: () => api<ResourceSettings>('/api/resource-settings'), enabled });
}

/** Saves the thresholds. Every resource view reads them, so all of `resources` is refetched afterwards. */
export function useSaveResourceSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: ResourceThresholds) => api<ResourceSettings>('/api/resource-settings', { method: 'PUT', body }),
    onSuccess: () => client.invalidateQueries({ queryKey: RESOURCES_KEY }),
  });
}
