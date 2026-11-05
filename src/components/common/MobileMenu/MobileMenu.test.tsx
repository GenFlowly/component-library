import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileMenu from './MobileMenu';

describe('MobileMenu', () => {
  const appMenu = <div data-testid="app-menu-stub">App menu</div>;

  test('shows context content first and drills into the app menu', () => {
    render(
      <MobileMenu
        title="History"
        appMenuTitle="Menu"
        appMenu={appMenu}
        onClose={jest.fn()}
      >
        <div data-testid="context-stub">Conversations</div>
      </MobileMenu>
    );

    expect(screen.getByRole('dialog', { name: 'History' })).toBeInTheDocument();
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    expect(screen.getByTestId('context-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('app-menu-stub')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mobile-menu-app-toggle'));
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByTestId('app-menu-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('context-stub')).not.toBeInTheDocument();
  });

  test('back button returns from the app menu to the context view', () => {
    render(
      <MobileMenu
        title="History"
        appMenuTitle="Menu"
        appMenu={appMenu}
        onClose={jest.fn()}
      >
        <div data-testid="context-stub">Conversations</div>
      </MobileMenu>
    );

    fireEvent.click(screen.getByTestId('mobile-menu-app-toggle'));
    fireEvent.click(screen.getByTestId('mobile-menu-back'));
    expect(screen.getByTestId('context-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('app-menu-stub')).not.toBeInTheDocument();
  });

  test('opens straight to the app menu without a back button when there is no context', () => {
    render(
      <MobileMenu appMenuTitle="Menu" appMenu={appMenu} onClose={jest.fn()} />
    );

    expect(screen.getByTestId('app-menu-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-menu-back')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('mobile-menu-app-toggle')
    ).not.toBeInTheDocument();
  });

  test('close button fires onClose from either view', () => {
    const onClose = jest.fn();
    render(
      <MobileMenu
        title="History"
        appMenuTitle="Menu"
        appMenu={appMenu}
        onClose={onClose}
      >
        <div>Conversations</div>
      </MobileMenu>
    );

    fireEvent.click(screen.getByTestId('mobile-menu-close'));
    fireEvent.click(screen.getByTestId('mobile-menu-app-toggle'));
    fireEvent.click(screen.getByTestId('mobile-menu-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test('shows the action in the context view only', () => {
    const onClick = jest.fn();
    render(
      <MobileMenu
        title="History"
        action={{ label: 'New chat', onClick, 'data-testid': 'menu-action' }}
        appMenuTitle="Menu"
        appMenu={appMenu}
        onClose={jest.fn()}
      >
        <div>Conversations</div>
      </MobileMenu>
    );

    fireEvent.click(screen.getByTestId('menu-action'));
    expect(onClick).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('mobile-menu-app-toggle'));
    expect(screen.queryByTestId('menu-action')).not.toBeInTheDocument();
  });
});
