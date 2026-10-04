// Empty state (pattern P10): says what will appear here and offers the first action.
import type { ReactNode } from 'react';
import { StateBlock } from './state-block';

export type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function EmptyState(props: EmptyStateProps) {
  return <StateBlock variant="empty" {...props} />;
}
