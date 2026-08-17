import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Modal from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <button onClick={() => setIsOpen(true)}>Open modal</button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm action"
        >
          <p>
            Are you sure you want to continue? This action cannot be undone.
          </p>
        </Modal>
      </>
    );
  },
};

export const WithLongContent: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <>
        <button onClick={() => setIsOpen(true)}>
          Open modal with long content
        </button>
        <Modal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Terms of Service"
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <p key={i}>
              Section {i + 1}: Lorem ipsum dolor sit amet, consectetur
              adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
              dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation.
            </p>
          ))}
        </Modal>
      </>
    );
  },
};

export const InitiallyOpen: Story = {
  render: function Render() {
    const [isOpen, setIsOpen] = React.useState(true);
    return (
      <>
        <button onClick={() => setIsOpen(true)}>Reopen modal</button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Welcome">
          <p>
            This modal starts open. Press Escape or click the overlay to close
            it.
          </p>
        </Modal>
      </>
    );
  },
};
