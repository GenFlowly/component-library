import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import TypedConfirmDialog from './TypedConfirmDialog';
import PillButton from '../PillButton/PillButton';

const meta: Meta<typeof TypedConfirmDialog> = {
  title: 'Components/Settings/TypedConfirmDialog',
  component: TypedConfirmDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A confirmation for something that can't be undone: the confirm button stays disabled until the exact word is typed (DELETE for an account, LOCK for the embedding model). \`danger\` makes the confirm button red; \`busy\` disables both buttons while the action runs.`,
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof TypedConfirmDialog>;

const Demo = ({ word, danger }: { word: string; danger: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PillButton
        label={danger ? 'Delete account' : 'Choose and lock'}
        variant={danger ? 'danger' : 'primary'}
        onClick={() => setOpen(true)}
      />
      <TypedConfirmDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title={danger ? 'Delete your account?' : 'Lock text-embedding-3-large?'}
        message={
          <p>
            {danger
              ? 'This permanently deletes your conversations and files.'
              : "This can't be changed later."}
          </p>
        }
        confirmWord={word}
        inputLabel={`Type ${word} to confirm`}
        confirmLabel={danger ? 'Delete account' : 'Lock this model'}
        cancelLabel="Cancel"
        danger={danger}
      />
    </>
  );
};

export const DeleteAccount: Story = {
  render: () => <Demo word="DELETE" danger />,
};
export const LockModel: Story = {
  render: () => <Demo word="LOCK" danger={false} />,
};
