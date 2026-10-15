import React, { useRef, useState } from 'react';
import styles from './AgentMaker.module.scss';
import { InputSelectWithHint } from '../../common/InputSelectWithHint/InputSelectWithHint';
import {
  PDF_PAGE_SIZES,
  PdfBrandingSettings,
  PdfPageSize,
} from '../GraphEditorWidget/types';

/** Logo formats every PDF renderer draws. */
export const PDF_LOGO_MEDIA_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
];

/** Largest logo accepted: it is embedded in every PDF the agent creates. */
export const MAX_PDF_LOGO_BYTES = 2 * 1024 * 1024;

/** "#1a73e8" or "1A73E8" (normalized to "#1A73E8"). */
const HEX_COLOR = /^#?([0-9a-fA-F]{6})$/;

/** User-facing strings of the PDF-branding fields (part of AgentMakerStrings). */
export interface PdfBrandingStrings {
  pdfBrandingTitle: string;
  pdfBrandingHelp: string;
  pdfBrandingToolDisabled: string;
  pdfBrandingCompanyName: string;
  pdfBrandingLogo: string;
  pdfBrandingLogoHint: string;
  pdfBrandingLogoUpload: string;
  pdfBrandingLogoReplace: string;
  pdfBrandingLogoUploading: string;
  pdfBrandingLogoRemove: string;
  pdfBrandingLogoSet: string;
  pdfBrandingLogoInvalid: string;
  pdfBrandingLogoFailed: string;
  pdfBrandingLogoUnavailable: string;
  pdfBrandingAccentColor: string;
  pdfBrandingAccentColorInvalid: string;
  pdfBrandingFooterText: string;
  pdfBrandingPageSize: string;
  pdfBrandingPageSizeAuto: string;
}

export const DEFAULT_PDF_BRANDING_STRINGS: PdfBrandingStrings = {
  pdfBrandingTitle: 'PDF branding',
  pdfBrandingHelp: 'Applied to every PDF the generate_pdf tool creates',
  pdfBrandingToolDisabled:
    "generate_pdf isn't in this node's tools, so these settings are unused.",
  pdfBrandingCompanyName: 'Company name',
  pdfBrandingLogo: 'Logo',
  pdfBrandingLogoHint: 'PNG or JPEG, at most 2 MB',
  pdfBrandingLogoUpload: 'Upload logo…',
  pdfBrandingLogoReplace: 'Replace…',
  pdfBrandingLogoUploading: 'Uploading…',
  pdfBrandingLogoRemove: 'Remove',
  pdfBrandingLogoSet: 'Logo uploaded',
  pdfBrandingLogoInvalid:
    'The logo must be a PNG or JPEG image of at most 2 MB.',
  pdfBrandingLogoFailed: 'The logo upload failed. Please try again.',
  pdfBrandingLogoUnavailable: "Logo uploads aren't available here.",
  pdfBrandingAccentColor: 'Accent color',
  pdfBrandingAccentColorInvalid: 'Use a hex color such as #1A73E8.',
  pdfBrandingFooterText: 'Footer text',
  pdfBrandingPageSize: 'Default page size',
  pdfBrandingPageSizeAuto: "Automatic (from the user's language)",
};

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The raw `tool_settings.generate_pdf` object of a node config ({} when absent). */
function rawPdfBranding(
  config: Record<string, unknown>
): Record<string, unknown> {
  const toolSettings = config.tool_settings;
  if (!isPlainObject(toolSettings)) return {};
  const branding = toolSettings.generate_pdf;
  return isPlainObject(branding) ? branding : {};
}

/** The node's PDF branding, keeping only well-typed values. */
export function readPdfBranding(
  config: Record<string, unknown>
): PdfBrandingSettings {
  const raw = rawPdfBranding(config);
  const branding: PdfBrandingSettings = {};
  (
    [
      'logo_attachment_id',
      'company_name',
      'accent_color',
      'footer_text',
    ] as const
  ).forEach(key => {
    const value = raw[key];
    if (typeof value === 'string' && value !== '') branding[key] = value;
  });
  const size = raw.default_page_size;
  if (
    typeof size === 'string' &&
    (PDF_PAGE_SIZES as readonly string[]).includes(size)
  ) {
    branding.default_page_size = size as PdfPageSize;
  }
  return branding;
}

/**
 * Whether the node binds generate_pdf: its `tools` list names it, or it has
 * no list (every built-in tool is bound then).
 */
