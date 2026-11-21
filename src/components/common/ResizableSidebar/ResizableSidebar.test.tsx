import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResizableSidebar from './ResizableSidebar';
import SidebarWidget from '../SidebarWidget/SidebarWidget';

describe('ResizableSidebar', () => {
  test('its cards scroll as one column between a fixed header and footer', () => {
    render(
      <ResizableSidebar
        storageKey="test_sidebar_width"
        aria-label="Chats and projects"
        header={<button>New chat</button>}
        footer={<button>Collapse</button>}
        data-testid="sidebar"
      >
        <SidebarWidget title="Projects" data-testid="projects">
          <span>Rows</span>
        </SidebarWidget>
        <SidebarWidget title="Chats" data-testid="chats">
          <span>Rows</span>
        </SidebarWidget>
      </ResizableSidebar>
    );
    const sidebar = screen.getByRole('complementary', {
      name: 'Chats and projects',
    });
    expect(sidebar).toBe(screen.getByTestId('sidebar'));

    const projects = screen.getByTestId('projects');
    const stack = projects.closest('.scrollArea');
    expect(stack).toHaveClass('stack');
    expect(stack).toContainElement(screen.getByTestId('chats'));
    expect(projects).toHaveClass('stacked');
    expect(stack).not.toContainElement(screen.getByText('New chat'));
    expect(stack).not.toContainElement(screen.getByText('Collapse'));
  });

  test('without a label it is a plain column', () => {
    render(
      <ResizableSidebar storageKey="test_sidebar_width" data-testid="sidebar">
        <span>Card</span>
      </ResizableSidebar>
    );
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar').tagName).toBe('DIV');
  });

  test('a collapsible one stays a single card with its toggle', () => {
    render(
      <ResizableSidebar
        storageKey="test_sidebar_width"
        collapsible
        toggleTestId="toggle"
      >
        <span>Versions</span>
      </ResizableSidebar>
    );
    expect(screen.getByText('Versions').closest('.scrollArea')).toBeNull();
    expect(screen.getByTestId('toggle')).toBeInTheDocument();
  });
});
