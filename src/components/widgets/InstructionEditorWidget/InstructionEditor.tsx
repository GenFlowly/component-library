import React, { useState } from 'react';
import styles from './InstructionEditor.module.scss';
import PillButton from '../../common/PillButton/PillButton';
import { InputTextWithHint } from '../../common/InputTextWithHint/InputTextWithHint';
import TextEditor from '../TextEditorWidget/TextEditor';
import ResizableSidebar from '../../common/ResizableSidebar/ResizableSidebar';
import SidebarListPanel from '../../common/SidebarListPanel/SidebarListPanel';
import { useWindowSize } from '../ConversationWidget/useWindowSize';
import { MOBILE_BREAKPOINT } from '../../../constants/breakpoints';

export interface InstructionEditorLabels {
  delete: string;
  save: string;
  saving: string;
  readonlyBanner: string;
  nameHint: string;
  namePlaceholder: string;
  versionsTitle: string;
  versionsEmpty: string;
  versionsError: string;
  accessLevel: string;
  latestTooltip: string;
  collapseVersions: string;
  expandVersions: string;
}

const DEFAULT_LABELS: InstructionEditorLabels = {
  delete: 'Delete',
  save: 'Save',
  saving: 'Saving…',
  readonlyBanner: 'You have view-only access to this instruction.',
  nameHint: 'Name',
  namePlaceholder: 'e.g. Marketing copy editor',
  versionsTitle: 'Versions',
  versionsEmpty: 'No versions yet.',
  versionsError: 'Failed to load versions.',
  accessLevel: 'Access Level',
  latestTooltip: 'latest version',
  collapseVersions: 'Collapse versions',
  expandVersions: 'Expand versions',
};

export interface InstructionVersionItem {
  version: number;
  /** Row label; defaults to `v{version}`. */
  label?: string;
  /** Second line under the label (name, timestamp, badges, ...). */
  details?: React.ReactNode;
}

export interface InstructionEditorProps {
  /** Instruction name (controlled). */
  name: string;
  onNameChange: (name: string) => void;
  /** Instruction body text (controlled). */
  instructionText: string;
  onInstructionTextChange: (text: string) => void;
  /**
   * Whether a new instruction is being created. Switches the title and
   * hides the Share/Delete actions, which only apply to saved instructions.
   * @default false
   */
  isNew?: boolean;
  /**
   * View-only mode: shows the readonly banner and hides every action
   * except Back; the name input and editor become non-editable.
   * @default false
   */
  readOnly?: boolean;
  /** Disables all actions while a save/delete request is in flight. */
  isLoading?: boolean;
  /** Show the Delete action (requires `onDelete`). @default false */
  canDelete?: boolean;
  onSave: () => void;
  onDelete?: () => void;
  /** Emoji/icon of the loaded instruction, shown beside the name input. */
  icon?: string;
  /** Hex color of the loaded instruction, rendered as a swatch beside the name. */
  color?: string;
  /** Access role on the loaded instruction (OWNER, EDIT, VIEW, ...), shown as a chip. */
  role?: string;
  /** Category of the loaded instruction, shown as a chip. */
  category?: string;
  /** Tags of the loaded instruction, shown as chips. */
  tags?: string[];
  /** Override any of the default English strings (e.g. with i18n values). */
  labels?: Partial<InstructionEditorLabels>;
  /** DOM id passed to the underlying TextEditor. @default 'instruction-editor' */
  editorId?: string;
  /**
   * Version history of the loaded instruction, shown in the resizable
   * sidebar that is always part of the page, or on a phone in a dropdown above
   * the fields. Defaults to an empty history (e.g. while creating a new
   * instruction), which renders the sidebar's empty state.
   */
  versions?: InstructionVersionItem[];
  /** Version highlighted as active in the sidebar. */
  selectedVersion?: number;
  onSelectVersion?: (version: number) => void;
  /** Shows the sidebar's loading skeleton while the history is fetched. */
  versionsLoading?: boolean;
  /** Shows the sidebar's error state when the history failed to load. */
  versionsError?: boolean;
  /**
   * localStorage key the sidebar width is persisted under.
   * @default 'instructionEditor.versionsWidth'
   */
  versionsStorageKey?: string;
  'data-testid'?: string;
}

/**
 * Full instruction create/edit surface: header with title and
 * Share/Delete/Save actions, an optional readonly banner, a name input and
 * the markdown TextEditor. Purely presentational — the host app owns the
 * name/text state and wires persistence, navigation and sharing through
 * the callbacks, so the same editor can back different auth and sharing
 * models (per-user sharing, public instructions, ...).
 */
