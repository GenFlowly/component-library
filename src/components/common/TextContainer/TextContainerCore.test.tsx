import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TextContainerCore from './TextContainerCore';

jest.mock('react-markdown', () => (props: any) => (
  <div data-testid="markdown-content">{props.children}</div>
));
jest.mock('remark-gfm', () => () => {});
jest.mock('remark-math', () => () => {});
jest.mock('rehype-highlight', () => () => {});
jest.mock('rehype-katex', () => () => {});

describe('TextContainerCore copy button', () => {
  test('is labelled "Copy Response" by default', () => {
    render(<TextContainerCore content="An answer" data-testid="card" />);

    const button = screen.getByTestId('card-copy-button');
    expect(button).toHaveAttribute('aria-label', 'Copy Response');
    expect(button).toHaveAttribute('title', 'Copy Response');
  });

  test('takes the label it is given', () => {
    render(
      <TextContainerCore
        content="A prompt"
        copyLabel="Copy Prompt"
        data-testid="card"
      />
    );

    const button = screen.getByTestId('card-copy-button');
    expect(button).toHaveAttribute('aria-label', 'Copy Prompt');
    expect(button).toHaveAttribute('title', 'Copy Prompt');
  });
});
