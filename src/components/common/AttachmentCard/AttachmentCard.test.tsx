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

  /** A stand-in for the tab window.open returns. */
  const fakeTab = () => ({
    opener: {} as unknown,
    closed: false,
    location: { href: 'about:blank' },
    close: jest.fn(),
  });

  it('opens a blank tab inside the click, then points it at the resolved URL', async () => {
    const tab = fakeTab();
    openSpy.mockImplementation(() => tab as unknown as Window);
    let resolveUrl: (url: string) => void = () => undefined;
    const getDownloadUrl = jest.fn(
      () =>
        new Promise<string>(resolve => {
          resolveUrl = resolve;
        })
    );
    render(<AttachmentCard filename="a.pdf" getDownloadUrl={getDownloadUrl} />);

    await userEvent.click(screen.getByTestId('attachment-card'));
    // Opened synchronously — before the URL is known (Safari/iOS popup rule)
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe('about:blank');
    expect(screen.getByTestId('attachment-card-spinner')).toBeInTheDocument();

    resolveUrl('https://signed.example.com/a.pdf');
    await waitFor(() =>
      expect(tab.location.href).toBe('https://signed.example.com/a.pdf')
    );
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(tab.close).not.toHaveBeenCalled();
    expect(getDownloadUrl).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        screen.queryByTestId('attachment-card-spinner')
      ).not.toBeInTheDocument()
    );
  });

  it('falls back to opening the URL when the blank tab was blocked', async () => {
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
    expect(openSpy).toHaveBeenNthCalledWith(1, 'about:blank', '_blank');
  });

  it('closes the blank tab and shows an inline error when URL resolution fails, and allows retry', async () => {
    const first = fakeTab();
    const second = fakeTab();
    openSpy
      .mockImplementationOnce(() => first as unknown as Window)
      .mockImplementationOnce(() => second as unknown as Window);
    const getDownloadUrl = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('https://signed.example.com/retry.pdf');
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<AttachmentCard filename="a.pdf" getDownloadUrl={getDownloadUrl} />);

    await userEvent.click(screen.getByTestId('attachment-card'));
    await waitFor(() =>
      expect(screen.getByTestId('attachment-card-meta')).toHaveTextContent(
        'Download failed'
      )
    );
    expect(first.close).toHaveBeenCalledTimes(1);
    expect(first.location.href).toBe('about:blank');

    await userEvent.click(screen.getByTestId('attachment-card'));
    await waitFor(() =>
      expect(second.location.href).toBe('https://signed.example.com/retry.pdf')
    );
    expect(second.close).not.toHaveBeenCalled();
    expect(screen.getByTestId('attachment-card-meta')).not.toHaveTextContent(
      'Download failed'
    );
  });

  it('is disabled when no URL source is provided', () => {
    render(<AttachmentCard filename="a.pdf" />);
    expect(screen.getByTestId('attachment-card')).toBeDisabled();
  });
});
