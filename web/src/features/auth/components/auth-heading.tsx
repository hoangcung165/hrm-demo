import type { ReactNode } from 'react';
import logoUrl from '@/assets/hrm-logo.svg';

export type AuthHeadingProps = {
  title: string;
  children?: ReactNode;
  /** Round mark between the logo and the title (mail sent, link expired). */
  mark?: ReactNode;
};

/** Logo, optional mark, page title and one line of muted text at the top of an auth card. */
export function AuthHeading({ title, children, mark }: AuthHeadingProps) {
  return (
    <div>
      <img src={logoUrl} alt="HRM" className="mb-6 block h-7 w-auto" />
      {mark}
      <h1 className="text-title">{title}</h1>
      {children ? <p className="mt-2 text-ink-muted">{children}</p> : null}
    </div>
  );
}
