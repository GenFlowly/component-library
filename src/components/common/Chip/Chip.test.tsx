import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chip from './Chip';
import '@testing-library/jest-dom';

describe('Chip Component', () => {
  test('renders as a static tag (span) without onClick', () => {
    render(<Chip label="claude-fable-5" data-testid="chip" />);

    const chip = screen.getByTestId('chip');
    expect(chip.tagName).toBe('SPAN');
    expect(chip).toHaveTextContent('claude-fable-5');
    expect(chip).toHaveAttribute('title', 'claude-fable-5');
  });

  test('CTA variant renders a pressable button with selected state', async () => {
    const onClick = jest.fn();
    const { rerender } = render(
      <Chip label="All agents" onClick={onClick} data-testid="chip" />
    );

    const chip = screen.getByTestId('chip');
    expect(chip.tagName).toBe('BUTTON');
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip.className).toContain('cta');
    expect(chip.className).not.toContain('selected');

    await userEvent.click(chip);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Chip label="All agents" onClick={onClick} selected data-testid="chip" />
    );
    expect(screen.getByTestId('chip')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('chip').className).toContain('selected');
  });

  test('disabled CTA chip ignores clicks', async () => {
    const onClick = jest.fn();
    render(
      <Chip
        label="Created by me"
        onClick={onClick}
        disabled
        data-testid="chip"
      />
    );

    expect(screen.getByTestId('chip')).toBeDisabled();
    await userEvent.click(screen.getByTestId('chip'));
    expect(onClick).not.toHaveBeenCalled();
  });

  test('node labels render as-is with an explicit title', () => {
    render(
      <Chip label={<em>fancy</em>} title="Fancy chip" data-testid="chip" />
    );

    expect(screen.getByTestId('chip')).toHaveAttribute('title', 'Fancy chip');
    expect(screen.getByText('fancy')).toBeInTheDocument();
  });
});
