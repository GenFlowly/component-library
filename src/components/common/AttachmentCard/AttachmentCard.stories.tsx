import type { Meta, StoryObj } from '@storybook/react';
import AttachmentCard from './AttachmentCard';

const meta: Meta<typeof AttachmentCard> = {
  title: 'Components/AttachmentCard',
  component: AttachmentCard,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AttachmentCard>;

export const GeneratedPdf: Story = {
  args: {
    filename: 'halloween-overview.pdf',
    mediaType: 'application/pdf',
    sizeBytes: 15417,
    getDownloadUrl: () =>
      new Promise(resolve =>
        setTimeout(() => resolve('https://example.com/file.pdf'), 800)
      ),
  },
};

export const LongFilename: Story = {
  args: {
    filename:
      'a-very-long-document-name-that-should-truncate-with-an-ellipsis.pdf',
    mediaType: 'application/pdf',
    sizeBytes: 2400000,
    href: 'https://example.com/file.pdf',
  },
};

export const ResolutionFails: Story = {
  args: {
    filename: 'report.pdf',
    mediaType: 'application/pdf',
    sizeBytes: 90210,
    getDownloadUrl: () =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('expired token')), 600)
      ),
  },
};

export const NoSizeNoType: Story = {
  args: {
    filename: 'mystery-file',
    href: 'https://example.com/file',
  },
};