export default function InstructionEditor({
  name,
  onNameChange,
  instructionText,
  onInstructionTextChange,
  isNew = false,
  readOnly = false,
  isLoading = false,
  canDelete = false,
  onSave,
  onDelete,
  icon,
  color,
  role,
  category,
  tags,
  labels,
  editorId = 'instruction-editor',
  versions,
  selectedVersion,
  onSelectVersion,
  versionsLoading = false,
  versionsError = false,
  versionsStorageKey = 'instructionEditor.versionsWidth',
  'data-testid': testId,
}: InstructionEditorProps): React.ReactElement {
  const text: InstructionEditorLabels = { ...DEFAULT_LABELS, ...labels };
  const { width } = useWindowSize();
  const isMobile = width <= MOBILE_BREAKPOINT;
  const [versionsMenuOpen, setVersionsMenuOpen] = useState(false);
  const showDelete = !readOnly && !isNew && canDelete && !!onDelete;
  const hasMeta = !!icon || !!color || !!category || !!tags?.length;
  const versionList = versions ?? [];
  const latestVersion = versionList.length
    ? Math.max(...versionList.map(v => v.version))
    : undefined;
  const selectedVersionItem = versionList.find(
    v => v.version === selectedVersion
  );

  const versionLabel = (v: InstructionVersionItem): React.ReactNode => {
    const labelText = v.label ?? `v${v.version}`;
    return v.version === latestVersion ? (
      <>
        {labelText}
        <span className={styles.latestStar} title={text.latestTooltip}>
          *
        </span>
      </>
    ) : (
      labelText
    );
  };

  const versionsPanel = (
    <SidebarListPanel
      title={isMobile ? undefined : text.versionsTitle}
      isLoading={versionsLoading}
      hasError={versionsError}
      errorText={text.versionsError}
      emptyText={text.versionsEmpty}
      listAriaLabel={text.versionsTitle}
      data-testid={testId ? `${testId}-versions` : undefined}
      groups={[
        {
          id: 'versions',
          label: '',
          items: versionList.map(v => ({
            id: `v${v.version}`,
            label: versionLabel(v),
            details:
              v.details != null ? (
                <span className={styles.versionDetails}>{v.details}</span>
              ) : undefined,
            isActive: v.version === selectedVersion,
            onSelect: () => {
              onSelectVersion?.(v.version);
              setVersionsMenuOpen(false);
            },
            testId: testId ? `${testId}-version-${v.version}` : undefined,
          })),
        },
      ]}
    />
  );

  return (
    <div className={styles.instructionEditor} data-testid={testId}>
      <div className={styles.body}>
        {!isMobile ? (
          <ResizableSidebar
            storageKey={versionsStorageKey}
            collapsible
            collapseLabel={text.collapseVersions}
            expandLabel={text.expandVersions}
            data-testid={testId ? `${testId}-versions-sidebar` : undefined}
          >
            {versionsPanel}
          </ResizableSidebar>
        ) : (
          !isNew && (
            <div className={styles.versionsMenu}>
              <button
                type="button"
                className={styles.versionsToggle}
                onClick={() => setVersionsMenuOpen(open => !open)}
                aria-expanded={versionsMenuOpen}
                aria-label={
                  versionsMenuOpen ? text.collapseVersions : text.expandVersions
                }
                data-testid={testId ? `${testId}-versions-toggle` : undefined}
              >
                <span className={styles.versionsToggleTitle}>
                  {text.versionsTitle}
                </span>
                {selectedVersionItem && (
                  <span className={styles.versionsToggleCurrent}>
                    {versionLabel(selectedVersionItem)}
                  </span>
                )}
                <span
                  className={`${styles.versionsChevron} ${versionsMenuOpen ? styles.versionsChevronOpen : ''}`}
                  aria-hidden="true"
                >
                  ❯
                </span>
              </button>
              {versionsMenuOpen && (
                <>
                  <div
                    className={styles.versionsBackdrop}
                    onClick={() => setVersionsMenuOpen(false)}
                    data-testid={
                      testId ? `${testId}-versions-backdrop` : undefined
                    }
                  />
                  <div className={styles.versionsDropdown}>{versionsPanel}</div>
                </>
              )}
            </div>
          )
        )}

        <div className={styles.content}>
          {role && (
            <div
              className={styles.accessLevel}
              data-testid={testId ? `${testId}-access-level` : undefined}
            >
              {text.accessLevel}: <strong>{role}</strong>
            </div>
          )}
          {readOnly && (
            <div
              className={styles.readonlyBanner}
              data-testid={testId ? `${testId}-readonly-banner` : undefined}
            >
              {text.readonlyBanner}
            </div>
          )}
          <div className={styles.inputGroup}>
            <InputTextWithHint
              hint={text.nameHint}
              value={name}
              onChange={e => onNameChange(e.target.value)}
              placeholder={text.namePlaceholder}
              disabled={readOnly}
              data-testid={testId ? `${testId}-name` : undefined}
            />
          </div>

          {hasMeta && (
            <div
              className={styles.instructionMeta}
              data-testid={testId ? `${testId}-meta` : undefined}
            >
              {icon && <span className={styles.metaIcon}>{icon}</span>}
              {color && (
                <span
                  className={styles.colorSwatch}
                  style={{ backgroundColor: color }}
                  title={color}
                  data-testid={testId ? `${testId}-color` : undefined}
                />
              )}
              {category && <span className={styles.metaChip}>{category}</span>}
              {tags?.map(tag => (
                <span key={tag} className={styles.metaChip}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className={styles.editorContainer}>
            <TextEditor
              id={editorId}
              value={instructionText}
              onChange={onInstructionTextChange}
              disableCache={true}
              height="100%"
              readOnly={readOnly}
              fullWidth
              data-testid={testId ? `${testId}-editor` : undefined}
            />
          </div>

          {!readOnly && (
            <div className={styles.footerActions}>
              {showDelete && (
                <PillButton
                  label={text.delete}
                  variant="danger"
                  onClick={onDelete}
                  disabled={isLoading}
                  data-testid={testId ? `${testId}-delete` : undefined}
                />
              )}
              <PillButton
                label={isLoading ? text.saving : text.save}
                variant="primary"
                onClick={onSave}
                disabled={isLoading || !instructionText.trim()}
                data-testid={testId ? `${testId}-save` : undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
