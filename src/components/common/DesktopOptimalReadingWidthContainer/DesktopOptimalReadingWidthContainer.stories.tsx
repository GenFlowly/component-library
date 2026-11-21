import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import DesktopOptimalReadingWidthContainer from './DesktopOptimalReadingWidthContainer';
import ChatReadingWidthContainer from './ChatReadingWidthContainer';

const meta: Meta<typeof DesktopOptimalReadingWidthContainer> = {
  title: 'Common/DesktopOptimalReadingWidthContainer',
  component: DesktopOptimalReadingWidthContainer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Caps a column of running text at a comfortable reading width on desktop ' +
          '(above 1024px) and centers it; tablets and phones keep the full width. ' +
          'Defaults to 70ch; `ChatReadingWidthContainer` is the 48rem chat column.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof DesktopOptimalReadingWidthContainer>;

const Paragraphs = () => (
  <div style={{ background: '#f9fafb', padding: '1rem', lineHeight: 1.55 }}>
    {Array.from({ length: 3 }, (_, i) => (
      <p key={i}>
        Lines of 45 to 75 characters are the easiest to read: the eye finds the
        start of the next line without effort, and the reader is not pulled back
        and forth across the screen. Wider lines tire the eye; much narrower
        ones break the rhythm of reading.
      </p>
    ))}
  </div>
);

export const Optimal: Story = {
  render: () => (
    <DesktopOptimalReadingWidthContainer>
      <Paragraphs />
    </DesktopOptimalReadingWidthContainer>
  ),
};

export const CustomWidth: Story = {
  render: () => (
    <DesktopOptimalReadingWidthContainer maxWidth="40rem">
      <Paragraphs />
    </DesktopOptimalReadingWidthContainer>
  ),
};

export const Chat: Story = {
  render: () => (
    <ChatReadingWidthContainer>
      <Paragraphs />
    </ChatReadingWidthContainer>
  ),
};
