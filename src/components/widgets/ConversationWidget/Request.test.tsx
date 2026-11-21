import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
  within,
} from '@testing-library/react';
import Request from './Request';
import {
  useConversation,
  useConversationUI,
  useConversationAuth,
} from './ConversationWidgetContext';
import '@testing-library/jest-dom';

// Mock the injection context (conversation state, auth, toast and the
// attachment upload service all flow through it)
const mockShowToast = jest.fn();
const mockUploadAttachment = jest.fn();
const mockComposer: { controls?: React.ReactNode } = {};
jest.mock('./ConversationWidgetContext', () => ({
  useConversation: jest.fn(),
  useConversationUI: jest.fn(),
  useConversationAuth: jest.fn(),
  useConversationServices: () => ({ uploadAttachment: mockUploadAttachment }),
  useConversationComposer: () => mockComposer,
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockPrepareImageForUpload = jest.fn();
jest.mock('../../../utils/imageUpload', () => ({
  prepareImageForUpload: (file: File) => mockPrepareImageForUpload(file),
}));

// Mock heavy child components
const mockFocusEnd = jest.fn();
jest.mock('../TextEditorWidget/TextEditor', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ReactActual.forwardRef(
      (
        { value, onChange, placeholder, height, 'data-testid': testId }: any,
        ref: any
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          focusEnd: mockFocusEnd,
        }));
        return (
          <textarea
            data-testid={testId}
            data-height={height}
            value={value}
            placeholder={placeholder}
            onChange={(e: any) => onChange(e.target.value)}
          />
        );
      }
    ),
  };
});
jest.mock('../../common/TextContainer/TextContainer', () => ({
  __esModule: true,
  default: ({
    content,
    title,
    copyLabel,
    variant,
    children,
  }: {
    content: string;
    title?: React.ReactNode;
    copyLabel?: string;
    variant?: string;
    children?: React.ReactNode;
  }) => (
    <div
      data-testid="text-container"
      data-copy-label={copyLabel}
      data-variant={variant}
    >
      {title}
      {content}
      {children}
    </div>
  ),
}));

jest.mock('./BrandName', () => ({
  UserBrandName: ({ name, picture }: any) => (
    <span data-testid="user-brand-name" data-picture={picture ?? ''}>
      {name}
    </span>
  ),
}));

