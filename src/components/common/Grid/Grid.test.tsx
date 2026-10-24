import React from 'react';
import { render, screen } from '@testing-library/react';
import { Grid, GridCol } from './Grid';
import '@testing-library/jest-dom';

describe('Grid Component', () => {
  test('renders children inside a 12-column grid container', () => {
    render(
      <Grid data-testid="grid">
        <GridCol data-testid="cell">content</GridCol>
      </Grid>
    );

    expect(screen.getByTestId('grid')).toBeInTheDocument();
    expect(screen.getByTestId('cell')).toHaveTextContent('content');
    expect(screen.getByTestId('grid').className).toContain('grid');
    expect(screen.getByTestId('grid').className).toContain('gapMd');
  });

  test('gap variants switch the gap class', () => {
    const { rerender } = render(
      <Grid data-testid="grid" gap="sm">
        x
      </Grid>
    );
    expect(screen.getByTestId('grid').className).toContain('gapSm');
    rerender(
      <Grid data-testid="grid" gap="lg">
        x
      </Grid>
    );
    expect(screen.getByTestId('grid').className).toContain('gapLg');
  });

  test('GridCol defaults to a full-width (12) span', () => {
    render(
      <Grid>
        <GridCol data-testid="cell">x</GridCol>
      </Grid>
    );
    expect(screen.getByTestId('cell').className).toContain('col-12');
    expect(screen.getByTestId('cell').className).not.toContain('col-md');
    expect(screen.getByTestId('cell').className).not.toContain('col-lg');
  });

  test('GridCol applies base, md and lg span classes (the standard card layout)', () => {
    render(
      <Grid>
        <GridCol data-testid="cell" span={12} md={6} lg={4}>
          x
        </GridCol>
      </Grid>
    );
    const className = screen.getByTestId('cell').className;
    expect(className).toContain('col-12');
    expect(className).toContain('col-md-6');
    expect(className).toContain('col-lg-4');
  });

  test('forwards className and other div attributes', () => {
    render(
      <Grid data-testid="grid" className="custom" aria-label="cards">
        <GridCol data-testid="cell" className="cellCustom">
          x
        </GridCol>
      </Grid>
    );
    expect(screen.getByTestId('grid').className).toContain('custom');
    expect(screen.getByTestId('grid')).toHaveAttribute('aria-label', 'cards');
    expect(screen.getByTestId('cell').className).toContain('cellCustom');
  });
});
