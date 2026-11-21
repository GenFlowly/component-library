import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SidebarStack from './SidebarStack';
import SidebarWidget from '../SidebarWidget/SidebarWidget';

const list = {
  groups: [
    {
      id: 'recent',
      label: 'Recents',
      items: [{ id: 'one', label: 'Trip ideas', onSelect: jest.fn() }],
    },
  ],
  isLoading: false,
  hasError: false,
  errorText: 'Failed',
  emptyText: 'Empty',
  testIds: { list: 'list' },
};

describe('SidebarStack', () => {
  test('stacks its widgets in one scrolling column', () => {
    render(
      <SidebarStack data-testid="stack" className="extra">
        <SidebarWidget
          variant="history"
          title="Projects"
          list={list}
          data-testid="a"
        />
        <SidebarWidget title="Models" data-testid="b">
          <span>Content</span>
        </SidebarWidget>
      </SidebarStack>
    );
    const stack = screen.getByTestId('stack');
    expect(stack).toHaveClass('scrollArea', 'stack', 'extra');
    expect(stack).not.toHaveClass('touch');
    expect(stack).toContainElement(screen.getByTestId('a'));
    expect(stack).toContainElement(screen.getByTestId('b'));
  });

  test('its widgets take their full height: a list grows the card instead of scrolling in it', () => {
    render(
      <SidebarStack touch>
        <SidebarWidget
          variant="history"
          title="Chats"
          list={list}
          data-testid="card"
        />
      </SidebarStack>
    );
    expect(screen.getByTestId('card')).toHaveClass('stacked');
    expect(screen.getByTestId('list')).not.toHaveClass('scrollArea');
    expect(screen.getByTestId('list').closest('.container')).toHaveClass('hug');
  });

  test('outside a stack a list widget keeps scrolling inside its card', () => {
    render(
      <SidebarWidget
        variant="history"
        title="Chats"
        list={list}
        data-testid="card"
      />
    );
    expect(screen.getByTestId('card')).not.toHaveClass('stacked');
    expect(screen.getByTestId('list')).toHaveClass('scrollArea');
  });

  test('touch widens the gap between cards', () => {
    render(
      <SidebarStack touch data-testid="stack">
        <span />
      </SidebarStack>
    );
    expect(screen.getByTestId('stack')).toHaveClass('touch');
  });
});
