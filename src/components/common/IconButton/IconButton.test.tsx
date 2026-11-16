import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import IconButton from './IconButton';

describe('IconButton', () => {
  test('uses the label as the accessible name', () => {
    render(<IconButton icon="icon.svg" label="Share" data-testid="btn" />);
    const button = screen.getByRole('button', { name: 'Share' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('data-testid', 'btn');
  });

  test('shows the label as a tooltip on hover and on keyboard focus', () => {
    render(<IconButton icon="icon.svg" label="Share" />);
    const button = screen.getByRole('button', { name: 'Share' });

    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Share');
    fireEvent.mouseLeave(button.parentElement!);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.focus(button);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Share');
  });

  test('hideTooltip keeps the tooltip away but keeps the name', () => {
    render(<IconButton icon="icon.svg" label="Outline" hideTooltip />);
    const button = screen.getByRole('button', { name: 'Outline' });
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  test('calls onClick, and not when disabled', () => {
    const onClick = jest.fn();
    const { rerender } = render(
      <IconButton icon="icon.svg" label="Next" onClick={onClick} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <IconButton icon="icon.svg" label="Next" onClick={onClick} disabled />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('applies size, active and rotation classes', () => {
    render(
      <IconButton
        icon="icon.svg"
        label="Previous"
        size="sm"
        active
        iconRotation={270}
        className="extra"
      />
    );
    const button = screen.getByRole('button', { name: 'Previous' });
    expect(button).toHaveClass('sm', 'active', 'extra');
    expect(button.querySelector('span')).toHaveClass('rotate270');
  });

  test('adds a class to the glyph', () => {
    render(
      <IconButton icon="icon.svg" label="Refresh" iconClassName="spinning" />
    );
    const glyph = screen
      .getByRole('button', { name: 'Refresh' })
      .querySelector('span');
    expect(glyph).toHaveClass('spinning');
  });

  test('passes other button attributes through', () => {
    render(
      <IconButton
        icon="icon.svg"
        label="Outline"
        aria-expanded={true}
        aria-haspopup="menu"
      />
    );
    const button = screen.getByRole('button', { name: 'Outline' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
  });
});
