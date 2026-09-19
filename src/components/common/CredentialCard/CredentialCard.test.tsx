import React from 'react';
import { render, screen } from '@testing-library/react';
import { CredentialCard, CredentialStatusPill } from './CredentialCard';

describe('CredentialCard', () => {
  test('renders label, pills and body', () => {
    render(
      <CredentialCard
        label="Milvus Cloud"
        pills={
          <CredentialStatusPill kind="ok" data-testid="pill">
            Connected
          </CredentialStatusPill>
        }
        data-testid="card"
      >
        <input placeholder="Endpoint" />
      </CredentialCard>
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Milvus Cloud')).toBeInTheDocument();
    expect(screen.getByTestId('pill')).toHaveTextContent('Connected');
    expect(screen.getByPlaceholderText('Endpoint')).toBeInTheDocument();
  });

  test('shows a message line only when a message is set', () => {
    const { rerender } = render(
      <CredentialCard label="X" data-testid="card" />
    );
    expect(screen.queryByTestId('card-message')).not.toBeInTheDocument();

    rerender(
      <CredentialCard
        label="X"
        data-testid="card"
        message="Saved"
        messageKind="success"
      />
    );
    expect(screen.getByTestId('card-message')).toHaveTextContent('Saved');
  });
});
