import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsCard from './SettingsCard';
import SettingsRow from './SettingsRow';
import ToggleRow from '../ToggleRow/ToggleRow';
import StatusPill from '../StatusPill/StatusPill';

describe('SettingsCard', () => {
  test('is a region named by its title, with pills, hint and body', () => {
    render(
      <SettingsCard
        title="OpenAI"
        pills={<StatusPill kind="ok">Key set</StatusPill>}
        hint="Optional"
      >
        <p>body</p>
      </SettingsCard>
    );
    const card = screen.getByRole('region', { name: 'OpenAI' });
    expect(card).toHaveTextContent('Key set');
    expect(card).toHaveTextContent('Optional');
    expect(card).toHaveTextContent('body');
  });

  test('danger and flush change only the styling', () => {
    render(
      <SettingsCard title="Account" danger flush data-testid="card">
        <p>x</p>
      </SettingsCard>
    );
    expect(screen.getByTestId('card')).toHaveClass('danger');
    expect(screen.getByText('x').parentElement).toHaveClass('flush');
  });
  it('drops the header when there is no title and names the card by aria-label', () => {
    render(
      <SettingsCard aria-label="Date range" data-testid="card">
        <span>Body</span>
      </SettingsCard>
    );
    expect(
      screen.getByRole('region', { name: 'Date range' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

describe('SettingsRow and ToggleRow', () => {
  test('a row shows its label, description and action', () => {
    render(
      <SettingsRow
        label="Delete all learned facts"
        description="Can't be undone."
        action={<button type="button">Delete</button>}
      />
    );
    expect(screen.getByText('Delete all learned facts')).toBeInTheDocument();
    expect(screen.getByText("Can't be undone.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  test('a toggle row is a switch named by its label', () => {
    const onChange = jest.fn();
    render(
      <ToggleRow
        label="Learn from my chats"
        checked={false}
        onChange={onChange}
      />
    );
    fireEvent.click(
      screen.getByRole('switch', { name: 'Learn from my chats' })
    );
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('StatusPill', () => {
  test('defaults to neutral and takes a kind', () => {
    const { rerender } = render(
      <StatusPill data-testid="pill">2 set</StatusPill>
    );
    expect(screen.getByTestId('pill')).toHaveClass('neutral');
    rerender(
      <StatusPill kind="locked" data-testid="pill">
        Locked
      </StatusPill>
    );
    expect(screen.getByTestId('pill')).toHaveClass('locked');
  });
});
