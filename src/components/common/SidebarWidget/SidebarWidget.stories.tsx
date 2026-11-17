import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SidebarWidget from './SidebarWidget';
import IconButton from '../IconButton/IconButton';
import { ICONS } from '../../../constants/icons';

const meta: Meta<typeof SidebarWidget> = {
  title: 'Components/SidebarWidget',
  component: SidebarWidget,
};

export default meta;

export const Bare: StoryObj<typeof SidebarWidget> = {
  render: () => (
    <SidebarWidget>
      <div style={{ padding: 16 }}>Card content</div>
    </SidebarWidget>
  ),
};

export const WithHeader: StoryObj<typeof SidebarWidget> = {
  render: () => (
    <div style={{ width: 240 }}>
      <SidebarWidget
        title="Models"
        icon={ICONS.BRAIN}
        actions={
          <IconButton
            icon={ICONS.REFRESH_ICON}
            label="Refresh Models"
            size="sm"
          />
        }
      >
        <div style={{ padding: 10 }}>Card body</div>
      </SidebarWidget>
    </div>
  ),
};

function CollapsibleDemo() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ width: 240 }}>
      <SidebarWidget
        title="Saved notes"
        icon={ICONS.DOCUMENT}
        collapsible
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        collapseLabel="Collapse Saved notes"
        expandLabel="Expand Saved notes"
        actions={<IconButton icon={ICONS.SEARCH} label="Search notes" />}
      >
        <div style={{ padding: 10 }}>Note rows</div>
      </SidebarWidget>
    </div>
  );
}

export const Collapsible: StoryObj<typeof SidebarWidget> = {
  render: () => <CollapsibleDemo />,
};
