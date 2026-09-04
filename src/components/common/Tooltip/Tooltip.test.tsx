import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tooltip from './Tooltip';
import '@testing-library/jest-dom';

describe('Tooltip Component', () => {
  const defaultProps = {
    content: 'Tooltip Text',
    'data-testid': 'test-tooltip',
  };

  beforeEach(() => {
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 50,
      top: 100,
      left: 100,
      bottom: 150,
      right: 200,
      x: 100,
      y: 100,
      toJSON: () => {},
    }));
  });

  test('renders children correctly', () => {
    render(
      <Tooltip {...defaultProps}>
        <button>Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByTestId('test-tooltip');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Trigger');
  });

  test('tooltip is hidden by default', () => {
    render(
      <Tooltip {...defaultProps}>
        <button>Trigger</button>
      </Tooltip>
    );

    expect(
      screen.queryByTestId('test-tooltip-content')
    ).not.toBeInTheDocument();
  });

  test('shows tooltip on hover', async () => {
    render(
      <Tooltip {...defaultProps}>
        <button>Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByTestId('test-tooltip');
    await userEvent.hover(trigger);

    const tooltip = await screen.findByTestId('test-tooltip-content');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('Tooltip Text');
  });

  test('hides tooltip on unhover', async () => {
    render(
      <Tooltip {...defaultProps}>
        <button>Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByTestId('test-tooltip');
    await userEvent.hover(trigger);
    expect(
      await screen.findByTestId('test-tooltip-content')
    ).toBeInTheDocument();

    await userEvent.unhover(trigger);

    await waitFor(() => {
      expect(
        screen.queryByTestId('test-tooltip-content')
      ).not.toBeInTheDocument();
    });
  });

  test('shows tooltip on focus (keyboard)', async () => {
    render(
      <Tooltip {...defaultProps}>
        <button>Trigger</button>
      </Tooltip>
    );

    // Tab to focus the button inside the tooltip container
    await userEvent.tab();

    const tooltip = await screen.findByTestId('test-tooltip-content');
    expect(tooltip).toBeInTheDocument();
  });

  describe('interactive mode', () => {
    test('stays open while hovering into the tooltip content', async () => {
      render(
        <Tooltip {...defaultProps} interactive content={<button>Act</button>}>
          <button>Trigger</button>
        </Tooltip>
      );

      const trigger = screen.getByTestId('test-tooltip');
      await userEvent.hover(trigger);
      const tooltip = await screen.findByTestId('test-tooltip-content');

      // Leave the trigger and enter the tooltip content within the close delay
      await userEvent.unhover(trigger);
      await userEvent.hover(tooltip);

      // Content is still there and its controls are clickable
      expect(screen.getByTestId('test-tooltip-content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument();
    });

    test('closes after the pointer leaves both trigger and content', async () => {
      render(
        <Tooltip {...defaultProps} interactive content={<span>Rich</span>}>
          <button>Trigger</button>
        </Tooltip>
      );

      const trigger = screen.getByTestId('test-tooltip');
      await userEvent.hover(trigger);
      const tooltip = await screen.findByTestId('test-tooltip-content');

      await userEvent.unhover(trigger);
      await userEvent.hover(tooltip);
      await userEvent.unhover(tooltip);

      await waitFor(() => {
        expect(
          screen.queryByTestId('test-tooltip-content')
        ).not.toBeInTheDocument();
      });
    });

    test('non-interactive tooltips still close immediately on unhover', async () => {
      render(
        <Tooltip {...defaultProps}>
          <button>Trigger</button>
        </Tooltip>
      );

      const trigger = screen.getByTestId('test-tooltip');
      await userEvent.hover(trigger);
      await screen.findByTestId('test-tooltip-content');
      await userEvent.unhover(trigger);

      expect(
        screen.queryByTestId('test-tooltip-content')
      ).not.toBeInTheDocument();
    });

    test('renders ReactNode content', async () => {
      render(
        <Tooltip
          {...defaultProps}
          interactive
          content={
            <ul>
              <li>Fact one</li>
              <li>Fact two</li>
            </ul>
          }
        >
          <button>Trigger</button>
        </Tooltip>
      );

      await userEvent.hover(screen.getByTestId('test-tooltip'));
      expect(await screen.findByText('Fact one')).toBeInTheDocument();
      expect(screen.getByText('Fact two')).toBeInTheDocument();
    });
  });

  test('hides tooltip on blur', async () => {
    render(
      <Tooltip {...defaultProps}>
        <button>Trigger</button>
      </Tooltip>
    );

    // Focus
    await userEvent.tab();
    expect(
      await screen.findByTestId('test-tooltip-content')
    ).toBeInTheDocument();

    // Blur (tab away)
    await userEvent.tab();

    await waitFor(() => {
      expect(
        screen.queryByTestId('test-tooltip-content')
      ).not.toBeInTheDocument();
    });
  });
});
