import type { Meta, StoryObj } from '@storybook/react';
import ReaderFriendlyTextContainer from './ReaderFriendlyTextContainer';

const sources = [
  {
    index: 1,
    title: 'Sundar Pichai net worth',
    url: 'https://www.forbes.com/profile/sundar-pichai/',
    published_date: '2026-10-30',
  },
  {
    index: 2,
    title: 'Satya Nadella net worth',
    url: 'https://www.bloomberg.com/billionaires/profiles/satya-nadella/',
  },
  {
    index: 16,
    title:
      'Form 4: Jassy Andrew R — Statement of changes in beneficial ownership',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001782546',
    favicon: 'https://www.sec.gov/favicon.ico',
    published_date: '2026-11-05',
  },
  {
    index: 17,
    title: 'Andy Jassy insider trading activity',
    url: 'https://www.secform4.com/insider-trading/1782546.htm',
  },
  {
    index: 18,
    title: 'Amazon CEO Andy Jassy stock holdings',
    url: 'https://www.gurufocus.com/insider/andy-jassy',
  },
];

const answer = `## Premise check: is it true?

Yes, on public figures. Jassy's visible wealth is roughly $600–690 million, built almost entirely on ~2.31 million AMZN shares [16][17][18]. Pichai is at $1.4 billion, Nadella $1.4 billion, and Cook $3.1 billion [1][2]. So Jassy sits at under half of the next-lowest peer.

Caveat: these are floor estimates. Insider-tracking sites only count disclosed stock; cash, real estate and prior sale proceeds are invisible. Jassy has sold about 529,000 shares for roughly $114 million since 2021 [16].

## Why the gap exists

Three things explain most of it:

- **Tenure:** Jassy became CEO in 2021; Nadella in 2014, Pichai in 2015 [1][2].
- **Grant timing:** executive grants are priced at the grant date, so later appreciation is smaller in absolute terms.

Five sources on one claim fold into a "+N" chip [1][2][16][17][18].`;

const mathAndTable = `## Compound interest

Interest is calculated on both the initial principal and the interest already accumulated.

$$
A = P\\left(1 + \\frac{r}{n}\\right)^{nt}
$$

For a quadratic $$ax^2 + bx + c = 0$$, the solutions are:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

## Three savings options

| Option | Typical feature | Pros | Cons |
| --- | --- | --- | --- |
| High-yield savings account | Variable interest, liquid | Easy access, low risk | Rate can drop [16] |
| CD (certificate of deposit) | Fixed rate, fixed term | Guaranteed yield | Early withdrawal penalties |
| Treasury bills | Government-backed | Low credit risk | Less flexible |`;

const meta: Meta<typeof ReaderFriendlyTextContainer> = {
  title: 'Common/ReaderFriendlyTextContainer',
  component: ReaderFriendlyTextContainer,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div style={{ maxWidth: 704 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReaderFriendlyTextContainer>;

export const ResponseWithCitations: Story = {
  args: {
    variant: 'turn',
    title: 'Anthropic',
    content: answer,
    sources,
  },
};

export const MathAndTable: Story = {
  args: {
    variant: 'turn',
    title: 'OpenAI',
    content: mathAndTable,
    sources,
  },
};

export const Phone: Story = {
  args: ResponseWithCitations.args,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
};

export const DocumentCard: Story = {
  args: {
    content: `# Privacy policy

We collect only what the service needs to work. Your prompts are sent to the AI providers you turn on, under your own keys.

## What we store

- Conversations and notes you create
- The settings you choose`,
    showCopyButton: false,
  },
};
