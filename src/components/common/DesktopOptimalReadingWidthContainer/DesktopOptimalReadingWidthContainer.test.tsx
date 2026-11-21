import React from 'react';
import { render, screen } from '@testing-library/react';
import DesktopOptimalReadingWidthContainer from './DesktopOptimalReadingWidthContainer';
import ChatReadingWidthContainer from './ChatReadingWidthContainer';
import '@testing-library/jest-dom';

describe('DesktopOptimalReadingWidthContainer', () => {
  test('renders its children in the reading column', () => {
    render(
      <DesktopOptimalReadingWidthContainer data-testid="column">
        text
      </DesktopOptimalReadingWidthContainer>
    );

    const column = screen.getByTestId('column');
    expect(column).toHaveTextContent('text');
    expect(column.className).toContain('container');
  });

  test('without maxWidth the stylesheet default applies', () => {
    render(
      <DesktopOptimalReadingWidthContainer data-testid="column">
        text
      </DesktopOptimalReadingWidthContainer>
    );

    expect(
      screen.getByTestId('column').style.getPropertyValue('--reading-max-width')
    ).toBe('');
  });

  test('maxWidth sets the column width and keeps the caller style', () => {
    render(
      <DesktopOptimalReadingWidthContainer
        data-testid="column"
        maxWidth="60ch"
        className="extra"
        style={{ paddingTop: '4px' }}
      >
        text
      </DesktopOptimalReadingWidthContainer>
    );

    const column = screen.getByTestId('column');
    expect(column.style.getPropertyValue('--reading-max-width')).toBe('60ch');
    expect(column.style.paddingTop).toBe('4px');
    expect(column.className).toContain('extra');
  });
});

describe('ChatReadingWidthContainer', () => {
  test('caps the column at the chat reading width', () => {
    render(
      <ChatReadingWidthContainer data-testid="column">
        message
      </ChatReadingWidthContainer>
    );

    const column = screen.getByTestId('column');
    expect(column).toHaveTextContent('message');
    expect(column.style.getPropertyValue('--reading-max-width')).toBe(
      'var(--reading-width-chat)'
    );
  });
});
