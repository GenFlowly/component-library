import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttachmentPreviewStrip, {
  PendingAttachment,
  ResolvedAttachmentThumbnails,
} from './AttachmentPreviewStrip';
import { useConversationAuth } from './ConversationWidgetContext';
import '@testing-library/jest-dom';

const mockGetAttachmentViewUrl = jest.fn();
let mockConversationId = 'conv-1';
jest.mock('./ConversationWidgetContext', () => ({
  useConversation: () => ({ conversationId: mockConversationId }),
  useConversationAuth: jest.fn(),
  useConversationServices: () => ({
    getAttachmentViewUrl: mockGetAttachmentViewUrl,
  }),
}));

const mockUseAuth = useConversationAuth as jest.Mock;

describe('AttachmentPreviewStrip', () => {
  const attachments: PendingAttachment[] = [
    {
      localId: 'l1',
      fileName: 'a.png',
      previewUrl: 'blob:a',
      status: 'ready',
      ref: {
        attachmentId: 'att-1',
        s3Key: 'customers/c/attachments/att-1',
        mediaType: 'image/png',
      },
    },
    {
      localId: 'l2',
      fileName: 'b.png',
      previewUrl: 'blob:b',
      status: 'uploading',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      getAccessTokenSilently: jest.fn().mockResolvedValue('token-1'),
    });
  });

  test('renders nothing when there are no attachments', () => {
    const { container } = render(
      <AttachmentPreviewStrip attachments={[]} onRemove={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders a thumbnail per attachment with a spinner while uploading', () => {
    render(
      <AttachmentPreviewStrip attachments={attachments} onRemove={jest.fn()} />
    );
    expect(screen.getAllByTestId('attachment-thumbnail')).toHaveLength(2);
    expect(screen.getAllByTestId('attachment-uploading-spinner')).toHaveLength(
      1
    );
  });

  test('remove button reports the attachment localId', () => {
    const onRemove = jest.fn();
    render(
      <AttachmentPreviewStrip attachments={attachments} onRemove={onRemove} />
    );
    fireEvent.click(screen.getAllByTestId('attachment-remove-button')[0]);
    expect(onRemove).toHaveBeenCalledWith('l1');
  });

  test('renders a PDF as a chip with its name, a PDF badge and its size — never an <img>', () => {
    const onRemove = jest.fn();
    render(
      <AttachmentPreviewStrip
        attachments={[
          {
            localId: 'p1',
            fileName: 'quarterly-report.pdf',
            previewUrl: 'blob:p1',
            status: 'uploading',
            kind: 'pdf',
            sizeBytes: 1.5 * 1024 * 1024,
          },
        ]}
        onRemove={onRemove}
      />
    );
    const chip = screen.getByTestId('attachment-pdf-chip');
    expect(chip).toHaveTextContent('quarterly-report.pdf');
    expect(chip).toHaveTextContent('PDF');
    expect(screen.getByTestId('attachment-pdf-size')).toHaveTextContent(
      '1.5 MB'
    );
    expect(chip.querySelector('img')).toBeNull();
    expect(
      screen.queryByTestId('attachment-thumbnail')
    ).not.toBeInTheDocument();
    // Uploading shows a spinner; the chip stays removable
    expect(
      screen.getByTestId('attachment-uploading-spinner')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('attachment-remove-button'));
    expect(onRemove).toHaveBeenCalledWith('p1');
  });

  test('shows a placeholder tile when the browser cannot preview the image', () => {
    render(
      <AttachmentPreviewStrip attachments={attachments} onRemove={jest.fn()} />
    );
    fireEvent.error(screen.getByAltText('a.png'));

    expect(screen.queryByAltText('a.png')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('attachment-thumbnail-placeholder')
    ).toHaveAttribute('title', 'a.png');
    // The attachment itself stays (and stays removable)
    expect(screen.getAllByTestId('attachment-thumbnail')).toHaveLength(2);
  });
});

