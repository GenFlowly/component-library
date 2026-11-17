import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TypedConfirmDialog from './TypedConfirmDialog';

const setup = (onConfirm = jest.fn(), onClose = jest.fn()) => {
  render(
    <TypedConfirmDialog
      isOpen
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete your account?"
      message="This deletes everything from our servers."
      confirmWord="DELETE"
      inputLabel="Type DELETE to confirm"
      confirmLabel="Delete account"
      cancelLabel="Cancel"
      data-testid="dialog"
    />
  );
  return { onConfirm, onClose };
};

describe('TypedConfirmDialog', () => {
  test('confirm stays disabled until the exact word is typed', () => {
    const { onConfirm } = setup();
    const confirm = screen.getByTestId('dialog-confirm');
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'delete' },
    });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('cancel closes without confirming', () => {
    const { onConfirm, onClose } = setup();
    fireEvent.click(screen.getByTestId('dialog-cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
