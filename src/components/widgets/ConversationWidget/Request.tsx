import React, { useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ICONS } from '../../../constants/icons';
import TextEditor, {
  type TextEditorHandle,
} from '../TextEditorWidget/TextEditor';
import { useAskSelection } from './AskSelectionContext';
import IconButton from '../../common/IconButton/IconButton';
import Tooltip from '../../common/Tooltip/Tooltip';
import { Icon } from '../../common/Icon/Icon';
import {
  useConversation,
  useConversationAuth,
  useConversationComposer,
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
import { prepareImageForUpload } from '../../../utils/imageUpload';
import { useWindowSize } from './useWindowSize';
import { NARROW_BREAKPOINT } from '../../../constants/breakpoints';

interface RequestProps {
  blockId: string;
}

/** Height the desktop editor box starts at while in use; its text grows it. */
const GROWN_EDITOR_HEIGHT_PX = 300;

/** The nearest ancestor that scrolls vertically (the conversation scroller). */
function findScrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
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
    getAccessTokenSilently,
  } = useConversationAuth();
  const { uploadAttachment } = useConversationServices();
  const { controls: composerControls } = useConversationComposer();
  const { showToast } = useToast();
  const validateAttachments = useAttachmentValidation();
  const hasAnyValidApiKey = aiVendorAPIKeyStatusList.some(s => s.isAPIKeyValid);
  const { width } = useWindowSize();
  // Matches respond-to-tablet (1024px) in Request.module.scss — the same
  // split between the docked editor's floating buttons and the desktop
  // button row. Keep this in lockstep with that CSS breakpoint, or they
  // produce mismatched markup (desktop button row floating beside an
  // absolutely-positioned, now-empty editor).
  const isNarrow = width <= NARROW_BREAKPOINT;

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
  const isNewChatBlock = !isFollowUpBlock;
  // Selection-asks always land in the trailing draft block — the follow-up
  // flow reuses or creates it before the ask is queued
  const isLastBlock =
    conversationBlockList.length > 0 &&
    conversationBlockList[conversationBlockList.length - 1]
      .conversationBlockId === blockId;

  const editorWrapperRef = React.useRef<HTMLDivElement | null>(null);

  // 📱 The docked editor grows upward with its text, up to the header (the
  // SCSS caps it). It is positioned out of flow, so a follow-up block reserves
  // the editor's real height itself, or a grown editor would cover the reply
  // above it. The block is stuck to the bottom of the view, so neither opening
  // the keyboard nor typing scrolls the conversation.
  const narrowContainerRef = React.useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const container = narrowContainerRef.current;
    const wrapper = editorWrapperRef.current;
    if (!isNarrow || !isEditorView || !isFollowUpBlock) return;
    if (!container || !wrapper) return;
    const observer = new ResizeObserver(() => {
      container.style.setProperty(
        '--editor-live-height',
        `${wrapper.offsetHeight}px`
      );
    });
    observer.observe(wrapper);
    return () => {
      observer.disconnect();
      container.style.removeProperty('--editor-live-height');
    };
  }, [isNarrow, isEditorView, isFollowUpBlock]);

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
      // The format was checked by addAttachments; prepareImageForUpload
      // turns the image into a PNG within the backend's limits
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
        const upload = isPdf ? file : await prepareImageForUpload(file);
        if (
          upload !== file &&
          pendingAttachmentsRef.current.some(a => a.localId === localId)
        ) {
          // The original may not render here (HEIC outside Safari)
          const convertedUrl = URL.createObjectURL(upload);
          URL.revokeObjectURL(previewUrl);
          setPendingAttachments(prev =>
            prev.map(a =>
              a.localId === localId
                ? { ...a, previewUrl: convertedUrl, fileName: upload.name }
                : a
            )
          );
        }
        const token = await getAccessTokenSilently();
        const ref = await uploadAttachment(token, upload);
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
  const contextTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  // Drafts live only in this component: a sent prompt must never come back as
  // the next conversation's draft, so nothing is kept in localStorage.

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

  // Typing in a desktop editor left at the bottom takes it back to the top
  // (set by the desktop composer below)
  const leaveBottomRef = React.useRef<() => void>(() => {});

  const handleEditorChange = React.useCallback(
    (newValue: string) => {
      // Ensure we are the active block
      setActiveBlockId(blockId);
      leaveBottomRef.current();

      // Immediate UI update via local state
      setDraftPrompt(newValue);

      // Debounce Context (Token Counting)
      if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
      contextTimerRef.current = setTimeout(() => {
        setEditorPrompt(newValue);
      }, 500);
    },
    [blockId, setActiveBlockId, setEditorPrompt]
  );

  // ---- Selection-asks (quote selected response text into this draft) ----
  const { pendingAsks, acknowledgeAsks, resetAskSession } = useAskSelection();
  const editorHandleRef = React.useRef<TextEditorHandle>(null);
  const consumedAskIdsRef = React.useRef<Set<number>>(new Set());
  const focusEndTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
      if (focusEndTimerRef.current) clearTimeout(focusEndTimerRef.current);
    };
  }, []);

  // Append each queued ask to the end of the draft as a blockquote — AFTER
  // whatever is already typed, so several ask → type → ask rounds keep their
  // order in the final prompt. Only the trailing draft block consumes the
  // queue; the consumed-ids set makes re-runs (e.g. dev strict mode) no-ops.
  useEffect(() => {
    if (!isEditorView || !isLastBlock || pendingAsks.length === 0) return;
    const fresh = pendingAsks.filter(
      ask => !consumedAskIdsRef.current.has(ask.id)
    );
    if (fresh.length === 0) return;
    fresh.forEach(ask => consumedAskIdsRef.current.add(ask.id));
    const quotes = fresh.map(ask => ask.quotedText).join('\n\n');
    const base = draftPrompt.replace(/\s+$/, '');
    // Trailing blank line so typing continues below the quote
    handleEditorChange(base ? `${base}\n\n${quotes}\n\n` : `${quotes}\n\n`);
    acknowledgeAsks(fresh.map(ask => ask.id));
    // Caret to the end once the editor has absorbed the new value — after
    // the follow-up flow's own focus timers (100/300ms), which would
    // otherwise leave the caret at the start
    if (focusEndTimerRef.current) clearTimeout(focusEndTimerRef.current);
    focusEndTimerRef.current = setTimeout(
      () => editorHandleRef.current?.focusEnd(),
      400
    );
  }, [
    pendingAsks,
    isEditorView,
    isLastBlock,
    draftPrompt,
    handleEditorChange,
    acknowledgeAsks,
  ]);

  // The trailing editor shows while the turn above it generates, but its
  // prompt can only go once that answer is in the conversation
  const isGenerating = conversationBlockList.some(b => b.isLoading);
  const canGenerate = hasAnyValidApiKey && !isGenerating;

  const handleGenerate = () => {
    if (!canGenerate) return;
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
    // The sent prompt took the quotes with it — next draft starts a fresh
    // ask session (possibly from another response)
    resetAskSession();
  };

  // 🖥️ The desktop editor rests as a one-line box stuck to the bottom of the
  // view and grows to a large box at the top of the view while in use
  // (focused, or holding a draft), then on with its text, never scrolling
  // inside. Scrolled back up out of view, it returns to the bottom: as the
  // one-line box when empty, holding its draft otherwise, until a press or a
  // keystroke takes it to the top again. A new chat's editor is always grown.
  const [isFocused, setFocused] = React.useState(false);
  const composerRef = React.useRef<HTMLDivElement | null>(null);
  const hasDraft =
    draftPrompt.trim().length > 0 ||
    pendingAttachments.length > 0 ||
    validatingCount > 0;
  const isGrown = isNewChatBlock || isFocused || hasDraft;
  const [isLeftBehind, setLeftBehind] = React.useState(false);
  const isAtTop =
    !isNarrow && isFollowUpBlock && isEditorView && isGrown && !isLeftBehind;
  const hasDraftRef = React.useRef(hasDraft);
  hasDraftRef.current = hasDraft;
  leaveBottomRef.current = () => setLeftBehind(false);

  useEffect(() => {
    if (!isGrown) setLeftBehind(false);
  }, [isGrown]);

  // A grown follow-up editor reserves a full view of height below its top
  // edge, so the conversation can always scroll it up to the top of the view.
  // The sent prompt renders into the same element, so the reserve has to go
  // with the editor, not just when it shrinks back to one line.
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el || !isAtTop) return;
    const reserve = () => {
      const scroller = findScrollParent(el);
      el.style.minHeight = scroller ? `${scroller.clientHeight}px` : '';
    };
    reserve();
    window.addEventListener('resize', reserve);
    return () => {
      window.removeEventListener('resize', reserve);
      el.style.minHeight = '';
    };
  }, [isAtTop]);

  // Starting to type brings the editor to the top of the view
  const wasAtTopRef = React.useRef(isAtTop);
  const wasFocusedRef = React.useRef(false);
  useEffect(() => {
    const arrived = isAtTop && !wasAtTopRef.current;
    const refocused = isAtTop && isFocused && !wasFocusedRef.current;
    if (arrived || refocused) {
      const toTop = () =>
        composerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      toTop();
      // Putting the caret in the text can have CodeMirror scroll it into
      // view a frame later, which stops a smooth scroll short of the top
      requestAnimationFrame(() => requestAnimationFrame(toTop));
    }
    wasAtTopRef.current = isAtTop;
    wasFocusedRef.current = isFocused;
  }, [isAtTop, isFocused]);

  // Scrolling back up until the editor at the top has left the view returns
  // it to the bottom. Only an upward scroll counts: the smooth scroll that
  // brings the editor to the top runs downward from below the view.
  useEffect(() => {
    const el = composerRef.current;
    if (!el || !isAtTop) return;
    const scroller = findScrollParent(el);
    if (!scroller) return;
    let lastTop = scroller.scrollTop;
    const handleScroll = () => {
      const scrolledUp = scroller.scrollTop < lastTop;
      lastTop = scroller.scrollTop;
      if (!scrolledUp) return;
      const outOfView =
        el.getBoundingClientRect().top >=
        scroller.getBoundingClientRect().bottom;
      if (!outOfView) return;
      setLeftBehind(true);
      if (!hasDraftRef.current && el.contains(document.activeElement)) {
        (document.activeElement as HTMLElement).blur();
      }
    };
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', handleScroll);
  }, [isAtTop]);

  const handleComposerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    // Focus moving between the text and the box's own buttons keeps it open
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setFocused(false);
  };

  // A press on the box outside the text and its controls puts the caret in
  // the text, so the whole box is the target, not just the text line. Any
  // press on a box left at the bottom takes it back to the top.
  const handleComposerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setLeftBehind(false);
    const target = e.target as HTMLElement;
    if (target.closest('button, input, a, [role="button"], .cm-editor')) return;
    e.preventDefault();
    editorHandleRef.current?.focusEnd();
  };

  const placeholder = isNewChatBlock
    ? t('conversation.request.placeholderNewChat')
    : t('conversation.request.placeholderFollowUp');

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
    return (
      <div
        className={styles.resolvedRequestContainer}
        data-testid={testId || 'resolved-request-wrapper'}
      >
        <TextContainer
          className={styles.requestWrapper}
          variant="turn"
          content={conversationBlock.prompt}
          title={
            <UserBrandName
              name={displayName}
              picture={displayPicture}
              as="span"
            />
          }
          showCopyButton={true}
          copyLabel={t('common.textContainer.copyPrompt')}
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

  const fileInput = uploadAttachment ? (
    // Shared hidden file input, driven by the attach buttons. Accepts images
    // and PDFs.
    <input
      ref={attachmentInputRef}
      type="file"
      accept={ATTACHMENT_FILE_INPUT_ACCEPT}
      multiple
      hidden
      onChange={handleAttachmentInputChange}
      data-testid="attachment-file-input"
    />
  ) : null;

  if (isNarrow) {
    // 📱 A follow-up editor nobody is using rests small; it takes its full
    // docked size once focused or holding a draft
    const isIdleFollowUp = isFollowUpBlock && !isFocused && !hasDraft;
    return (
      <div
        ref={narrowContainerRef}
        className={`${styles.container}${isFollowUpBlock ? ` ${styles.followUp}` : ''}${isIdleFollowUp ? ` ${styles.idleFollowUp}` : ''}`}
        onPasteCapture={handlePasteCapture}
        data-testid={testId || 'request-widget-container'}
        data-composer-state={isIdleFollowUp ? 'idle' : 'grown'}
        data-composer-sticky={isFollowUpBlock}
      >
        <div
          className={styles.editorWrapper}
          ref={editorWrapperRef}
          onFocus={() => setFocused(true)}
          onBlur={handleComposerBlur}
        >
          <TextEditor
            ref={editorHandleRef}
            id={blockId}
            value={draftPrompt}
            onChange={handleEditorChange}
            height="100%"
            className={styles.textEditorFullscreen}
            compact
            placeholder={placeholder}
            data-testid="text-editor"
          />

          {/* Compact icon-only generate button floating inside the editor's
              bottom-right corner */}
          <button
            className={styles.mobileGenerateButton}
            onClick={handleGenerate}
            disabled={!canGenerate}
            aria-label={t('conversation.request.generate')}
            data-testid="generate-button"
          >
            <Icon src={ICONS.SEND} size={22} />
          </button>

          {fileInput}

          {uploadAttachment && (
            // Attachment picker to the LEFT of the generate button — this
            // layout has no paste path, so it's the only way to attach a
            // file (image or PDF) here.
            <button
              className={styles.mobileAttachmentButton}
              onClick={() => attachmentInputRef.current?.click()}
              aria-label={t('conversation.request.addAttachment')}
              data-testid="attachment-button"
            >
              <Icon src={ICONS.ATTACHMENT} size={22} />
            </button>
          )}

          <AttachmentPreviewStrip
            attachments={pendingAttachments}
            onRemove={removeAttachment}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={composerRef}
      className={`${styles.composer} ${isGrown ? styles.grown : styles.idle}`}
      onPasteCapture={handlePasteCapture}
      data-testid={testId || 'request-widget-container'}
      data-composer-state={isGrown ? 'grown' : 'idle'}
      data-composer-sticky={isFollowUpBlock && !isAtTop}
    >
      <div
        ref={editorWrapperRef}
        className={`${styles.composerBox} ${isFocused ? styles.composerFocused : ''}`}
        style={isGrown ? { minHeight: GROWN_EDITOR_HEIGHT_PX } : undefined}
        onFocus={() => setFocused(true)}
        onBlur={handleComposerBlur}
        onMouseDown={handleComposerMouseDown}
        data-testid="composer-box"
      >
        <TextEditor
          ref={editorHandleRef}
          id={blockId}
          value={draftPrompt}
          onChange={handleEditorChange}
          height="auto"
          variant="composer"
          placeholder={placeholder}
          className={styles.composerText}
          data-testid="text-editor"
        />

        <AttachmentPreviewStrip
          attachments={pendingAttachments}
          onRemove={removeAttachment}
        />

        <div className={styles.composerBar}>
          {uploadAttachment && (
            <IconButton
              icon={ICONS.ATTACHMENT}
              label={t('conversation.request.addAttachment')}
              tooltipPosition="top"
              onClick={() => attachmentInputRef.current?.click()}
              data-testid="attachment-button"
            />
          )}
          {composerControls}
          <span className={styles.composerSpacer} />
          <Tooltip
            content={
              hasAnyValidApiKey
                ? t('conversation.request.generate')
                : t('conversation.request.noApiKeysSet')
            }
            position="top"
          >
            <button
              type="button"
              className={styles.sendButton}
              onClick={handleGenerate}
              disabled={!canGenerate}
              aria-label={t('conversation.request.generate')}
              data-testid="generate-button"
            >
              <Icon src={ICONS.SEND} size={16} />
            </button>
          </Tooltip>
        </div>

        {fileInput}
      </div>
    </div>
  );
}

export default React.memo(Request);