describe('Request Widget Component', () => {
  const mockUseConversation = useConversation as jest.Mock;
  const mockUseConversationUI = useConversationUI as jest.Mock;
  const mockUseAuth = useConversationAuth as jest.Mock;
  const mockGenerateResponsesStream = jest.fn();
  const mockStopGenerating = jest.fn();
  const mockSetEditorPrompt = jest.fn();
  const mockSetActiveBlockId = jest.fn();
  const mockGetSelectedResponseForBlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrepareImageForUpload.mockImplementation(async (file: File) => file);
    // setEditorPrompt moved to the ConversationUI context (perf split);
    // the main-context mocks below may still carry it harmlessly
    mockUseConversationUI.mockReturnValue({
      setEditorPrompt: mockSetEditorPrompt,
    });
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [],
          isLoading: false,
          status: 'draft',
          prompt: '',
        },
      ],
      generateResponsesStream: mockGenerateResponsesStream,
      stopGenerating: mockStopGenerating,
      getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
      setEditorPrompt: mockSetEditorPrompt,
      setActiveBlockId: mockSetActiveBlockId,
    });

    mockUseAuth.mockReturnValue({
      aiVendorAPIKeyStatusList: [{ isAPIKeyValid: true }],
      customerName: 'Test User',
      user: { name: 'Auth0 User' },
      customerId: 'cust-123',
      getAccessTokenSilently: jest.fn().mockResolvedValue('test-token'),
    });
  });

  test('renders in Editor mode when no responses', () => {
    render(<Request blockId="block-1" data-testid="request-comp" />);
    expect(screen.getByTestId('request-comp')).toBeInTheDocument();
    expect(screen.getByTestId('text-editor')).toBeInTheDocument();
    expect(screen.getByTestId('generate-button')).toBeInTheDocument();
  });

  test('renders in Reader mode when has responses and not loading', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [{ id: 'res-1' }],
          isLoading: false,
          status: 'resolved',
          prompt: 'Resolved Prompt',
        },
      ],
      generateResponsesStream: mockGenerateResponsesStream,
      stopGenerating: mockStopGenerating,
      getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
      setEditorPrompt: mockSetEditorPrompt,
      setActiveBlockId: mockSetActiveBlockId,
    });

    render(<Request blockId="block-1" data-testid="request-comp" />);
    expect(screen.getByTestId('request-comp')).toBeInTheDocument();
    // Should show resolved content
    expect(screen.getByTestId('text-container')).toHaveTextContent(
      'Resolved Prompt'
    );
    // Editor and button should NOT be there
    expect(screen.queryByTestId('text-editor')).not.toBeInTheDocument();
  });

  test('handles focus and typing (Active state)', () => {
    // use fake timers for debounce
    jest.useFakeTimers();

    render(<Request blockId="block-1" />);
    const editor = screen.getByTestId('text-editor');

    // Test Focus (implicit by typing)
    editor.focus();
    expect(editor).toHaveFocus();

    // Typing updates local state and calls context update (after debounce)
    fireEvent.change(editor, { target: { value: 'New Prompt' } });
    expect(editor).toHaveValue('New Prompt'); // Local state update

    // Check context update
    act(() => {
      jest.advanceTimersByTime(500); // Debounce time
    });

    expect(mockSetActiveBlockId).toHaveBeenCalledWith('block-1');
    expect(mockSetEditorPrompt).toHaveBeenCalledWith('New Prompt');

    jest.useRealTimers();
  });

  test('handles Clicked state (Generate button)', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [],
          isLoading: false,
          status: 'draft',
          prompt: 'Ready Prompt',
        },
      ],
      generateResponsesStream: mockGenerateResponsesStream,
      stopGenerating: mockStopGenerating,
      getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
      setEditorPrompt: mockSetEditorPrompt,
      setActiveBlockId: mockSetActiveBlockId,
    });
    mockGetSelectedResponseForBlock.mockReturnValue('selected-res-id');

    render(<Request blockId="block-1" />);
    const btn = screen.getByTestId('generate-button');

    fireEvent.click(btn);

    expect(mockGenerateResponsesStream).toHaveBeenCalledWith(
      'block-1',
      'Ready Prompt',
      'selected-res-id',
      undefined,
      []
    );
  });

  test('renders as TextContainer without any button when loading', () => {
    mockUseConversation.mockReturnValue({
      conversationBlockList: [
        {
          conversationBlockId: 'block-1',
          responseMessages: [],
          isLoading: true,
          status: 'draft',
          prompt: 'Streaming Prompt',
        },
      ],
      generateResponsesStream: mockGenerateResponsesStream,
      stopGenerating: mockStopGenerating,
      getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
      setEditorPrompt: mockSetEditorPrompt,
      setActiveBlockId: mockSetActiveBlockId,
    });

    render(<Request blockId="block-1" />);
    // Editor should NOT be visible, TextContainer should be visible
    expect(screen.queryByTestId('text-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('resolved-request-wrapper')).toBeInTheDocument();
    // The sent prompt's copy button names what it copies
    expect(screen.getByTestId('text-container')).toHaveAttribute(
      'data-copy-label',
      'Copy Prompt'
    );
    // Drawn as a conversation turn, in the column the responses share
    expect(screen.getByTestId('text-container')).toHaveAttribute(
      'data-variant',
      'turn'
    );

    // No Stop Generating (or any) button in the Request widget while
    // loading — stopping is handled per-vendor in the Response widget
    expect(screen.queryByTestId('generate-button')).not.toBeInTheDocument();
  });

  test('disable Generate button if API key invalid', () => {
    mockUseAuth.mockReturnValue({
      aiVendorAPIKeyStatusList: [{ isAPIKeyValid: false }],
      customerName: 'Test User',
    });

    render(<Request blockId="block-1" />);
    const btn = screen.getByTestId('generate-button');

    expect(btn).toBeDisabled();

    fireEvent.click(btn);
    expect(mockGenerateResponsesStream).not.toHaveBeenCalled();
  });

  test('sets Active Block on mount if empty', () => {
    render(<Request blockId="block-1" />);
    expect(mockSetActiveBlockId).toHaveBeenCalledWith('block-1');
  });

  test('never restores a draft from localStorage', () => {
    const storageKey = 'cust-123_prompt_editor_content_conv-block-1';
    localStorage.setItem(storageKey, 'A prompt already sent');

    render(<Request blockId="block-1" />);

    expect(screen.getByTestId('text-editor')).toHaveValue('');
    localStorage.removeItem(storageKey);
  });

  test('typing keeps the draft out of localStorage', () => {
    localStorage.clear();
    jest.useFakeTimers();
    try {
      render(<Request blockId="block-1" />);

      fireEvent.change(screen.getByTestId('text-editor'), {
        target: { value: 'Unsent draft' },
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(Object.keys(localStorage)).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  describe('message author identity', () => {
    const mockResolvedBlock = (block: Record<string, unknown>) => {
      mockUseConversation.mockReturnValue({
        conversationBlockList: [
          {
            conversationBlockId: 'block-1',
            responseMessages: [{ id: 'res-1' }],
            isLoading: false,
            status: 'resolved',
            prompt: 'Hello',
            ...block,
          },
        ],
        generateResponsesStream: mockGenerateResponsesStream,
        stopGenerating: mockStopGenerating,
        getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
        setEditorPrompt: mockSetEditorPrompt,
        setActiveBlockId: mockSetActiveBlockId,
      });
    };

    test('block with a sender shows the sender, not the viewer (shared conversation)', () => {
      mockResolvedBlock({
        sender: {
          customerId: 'cust-owner',
          name: 'Owner Name',
          picture: 'https://pics/owner.png',
        },
      });

      render(<Request blockId="block-1" />);
      const brand = screen.getByTestId('user-brand-name');
      expect(brand).toHaveTextContent('Owner Name');
      expect(brand).toHaveAttribute('data-picture', 'https://pics/owner.png');
    });

    test('sender without a picture does not fall back to the viewer picture', () => {
      mockUseAuth.mockReturnValue({
        aiVendorAPIKeyStatusList: [{ isAPIKeyValid: true }],
        customerName: 'Test User',
        customerPicture: 'https://pics/viewer.png',
        user: { name: 'Auth0 User' },
        customerId: 'cust-123',
      });
      mockResolvedBlock({
        sender: { customerId: 'cust-owner', name: 'Owner Name', picture: null },
      });

      render(<Request blockId="block-1" />);
      const brand = screen.getByTestId('user-brand-name');
      expect(brand).toHaveTextContent('Owner Name');
      expect(brand).toHaveAttribute('data-picture', '');
    });

    test('block without a sender falls back to the viewer identity (live-sent message)', () => {
      mockResolvedBlock({});

      render(<Request blockId="block-1" />);
      expect(screen.getByTestId('user-brand-name')).toHaveTextContent(
        'Test User'
      );
    });
  });

  describe('keyboard-open scroll behavior', () => {
    let resizeHandler: (() => void) | undefined;
    let removeViewportListener: jest.Mock;
    let scroller: HTMLDivElement;

    // Two blocks so 'block-2' is a follow-up: the keyboard-resize effect
    // only attaches to follow-up editor blocks
    const mockFollowUpBlocks = () => {
      mockUseConversation.mockReturnValue({
        conversationBlockList: [
          {
            conversationBlockId: 'block-1',
            responseMessages: [{ id: 'res-1' }],
            isLoading: false,
            status: 'resolved',
            prompt: 'First prompt',
          },
          {
            conversationBlockId: 'block-2',
            responseMessages: [],
            isLoading: false,
            status: 'draft',
            prompt: '',
          },
        ],
        generateResponsesStream: mockGenerateResponsesStream,
        stopGenerating: mockStopGenerating,
        getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
        setEditorPrompt: mockSetEditorPrompt,
        setActiveBlockId: mockSetActiveBlockId,
      });
    };

    beforeEach(() => {
      jest.useFakeTimers();
      resizeHandler = undefined;
      removeViewportListener = jest.fn();
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: {
          height: 800,
          addEventListener: (event: string, cb: () => void) => {
            if (event === 'resize') resizeHandler = cb;
          },
          removeEventListener: removeViewportListener,
        },
      });

      // The conversation scroller the effect pins to the end
      scroller = document.createElement('div');
      scroller.setAttribute('data-testid', 'center-section-scroll');
      Object.defineProperty(scroller, 'scrollHeight', {
        value: 500,
        configurable: true,
      });
      scroller.scrollTop = 0;
      document.body.appendChild(scroller);
    });

    afterEach(() => {
      jest.useRealTimers();
      scroller.remove();
      Object.defineProperty(window, 'visualViewport', {
        configurable: true,
        value: undefined,
      });
    });

    const openKeyboard = () => {
      act(() => {
        resizeHandler?.();
        // The effect defers its scroll behind a double rAF; flush both frames
        jest.advanceTimersByTime(100);
      });
    };

    test('opening the keyboard leaves the conversation where it was', () => {
      mockFollowUpBlocks();
      render(<Request blockId="block-2" />);

      screen.getByTestId('text-editor').focus();
      openKeyboard();

      expect(scroller.scrollTop).toBe(0);
    });
  });

  describe('image paste-to-upload', () => {
    const makeImageFile = (type = 'image/png', size = 1024): File => {
      const file = new File(['x'], 'shot.png', { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    const pasteImage = (target: HTMLElement, file: File) => {
      fireEvent.paste(target, {
        clipboardData: {
          items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
        },
      });
    };

    beforeEach(() => {
      (global.URL.createObjectURL as any) = jest.fn(() => 'blob:preview');
      (global.URL.revokeObjectURL as any) = jest.fn();
    });

    test('pasting an image uploads it and shows a ready thumbnail', async () => {
      const ref = {
        attachmentId: 'att-1',
        s3Key: 'customers/cust-123/attachments/att-1',
        mediaType: 'image/png',
      };
      mockUploadAttachment.mockResolvedValue(ref);

      render(<Request blockId="block-1" />);
      pasteImage(
        screen.getByTestId('request-widget-container'),
        makeImageFile()
      );

      expect(
        await screen.findByTestId('attachment-thumbnail')
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(
          screen.queryByTestId('attachment-uploading-spinner')
        ).not.toBeInTheDocument();
      });
      expect(mockUploadAttachment).toHaveBeenCalledWith(
        'test-token',
        expect.any(File)
      );

      // Generate passes the uploaded refs
      fireEvent.click(screen.getByTestId('generate-button'));
      expect(mockGenerateResponsesStream).toHaveBeenCalledWith(
        'block-1',
        '',
        undefined,
        undefined,
        [ref]
      );
    });

    const makePdfFile = (size = 1024): File => {
      const file = new File(['%PDF-1.4'], 'report.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    test('pasting a PDF uploads it and shows a document chip', async () => {
      const ref = {
        attachmentId: 'att-pdf',
        s3Key: 'customers/cust-123/attachments/att-pdf',
        mediaType: 'application/pdf',
      };
      mockUploadAttachment.mockResolvedValue(ref);

      render(<Request blockId="block-1" />);
      pasteImage(screen.getByTestId('request-widget-container'), makePdfFile());

      expect(
        await screen.findByTestId('attachment-doc-chip')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('attachment-thumbnail')
      ).not.toBeInTheDocument();
      await waitFor(() => {
        expect(
          screen.queryByTestId('attachment-uploading-spinner')
        ).not.toBeInTheDocument();
      });
      expect(mockPrepareImageForUpload).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('generate-button'));
      expect(mockGenerateResponsesStream).toHaveBeenCalledWith(
        'block-1',
        '',
        undefined,
        undefined,
        [ref]
      );
    });

    test('rejects a PDF over the 10MB limit with a toast', async () => {
      render(<Request blockId="block-1" />);
      pasteImage(
        screen.getByTestId('request-widget-container'),
        makePdfFile(11 * 1024 * 1024)
      );
      await waitFor(() => expect(mockShowToast).toHaveBeenCalled());
      expect(mockUploadAttachment).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId('attachment-doc-chip')
      ).not.toBeInTheDocument();
    });

    test('uploads any image type and size without a toast', async () => {
      mockUploadAttachment.mockResolvedValue({
        attachmentId: 'att-1',
        s3Key: 'k',
        mediaType: 'image/heic',
      });

      render(<Request blockId="block-1" />);
      const heic = makeImageFile('image/heic', 40 * 1024 * 1024);
      pasteImage(screen.getByTestId('request-widget-container'), heic);

      expect(
        await screen.findByTestId('attachment-thumbnail')
      ).toBeInTheDocument();
      expect(mockUploadAttachment).toHaveBeenCalledWith('test-token', heic);
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    test('uploads the converted PNG and previews it', async () => {
      const converted = new File(['png'], 'IMG_0036.png', {
        type: 'image/png',
      });
      mockPrepareImageForUpload.mockResolvedValue(converted);
      (global.URL.createObjectURL as jest.Mock)
        .mockReturnValueOnce('blob:original')
        .mockReturnValueOnce('blob:converted');
      mockUploadAttachment.mockResolvedValue({
        attachmentId: 'att-1',
        s3Key: 'k',
        mediaType: 'image/png',
      });

      render(<Request blockId="block-1" />);
      const heic = new File(['x'], 'IMG_0036.HEIC', { type: '' });
      pasteImage(screen.getByTestId('request-widget-container'), heic);

      await waitFor(() =>
        expect(mockUploadAttachment).toHaveBeenCalledWith(
          'test-token',
          converted
        )
      );
      expect(mockPrepareImageForUpload).toHaveBeenCalledWith(heic);
      const thumb = within(
        screen.getByTestId('attachment-thumbnail')
      ).getByRole('img');
      expect(thumb).toHaveAttribute('src', 'blob:converted');
      expect(thumb).toHaveAttribute('alt', 'IMG_0036.png');
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:original');
    });

    test('pastes blank-type files only when they are images', async () => {
      mockUploadAttachment.mockResolvedValue({
        attachmentId: 'att-1',
        s3Key: 'k',
        mediaType: 'application/octet-stream',
      });
      const pasteFile = (file: File) =>
        fireEvent.paste(screen.getByTestId('request-widget-container'), {
          clipboardData: {
            items: [{ kind: 'file', type: '', getAsFile: () => file }],
          },
        });

      render(<Request blockId="block-1" />);
      // A blank-type .txt is neither a supported image nor a PDF → rejected.
      // (A blank-type .pdf is now treated as a PDF; see the PDF paste tests.)
      pasteFile(new File(['x'], 'notes.txt', { type: '' }));
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(1));
      expect(mockShowToast.mock.calls[0][0]).toMatch(
        /^notes\.txt isn't a supported image format/
      );
      expect(mockUploadAttachment).not.toHaveBeenCalled();

      const heic = new File(['x'], 'IMG_0001.HEIC', { type: '' });
      pasteFile(heic);
      const raw = new File(['x'], 'DSC_0042.NEF', { type: '' });
      pasteFile(raw);
      expect(await screen.findAllByTestId('attachment-thumbnail')).toHaveLength(
        2
      );
      expect(mockUploadAttachment).toHaveBeenCalledWith('test-token', heic);
      expect(mockUploadAttachment).toHaveBeenCalledWith('test-token', raw);
    });

    describe('unsupported formats', () => {
      const pasteItems = (items: object[]) =>
        fireEvent.paste(screen.getByTestId('request-widget-container'), {
          clipboardData: { items },
        });
      const fileItem = (file: File) => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file,
      });
      const png = () =>
        new File(
          [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])],
          'shot.png',
          { type: 'image/png' }
        );

      test('are turned down with a toast listing the supported formats', async () => {
        render(<Request blockId="block-1" />);
        const svg = new File(
          ['<svg xmlns="http://www.w3.org/2000/svg"/>'],
          'logo.svg',
          {
            type: 'image/svg+xml',
          }
        );
        expect(pasteItems([fileItem(svg)])).toBe(false); // the paste is taken

        await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(1));
        const [message, duration] = mockShowToast.mock.calls[0];
        expect(message).toMatch(
          /^logo\.svg isn't a supported image format\. Supported formats: JPEG, PNG/
        );
        expect(message).toContain('HEIC/HEIF');
        expect(message).toContain('camera RAW (DNG');
        expect(duration).toBeGreaterThanOrEqual(5000); // long enough to read the list
        expect(mockUploadAttachment).not.toHaveBeenCalled();
        expect(
          screen.queryByTestId('attachment-thumbnail')
        ).not.toBeInTheDocument();
      });

      test('a PDF uploads as a doc chip; only truly-unsupported files are named', async () => {
        mockUploadAttachment.mockResolvedValue({
          attachmentId: 'a',
          s3Key: 'k',
          mediaType: 'image/png',
        });
        render(<Request blockId="block-1" />);
        const image = png();
        pasteItems([
          fileItem(image),
          fileItem(
            new File(['%PDF-1.7'], 'scan.pdf', { type: 'application/pdf' })
          ),
          fileItem(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })),
        ]);

        // The image shows a thumbnail, the PDF a doc chip; the SVG is rejected.
        expect(
          await screen.findAllByTestId('attachment-thumbnail')
        ).toHaveLength(1);
        expect(
          await screen.findAllByTestId('attachment-doc-chip')
        ).toHaveLength(1);
        expect(mockUploadAttachment).toHaveBeenCalledTimes(2);
        expect(mockShowToast).toHaveBeenCalledTimes(1);
        expect(mockShowToast.mock.calls[0][0]).toMatch(
          /^logo\.svg isn't a supported image format\. Supported formats: /
        );
      });

      test('go by the file contents, not the name', async () => {
        mockUploadAttachment.mockResolvedValue({
          attachmentId: 'a',
          s3Key: 'k',
          mediaType: 'image/png',
        });
        render(<Request blockId="block-1" />);
        // An SVG named .png is turned down; a PNG with no type or extension isn't
        pasteItems([
          fileItem(new File(['<svg/>'], 'fake.png', { type: 'image/png' })),
        ]);
        await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(1));
        const nameless = new File([png()], 'image', { type: '' });
        pasteItems([fileItem(nameless)]);
        expect(
          await screen.findAllByTestId('attachment-thumbnail')
        ).toHaveLength(1);
        expect(mockUploadAttachment).toHaveBeenCalledWith(
          'test-token',
          nameless
        );
      });

      test('Generate waits while a paste is still being checked', async () => {
        mockUploadAttachment.mockResolvedValue({
          attachmentId: 'a',
          s3Key: 'k',
          mediaType: 'image/png',
        });
        render(<Request blockId="block-1" />);
        // A file whose first bytes are slow to read (e.g. cloud-only)
        let release: (head: ArrayBuffer) => void = () => undefined;
        const held = new File(['x'], 'shot.png', { type: 'image/png' });
        held.slice = () =>
          ({
            arrayBuffer: () =>
              new Promise<ArrayBuffer>(resolve => (release = resolve)),
          }) as unknown as Blob;
        pasteItems([fileItem(held)]);

        fireEvent.click(screen.getByTestId('generate-button'));
        expect(mockGenerateResponsesStream).not.toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith(
          'Images are still uploading'
        );

        await act(async () =>
          release(
            new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
              .buffer
          )
        );
        expect(
          await screen.findAllByTestId('attachment-thumbnail')
        ).toHaveLength(1);
        expect(mockUploadAttachment).toHaveBeenCalledWith('test-token', held);
      });

      test('next to text, files that are not images are left to the editor', async () => {
        render(<Request blockId="block-1" />);
        const pdf = new File(['%PDF-1.7'], 'scan.pdf', {
          type: 'application/pdf',
        });
        const notPrevented = pasteItems([
          { kind: 'string', type: 'text/plain', getAsFile: () => null },
          fileItem(pdf),
        ]);
        expect(notPrevented).toBe(true);
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(mockShowToast).not.toHaveBeenCalled();
        expect(mockUploadAttachment).not.toHaveBeenCalled();
      });
    });

    test('remove button discards the attachment before send', async () => {
      mockUploadAttachment.mockResolvedValue({
        attachmentId: 'att-1',
        s3Key: 'k',
        mediaType: 'image/png',
      });

      render(<Request blockId="block-1" />);
      pasteImage(
        screen.getByTestId('request-widget-container'),
        makeImageFile()
      );
      await screen.findByTestId('attachment-thumbnail');

      fireEvent.click(screen.getByTestId('attachment-remove-button'));
      expect(
        screen.queryByTestId('attachment-thumbnail')
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('generate-button'));
      expect(mockGenerateResponsesStream).toHaveBeenCalledWith(
        'block-1',
        '',
        undefined,
        undefined,
        []
      );
    });

    test('failed uploads show a toast and drop the pending attachment', async () => {
      mockUploadAttachment.mockRejectedValue(new Error('network'));

      render(<Request blockId="block-1" />);
      pasteImage(
        screen.getByTestId('request-widget-container'),
        makeImageFile()
      );

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });
      expect(
        screen.queryByTestId('attachment-thumbnail')
      ).not.toBeInTheDocument();
    });

    test('blocks Generate while an upload is in flight', async () => {
      let resolveUpload: (v: any) => void = () => {};
      mockUploadAttachment.mockReturnValue(
        new Promise(r => {
          resolveUpload = r;
        })
      );

      render(<Request blockId="block-1" />);
      pasteImage(
        screen.getByTestId('request-widget-container'),
        makeImageFile()
      );
      await screen.findByTestId('attachment-uploading-spinner');

      fireEvent.click(screen.getByTestId('generate-button'));
      expect(mockGenerateResponsesStream).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalled();

      await act(async () => {
        resolveUpload({
          attachmentId: 'att-1',
          s3Key: 'k',
          mediaType: 'image/png',
        });
      });
    });
  });

  describe('mobile image-attachment button', () => {
    const originalInnerWidth = window.innerWidth;

    const makeImageFile = (type = 'image/png', size = 1024): File => {
      const file = new File(['x'], 'photo.png', { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    const setViewportWidth = (width: number) => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: width,
      });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    };

    beforeEach(() => {
      (global.URL.createObjectURL as any) = jest.fn(() => 'blob:preview');
      (global.URL.revokeObjectURL as any) = jest.fn();
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    });

    test('renders on both desktop and mobile', () => {
      render(<Request blockId="block-1" />);
      // Desktop has an attach button too (the only way to add a PDF there).
      expect(screen.getByTestId('attachment-button')).toBeInTheDocument();

      setViewportWidth(500);
      expect(screen.getByTestId('attachment-button')).toBeInTheDocument();
    });

    test('selecting a file uploads it through the shared pipeline', async () => {
      const ref = {
        attachmentId: 'att-9',
        s3Key: 'customers/cust-123/attachments/att-9',
        mediaType: 'image/png',
      };
      mockUploadAttachment.mockResolvedValue(ref);

      render(<Request blockId="block-1" />);
      setViewportWidth(500);

      const input = screen.getByTestId(
        'attachment-file-input'
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { files: [makeImageFile()] } });

      expect(
        await screen.findByTestId('attachment-thumbnail')
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(
          screen.queryByTestId('attachment-uploading-spinner')
        ).not.toBeInTheDocument();
      });
      expect(mockUploadAttachment).toHaveBeenCalledWith(
        'test-token',
        expect.any(File)
      );

      fireEvent.click(screen.getByTestId('generate-button'));
      expect(mockGenerateResponsesStream).toHaveBeenCalledWith(
        'block-1',
        '',
        undefined,
        undefined,
        [ref]
      );
    });

    test('selecting more photos than the limit uploads only up to it', async () => {
      mockUploadAttachment.mockResolvedValue({
        attachmentId: 'att-1',
        s3Key: 'k',
        mediaType: 'application/octet-stream',
      });

      render(<Request blockId="block-1" />);
      setViewportWidth(500);

      const photos = Array.from(
        { length: 12 },
        (_, i) => new File(['x'], `IMG_${i}.HEIC`, { type: '' })
      );
      fireEvent.change(screen.getByTestId('attachment-file-input'), {
        target: { files: photos },
      });

      await waitFor(() => {
        expect(screen.getAllByTestId('attachment-thumbnail')).toHaveLength(10);
      });
      expect(mockUploadAttachment).toHaveBeenCalledTimes(10);
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    test('picker accepts every image type, including HEIC', () => {
      render(<Request blockId="block-1" />);
      setViewportWidth(500);

      const accept = screen
        .getByTestId('attachment-file-input')
        .getAttribute('accept')!
        .split(',');
      expect(accept).toEqual(
        expect.arrayContaining([
          'image/*',
          '.heic',
          '.heif',
          '.dng',
          'image/x-canon-cr3',
          '.nef',
          '.arw',
          '.raf',
        ])
      );
    });

    test('a picked file in an unsupported format gets a toast, not an upload', async () => {
      render(<Request blockId="block-1" />);
      setViewportWidth(500);

      // SVG is an unsupported image format (PDFs are now accepted — see the
      // PDF tests — so they no longer stand in for "unsupported").
      fireEvent.change(screen.getByTestId('attachment-file-input'), {
        target: {
          files: [new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })],
        },
      });

      await waitFor(() => expect(mockShowToast).toHaveBeenCalledTimes(1));
      expect(mockShowToast.mock.calls[0][0]).toMatch(
        /^logo\.svg isn't a supported image format\. Supported formats: /
      );
      expect(mockUploadAttachment).not.toHaveBeenCalled();
    });

    test('uploads a picked file the browser reports with a blank type', async () => {
      mockUploadAttachment.mockResolvedValue({
        attachmentId: 'att-9',
        s3Key: 'k',
        mediaType: 'application/octet-stream',
      });

      render(<Request blockId="block-1" />);
      setViewportWidth(500);

      const photo = makeImageFile('', 12 * 1024 * 1024);
      fireEvent.change(screen.getByTestId('attachment-file-input'), {
        target: { files: [photo] },
      });

      expect(
        await screen.findByTestId('attachment-thumbnail')
      ).toBeInTheDocument();
      expect(mockUploadAttachment).toHaveBeenCalledWith('test-token', photo);
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('phone follow-up editor', () => {
    const blocks = (draft = '') => [
      {
        conversationBlockId: 'block-1',
        responseMessages: [{ id: 'res-1' }],
        isLoading: false,
        status: 'resolved',
        prompt: 'First prompt',
      },
      {
        conversationBlockId: 'block-2',
        responseMessages: [],
        isLoading: false,
        status: 'draft',
        prompt: draft,
      },
    ];

    beforeEach(() => {
      mockUseConversation.mockReturnValue({
        conversationBlockList: blocks(),
        generateResponsesStream: mockGenerateResponsesStream,
        stopGenerating: mockStopGenerating,
        getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
        setActiveBlockId: mockSetActiveBlockId,
      });
    });

    test('rests small until it is used', () => {
      render(<Request blockId="block-2" />);
      const container = screen.getByTestId('request-widget-container');
      expect(container).toHaveClass('idleFollowUp');
      expect(screen.getByTestId('text-editor')).toHaveAttribute(
        'placeholder',
        'Follow up…'
      );

      fireEvent.focus(screen.getByTestId('text-editor'));
      expect(container).not.toHaveClass('idleFollowUp');

      fireEvent.blur(screen.getByTestId('text-editor'));
      expect(container).toHaveClass('idleFollowUp');
    });

    test('sticks to the bottom of the view, idle or in use', () => {
      render(<Request blockId="block-2" />);
      const container = screen.getByTestId('request-widget-container');
      expect(container).toHaveAttribute('data-composer-sticky', 'true');

      fireEvent.focus(screen.getByTestId('text-editor'));
      expect(container).toHaveAttribute('data-composer-sticky', 'true');
    });

    test('a draft keeps it full size', () => {
      render(<Request blockId="block-2" />);
      fireEvent.change(screen.getByTestId('text-editor'), {
        target: { value: 'Shorter' },
      });
      expect(screen.getByTestId('request-widget-container')).not.toHaveClass(
        'idleFollowUp'
      );
    });

    test('reserves the height its text grows it to, without scrolling the conversation while typing', () => {
      let resized = () => {};
      const OriginalResizeObserver = window.ResizeObserver;
      window.ResizeObserver = class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
      const scroller = document.createElement('div');
      scroller.setAttribute('data-testid', 'center-section-scroll');
      Object.defineProperty(scroller, 'scrollHeight', { value: 900 });
      document.body.appendChild(scroller);

      try {
        const { unmount } = render(<Request blockId="block-2" />);
        const container = screen.getByTestId('request-widget-container');
        const editor = container.firstElementChild as HTMLElement;
        Object.defineProperty(editor, 'offsetHeight', { value: 480 });

        act(() => resized());
        expect(container.style.getPropertyValue('--editor-live-height')).toBe(
          '480px'
        );
        expect(scroller.scrollTop).toBe(0);

        screen.getByTestId('text-editor').focus();
        act(() => resized());
        expect(scroller.scrollTop).toBe(0);

        unmount();
        expect(container.style.getPropertyValue('--editor-live-height')).toBe(
          ''
        );
      } finally {
        scroller.remove();
        window.ResizeObserver = OriginalResizeObserver;
      }
    });

    test('the first block of a new chat is never the small one', () => {
      mockUseConversation.mockReturnValue({
        conversationBlockList: blocks().slice(1),
        generateResponsesStream: mockGenerateResponsesStream,
        stopGenerating: mockStopGenerating,
        getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
        setActiveBlockId: mockSetActiveBlockId,
      });
      render(<Request blockId="block-2" />);
      expect(screen.getByTestId('request-widget-container')).not.toHaveClass(
        'idleFollowUp'
      );
      expect(screen.getByTestId('request-widget-container')).toHaveAttribute(
        'data-composer-sticky',
        'false'
      );
      expect(screen.getByTestId('text-editor')).toHaveAttribute(
        'placeholder',
        'Ask anything'
      );
    });
  });

  describe('desktop composer', () => {
    const originalInnerWidth = window.innerWidth;
    const scrollIntoView = jest.fn();

    const followUpBlocks = (draft = '') => [
      {
        conversationBlockId: 'block-1',
        responseMessages: [{ id: 'res-1' }],
        isLoading: false,
        status: 'resolved',
        prompt: 'First prompt',
      },
      {
        conversationBlockId: 'block-2',
        responseMessages: [],
        isLoading: false,
        status: 'draft',
        prompt: draft,
      },
    ];

    const useBlocks = (blocks: any[]) =>
      mockUseConversation.mockReturnValue({
        conversationBlockList: blocks,
        generateResponsesStream: mockGenerateResponsesStream,
        stopGenerating: mockStopGenerating,
        getSelectedResponseForBlock: mockGetSelectedResponseForBlock,
        setActiveBlockId: mockSetActiveBlockId,
      });

    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 1440,
      });
      window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
      scrollIntoView.mockClear();
      mockFocusEnd.mockClear();
      delete mockComposer.controls;
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    });

    test('a follow-up rests as a one-line box with its controls inside', () => {
      useBlocks(followUpBlocks());
      mockComposer.controls = <button>Choose instruction</button>;
      render(<Request blockId="block-2" />);

      const composer = screen.getByTestId('request-widget-container');
      expect(composer).toHaveAttribute('data-composer-state', 'idle');
      expect(screen.getByTestId('composer-box')).not.toHaveStyle({
        minHeight: '300px',
      });
      expect(screen.getByTestId('text-editor')).toHaveAttribute(
        'placeholder',
        'Follow up…'
      );
      const box = screen.getByTestId('composer-box');
      expect(box).toContainElement(
        screen.getByRole('button', { name: 'Add attachments' })
      );
      expect(box).toContainElement(
        screen.getByRole('button', { name: 'Choose instruction' })
      );
      expect(box).toContainElement(screen.getByTestId('generate-button'));
      expect(
        screen.queryByTestId('generate-button-wrapper')
      ).not.toBeInTheDocument();
    });

    test('only an idle follow-up sticks to the bottom of the view', () => {
      useBlocks(followUpBlocks());
      render(<Request blockId="block-2" />);
      const composer = screen.getByTestId('request-widget-container');
      expect(composer).toHaveAttribute('data-composer-sticky', 'true');

      fireEvent.focus(screen.getByTestId('text-editor'));
      expect(composer).toHaveAttribute('data-composer-sticky', 'false');
    });

    test('send waits while the turn above is generating', () => {
      const blocks = followUpBlocks('Shorter please');
      blocks[0] = { ...blocks[0], isLoading: true };
      useBlocks(blocks);
      render(<Request blockId="block-2" />);

      expect(screen.getByTestId('generate-button')).toBeDisabled();
      fireEvent.click(screen.getByTestId('generate-button'));
      expect(mockGenerateResponsesStream).not.toHaveBeenCalled();
    });

    test('a new chat does not stick to the bottom of the view', () => {
      render(<Request blockId="block-1" />);
      expect(screen.getByTestId('request-widget-container')).toHaveAttribute(
        'data-composer-sticky',
        'false'
      );
    });

    test('a new chat starts grown, with its own placeholder', () => {
      render(<Request blockId="block-1" />);
      expect(screen.getByTestId('request-widget-container')).toHaveAttribute(
        'data-composer-state',
        'grown'
      );
      expect(screen.getByTestId('composer-box')).toHaveStyle({
        minHeight: '300px',
      });
      expect(screen.getByTestId('text-editor')).toHaveAttribute(
        'placeholder',
        'Ask anything'
      );
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    test('the grown box only sets a minimum, so its text grows it', () => {
      render(<Request blockId="block-1" />);

      expect(screen.getByTestId('composer-box').style.height).toBe('');
      expect(screen.getByTestId('text-editor')).toHaveAttribute(
        'data-height',
        'auto'
      );
    });

    test('focus grows the box and brings it to the top of the view', () => {
      useBlocks(followUpBlocks());
      render(<Request blockId="block-2" />);
      fireEvent.focus(screen.getByTestId('text-editor'));

      expect(screen.getByTestId('request-widget-container')).toHaveAttribute(
        'data-composer-state',
        'grown'
      );
      expect(screen.getByTestId('composer-box')).toHaveStyle({
        minHeight: '300px',
      });
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    test('a grown follow-up reserves a full view of space below its top', () => {
      useBlocks(followUpBlocks());
      const scroller = document.createElement('div');
      scroller.style.overflowY = 'auto';
      Object.defineProperty(scroller, 'clientHeight', { value: 640 });
      document.body.appendChild(scroller);
      render(<Request blockId="block-2" />, { container: scroller });

      const composer = screen.getByTestId('request-widget-container');
      expect(composer.style.minHeight).toBe('');
      fireEvent.focus(screen.getByTestId('text-editor'));
      expect(composer.style.minHeight).toBe('640px');

      fireEvent.blur(screen.getByTestId('text-editor'));
      expect(composer.style.minHeight).toBe('');
      scroller.remove();
    });

    test('a sent follow-up leaves no reserved space under the prompt', () => {
      useBlocks(followUpBlocks());
      const scroller = document.createElement('div');
      scroller.style.overflowY = 'auto';
      Object.defineProperty(scroller, 'clientHeight', { value: 640 });
      document.body.appendChild(scroller);
      const { rerender } = render(<Request blockId="block-2" />, {
        container: scroller,
      });

      fireEvent.focus(screen.getByTestId('text-editor'));
      expect(
        screen.getByTestId('request-widget-container').style.minHeight
      ).toBe('640px');

      const sent = followUpBlocks();
      sent[1] = {
        ...sent[1],
        prompt: 'Make it shorter',
        status: 'draft',
        isLoading: true,
      };
      useBlocks(sent);
      // A new prop gets the memoised widget to render the sent state
      rerender(<Request blockId="block-2" data-testid="sent-request" />);

      expect(screen.getByTestId('sent-request')).toHaveClass(
        'resolvedRequestContainer'
      );
      expect(screen.getByTestId('sent-request').style.minHeight).toBe('');
      scroller.remove();
    });

    describe('scrolled back up out of view', () => {
      const setUp = () => {
        const scroller = document.createElement('div');
        scroller.style.overflowY = 'auto';
        Object.defineProperty(scroller, 'clientHeight', { value: 640 });
        scroller.getBoundingClientRect = () =>
          ({ top: 0, bottom: 640 }) as DOMRect;
        document.body.appendChild(scroller);
        render(<Request blockId="block-2" />, { container: scroller });
        const composer = screen.getByTestId('request-widget-container');
        let composerTop = 16;
        composer.getBoundingClientRect = () =>
          ({ top: composerTop, bottom: composerTop + 640 }) as DOMRect;
        const scrollTo = (top: number, boxTop: number) => {
          composerTop = boxTop;
          scroller.scrollTop = top;
          fireEvent.scroll(scroller);
        };
        return { scroller, composer, scrollTo };
      };

      test('an empty box returns to the bottom as the one-line box', () => {
        useBlocks(followUpBlocks());
        const { scroller, composer, scrollTo } = setUp();
        const editor = screen.getByTestId('text-editor');
        act(() => editor.focus());
        expect(composer).toHaveAttribute('data-composer-sticky', 'false');

        scrollTo(1000, 16);
        scrollTo(700, 316);
        expect(composer).toHaveAttribute('data-composer-sticky', 'false');

        scrollTo(300, 716);
        expect(composer).toHaveAttribute('data-composer-sticky', 'true');
        expect(composer).toHaveAttribute('data-composer-state', 'idle');
        expect(editor).not.toHaveFocus();
        expect(composer.style.minHeight).toBe('');
        scroller.remove();
      });

      test('a draft stays with the box on the bottom until a press takes it back to the top', () => {
        useBlocks(followUpBlocks('Shorter please'));
        const { scroller, composer, scrollTo } = setUp();
        fireEvent.focus(screen.getByTestId('text-editor'));
        scrollTo(1000, 16);
        scrollIntoView.mockClear();

        scrollTo(300, 716);
        expect(composer).toHaveAttribute('data-composer-sticky', 'true');
        expect(composer).toHaveAttribute('data-composer-state', 'grown');

        fireEvent.mouseDown(screen.getByTestId('composer-box'));
        expect(composer).toHaveAttribute('data-composer-sticky', 'false');
        expect(scrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'start',
        });
        scroller.remove();
      });

      test('typing in a box left at the bottom takes it back to the top', () => {
        useBlocks(followUpBlocks('Shorter please'));
        const { scroller, composer, scrollTo } = setUp();
        fireEvent.focus(screen.getByTestId('text-editor'));
        scrollTo(1000, 16);
        scrollTo(300, 716);
        expect(composer).toHaveAttribute('data-composer-sticky', 'true');

        fireEvent.change(screen.getByTestId('text-editor'), {
          target: { value: 'Shorter please, and simpler' },
        });
        expect(composer).toHaveAttribute('data-composer-sticky', 'false');
        scroller.remove();
      });

      test('the downward scroll that brings it to the top never sends it back', () => {
        useBlocks(followUpBlocks());
        const { scroller, composer, scrollTo } = setUp();
        act(() => screen.getByTestId('text-editor').focus());
        scrollTo(0, 900);
        scrollTo(500, 400);
        expect(composer).toHaveAttribute('data-composer-sticky', 'false');
        scroller.remove();
      });
    });

    test('blur returns an empty box to one line; a draft keeps it grown', () => {
      useBlocks(followUpBlocks());
      render(<Request blockId="block-2" />);
      const editor = screen.getByTestId('text-editor');

      fireEvent.focus(editor);
      fireEvent.blur(editor);
      expect(screen.getByTestId('request-widget-container')).toHaveAttribute(
        'data-composer-state',
        'idle'
      );

      fireEvent.focus(editor);
      fireEvent.change(editor, { target: { value: 'Shorter please' } });
      fireEvent.blur(editor);
      expect(screen.getByTestId('request-widget-container')).toHaveAttribute(
        'data-composer-state',
        'grown'
      );
    });

    test('moving focus to the box controls keeps it grown', () => {
      useBlocks(followUpBlocks());
      render(<Request blockId="block-2" />);
      const editor = screen.getByTestId('text-editor');
      const attach = screen.getByRole('button', { name: 'Add attachments' });

      fireEvent.focus(editor);
      fireEvent.blur(editor, { relatedTarget: attach });
      expect(screen.getByTestId('request-widget-container')).toHaveAttribute(
        'data-composer-state',
        'grown'
      );
    });

    test('a press on the empty part of the box puts the caret in the text', () => {
      useBlocks(followUpBlocks());
      render(<Request blockId="block-2" />);
      fireEvent.mouseDown(screen.getByTestId('composer-box'));
      expect(mockFocusEnd).toHaveBeenCalledTimes(1);

      fireEvent.mouseDown(
        screen.getByRole('button', { name: 'Add attachments' })
      );
      expect(mockFocusEnd).toHaveBeenCalledTimes(1);
    });

    test('Generate shows its tooltip, or why it is off', () => {
      useBlocks(followUpBlocks('Ready'));
      const { unmount } = render(<Request blockId="block-2" />);
      const generate = screen.getByTestId('generate-button');
      expect(generate).toHaveAccessibleName('Generate');
      fireEvent.mouseEnter(generate.parentElement!);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Generate');
      fireEvent.click(generate);
      expect(mockGenerateResponsesStream).toHaveBeenCalledWith(
        'block-2',
        'Ready',
        undefined,
        undefined,
        []
      );
      unmount();

      mockUseAuth.mockReturnValue({
        aiVendorAPIKeyStatusList: [{ isAPIKeyValid: false }],
      });
      render(<Request blockId="block-2" />);
      const disabled = screen.getByTestId('generate-button');
      expect(disabled).toBeDisabled();
      fireEvent.mouseEnter(disabled.parentElement!);
      expect(screen.getByRole('tooltip')).toHaveTextContent('No API keys set');
    });

    test('the attach button opens the file picker', () => {
      useBlocks(followUpBlocks());
      render(<Request blockId="block-2" />);
      const input = screen.getByTestId('attachment-file-input');
      const click = jest.spyOn(input, 'click');
      fireEvent.click(screen.getByRole('button', { name: 'Add attachments' }));
      expect(click).toHaveBeenCalled();
    });
  });
});
