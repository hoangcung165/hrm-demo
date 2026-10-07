// Which card of a profile is being edited in place: one at a time. The open card reports whether it has unsaved
// changes, for the leave guard of the page; the other cards hide their "Sửa" while one is open.
import { createContext, useContext, useMemo, useState } from 'react';
import type { ProfilePart } from './form-api';

export type ProfileEdit = {
  editing: ProfilePart | null;
  /** The open card has changes that are not saved. */
  dirty: boolean;
  start: (part: ProfilePart) => void;
  /** Back to the read view; the changes are dropped. */
  stop: () => void;
  setDirty: (dirty: boolean) => void;
};

export const ProfileEditContext = createContext<ProfileEdit | null>(null);

/** The editing state of a profile page, for its `ProfileEditContext`. */
export function useProfileEditState(): ProfileEdit {
  const [editing, setEditing] = useState<ProfilePart | null>(null);
  const [dirty, setDirty] = useState(false);
  return useMemo(
    () => ({
      editing,
      dirty,
      start: (part: ProfilePart) => setEditing((current) => current ?? part),
      stop: () => {
        setDirty(false);
        setEditing(null);
      },
      setDirty,
    }),
    [editing, dirty],
  );
}

/** The editing state of the profile around; throws outside the profile page, so a missing provider fails loudly. */
export function useProfileEdit(): ProfileEdit {
  const edit = useContext(ProfileEditContext);
  if (!edit) throw new Error('useProfileEdit must be used inside a ProfileEditContext');
  return edit;
}
