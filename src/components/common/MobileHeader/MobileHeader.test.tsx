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

  test('a tappable pill is one button ending its subtitle with the chevron', () => {
    const onPillClick = jest.fn();
    render(
      <MobileHeader
        title="Water heater"
        subtitle="Q3 Fix the pilot light"
        onPillClick={onPillClick}
        pillActionLabel="Turns: Water heater"
        onMenuClick={jest.fn()}
      />
    );

    const pill = screen.getByRole('button', { name: 'Turns: Water heater' });
    expect(pill).toHaveAttribute('aria-haspopup', 'dialog');
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    expect(pill).toContainElement(screen.getByTestId('mobile-header-title'));
    const subtitle = screen.getByTestId('mobile-header-subtitle');
    expect(subtitle.lastElementChild).toHaveClass('chevron');
    expect(
      screen.getByTestId('mobile-header-title').parentElement
    ).not.toContainElement(subtitle.lastElementChild as HTMLElement);

    fireEvent.click(screen.getByTestId('mobile-header-subtitle'));
    fireEvent.click(screen.getByTestId('mobile-header-title'));
    expect(onPillClick).toHaveBeenCalledTimes(2);
  });

  test('without a subtitle the chevron follows the title', () => {
    render(
      <MobileHeader
        title="Water heater"
        onPillClick={jest.fn()}
        onMenuClick={jest.fn()}
      />
    );

    expect(
      screen.getByTestId('mobile-header-title').nextElementSibling
    ).toHaveClass('chevron');
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

  test('pillExpanded marks the pill expanded and turns its chevron up', () => {
    const { container } = render(
      <MobileHeader
        title="Water heater"
        subtitle="Q1 Fix the pilot light"
        onPillClick={jest.fn()}
        pillExpanded
        onMenuClick={jest.fn()}
      />
    );

    expect(screen.getByTestId('mobile-header-pill')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(container.querySelector('.chevronUp')).toBeInTheDocument();
  });

  test('without a click handler the pill is plain text, with no chevron', () => {
    const { container } = render(
      <MobileHeader
        title="My Chat"
        subtitle="In Trips"
        onMenuClick={jest.fn()}
      />
    );
    expect(screen.queryByTestId('mobile-header-pill')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'My Chat' })).toBeNull();
    expect(container.querySelector('.chevron')).not.toBeInTheDocument();
  });

  test('hides the kebab when there are no menu items', () => {
    render(<MobileHeader title="My Chat" onMenuClick={jest.fn()} />);
    expect(screen.queryByTestId('mobile-header-kebab')).not.toBeInTheDocument();
  });
});
