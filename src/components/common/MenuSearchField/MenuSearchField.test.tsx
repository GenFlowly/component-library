import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MenuSearchField from './MenuSearchField';

describe('MenuSearchField', () => {
  const onChange = jest.fn();

  beforeEach(() => onChange.mockClear());

  const renderField = (value: string) =>
    render(
      <MenuSearchField
        value={value}
        onChange={onChange}
        placeholder="Search chats"
        clearLabel="Clear search"
        data-testid="search"
      />
    );

  test('reports typed text', () => {
    renderField('');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search chats' }), {
      target: { value: 'tax' },
    });
    expect(onChange).toHaveBeenCalledWith('tax');
  });

  test('offers a clear button only when there is text', () => {
    renderField('tax');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  test('hides the clear button when empty', () => {
    renderField('');
    expect(
      screen.queryByRole('button', { name: 'Clear search' })
    ).not.toBeInTheDocument();
  });

  test('closes the keyboard on Enter', () => {
    renderField('tax');
    const input = screen.getByTestId('search');
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).not.toHaveFocus();
  });
});