describe('ResolvedAttachmentThumbnails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConversationId = 'conv-1';
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      getAccessTokenSilently: jest.fn().mockResolvedValue('token-1'),
    });
  });

  const refs = [
    {
      attachmentId: 'att-1',
      s3Key: 'customers/c/attachments/att-1',
      mediaType: 'image/png',
    },
    {
      attachmentId: 'att-2',
      s3Key: 'customers/c/attachments/att-2',
      mediaType: 'image/jpeg',
    },
  ];

  test('fetches presigned URLs and renders thumbnails', async () => {
    mockGetAttachmentViewUrl.mockImplementation(
      async (_t: string, id: string) => `https://s3/view/${id}`
    );

    render(<ResolvedAttachmentThumbnails attachments={refs} />);

    await waitFor(() => {
      expect(
        screen.getAllByTestId('resolved-attachment-thumbnail')
      ).toHaveLength(2);
    });
    const imgs = screen.getAllByTestId('resolved-attachment-thumbnail');
    expect(imgs[0]).toHaveAttribute('src', 'https://s3/view/att-1');
  });

  test('resolves URLs within the loaded conversation (shared conversations)', async () => {
    mockGetAttachmentViewUrl.mockResolvedValue('https://s3/view/x');

    render(<ResolvedAttachmentThumbnails attachments={refs} />);

    await waitFor(() =>
      expect(mockGetAttachmentViewUrl).toHaveBeenCalledTimes(2)
    );
    expect(mockGetAttachmentViewUrl).toHaveBeenCalledWith(
      'token-1',
      'att-1',
      'conv-1'
    );
    expect(mockGetAttachmentViewUrl).toHaveBeenCalledWith(
      'token-1',
      'att-2',
      'conv-1'
    );
  });

  test('passes no conversation id before the conversation exists', async () => {
    mockConversationId = '';
    mockGetAttachmentViewUrl.mockResolvedValue('https://s3/view/x');

    render(<ResolvedAttachmentThumbnails attachments={[refs[0]]} />);

    await waitFor(() =>
      expect(mockGetAttachmentViewUrl).toHaveBeenCalledWith(
        'token-1',
        'att-1',
        undefined
      )
    );
  });

  test('skips attachments whose URL fetch fails', async () => {
    mockGetAttachmentViewUrl
      .mockResolvedValueOnce('https://s3/view/att-1')
      .mockRejectedValueOnce(new Error('404'));

    render(<ResolvedAttachmentThumbnails attachments={refs} />);

    await waitFor(() => {
      expect(
        screen.getAllByTestId('resolved-attachment-thumbnail')
      ).toHaveLength(1);
    });
  });

  test('renders nothing when unauthenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      getAccessTokenSilently: jest.fn(),
    });
    const { container } = render(
      <ResolvedAttachmentThumbnails attachments={refs} />
    );
    expect(container.firstChild).toBeNull();
    expect(mockGetAttachmentViewUrl).not.toHaveBeenCalled();
  });

  test('opens the image in a new tab on click', async () => {
    mockGetAttachmentViewUrl.mockResolvedValue('https://s3/view/att-1');
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<ResolvedAttachmentThumbnails attachments={[refs[0]]} />);
    await screen.findByTestId('resolved-attachment-thumbnail');
    fireEvent.click(screen.getByTestId('resolved-attachment-thumbnail'));

    expect(openSpy).toHaveBeenCalledWith(
      'https://s3/view/att-1',
      '_blank',
      'noopener'
    );
    openSpy.mockRestore();
  });

  test('unpreviewable images fall back to a placeholder that still opens', async () => {
    mockGetAttachmentViewUrl.mockResolvedValue('https://s3/view/att-1');
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    render(<ResolvedAttachmentThumbnails attachments={[refs[0]]} />);
    fireEvent.error(await screen.findByTestId('resolved-attachment-thumbnail'));
    fireEvent.click(screen.getByTestId('attachment-thumbnail-placeholder'));

    expect(
      screen.queryByTestId('resolved-attachment-thumbnail')
    ).not.toBeInTheDocument();
    expect(openSpy).toHaveBeenCalledWith(
      'https://s3/view/att-1',
      '_blank',
      'noopener'
    );
    openSpy.mockRestore();
  });

  describe('PDFs', () => {
    const pdfRef = {
      attachmentId: 'doc-1',
      s3Key: 'customers/c/attachments/doc-1',
      mediaType: 'application/pdf',
      filename: 'contract.pdf',
      sizeBytes: 240 * 1024,
      pageCount: 12,
    };

    test('render as a document card (name, PDF, pages, size), not an <img>', async () => {
      mockGetAttachmentViewUrl.mockResolvedValue('https://s3/view/img');
      const { container } = render(
        <ResolvedAttachmentThumbnails attachments={[pdfRef, refs[0]]} />
      );

      expect(screen.getByTestId('resolved-attachment-pdf')).toHaveTextContent(
        'contract.pdf'
      );
      expect(
        screen.getByTestId('resolved-attachment-pdf-meta')
      ).toHaveTextContent('PDF · 12 pages · 240 KB');
      // Only the image's URL is resolved up front
      await waitFor(() =>
        expect(
          screen.getAllByTestId('resolved-attachment-thumbnail')
        ).toHaveLength(1)
      );
      expect(mockGetAttachmentViewUrl).toHaveBeenCalledTimes(1);
      expect(mockGetAttachmentViewUrl).toHaveBeenCalledWith(
        'token-1',
        'att-1',
        'conv-1'
      );
      expect(container.querySelectorAll('img')).toHaveLength(1);
    });

    test('a PDF card resolves its URL within the conversation when clicked', async () => {
      mockGetAttachmentViewUrl.mockResolvedValue('https://s3/view/doc-1');
      const tab = {
        opener: {},
        closed: false,
        location: { href: 'about:blank' },
        close: jest.fn(),
      };
      const openSpy = jest
        .spyOn(window, 'open')
        .mockImplementation(() => tab as unknown as Window);

      render(<ResolvedAttachmentThumbnails attachments={[pdfRef]} />);
      expect(mockGetAttachmentViewUrl).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('resolved-attachment-pdf'));

      await waitFor(() =>
        expect(tab.location.href).toBe('https://s3/view/doc-1')
      );
      expect(mockGetAttachmentViewUrl).toHaveBeenCalledWith(
        'token-1',
        'doc-1',
        'conv-1'
      );
      openSpy.mockRestore();
    });

    test('an untyped upload named .pdf (older records) is still a document', () => {
      render(
        <ResolvedAttachmentThumbnails
          attachments={[
            {
              attachmentId: 'doc-2',
              s3Key: 'k',
              mediaType: 'application/octet-stream',
              filename: 'scan.pdf',
            },
          ]}
        />
      );
      expect(screen.getByTestId('resolved-attachment-pdf')).toHaveTextContent(
        'scan.pdf'
      );
      expect(mockGetAttachmentViewUrl).not.toHaveBeenCalled();
    });

    test('without a URL service the card shows but cannot be opened', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        getAccessTokenSilently: jest.fn(),
      });
      render(<ResolvedAttachmentThumbnails attachments={[pdfRef]} />);
      expect(screen.getByTestId('resolved-attachment-pdf')).toBeDisabled();
    });
  });
});