export function bindsGeneratePdf(config: Record<string, unknown>): boolean {
  return !Array.isArray(config.tools) || config.tools.includes('generate_pdf');
}

/**
 * `toolSettings` with `generate_pdf` set to `branding` (dropped when empty);
 * undefined when nothing is left, so the key disappears from the config.
 */
export function withPdfBranding(
  toolSettings: unknown,
  branding: Record<string, unknown>
): Record<string, unknown> | undefined {
  const next: Record<string, unknown> = isPlainObject(toolSettings)
    ? { ...toolSettings }
    : {};
  if (Object.keys(branding).length > 0) {
    next.generate_pdf = branding;
  } else {
    delete next.generate_pdf;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

interface PdfBrandingFieldsProps {
  /** The node's parsed config. */
  config: Record<string, unknown>;
  /** Writes the node's new `tool_settings` (undefined removes the key). */
  onToolSettingsChange: (
    toolSettings: Record<string, unknown> | undefined
  ) => void;
  /** Uploads the logo image and resolves its attachment id. */
  onUploadImage?: (file: File) => Promise<string>;
  strings: PdfBrandingStrings;
  testId: string;
}

/**
 * Letterhead settings of a TOOL_EXECUTOR node — company name, logo, accent
 * color, footer text and default page size — stored in its config as
 * `tool_settings.generate_pdf` (plan 6.2). Shown while the node binds
 * generate_pdf (or already carries settings). Changes apply immediately;
 * empty fields are removed rather than stored blank, and keys this form
 * doesn't know are kept.
 */
export default function PdfBrandingFields({
  config,
  onToolSettingsChange,
  onUploadImage,
  strings,
  testId,
}: PdfBrandingFieldsProps): React.ReactElement | null {
  const branding = readPdfBranding(config);

  // The logo upload resolves later: write against the newest config and
  // handler, not the ones from when it started, so edits made meanwhile
  // survive
  const configRef = useRef(config);
  configRef.current = config;
  const onChangeRef = useRef(onToolSettingsChange);
  onChangeRef.current = onToolSettingsChange;

  const [accentDraft, setAccentDraft] = useState(branding.accent_color ?? '');
  const [accentInvalid, setAccentInvalid] = useState(false);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const enabled = bindsGeneratePdf(config);
  if (!enabled && Object.keys(branding).length === 0) return null;

  const update = (
    patch: Partial<Record<keyof PdfBrandingSettings, string>>
  ) => {
    const latest = configRef.current;
    const next: Record<string, unknown> = { ...rawPdfBranding(latest) };
    (Object.keys(patch) as (keyof PdfBrandingSettings)[]).forEach(key => {
      const value = patch[key];
      if (value === undefined || value.trim() === '') {
        delete next[key];
      } else {
        next[key] = value;
      }
    });
    onChangeRef.current(withPdfBranding(latest.tool_settings, next));
  };

  const changeAccent = (value: string) => {
    setAccentDraft(value);
    const trimmed = value.trim();
    if (trimmed === '') {
      setAccentInvalid(false);
      update({ accent_color: undefined });
      return;
    }
    const match = HEX_COLOR.exec(trimmed);
    if (!match) {
      // Keep the last valid color stored until the input is fixed
      setAccentInvalid(true);
      return;
    }
    setAccentInvalid(false);
    update({ accent_color: `#${match[1].toUpperCase()}` });
  };

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow picking the same file again later
    e.target.value = '';
    if (!file || !onUploadImage) return;
    if (
      !PDF_LOGO_MEDIA_TYPES.includes(file.type) ||
      file.size > MAX_PDF_LOGO_BYTES
    ) {
      setLogoError(strings.pdfBrandingLogoInvalid);
      return;
    }
    setLogoError(null);
    setLogoUploading(true);
    try {
      const attachmentId = await onUploadImage(file);
      setLogoName(file.name);
      update({ logo_attachment_id: attachmentId });
    } catch {
      setLogoError(strings.pdfBrandingLogoFailed);
    } finally {
      setLogoUploading(false);
    }
  };

  const logoId = branding.logo_attachment_id;

  return (
    <section className={styles.section} data-testid={`${testId}-pdf-branding`}>
      <span className={styles.fieldLabel}>
        {strings.pdfBrandingTitle}{' '}
        <span className={styles.fieldLabelHint}>{strings.pdfBrandingHelp}</span>
      </span>
      {!enabled && (
        <span
          className={styles.fieldLabelHint}
          data-testid={`${testId}-pdf-branding-unused`}
        >
          {strings.pdfBrandingToolDisabled}
        </span>
      )}

      <label className={styles.fieldLabel}>
        {strings.pdfBrandingCompanyName}
        <input
          className={styles.plainInput}
          value={branding.company_name ?? ''}
          onChange={e => update({ company_name: e.target.value })}
          data-testid={`${testId}-pdf-company`}
        />
      </label>

      <div className={styles.templateField}>
        <span className={styles.fieldLabel}>
          {strings.pdfBrandingLogo}{' '}
          <span className={styles.fieldLabelHint}>
            {strings.pdfBrandingLogoHint}
          </span>
        </span>
        <div className={styles.inlineRow}>
          {logoId && (
            <span
              className={styles.logoName}
              title={logoId}
              data-testid={`${testId}-pdf-logo`}
            >
              {logoName ?? strings.pdfBrandingLogoSet}
            </span>
          )}
          {onUploadImage && (
            <>
              <input
                ref={logoInputRef}
                type="file"
                accept={PDF_LOGO_MEDIA_TYPES.join(',')}
                hidden
                onChange={e => void pickLogo(e)}
                data-testid={`${testId}-pdf-logo-input`}
              />
              <button
                type="button"
                className={styles.linkButton}
                disabled={logoUploading}
                onClick={() => logoInputRef.current?.click()}
                data-testid={`${testId}-pdf-logo-upload`}
              >
                {logoUploading
                  ? strings.pdfBrandingLogoUploading
                  : logoId
                    ? strings.pdfBrandingLogoReplace
                    : strings.pdfBrandingLogoUpload}
              </button>
            </>
          )}
          {logoId && !logoUploading && (
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setLogoName(null);
                update({ logo_attachment_id: undefined });
              }}
              data-testid={`${testId}-pdf-logo-remove`}
            >
              {strings.pdfBrandingLogoRemove}
            </button>
          )}
        </div>
        {!onUploadImage && !logoId && (
          <span
            className={styles.fieldLabelHint}
            data-testid={`${testId}-pdf-logo-unavailable`}
          >
            {strings.pdfBrandingLogoUnavailable}
          </span>
        )}
        {logoError && (
          <p
            className={`${styles.message} ${styles.error}`}
            role="alert"
            data-testid={`${testId}-pdf-logo-error`}
          >
            {logoError}
          </p>
        )}
      </div>

      <div className={styles.templateField}>
        <span className={styles.fieldLabel}>
          {strings.pdfBrandingAccentColor}
        </span>
        <div className={styles.inlineRow}>
          <input
            type="color"
            className={styles.colorSwatch}
            value={(branding.accent_color ?? '#000000').toLowerCase()}
            onChange={e => changeAccent(e.target.value)}
            aria-label={strings.pdfBrandingAccentColor}
            data-testid={`${testId}-pdf-accent-picker`}
          />
          <input
            className={styles.plainInput}
            value={accentDraft}
            placeholder="#1A73E8"
            onChange={e => changeAccent(e.target.value)}
            aria-label={strings.pdfBrandingAccentColor}
            aria-invalid={accentInvalid || undefined}
            data-testid={`${testId}-pdf-accent`}
          />
        </div>
        {accentInvalid && (
          <p
            className={`${styles.message} ${styles.error}`}
            data-testid={`${testId}-pdf-accent-error`}
          >
            {strings.pdfBrandingAccentColorInvalid}
          </p>
        )}
      </div>

      <label className={styles.fieldLabel}>
        {strings.pdfBrandingFooterText}
        <input
          className={styles.plainInput}
          value={branding.footer_text ?? ''}
          onChange={e => update({ footer_text: e.target.value })}
          data-testid={`${testId}-pdf-footer`}
        />
      </label>

      <InputSelectWithHint
        hint={strings.pdfBrandingPageSize}
        placeholder={strings.pdfBrandingPageSizeAuto}
        value={branding.default_page_size ?? ''}
        onChange={value => update({ default_page_size: value || undefined })}
        options={[
          { label: strings.pdfBrandingPageSizeAuto, value: '' },
          ...PDF_PAGE_SIZES.map(size => ({ label: size, value: size })),
        ]}
        data-testid={`${testId}-pdf-page-size`}
      />
    </section>
  );
}
