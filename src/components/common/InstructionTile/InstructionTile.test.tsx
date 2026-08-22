import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import InstructionTile from './InstructionTile';

describe('InstructionTile', () => {
  const baseProps = {
    title: 'Physics Wave Expert',
    detail: 'You are an expert in physics and electromagnetic waves.',
  };

  test('renders title, icon, tags and version', () => {
    render(
      <InstructionTile
        {...baseProps}
        icon="🔍⚡"
        tags={['physics', 'citations']}
        version={3}
      />
    );

    expect(screen.getByText('Physics Wave Expert')).toBeInTheDocument();
    expect(screen.getByText('🔍⚡')).toBeInTheDocument();
    expect(screen.getByText('#physics')).toBeInTheDocument();
    expect(screen.getByText('#citations')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
  });

  test('applies the color hue to the accent bar', () => {
    render(
      <InstructionTile {...baseProps} color="#059669" data-testid="tile" />
    );
    expect(screen.getByTestId('tile-accent')).toHaveStyle(
      'background-color: #059669'
    );
  });

  test('truncates the detail to 140 characters with an ellipsis', () => {
    const longDetail = 'a'.repeat(200);
    render(<InstructionTile {...baseProps} detail={longDetail} />);

    const preview = `${'a'.repeat(140)}…`;
    expect(screen.getByText(preview)).toBeInTheDocument();
    expect(screen.queryByText(longDetail)).not.toBeInTheDocument();
  });

  test('shows the owner avatar with the username on hover', async () => {
    render(
      <InstructionTile
        {...baseProps}
        owner={{ name: 'nkirit', avatarUrl: 'https://example.com/a.png' }}
        data-testid="tile"
      />
    );

    const avatar = screen.getByAltText('nkirit');
    expect(avatar).toHaveAttribute('src', 'https://example.com/a.png');

    await userEvent.hover(screen.getByTestId('tile-owner'));
    expect(await screen.findByText('nkirit')).toBeInTheDocument();
  });

  test('falls back to a generic user icon without an avatar image', () => {
    render(
      <InstructionTile
        {...baseProps}
        owner={{ name: 'nkirit' }}
        data-testid="tile"
      />
    );
    expect(screen.getByTestId('tile-owner')).toBeInTheDocument();
    expect(screen.queryByAltText('nkirit')).not.toBeInTheDocument();
  });

  test('fires onClick on click and keyboard activation', async () => {
    const onClick = jest.fn();
    render(
      <InstructionTile {...baseProps} onClick={onClick} data-testid="tile" />
    );

    await userEvent.click(screen.getByTestId('tile'));
    expect(onClick).toHaveBeenCalledTimes(1);

    screen.getByTestId('tile').focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
