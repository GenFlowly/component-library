import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ArchiveIcon from './ArchiveIcon';
import LoginIcon from './LoginIcon';
import SettingsIcon from './SettingsIcon';
import UserIcon from './UserIcon';

const meta: Meta = {
  title: 'Components/SVG Icons',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

const cellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.75rem',
};

export const AllIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <div style={cellStyle}>
        {/* ArchiveIcon has no intrinsic size; give it one via style on a wrapper */}
        <span style={{ width: 20, height: 20, display: 'inline-flex' }}>
          <ArchiveIcon />
        </span>
        <span>ArchiveIcon</span>
      </div>
      <div style={cellStyle}>
        <LoginIcon />
        <span>LoginIcon</span>
      </div>
      <div style={cellStyle}>
        <SettingsIcon />
        <span>SettingsIcon</span>
      </div>
      <div style={cellStyle}>
        <UserIcon />
        <span>UserIcon</span>
      </div>
    </div>
  ),
};

export const Colored: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        color: '#4a6cf7',
      }}
    >
      <span style={{ width: 20, height: 20, display: 'inline-flex' }}>
        <ArchiveIcon />
      </span>
      <LoginIcon />
      <SettingsIcon />
      <UserIcon />
    </div>
  ),
};
