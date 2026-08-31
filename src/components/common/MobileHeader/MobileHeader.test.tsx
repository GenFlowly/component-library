import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileHeader from './MobileHeader';

describe('MobileHeader', () => {
  test('renders title and fires onMenuClick from the hamburger', () => {
    const onMenuClick = jest.fn();
    render(<MobileHeader title="My Chat" onMenuClick={onMenuClick} />);

    expect(screen.getByText('My Chat')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mobile-header-menu-toggle'));
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  test('renders a tappable subtitle that fires onSubtitleClick', () => {
    const onSubtitleClick = jest.fn();
    render(
      <MobileHeader
        title="My Chat"
        subtitle="Coding Buddy"
        onSubtitleClick={onSubtitleClick}
        onMenuClick={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('mobile-header-subtitle'));
    expect(onSubtitleClick).toHaveBeenCalledTimes(1);
  });

  test('renders a plain subtitle when there is no click handler', () => {
    render(
      <MobileHeader
        title="My Note"
        subtitle="Saved at 10:00"
        onMenuClick={jest.fn()}
      />
    );

    const subtitle = screen.getByTestId('mobile-header-subtitle');
    expect(subtitle).toHaveTextContent('Saved at 10:00');
    expect(subtitle.tagName).not.toBe('BUTTON');
  });

  test('kebab opens the menu; picking an item fires it and closes the menu', () => {
    const onNewChat = jest.fn();
    render(
      <MobileHeader
        title="My Chat"
        onMenuClick={jest.fn()}
        menuItems={[
          {
            label: 'New Chat',
            onClick: onNewChat,
            'data-testid': 'menu-new-chat',
          },
        ]}
      />
    );

    expect(
      screen.queryByTestId('mobile-header-kebab-menu')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mobile-header-kebab'));
    expect(screen.getByTestId('mobile-header-kebab-menu')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('menu-new-chat'));
    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId('mobile-header-kebab-menu')
    ).not.toBeInTheDocument();
  });

  test('disabled menu items do not fire', () => {
    const onShare = jest.fn();
    render(
      <MobileHeader
        title="My Chat"
        onMenuClick={jest.fn()}
        menuItems={[
          {
            label: 'Share',
            onClick: onShare,
            disabled: true,
            'data-testid': 'menu-share',
          },
        ]}
      />
    );

    fireEvent.click(screen.getByTestId('mobile-header-kebab'));
    const shareItem = screen.getByTestId('menu-share');
    expect(shareItem).toBeDisabled();
    fireEvent.click(shareItem);
    expect(onShare).not.toHaveBeenCalled();
  });

  test('hides the kebab when there are no menu items', () => {
    render(<MobileHeader title="My Chat" onMenuClick={jest.fn()} />);
    expect(screen.queryByTestId('mobile-header-kebab')).not.toBeInTheDocument();
  });
});
