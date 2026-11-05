import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileMenu from './MobileMenu';

describe('MobileMenu', () => {
  test('shows its content under an accessible name, with no visible title', () => {
    render(
      <MobileMenu title="History" onOpenAppMenu={jest.fn()} onClose={jest.fn()}>
        <div data-testid="context-stub">Conversations</div>
      </MobileMenu>
    );

    expect(screen.getByRole('dialog', { name: 'History' })).toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    expect(screen.getByTestId('context-stub')).toBeInTheDocument();
  });

  test('hamburger asks for the app menu and stays on the context view', () => {
    const onOpenAppMenu = jest.fn();
    render(
      <MobileMenu
        title="History"
        onOpenAppMenu={onOpenAppMenu}
        onClose={jest.fn()}
      >
        <div data-testid="context-stub">Conversations</div>
      </MobileMenu>
    );

    fireEvent.click(screen.getByTestId('mobile-menu-app-toggle'));

    expect(onOpenAppMenu).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('context-stub')).toBeInTheDocument();
  });

  test('close button fires onClose', () => {
    const onClose = jest.fn();
    render(
      <MobileMenu title="History" onOpenAppMenu={jest.fn()} onClose={onClose}>
        <div>Conversations</div>
      </MobileMenu>
    );

    fireEvent.click(screen.getByTestId('mobile-menu-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows the action in the top bar', () => {
    const onClick = jest.fn();
    render(
      <MobileMenu
        title="History"
        action={{ label: 'New chat', onClick, 'data-testid': 'menu-action' }}
        onOpenAppMenu={jest.fn()}
        onClose={jest.fn()}
      >
        <div>Conversations</div>
      </MobileMenu>
    );

    fireEvent.click(screen.getByTestId('menu-action'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
