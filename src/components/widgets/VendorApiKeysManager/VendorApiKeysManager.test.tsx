import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VendorApiKeysManager, {
  VendorApiKeyRowData,
} from './VendorApiKeysManager';
import '@testing-library/jest-dom';

describe('VendorApiKeysManager', () => {
  const rows: VendorApiKeyRowData[] = [
    {
      vendor: 'OPENAI',
      label: 'OpenAI',
      keySet: true,
      savedModel: 'gpt-5-mini',
      savedPriority: 1,
      models: ['gpt-5', 'gpt-5-mini'],
    },
    { vendor: 'CLAUDE', label: 'Claude', keySet: false, models: [] },
  ];

  const onSaveKey = jest.fn();
  const onDeleteKey = jest.fn();
  const onSaveConfig = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onSaveKey.mockResolvedValue({ success: true });
    onDeleteKey.mockResolvedValue(undefined);
    onSaveConfig.mockResolvedValue(undefined);
  });

  const renderAll = () =>
    render(
      <VendorApiKeysManager
        rows={rows}
        onSaveKey={onSaveKey}
        onDeleteKey={onDeleteKey}
        onSaveConfig={onSaveConfig}
      />
    );

  test('renders a card per vendor with key status pills', () => {
    renderAll();
    expect(
      screen.getByTestId('vendor-api-keys-OPENAI-status-pill')
    ).toHaveTextContent('Key set');
    expect(
      screen.getByTestId('vendor-api-keys-CLAUDE-status-pill')
    ).toHaveTextContent('Not set');
    expect(
      screen.getByTestId('vendor-api-keys-OPENAI-priority-pill')
    ).toHaveTextContent('Priority 1');
  });

  test('shows config row and remove button only for keyed vendors', () => {
    renderAll();
    expect(
      screen.getByTestId('vendor-api-keys-OPENAI-config')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('vendor-api-keys-CLAUDE-config')
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('vendor-api-keys-OPENAI-remove-key')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('vendor-api-keys-CLAUDE-remove-key')
    ).not.toBeInTheDocument();
  });

  test('hides config row and remove button when callbacks are omitted', () => {
    render(<VendorApiKeysManager rows={rows} onSaveKey={onSaveKey} />);
    expect(
      screen.queryByTestId('vendor-api-keys-OPENAI-config')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('vendor-api-keys-OPENAI-remove-key')
    ).not.toBeInTheDocument();
  });

  test('saves a key and shows the success message', async () => {
    renderAll();
    fireEvent.change(screen.getByTestId('vendor-api-keys-CLAUDE-key-input'), {
      target: { value: 'sk-123' },
    });
    fireEvent.click(screen.getByTestId('vendor-api-keys-CLAUDE-save-key'));

    await waitFor(() => {
      expect(onSaveKey).toHaveBeenCalledWith('CLAUDE', 'sk-123');
    });
    expect(
      await screen.findByTestId('vendor-api-keys-CLAUDE-message')
    ).toHaveTextContent('Key validated and saved');
  });

  test('shows the rejection message when a key is not accepted', async () => {
    onSaveKey.mockResolvedValue({ success: false });
    renderAll();
    fireEvent.change(screen.getByTestId('vendor-api-keys-CLAUDE-key-input'), {
      target: { value: 'bad' },
    });
    fireEvent.click(screen.getByTestId('vendor-api-keys-CLAUDE-save-key'));

    await waitFor(() => {
      expect(
        screen.getByTestId('vendor-api-keys-CLAUDE-message')
      ).toHaveTextContent('Key rejected by vendor — not saved');
    });
  });

  test('save config is disabled until the selection changes, then submits model and numeric priority', async () => {
    renderAll();
    const saveConfig = screen.getByTestId('vendor-api-keys-OPENAI-save-config');
    // Prefilled with the saved values → not dirty → disabled
    expect(saveConfig).toBeDisabled();

    fireEvent.change(screen.getByTestId('vendor-api-keys-OPENAI-model'), {
      target: { value: 'gpt-5' },
    });
    expect(saveConfig).toBeEnabled();
    fireEvent.click(saveConfig);

    await waitFor(() => {
      expect(onSaveConfig).toHaveBeenCalledWith('OPENAI', 'gpt-5', 1, '');
    });
    expect(
      await screen.findByTestId('vendor-api-keys-OPENAI-message')
    ).toHaveTextContent('Saved: gpt-5 at priority 1');
  });

  test('reasoning effort dirties the config and rides the save', async () => {
    renderAll();
    const saveConfig = screen.getByTestId('vendor-api-keys-OPENAI-save-config');
    expect(saveConfig).toBeDisabled();

    fireEvent.change(screen.getByTestId('vendor-api-keys-OPENAI-thinking'), {
      target: { value: 'low' },
    });
    expect(saveConfig).toBeEnabled();
    fireEvent.click(saveConfig);

    await waitFor(() => {
      expect(onSaveConfig).toHaveBeenCalledWith(
        'OPENAI',
        expect.any(String),
        expect.any(Number),
        'low'
      );
    });
  });

  test('a cancelled delete (resolving false) shows no message', async () => {
    onDeleteKey.mockResolvedValue(false);
    renderAll();
    fireEvent.click(screen.getByTestId('vendor-api-keys-OPENAI-remove-key'));

    await waitFor(() => {
      expect(onDeleteKey).toHaveBeenCalledWith('OPENAI');
    });
    expect(
      screen.queryByTestId('vendor-api-keys-OPENAI-message')
    ).not.toBeInTheDocument();
  });

  test('removes a key and clears the config selections', async () => {
    renderAll();
    fireEvent.click(screen.getByTestId('vendor-api-keys-OPENAI-remove-key'));

    await waitFor(() => {
      expect(onDeleteKey).toHaveBeenCalledWith('OPENAI');
    });
    expect(
      await screen.findByTestId('vendor-api-keys-OPENAI-message')
    ).toHaveTextContent('Key removed');
  });

  test('surfaces callback errors as row messages', async () => {
    onSaveConfig.mockRejectedValue(new Error('No API key stored'));
    renderAll();
    fireEvent.change(screen.getByTestId('vendor-api-keys-OPENAI-model'), {
      target: { value: 'gpt-5' },
    });
    fireEvent.click(screen.getByTestId('vendor-api-keys-OPENAI-save-config'));

    await waitFor(() => {
      expect(
        screen.getByTestId('vendor-api-keys-OPENAI-message')
      ).toHaveTextContent('No API key stored');
    });
  });

  test('applies string overrides', () => {
    render(
      <VendorApiKeysManager
        rows={rows}
        onSaveKey={onSaveKey}
        strings={{ keySetPill: 'Aktiv', keyNotSetPill: 'Fehlt' }}
      />
    );
    expect(
      screen.getByTestId('vendor-api-keys-OPENAI-status-pill')
    ).toHaveTextContent('Aktiv');
    expect(
      screen.getByTestId('vendor-api-keys-CLAUDE-status-pill')
    ).toHaveTextContent('Fehlt');
  });
});
