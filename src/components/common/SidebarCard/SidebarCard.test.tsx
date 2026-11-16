import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SidebarCard from './SidebarCard';

describe('SidebarCard', () => {
  test('renders its children with the given class and test id', () => {
    render(
      <SidebarCard className="extra" data-testid="card">
        <span>Content</span>
      </SidebarCard>
    );
    expect(screen.getByTestId('card')).toHaveClass('extra');
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  test('with a title, renders a header with the icon and actions', () => {
    render(
      <SidebarCard
        title="Models"
        icon="models.svg"
        actions={<button>Refresh</button>}
        bodyClassName="body-extra"
        data-testid="card"
      >
        <span>Body</span>
      </SidebarCard>
    );
    expect(screen.getByRole('heading', { name: 'Models' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByText('Body').parentElement).toHaveClass(
      'body',
      'body-extra'
    );
    expect(screen.getByTestId('card').tagName).toBe('SECTION');
  });
});
