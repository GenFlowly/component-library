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
  });
});
