import type { Meta, StoryObj } from '@storybook/react';
import CitationTooltip from './CitationTooltip';
import CitationChip from './CitationChip';

const filing = {
  index: 16,
  title:
    'Form 4: Jassy Andrew R — Statement of changes in beneficial ownership',
  url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001782546',
  favicon: 'https://www.sec.gov/favicon.ico',
  published_date: '2026-11-05',
};

const tracker = {
  index: 17,
  title: 'Andy Jassy insider trading activity',
  url: 'https://www.secform4.com/insider-trading/1782546.htm',
};

const meta: Meta<typeof CitationTooltip> = {
  title: 'Common/CitationTooltip',
  component: CitationTooltip,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <p
        style={{
          maxWidth: 640,
          margin: '160px auto',
          font: '18px/31px "Source Serif 4", Georgia, serif',
        }}
      >
        Jassy&apos;s visible wealth is built almost entirely on AMZN shares
        <Story />. Hover, click or tap the chip.
      </p>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CitationTooltip>;

export const OneSource: Story = {
  args: {
    sources: [filing],
    citeCounts: new Map([[16, 3]]),
    children: (
      <CitationChip
        label="16"
        markers="[16]"
        href={filing.url}
        aria-label={`Source 16: ${filing.title}`}
      />
    ),
  },
};

export const FoldedSources: Story = {
  args: {
    sources: [filing, tracker],
    citeCounts: new Map([
      [16, 3],
      [17, 1],
    ]),
    children: (
      <CitationChip
        label="+2"
        markers="[16][17]"
        href={filing.url}
        aria-label="2 more sources"
      />
    ),
  },
};
