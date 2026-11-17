import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileHeader from './MobileHeader';
import PillButton from '../PillButton/PillButton';
import { InputTextWithHint } from '../InputTextWithHint/InputTextWithHint';

describe('MobileHeader trailing action', () => {
  test('shows a round button on the right when there is no kebab menu', () => {
    const onClick = jest.fn();
    render(
      <MobileHeader
        title="LLM API Keys"
        onMenuClick={jest.fn()}
        trailingAction={{ icon: 'info.svg', label: 'About this page', onClick }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'About this page' }));
    expect(onClick).toHaveBeenCalled();
  });

  test('the kebab wins when there are menu items', () => {
    render(
      <MobileHeader
        title="Chat"
        onMenuClick={jest.fn()}
        menuItems={[{ label: 'Share', onClick: jest.fn() }]}
        trailingAction={{
          icon: 'info.svg',
          label: 'About this page',
          onClick: jest.fn(),
        }}
      />
    );
    expect(
      screen.queryByRole('button', { name: 'About this page' })
    ).not.toBeInTheDocument();
  });
});

describe('phone sizes and locked fields', () => {
  test('a large pill button', () => {
    render(<PillButton label="Save" size="lg" data-testid="save" />);
    expect(screen.getByTestId('save')).toHaveClass('large');
  });

  test('a read-only, stacked field', () => {
    render(
      <InputTextWithHint
        hint="Model"
        value="text-embedding-3-large"
        readOnly
        layout="stacked"
        data-testid="model"
      />
    );
    expect(screen.getByTestId('model')).toHaveAttribute('readonly');
    expect(screen.getByTestId('model-container')).toHaveClass('stacked');
    expect(screen.getByTestId('model-container')).toHaveClass('readOnly');
  });
});
