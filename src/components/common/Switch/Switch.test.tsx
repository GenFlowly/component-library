import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Switch from './Switch';

describe('Switch', () => {
  test('exposes switch semantics and its state', () => {
    render(<Switch checked label="OpenAI" onChange={jest.fn()} />);
    const toggle = screen.getByRole('switch', { name: 'OpenAI' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveClass('on');
  });

  test('reports the next state on click', () => {
    const onChange = jest.fn();
    render(<Switch checked={false} label="xAI" onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'xAI' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('does nothing when disabled', () => {
    const onChange = jest.fn();
    render(<Switch checked={false} label="xAI" onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('switch', { name: 'xAI' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
