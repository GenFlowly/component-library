import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AttachmentCard from './AttachmentCard';

describe('AttachmentCard', () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('renders filename, type label and formatted size', () => {
    render(
      <AttachmentCard
        filename="halloween-overview.pdf"
        mediaType="application/pdf"
        sizeBytes={15417}
        href="https://example.com/file.pdf"
      />
    );
    expect(screen.getByText('halloween-overview.pdf')).toBeInTheDocument();
    expect(screen.getByTestId('attachment-card-meta')).toHaveTextContent(
      'PDF · 15 KB'
    );
  });

  it('derives the type label from the extension when mediaType is missing', () => {
    render(<AttachmentCard filename="notes.docx" href="https://x.test/f" />);
    expect(screen.getByTestId('attachment-card-meta')).toHaveTextContent(
      'DOCX'
    );
  });

  it('opens href directly in a new tab', async () => {
    render(
      <AttachmentCard filename="a.pdf" href="https://example.com/a.pdf" />
    );
    await userEvent.click(screen.getByTestId('attachment-card'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/a.pdf',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('resolves the URL via getDownloadUrl and opens it', async () => {
    const getDownloadUrl = jest
      .fn()
      .mockResolvedValue('https://signed.example.com/a.pdf');
    render(<AttachmentCard filename="a.pdf" getDownloadUrl={getDownloadUrl} />);
    await userEvent.click(screen.getByTestId('attachment-card'));
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        'https://signed.example.com/a.pdf',
        '_blank',
        'noopener,noreferrer'
      )
    );
    expect(getDownloadUrl).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error when URL resolution fails and allows retry', async () => {
    const getDownloadUrl = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('https://signed.example.com/retry.pdf');
    render(<AttachmentCard filename="a.pdf" getDownloadUrl={getDownloadUrl} />);

    await userEvent.click(screen.getByTestId('attachment-card'));
    await waitFor(() =>
      expect(screen.getByTestId('attachment-card-meta')).toHaveTextContent(
        'Download failed'
      )
    );
    expect(openSpy).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('attachment-card'));
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        'https://signed.example.com/retry.pdf',
        '_blank',
        'noopener,noreferrer'
      )
    );
  });

  it('is disabled when no URL source is provided', () => {
    render(<AttachmentCard filename="a.pdf" />);
    expect(screen.getByTestId('attachment-card')).toBeDisabled();
  });
});
