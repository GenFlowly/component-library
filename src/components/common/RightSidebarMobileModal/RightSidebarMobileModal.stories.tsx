import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import RightSidebarMobileModal from './RightSidebarMobileModal';

const meta: Meta<typeof RightSidebarMobileModal> = {
  title: 'Components/RightSidebarMobileModal',
  component: RightSidebarMobileModal,
  tags: ['autodocs'],
  parameters: {
    // The component is a full-screen mobile overlay pinned below the page's <nav>
    viewport: { defaultViewport: 'mobile1' },
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof RightSidebarMobileModal>;

export const Default: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = React.useState(true);
    return (
      <div style={{ minHeight: '100vh' }}>
        <button onClick={() => setIsOpen(true)}>Open settings</button>
        {isOpen && (
          <RightSidebarMobileModal onClose={() => setIsOpen(false)}>
            <div
              style={{
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <strong>AI Settings</strong>
              <label>
                Model
                <select style={{ display: 'block', width: '100%' }}>
                  <option>claude-sonnet</option>
                  <option>gpt-4o</option>
                </select>
              </label>
              <label>
                Temperature
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  style={{ display: 'block', width: '100%' }}
                />
              </label>
            </div>
          </RightSidebarMobileModal>
        )}
      </div>
    );
  },
};

export const BelowNavbar: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = React.useState(true);
    return (
      <div style={{ minHeight: '100vh' }}>
        {/* The modal measures the page's <nav> and pins itself below it */}
        <nav
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 1rem',
            borderBottom: '1px solid var(--color-border, #ccc)',
            position: 'relative',
            zIndex: 1001,
            background: 'var(--color-bg-primary, #fff)',
          }}
        >
          <strong>App Navbar</strong>
        </nav>
        <div style={{ padding: '1rem' }}>
          <button onClick={() => setIsOpen(true)}>Open settings</button>
        </div>
        {isOpen && (
          <RightSidebarMobileModal onClose={() => setIsOpen(false)}>
            <div style={{ padding: '1rem' }}>
              <strong>Sidebar widgets</strong>
              <p>
                The navbar above stays visible; this overlay covers everything
                below it.
              </p>
            </div>
          </RightSidebarMobileModal>
        )}
      </div>
    );
  },
};
