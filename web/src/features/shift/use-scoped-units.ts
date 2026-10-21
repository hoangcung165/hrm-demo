// The org units an Account may pick in a shift screen: the tree of its data scope (the whole company, or the units it
// heads and those below), and the flat list for walking up to a parent.
import { useMemo } from 'react';
import type { TreePickerNode } from '@/components/ui/tree-picker';
import { useCurrentAccount } from '@/features/auth/account-context';
import { unitChoices } from '@/features/employee/unit-choices';
import { useOrgUnitOptions, type OrgUnitOption } from '@/features/org-unit/api';

export function useScopedUnits(): { nodes: TreePickerNode[]; units: OrgUnitOption[] } {
  const { dataScope, orgUnitIds } = useCurrentAccount();
  const options = useOrgUnitOptions();
  const nodes = useMemo(() => (options.data ? unitChoices(options.data, dataScope === 'COMPANY' ? undefined : new Set(orgUnitIds)) : []), [options.data, dataScope, orgUnitIds]);
  return { nodes, units: options.data ?? [] };
}
