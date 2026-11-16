import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CollapseStrip from './CollapseStrip';

describe('CollapseStrip', () => {
  test('is a labelled button that reports its expanded state', () => {
    const onClick = jest.fn();
    render(
      <CollapseStrip
        direction="left"
        label="Collapse Sidebar"
        onClick={onClick}
        aria-expanded={true}
        data-testid="strip"
      />
    );
    const button = screen.getByRole('button', { name: 'Collapse Sidebar' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('shows its label as a tooltip', () => {
    render(
      <CollapseStrip
        direction="right"
        label="Expand Sidebar"
        onClick={jest.fn()}
      />
    );
    const button = screen.getByRole('button', { name: 'Expand Sidebar' });
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Expand Sidebar');
  });
});
