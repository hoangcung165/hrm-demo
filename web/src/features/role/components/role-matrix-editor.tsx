// The editable role matrix: boxes to tick, the legend, and the Save bar while something is changed, being saved
// or could not be saved. Changes are collected and saved together, never on each tick.
import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MatrixLegend } from '@/components/ui/matrix-legend';
import { SaveBar } from '@/components/ui/save-bar';
import type { RoleMatrix as RoleMatrixData } from '../api';
import { useRoleDraft } from '../use-role-draft';
import { useRoleSave } from '../use-role-save';
import { RoleMatrix } from './role-matrix';

export type RoleMatrixEditorProps = {
  matrix: RoleMatrixData;
  /** Shown between the legend and the Save bar: what each data scope means. */
  children?: ReactNode;
};

export function RoleMatrixEditor({ matrix, children }: RoleMatrixEditorProps) {
  const { t } = useTranslation();
  const draft = useRoleDraft(matrix);
  // The matrix on screen is now the saved one: the marks go with the draft.
  const { save, saving, failure, clearFailure } = useRoleSave(draft.discard);
  const { changes, total } = draft;
  const dirty = total > 0;
  const shown = dirty || failure !== null;
  // When the bar leaves and takes the focus along (saved, or discarded from its button), focus goes to the matrix.
  const region = useRef<HTMLDivElement>(null);
  const wasShown = useRef(false);
  useEffect(() => {
    if (wasShown.current && !shown && (!document.activeElement || document.activeElement === document.body)) region.current?.focus();
    wasShown.current = shown;
  }, [shown]);
  return (
    <>
      <RoleMatrix matrix={matrix} draft={draft} saving={saving} regionRef={region} />
      <MatrixLegend pickLabel={t('roles.legend.pick')} lockedLabel={t('roles.legend.locked')} changedLabel={dirty ? t('roles.legend.changed') : undefined} />
      {children}
      {shown ? (
        <SaveBar
          label={t('roles.save.label')}
          title={saving ? t('roles.save.saving', { count: total }) : t('roles.save.unsaved', { count: total, roles: t('roles.save.roleCount', { count: changes.length }) })}
          caption={changes.map(({ role }) => t(`role.${role}`)).join(', ')}
          // After a refused save the reloaded matrix may leave nothing changed: no count of 0, nothing to save.
          error={failure && !saving ? { title: dirty ? t('roles.save.failed', { count: total }) : t('roles.save.failedNone'), detail: t(`roles.save.failure.${dirty ? failure : 'refused'}`) } : undefined}
          saving={saving}
          discardLabel={t('roles.save.discard')}
          saveLabel={t('roles.save.submit')}
          onDiscard={() => {
            draft.discard();
            clearFailure();
          }}
          onSave={dirty ? () => void save(changes) : undefined}
        />
      ) : null}
    </>
  );
}
