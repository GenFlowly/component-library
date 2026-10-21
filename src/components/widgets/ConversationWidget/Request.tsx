import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '../../../constants/icons';
import TextEditor from '../TextEditorWidget/TextEditor';
import RectangleButton from '../../common/RectangleButton/RectangleButton';
import Tooltip from '../../common/Tooltip/Tooltip';
import { Icon } from '../../common/Icon/Icon';
import {
  useConversation,
  useConversationAuth,
  useConversationServices,
  useConversationUI,
  useToast,
} from './ConversationWidgetContext';
import TextContainer from '../../common/TextContainer/TextContainer';
import styles from './Request.module.scss';
import { UserBrandName } from './BrandName';
import { formatServerDateTime } from './timeUtils';
import AttachmentPreviewStrip, {
  PendingAttachment,
  ResolvedAttachmentThumbnails,
} from './AttachmentPreviewStrip';
import {
  ATTACHMENT_FILE_INPUT_ACCEPT,
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_PDFS_PER_MESSAGE,
  PDF_MEDIA_TYPE,
  isImageFile,
  isPdfFile,
} from './attachment.models';
import { useAttachmentValidation } from './useAttachmentValidation';
import { useWindowSize } from './useWindowSize';

interface RequestProps {
  blockId: string;
}

// Memoized (see export): props are stable, so re-renders come only from its
// own editing state and the contexts it subscribes to
function Request({
  blockId,
  'data-testid': testId,
}: RequestProps & { 'data-testid'?: string }) {
  const { t } = useTranslation();
  const {
    conversationBlockList,
    generateResponsesStream,
    getSelectedResponseForBlock,
    setActiveBlockId,
  } = useConversation();
  const { setEditorPrompt } = useConversationUI();

  const {
    aiVendorAPIKeyStatusList,
    customerName,
    customerPicture,
    user,
    customerId,
    getAccessTokenSilently,
  } = useConversationAuth();
  const { uploadAttachment } = useConversationServices();
  const { showToast } = useToast();
  const validateAttachments = useAttachmentValidation();
  const hasAnyValidApiKey = aiVendorAPIKeyStatusList.some(s => s.isAPIKeyValid);
  const { width } = useWindowSize();
  const isMobile = width <= 768;

  const conversationBlock = conversationBlockList.find(
    b => b.conversationBlockId === blockId
  );
  // The prompt editor renders unless the block is streaming/resolved
  const isEditorView =
    !!conversationBlock &&
    conversationBlock.status !== 'resolved' &&
    !conversationBlock.isLoading;
  // Any block after the first is a follow-up: same docked editor, but the
  // block only occupies the editor's height on mobile, not a full screen
  const isFollowUpBlock =
    conversationBlockList.findIndex(b => b.conversationBlockId === blockId) > 0;

  const editorWrapperRef = React.useRef<HTMLDivElement | null>(null);

  // 📱 A focused follow-up block grows by the keyboard's height (--kb in
  // the SCSS) so the riding editor gets reserved space instead of
  // overlapping the response above. That growth happens at the END of the
  // scroll content — keep the conversation pinned to the end whenever the
  // keyboard opens/closes so the editor lands flush on the keyboard with
  // the last response visible right above it.
  useEffect(() => {
    if (!isEditorView || !isFollowUpBlock) return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const scrollConversationToEnd = () => {
      const scroller = document.querySelector(
        '[data-testid="center-section-scroll"]'
      );
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    };

    const handleResize = () => {
      if (!editorWrapperRef.current?.contains(document.activeElement)) return;
      // Double rAF: the --vvh/--kb CSS vars are themselves written in a
      // rAF, so wait a frame for the block's new height to apply first
      requestAnimationFrame(() =>
        requestAnimationFrame(scrollConversationToEnd)
      );
    };

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, [isEditorView, isFollowUpBlock]);

  // 📱 iOS Safari force-scrolls the page on focus when it thinks the
  // keyboard will cover the caret — before our CSS has moved the editor up
  // — which shoves the whole layout (incl. the fixed MobileHeader) off
  // screen. The editor repositions itself above the keyboard, so the
  // scroll is never needed: pin the window scroll back to 0 during the
  // keyboard animation and whenever Safari retries while the editor owns
  // focus. No-op everywhere else (the window never scrolls in this app).
  useEffect(() => {
    if (!isEditorView) return;
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    let rafId: number | null = null;
    let pinUntil = 0;

    const pin = () => {
      rafId = null;
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      if (performance.now() < pinUntil) {
        rafId = requestAnimationFrame(pin);
      }
    };
    const startPinning = (durationMs: number) => {
      pinUntil = Math.max(pinUntil, performance.now() + durationMs);
      if (rafId === null) rafId = requestAnimationFrame(pin);
    };

    // Cover the whole keyboard open/close animation (~250ms on iOS);
    // focusout catches the close-side pan Safari does while restoring
    const handleFocusChange = () => startPinning(700);
    // Safari can re-scroll later (e.g. caret moves); undo while focused
    const handleScroll = () => {
      if (wrapper.contains(document.activeElement)) startPinning(150);
    };

    wrapper.addEventListener('focusin', handleFocusChange);
    wrapper.addEventListener('focusout', handleFocusChange);
    window.addEventListener('scroll', handleScroll);
    window.visualViewport?.addEventListener('scroll', handleScroll);
    return () => {
      wrapper.removeEventListener('focusin', handleFocusChange);
      wrapper.removeEventListener('focusout', handleFocusChange);
      window.removeEventListener('scroll', handleScroll);
      window.visualViewport?.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isEditorView]);

  // ✅ Local draft state to prevent global re-renders on typing
  const [draftPrompt, setDraftPrompt] = React.useState(
    conversationBlock?.prompt || ''
  );

  // Images pasted into the editor; uploaded to S3 in the background
  const [pendingAttachments, setPendingAttachments] = React.useState<
    PendingAttachment[]
  >([]);
  const pendingAttachmentsRef = React.useRef(pendingAttachments);
  pendingAttachmentsRef.current = pendingAttachments;

  // Revoke preview object URLs on unmount
  useEffect(() => {
    return () => {
      pendingAttachmentsRef.current.forEach(a =>
        URL.revokeObjectURL(a.previewUrl)
      );
    };
  }, []);

  const removeAttachment = React.useCallback((localId: string) => {
    setPendingAttachments(prev => {
      const target = prev.find(a => a.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter(a => a.localId !== localId);
    });
  }, []);

  const uploadPastedImage = React.useCallback(
    async (file: File) => {
      // Attachments need the host's upload service — without it the paste
      // path is simply off
      if (!uploadAttachment) return;
      // No size check, and the format was checked by addAttachments: any
      // supported image goes up as-is (HEIC from iPhones, camera RAW,
      // multi-MB photos) and the backend converts/compresses it for the
      // LLM vendors
      if (pendingAttachmentsRef.current.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
        showToast(
          t('conversation.request.attachmentLimitReached', {
            max: MAX_ATTACHMENTS_PER_MESSAGE,
          })
        );
        return;
      }

      const isPdf = isPdfFile(file.type, file.name);
      const localId = `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      const entry: PendingAttachment = {
        localId,
        fileName: file.name || (isPdf ? 'document.pdf' : 'pasted-image'),
        // Marks the chip as a document (vs. an image thumbnail). PDFs report
        // application/pdf; images may report '' (HEIC) — treated as an image.
        mediaType: isPdf ? PDF_MEDIA_TYPE : file.type,
        previewUrl,
        status: 'uploading',
      };
      // Reserve the slot now: several files arrive in one picker/paste event,
      // before any re-render refreshes the ref, and each must see the others
      pendingAttachmentsRef.current = [...pendingAttachmentsRef.current, entry];
      setPendingAttachments(prev => [...prev, entry]);

      try {
        const token = await getAccessTokenSilently();
        const ref = await uploadAttachment(token, file);
        setPendingAttachments(prev =>
          prev.map(a =>
            a.localId === localId ? { ...a, status: 'ready', ref } : a
          )
        );
      } catch (err) {
        console.error('Attachment upload failed:', err);
        showToast(t('conversation.request.attachmentUploadFailed'));
        removeAttachment(localId);
      }
    },
    [getAccessTokenSilently, removeAttachment, showToast, t, uploadAttachment]
  );

  // Picker/paste events whose files are still being format-checked: nothing
  // is in the strip yet, but Generate must wait for them like for uploads
  const [validatingCount, setValidatingCount] = React.useState(0);

  // Several files from one picker/paste event: drop (and toast about) the
  // ones in a format the backend can't use, upload what fits under the
  // per-message limit and tell the user once about the rest.
  const addAttachments = React.useCallback(
    async (files: File[]) => {
      setValidatingCount(n => n + 1);
      let supported: File[];
      try {
        supported = await validateAttachments(files);
      } finally {
        // Same tick as the uploads below reserve their slots: no Generate
        // click can land in between
        setValidatingCount(n => n - 1);
      }
      // PDFs have a stricter per-message sub-limit than images (they're far
      // heavier and some vendors cap total document pages). Drop PDFs beyond
      // the budget, keeping images, and toast once if any PDF was dropped.
      let pdfBudget =
        MAX_PDFS_PER_MESSAGE -
        pendingAttachmentsRef.current.filter(
          a => a.mediaType === PDF_MEDIA_TYPE
        ).length;
      let droppedPdf = false;
      const withinPdfLimit = supported.filter(file => {
        if (!isPdfFile(file.type, file.name)) return true;
        if (pdfBudget <= 0) {
          droppedPdf = true;
          return false;
        }
        pdfBudget -= 1;
        return true;
      });
      if (droppedPdf) {
        showToast(
          t('conversation.request.attachmentPdfLimitReached', {
            max: MAX_PDFS_PER_MESSAGE,
          })
        );
      }

      const free =
        MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachmentsRef.current.length;
      if (withinPdfLimit.length > free) {
        showToast(
          t('conversation.request.attachmentLimitReached', {
            max: MAX_ATTACHMENTS_PER_MESSAGE,
          })
        );
      }
      withinPdfLimit.slice(0, Math.max(0, free)).forEach(uploadPastedImage);
    },
    [showToast, t, uploadPastedImage, validateAttachments]
  );

  // Mobile file-picker path: same validation/upload pipeline as paste.
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const handleAttachmentInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void addAttachments(Array.from(e.target.files ?? []));
      // Allow re-selecting the same file later
      e.target.value = '';
    },
    [addAttachments]
  );

  // GitHub-style paste: an image in the clipboard uploads automatically,
  // no file picker involved. Capture phase so the markdown editor doesn't
  // swallow the event first. Files that aren't images are taken too (and
  // turned down with a toast) when the paste is files alone, e.g. copied
  // in Finder/Explorer; next to text they're left to the editor.
  const handlePasteCapture = React.useCallback(
    (e: React.ClipboardEvent) => {
      if (!uploadAttachment) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const filesOnly = items.every(item => item.kind === 'file');
      const files = items
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter(
          (f): f is File =>
            f !== null && (filesOnly || isImageFile(f.type, f.name))
        );

      if (files.length === 0) return;

      e.preventDefault();
      e.stopPropagation();
      void addAttachments(files);
    },
    [addAttachments, uploadAttachment]
  );

  // Dependencies moved from TextEditor
  const storageTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const contextTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const STORAGE_KEY = customerId
    ? `${customerId}_prompt_editor_content_conv-${blockId}`
    : '';

  // Load from localStorage only on mount if empty
  useEffect(() => {
    if (!STORAGE_KEY) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && !draftPrompt) {
        setDraftPrompt(saved);
        // Also sync to parent/global if needed, but usually we wait for user action
        // actually, if we load from storage, we should probably update the draft
      }
    } catch (err) {
      console.error('Failed to load from localStorage:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync draft if global prompt changes (e.g. history load or API success)
  useEffect(() => {
    if (conversationBlock?.prompt && conversationBlock.prompt !== draftPrompt) {
      setDraftPrompt(conversationBlock.prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationBlock?.prompt]);

  // ✅ Sync AI Context on mount (or when blockId changes)
  // This restores the logic previously in TextEditor that ensures
  // the Token Counter knows about this block immediately.
  useEffect(() => {
    // Only sync if we are the "active" editing block (no responses yet)
    if (conversationBlock?.responseMessages.length === 0) {
      setActiveBlockId(blockId);
      setEditorPrompt(draftPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]); // Run on mount/id change

  const handleEditorChange = React.useCallback(
    (newValue: string) => {
      // Ensure we are the active block
      setActiveBlockId(blockId);

      // Immediate UI update via local state
      setDraftPrompt(newValue);

      // Debounce localStorage
      if (storageTimerRef.current) clearTimeout(storageTimerRef.current);
      storageTimerRef.current = setTimeout(() => {
        try {
          if (STORAGE_KEY) {
            localStorage.setItem(STORAGE_KEY, newValue);
          }
        } catch (err) {
          console.error(err);
        }
      }, 500);

      // Debounce Context (Token Counting)
      if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
      contextTimerRef.current = setTimeout(() => {
        setEditorPrompt(newValue);
      }, 500);
    },
    [blockId, setActiveBlockId, setEditorPrompt, STORAGE_KEY]
  );

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (storageTimerRef.current) clearTimeout(storageTimerRef.current);
      if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
    };
  }, []);

  const handleGenerate = () => {
    if (!hasAnyValidApiKey) return;
    if (
      validatingCount > 0 ||
      pendingAttachments.some(a => a.status === 'uploading')
    ) {
      showToast(t('conversation.request.attachmentsUploading'));
      return;
    }
    const selectedId = getSelectedResponseForBlock(blockId);
    const attachmentRefs = pendingAttachments
      .map(a => a.ref)
      .filter((r): r is NonNullable<typeof r> => r != null);
    generateResponsesStream(
      blockId,
      draftPrompt,
      selectedId,
      undefined,
      attachmentRefs
    );
    // The block now owns the refs; drop the local previews
    pendingAttachments.forEach(a => URL.revokeObjectURL(a.previewUrl));
    setPendingAttachments([]);
  };

  if (!conversationBlock) return null;

  // If we have responses AND loading is finished, this block is "resolved" -> Show static text
  // (Stopping an in-flight generation is done per-vendor from the Response widget.)
  // History blocks carry their author's profile (sender) — a shared
  // conversation must show who actually sent each message, never the
  // viewer's own identity. Blocks created live in this session have no
  // sender; there the viewer IS the author, so their profile applies.
  const sender = conversationBlock.sender;
  const displayName = sender
    ? (sender.name ?? '')
    : customerName || user?.name || '';
  const displayPicture = sender
    ? (sender.picture ?? undefined)
    : customerPicture || user?.picture || undefined;

  // Only lock Request when actively streaming/resolved AND not being edited
  if (conversationBlock.status === 'resolved' || conversationBlock.isLoading) {
    // The request card spans the total max allowed width of the response
    // columns below it (N columns + the gaps between them)
    const responseColumnCount = Math.max(
      1,
      conversationBlock.responseMessages.length
    );
    return (
      <div
        className={styles.resolvedRequestContainer}
        style={
          {
            '--response-column-count': responseColumnCount,
          } as React.CSSProperties
        }
        data-testid={testId || 'resolved-request-wrapper'}
      >
        <TextContainer
          className={styles.requestWrapper}
          content={conversationBlock.prompt}
          title={
            <UserBrandName
              name={displayName}
              picture={displayPicture}
              as="span"
            />
          }
          showCopyButton={true}
          data-testid={testId || 'resolved-request-wrapper'}
        >
          {(conversationBlock.attachments?.length ?? 0) > 0 && (
            <ResolvedAttachmentThumbnails
              attachments={conversationBlock.attachments!}
            />
          )}
          {conversationBlock.sentAt && (
            <div
              className={styles.sentTimestamp}
              data-testid="request-sent-timestamp"
            >
              {formatServerDateTime(conversationBlock.sentAt)}
            </div>
          )}
        </TextContainer>
      </div>
    );
  }

  // Otherwise show the editor
  return (
    <div
      className={`${styles.container}${isFollowUpBlock ? ` ${styles.followUp}` : ''}`}
      onPasteCapture={handlePasteCapture}
      data-testid={testId || 'request-widget-container'}
    >
      <div className={styles.editorWrapper} ref={editorWrapperRef}>
        <TextEditor
          id={blockId}
          value={draftPrompt}
          onChange={handleEditorChange}
          height="100%"
          className={styles.textEditorFullscreen}
          data-testid="text-editor"
        />

        {isMobile && (
          // 📱 Compact icon-only generate button floating inside the
          // editor's bottom-right corner
          <button
            className={styles.mobileGenerateButton}
            onClick={handleGenerate}
            disabled={!hasAnyValidApiKey}
            aria-label={t('conversation.request.generate')}
            data-testid="generate-button"
          >
            <Icon src={ICONS.SEND} size={22} />
          </button>
        )}

        {uploadAttachment && (
          // Shared hidden file input, driven by the mobile and desktop
          // attach buttons. Accepts images and PDFs.
          <input
            ref={attachmentInputRef}
            type="file"
            accept={ATTACHMENT_FILE_INPUT_ACCEPT}
            multiple
            hidden
            onChange={handleAttachmentInputChange}
            data-testid="attachment-file-input"
          />
        )}

        {isMobile && uploadAttachment && (
          // 📱 Attachment picker to the LEFT of the generate button —
          // mobile has no paste path, so this is the only way to attach a
          // file (image or PDF) there.
          <button
            className={styles.mobileAttachmentButton}
            onClick={() => attachmentInputRef.current?.click()}
            aria-label={t('conversation.request.addAttachment')}
            data-testid="attachment-button"
          >
            <Icon src={ICONS.IMAGE_ATTACHMENT} size={22} />
          </button>
        )}

        <AttachmentPreviewStrip
          attachments={pendingAttachments}
          onRemove={removeAttachment}
        />
      </div>

      {!isMobile && (
        <div
          className={styles.buttonWrapper}
          data-testid="generate-button-wrapper"
        >
          {uploadAttachment && (
            // 🖥️ Desktop attach button — the only way to add a PDF on
            // desktop (PDFs can't be pasted); images can still be pasted.
            <button
              className={styles.desktopAttachmentButton}
              onClick={() => attachmentInputRef.current?.click()}
              aria-label={t('conversation.request.addAttachment')}
              title={t('conversation.request.addAttachment')}
              data-testid="attachment-button"
            >
              <Icon src={ICONS.IMAGE_ATTACHMENT} size={20} />
            </button>
          )}
          <Tooltip
            content={
              !hasAnyValidApiKey ? t('conversation.request.noApiKeysSet') : ''
            }
          >
            <div style={!hasAnyValidApiKey ? { cursor: 'not-allowed' } : {}}>
              <RectangleButton
                onClick={handleGenerate}
                label={t('conversation.request.generate')}
                disabled={!hasAnyValidApiKey}
                icon={ICONS.SEND}
                data-testid="generate-button"
              />
            </div>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export default React.memo(Request);
