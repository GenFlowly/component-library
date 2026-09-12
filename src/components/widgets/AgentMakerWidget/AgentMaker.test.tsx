import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgentMaker, {
  AgentMakerInstructionOption,
  AgentMakerVendorOption,
  emptyAgentMakerValues,
} from './AgentMaker';
import '@testing-library/jest-dom';

// The real TextEditor lazy-loads the UIW markdown editor, which does not
// work in JSDOM, so replace it with a plain textarea.
jest.mock('../TextEditorWidget/TextEditor', () => ({
  __esModule: true,
  default: function MockTextEditor(props: any) {
    return (
      <textarea
        data-testid={props['data-testid']}
        value={props.value}
        readOnly={props.readOnly}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          props.onChange(e.target.value)
        }
      />
    );
  },
}));

describe('AgentMaker', () => {
  const instructions: AgentMakerInstructionOption[] = [
    { id: 'inst-1', name: 'Persona Builder', version: 3 },
    { id: 'inst-2', name: 'Summarizer', version: 1 },
  ];
  const vendors: AgentMakerVendorOption[] = [
    { id: 'OPENAI', label: 'OpenAI' },
    { id: 'CLAUDE', label: 'Claude' },
  ];

  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  const getModelsForVendor = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    onSubmit.mockResolvedValue(undefined);
    getModelsForVendor.mockResolvedValue(['gpt-5', 'gpt-5-mini']);
  });

  const renderMaker = (
    props: Partial<React.ComponentProps<typeof AgentMaker>> = {}
  ) =>
    render(
      <AgentMaker
        instructions={instructions}
        vendors={vendors}
        getModelsForVendor={getModelsForVendor}
        onSubmit={onSubmit}
        onCancel={onCancel}
        {...props}
      />
    );

  test('create mode: submit stays disabled until name and instruction are set', () => {
    renderMaker();
    expect(screen.getByTestId('agent-maker-title')).toHaveTextContent(
      'New agent'
    );
    const submit = screen.getByTestId('agent-maker-submit');
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('agent-maker-name'), {
      target: { value: 'My agent' },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId('agent-maker-instruction'), {
      target: { value: 'inst-1' },
    });
    expect(submit).toBeEnabled();
  });

  test('submits trimmed values and shows the resolved success message', async () => {
    onSubmit.mockResolvedValue('Agent created: g-123');
    renderMaker();
    fireEvent.change(screen.getByTestId('agent-maker-name'), {
      target: { value: '  My agent  ' },
    });
    fireEvent.change(screen.getByTestId('agent-maker-instruction'), {
      target: { value: 'inst-2' },
    });
    fireEvent.change(screen.getByTestId('agent-maker-input-template'), {
      target: { value: '{{instructionText}}' },
    });
    fireEvent.click(screen.getByTestId('agent-maker-submit'));

    await waitFor(() =>
      expect(screen.getByTestId('agent-maker-message')).toHaveTextContent(
        'Agent created: g-123'
      )
    );
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'My agent',
      instructionId: 'inst-2',
      outputFormat: 'text',
      vendor: '',
      model: '',
      inputTemplate: '{{instructionText}}',
    });
  });

  test('vendor selection loads models and renders the model select', async () => {
    renderMaker();
    fireEvent.change(screen.getByTestId('agent-maker-vendor'), {
      target: { value: 'OPENAI' },
    });
    expect(getModelsForVendor).toHaveBeenCalledWith('OPENAI');
    expect(
      await screen.findByTestId('agent-maker-model-option-gpt-5')
    ).toBeInTheDocument();
  });

  test('vendor with a failed/empty model fetch leaves the model field free-text', async () => {
    getModelsForVendor.mockRejectedValue(new Error('no key'));
    renderMaker();
    fireEvent.change(screen.getByTestId('agent-maker-vendor'), {
      target: { value: 'CLAUDE' },
    });
    await waitFor(() =>
      expect(screen.getByTestId('agent-maker-model')).toHaveAttribute(
        'placeholder',
        'e.g. gpt-5'
      )
    );
    fireEvent.change(screen.getByTestId('agent-maker-model'), {
      target: { value: 'claude-fable-5' },
    });
    expect(screen.getByTestId('agent-maker-model')).toHaveValue(
      'claude-fable-5'
    );
  });

  test('vendor without a model blocks submit with an inline error', async () => {
    getModelsForVendor.mockResolvedValue([]);
    renderMaker();
    fireEvent.change(screen.getByTestId('agent-maker-name'), {
      target: { value: 'My agent' },
    });
    fireEvent.change(screen.getByTestId('agent-maker-instruction'), {
      target: { value: 'inst-1' },
    });
    fireEvent.change(screen.getByTestId('agent-maker-vendor'), {
      target: { value: 'OPENAI' },
    });
    fireEvent.click(screen.getByTestId('agent-maker-submit'));

    expect(await screen.findByTestId('agent-maker-message')).toHaveTextContent(
      'Pick a model for the selected vendor (or clear the vendor)'
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('editing prefills the form and loads models for the saved vendor', async () => {
    renderMaker({
      editing: {
        agentId: 'g-9f21',
        initial: {
          name: 'Persona Generator',
          instructionId: 'inst-1',
          outputFormat: 'json',
          vendor: 'OPENAI',
          model: 'gpt-5',
          inputTemplate: '{{instructionText}}',
        },
      },
    });
    expect(screen.getByTestId('agent-maker-title')).toHaveTextContent(
      'Edit agent g-9f21'
    );
    expect(screen.getByTestId('agent-maker-name')).toHaveValue(
      'Persona Generator'
    );
    expect(screen.getByTestId('agent-maker-output-format')).toHaveValue('json');
    expect(screen.getByTestId('agent-maker-submit')).toHaveTextContent(
      'Save changes'
    );
    await waitFor(() =>
      expect(screen.getByTestId('agent-maker-model')).toHaveValue('gpt-5')
    );
    expect(getModelsForVendor).toHaveBeenCalledWith('OPENAI');
  });

  test('a stored model missing from the fetched list stays selectable', async () => {
    getModelsForVendor.mockResolvedValue(['gpt-5']);
    renderMaker({
      editing: {
        agentId: 'g-1',
        initial: {
          ...emptyAgentMakerValues(),
          name: 'Old agent',
          instructionId: 'inst-1',
          vendor: 'OPENAI',
          model: 'gpt-4-legacy',
        },
      },
    });
    expect(
      await screen.findByTestId('agent-maker-model-option-gpt-4-legacy')
    ).toBeInTheDocument();
    expect(screen.getByTestId('agent-maker-model')).toHaveValue('gpt-4-legacy');
  });

  test('thrown submit errors surface as the error message', async () => {
    onSubmit.mockRejectedValue(new Error('Name already taken'));
    renderMaker();
    fireEvent.change(screen.getByTestId('agent-maker-name'), {
      target: { value: 'My agent' },
    });
    fireEvent.change(screen.getByTestId('agent-maker-instruction'), {
      target: { value: 'inst-1' },
    });
    fireEvent.click(screen.getByTestId('agent-maker-submit'));

    expect(await screen.findByTestId('agent-maker-message')).toHaveTextContent(
      'Name already taken'
    );
  });

  test('full-height toggle expands the card and Escape collapses it', () => {
    renderMaker();
    const card = screen.getByTestId('agent-maker');
    const toggle = screen.getByTestId('agent-maker-toggle-height');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(card.className).not.toContain('fullHeight');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(card.className).toContain('fullHeight');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(card.className).not.toContain('fullHeight');
  });

  test('new-tab link renders only when newTabHref is set', () => {
    renderMaker({ newTabHref: '/agents/new' });
    const link = screen.getByTestId('agent-maker-new-tab');
    expect(link).toHaveAttribute('href', '/agents/new');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('variable hints render per action; cancel fires onCancel', () => {
    renderMaker({
      variableHints: [
        { action: 'Learn about User', variables: ['userName', 'text'] },
      ],
    });
    expect(screen.getByTestId('agent-maker-hints')).toHaveTextContent(
      'Learn about User: userName, text'
    );
    fireEvent.click(screen.getByTestId('agent-maker-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  describe('node flavor', () => {
    const onRename = jest.fn();
    const onConfigChange = jest.fn();
    const onConditionalChange = jest.fn();
    const onSetEntryPoint = jest.fn();
    const onDeleteNode = jest.fn();

    const nodeInstructions = [
      { id: 'inst-a', name: 'Analyzer Prompt', version: 3, preview: 'You…' },
    ];

    const generationNode = {
      id: 'n1',
      name: 'Analyzer',
      nodeType: 'GENERATION',
      config: JSON.stringify({
        instruction_id: 'inst-a',
        instruction_version: null,
        output_key: 'analysis',
        custom_key: 'kept',
      }),
      conditional: null,
      isEntry: false,
    };

    const renderNode = (
      props: Partial<React.ComponentProps<typeof AgentMaker>> = {}
    ) =>
      render(
        <AgentMaker
          node={generationNode}
          catalogEntry={{
            nodeType: 'GENERATION',
            label: 'Generation Node',
            defaultConfig: '{}',
            hasPrompt: true,
          }}
          instructions={nodeInstructions}
          conditionOptions={[
            { key: 'needs_rewrite', type: 'bool', label: 'Needs rewrite' },
          ]}
          onRename={onRename}
          onConfigChange={onConfigChange}
          onConditionalChange={onConditionalChange}
          onSetEntryPoint={onSetEntryPoint}
          onDeleteNode={onDeleteNode}
          {...props}
        />
      );

    test('generation node shows instruction and output-key fields; rename and entry point wire through', () => {
      renderNode();
      expect(screen.getByTestId('agent-maker-title')).toHaveTextContent(
        'Node settings'
      );
      expect(screen.getByTestId('agent-maker-instruction')).toHaveValue(
        'inst-a'
      );
      expect(screen.getByTestId('agent-maker-output-key')).toHaveValue(
        'analysis'
      );
      // Agent-flavor-only fields are absent
      expect(
        screen.queryByTestId('agent-maker-output-format')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('agent-maker-submit')
      ).not.toBeInTheDocument();

      fireEvent.change(screen.getByTestId('agent-maker-name'), {
        target: { value: 'Renamed' },
      });
      expect(onRename).toHaveBeenCalledWith('Renamed');

      fireEvent.click(screen.getByTestId('agent-maker-set-entry'));
      expect(onSetEntryPoint).toHaveBeenCalled();
    });

    test('output-key edits emit the merged config JSON, preserving unknown keys', () => {
      renderNode();
      fireEvent.change(screen.getByTestId('agent-maker-output-key'), {
        target: { value: 'result' },
      });
      const config = JSON.parse(onConfigChange.mock.calls[0][0]);
      expect(config).toEqual({
        instruction_id: 'inst-a',
        instruction_version: null,
        output_key: 'result',
        custom_key: 'kept',
      });
    });

    test('retrieval node hides instruction/output-key and renders declared config fields', () => {
      renderNode({
        node: {
          id: 'n2',
          name: 'Retrieval',
          nodeType: 'RETRIEVAL',
          config: JSON.stringify({ top_k: 8 }),
          conditional: null,
          isEntry: false,
        },
        catalogEntry: {
          nodeType: 'RETRIEVAL',
          label: 'Retrieval Node',
          defaultConfig: '{}',
          hasPrompt: false,
        },
        configFields: [
          { key: 'top_k', label: 'Top K', type: 'number' as const },
          { key: 'rerank', label: 'Rerank', type: 'boolean' as const },
        ],
      });
      expect(
        screen.queryByTestId('agent-maker-instruction')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('agent-maker-output-key')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('agent-maker-field-top_k')).toHaveValue(8);

      fireEvent.click(screen.getByTestId('agent-maker-field-rerank'));
      const config = JSON.parse(onConfigChange.mock.calls[0][0]);
      expect(config).toEqual({ top_k: 8, rerank: true });
    });

    test('vendor + model selection writes model_preference and mirrors model_override', async () => {
      getModelsForVendor.mockResolvedValue(['gpt-5']);
      renderNode({
        vendors: [{ id: 'OPENAI', label: 'OpenAI' }],
        getModelsForVendor,
      });
      fireEvent.change(screen.getByTestId('agent-maker-vendor'), {
        target: { value: 'OPENAI' },
      });
      const modelSelect = await screen.findByTestId(
        'agent-maker-model-option-gpt-5'
      );
      expect(modelSelect).toBeInTheDocument();
      fireEvent.change(screen.getByTestId('agent-maker-model'), {
        target: { value: 'gpt-5' },
      });
      const config = JSON.parse(
        onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0]
      );
      expect(config.model_preference).toEqual({
        vendor: 'OPENAI',
        model: 'gpt-5',
      });
      expect(config.model_override).toBe('gpt-5');
    });

    test('a legacy bare model_override stays visible and editable', () => {
      renderNode({
        node: {
          ...generationNode,
          config: JSON.stringify({
            instruction_id: 'inst-a',
            model_override: 'gpt-4-legacy',
          }),
        },
      });
      expect(screen.getByTestId('agent-maker-model')).toHaveValue(
        'gpt-4-legacy'
      );
      fireEvent.change(screen.getByTestId('agent-maker-model'), {
        target: { value: 'gpt-4o' },
      });
      const config = JSON.parse(onConfigChange.mock.calls[0][0]);
      expect(config.model_override).toBe('gpt-4o');
      expect(config.model_preference).toBeUndefined();
    });

    test('enabling the conditional seeds it from the first suggestion', () => {
      renderNode();
      fireEvent.click(screen.getByTestId('agent-maker-conditional-toggle'));
      expect(onConditionalChange).toHaveBeenCalledWith({
        key: 'needs_rewrite',
        type: 'bool',
        routes: ['true', 'false'],
      });
    });

    test('invalid raw JSON shows an error instead of emitting', () => {
      renderNode();
      fireEvent.change(screen.getByTestId('agent-maker-raw'), {
        target: { value: '{not json' },
      });
      fireEvent.click(screen.getByTestId('agent-maker-raw-apply'));
      expect(screen.getByTestId('agent-maker-raw-error')).toBeInTheDocument();
      expect(onConfigChange).not.toHaveBeenCalled();
    });

    test('delete button fires onDeleteNode', () => {
      renderNode();
      fireEvent.click(screen.getByTestId('agent-maker-delete'));
      expect(onDeleteNode).toHaveBeenCalled();
    });
  });

  test('hides hints and cancel when props are omitted', () => {
    render(
      <AgentMaker
        instructions={instructions}
        vendors={vendors}
        onSubmit={onSubmit}
      />
    );
    expect(screen.queryByTestId('agent-maker-hints')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-maker-new-tab')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agent-maker-cancel')).not.toBeInTheDocument();
  });
});
