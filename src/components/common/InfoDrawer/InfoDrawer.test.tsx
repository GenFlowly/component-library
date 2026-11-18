import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InfoDrawer from './InfoDrawer';

describe('InfoDrawer', () => {
  test('covers the screen from the right with the page knowledge', () => {
    const onClose = jest.fn();
    render(
      <InfoDrawer
        open
        onClose={onClose}
        title="About this page"
        subtitle="Agents"
        items={[
          { title: 'What an agent is', text: 'A helper that does one job.' },
        ]}
        hint="Swipe in from the right edge to open this anytime."
        closeLabel="Close"
        data-testid="drawer"
      />
    );
    expect(screen.getByTestId('drawer')).toHaveClass('right', 'full');
    expect(
      screen.getByRole('dialog', { name: 'About this page' })
    ).toHaveTextContent('What an agent is');
    expect(screen.getByText('Agents')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('drawer-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
