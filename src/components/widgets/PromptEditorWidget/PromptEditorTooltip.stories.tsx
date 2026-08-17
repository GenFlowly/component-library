import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import PromptEditorTooltip from './PromptEditorTooltip';

const meta: Meta<typeof PromptEditorTooltip> = {
  title: 'Components/PromptEditorTooltip',
  component: PromptEditorTooltip,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PromptEditorTooltip>;

export const Default: Story = {
  args: {
    top: 120,
    left: 160,
    visible: true,
  },
  decorators: [
    Story => (
      <div style={{ height: 200 }}>
        <p style={{ opacity: 0.6 }}>
          The tooltip is portaled to document.body at the given coordinates.
        </p>
        <Story />
      </div>
    ),
  ],
};

export const FollowsSelection: Story = {
  render: function Render() {
    const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
      null
    );

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        setPos({ top: rect.top, left: rect.left + rect.width / 2 });
      } else {
        setPos(null);
      }
    };

    return (
      <div onMouseUp={handleMouseUp} style={{ maxWidth: 480, lineHeight: 1.6 }}>
        <p>
          Select some of this text with your mouse — the tooltip appears above
          the selection, just like it does over the prompt editor. Click
          elsewhere to dismiss it.
        </p>
        <PromptEditorTooltip
          top={pos?.top ?? 0}
          left={pos?.left ?? 0}
          visible={pos !== null}
          onMarkReusable={() => {
            console.log('mark as reusable');
            setPos(null);
          }}
        />
      </div>
    );
  },
};
