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
      thinkingLevel: '',
      inputTemplate: '{{instructionText}}',
    });
  });

  test('reasoning effort selection rides the submitted values', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    renderMaker({ onSubmit });
    fireEvent.change(screen.getByTestId('agent-maker-name'), {
      target: { value: 'Thinker' },
    });
    fireEvent.change(screen.getByTestId('agent-maker-instruction'), {
      target: { value: 'inst-2' },
    });
    fireEvent.change(screen.getByTestId('agent-maker-thinking'), {
      target: { value: 'none' },
    });
    fireEvent.click(screen.getByTestId('agent-maker-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].thinkingLevel).toBe('none');
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

    test('reasoning effort writes thinking_level and clears back to vendor default', () => {
      renderNode();
      fireEvent.change(screen.getByTestId('agent-maker-thinking'), {
        target: { value: 'low' },
      });
      let config = JSON.parse(
        onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0]
      );
      expect(config.thinking_level).toBe('low');
      // Untouched keys survive the edit
      expect(config.custom_key).toBe('kept');

      // Clearing to vendor default removes the key entirely
      renderNode({
        node: {
          ...generationNode,
          config: JSON.stringify({ thinking_level: 'high' }),
        },
      });
      const selects = screen.getAllByTestId('agent-maker-thinking');
      const fresh = selects[selects.length - 1];
      expect(fresh).toHaveValue('high');
      fireEvent.change(fresh, { target: { value: '' } });
      config = JSON.parse(
        onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0]
      );
      expect(config.thinking_level).toBeUndefined();
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

  describe('PDF branding (TOOL_EXECUTOR node)', () => {
    const onConfigChange = jest.fn();

    const toolNode = (config: Record<string, unknown>) => ({
      id: 'tools',
      name: 'Tools',
      nodeType: 'TOOL_EXECUTOR',
      config: JSON.stringify(config),
      conditional: null,
      isEntry: false,
    });

    const renderTools = (
      config: Record<string, unknown>,
      props: Partial<React.ComponentProps<typeof AgentMaker>> = {}
    ) =>
      render(
        <AgentMaker
          node={toolNode(config)}
          catalogEntry={{
            nodeType: 'TOOL_EXECUTOR',
            label: 'Tool executor',
            defaultConfig: '{}',
            hasPrompt: false,
          }}
          onConfigChange={onConfigChange}
          {...props}
        />
      );

    const lastConfig = () =>
      JSON.parse(
        onConfigChange.mock.calls[onConfigChange.mock.calls.length - 1][0]
      );

    test('shows the stored settings when the node binds generate_pdf', () => {
      renderTools({
        tools: ['web_search', 'generate_pdf'],
        tool_settings: {
          generate_pdf: {
            company_name: 'Acme GmbH',
            accent_color: '#1A73E8',
            footer_text: 'Confidential',
            default_page_size: 'Letter',
            logo_attachment_id: 'logo-1',
          },
        },
      });
      expect(screen.getByTestId('agent-maker-pdf-company')).toHaveValue(
        'Acme GmbH'
      );
      expect(screen.getByTestId('agent-maker-pdf-accent')).toHaveValue(
        '#1A73E8'
      );
      expect(screen.getByTestId('agent-maker-pdf-accent-picker')).toHaveValue(
        '#1a73e8'
      );
      expect(screen.getByTestId('agent-maker-pdf-footer')).toHaveValue(
        'Confidential'
      );
      expect(screen.getByTestId('agent-maker-pdf-page-size')).toHaveValue(
        'Letter'
      );
      expect(screen.getByTestId('agent-maker-pdf-logo')).toHaveTextContent(
        'Logo uploaded'
      );
    });

    test('also shows for a node without a tools list (all built-ins bound)', () => {
      renderTools({});
      expect(
        screen.getByTestId('agent-maker-pdf-branding')
      ).toBeInTheDocument();
    });

    test('is hidden when the node does not bind generate_pdf', () => {
      renderTools({ tools: ['web_search'] });
      expect(
        screen.queryByTestId('agent-maker-pdf-branding')
      ).not.toBeInTheDocument();
    });

    test('stored settings stay visible, flagged as unused, when generate_pdf is not bound', () => {
      renderTools({
        tools: ['web_search'],
        tool_settings: { generate_pdf: { company_name: 'Acme' } },
      });
      expect(
        screen.getByTestId('agent-maker-pdf-branding-unused')
      ).toBeInTheDocument();
      expect(screen.getByTestId('agent-maker-pdf-company')).toHaveValue('Acme');
    });

    test('is not offered on other node types', () => {
      render(
        <AgentMaker
          node={{ ...toolNode({}), nodeType: 'RETRIEVAL' }}
          onConfigChange={onConfigChange}
        />
      );
      expect(
        screen.queryByTestId('agent-maker-pdf-branding')
      ).not.toBeInTheDocument();
    });

    test('fields write tool_settings.generate_pdf and keep the rest of the config', () => {
      renderTools({
        tools: ['generate_pdf'],
        subagents: [],
        tool_settings: { web_search: { max_results: 5 } },
      });
      fireEvent.change(screen.getByTestId('agent-maker-pdf-company'), {
        target: { value: 'Acme GmbH' },
      });
      expect(lastConfig()).toEqual({
        tools: ['generate_pdf'],
        subagents: [],
        tool_settings: {
          web_search: { max_results: 5 },
          generate_pdf: { company_name: 'Acme GmbH' },
        },
      });

      fireEvent.change(screen.getByTestId('agent-maker-pdf-footer'), {
        target: { value: 'Page footer' },
      });
      expect(lastConfig().tool_settings.generate_pdf).toEqual({
        footer_text: 'Page footer',
      });

      fireEvent.change(screen.getByTestId('agent-maker-pdf-page-size'), {
        target: { value: 'A4' },
      });
      expect(lastConfig().tool_settings.generate_pdf).toEqual({
        default_page_size: 'A4',
      });
    });

    test('clearing the last setting removes generate_pdf and an empty tool_settings', () => {
      renderTools({
        tools: ['generate_pdf'],
        tool_settings: {
          generate_pdf: { company_name: 'Acme', future_key: 'kept' },
        },
      });
      fireEvent.change(screen.getByTestId('agent-maker-pdf-company'), {
        target: { value: '   ' },
      });
      // Keys the form doesn't know survive
      expect(lastConfig().tool_settings).toEqual({
        generate_pdf: { future_key: 'kept' },
      });

      onConfigChange.mockClear();
      renderTools({
        tools: ['generate_pdf'],
        tool_settings: { generate_pdf: { default_page_size: 'Legal' } },
      });
      const selects = screen.getAllByTestId('agent-maker-pdf-page-size');
      fireEvent.change(selects[selects.length - 1], { target: { value: '' } });
      expect(lastConfig()).toEqual({ tools: ['generate_pdf'] });
    });

    test('the accent color accepts #RRGGBB (normalized) and flags anything else', () => {
      renderTools({ tools: ['generate_pdf'] });
      fireEvent.change(screen.getByTestId('agent-maker-pdf-accent'), {
        target: { value: '#12ab' },
      });
      expect(
        screen.getByTestId('agent-maker-pdf-accent-error')
      ).toHaveTextContent('Use a hex color such as #1A73E8.');
      expect(onConfigChange).not.toHaveBeenCalled();

      fireEvent.change(screen.getByTestId('agent-maker-pdf-accent'), {
        target: { value: '1a73e8' },
      });
      expect(
        screen.queryByTestId('agent-maker-pdf-accent-error')
      ).not.toBeInTheDocument();
      expect(lastConfig().tool_settings.generate_pdf).toEqual({
        accent_color: '#1A73E8',
      });

      fireEvent.change(screen.getByTestId('agent-maker-pdf-accent-picker'), {
        target: { value: '#ff8800' },
      });
      expect(lastConfig().tool_settings.generate_pdf).toEqual({
        accent_color: '#FF8800',
      });
    });

    test('uploading a logo stores its attachment id; removing clears it', async () => {
      const onUploadImage = jest.fn().mockResolvedValue('att-logo-9');
      const { rerender } = renderTools(
        { tools: ['generate_pdf'] },
        { onUploadImage }
      );
      expect(
        screen.getByTestId('agent-maker-pdf-logo-upload')
      ).toHaveTextContent('Upload logo…');
      const logo = new File(['png'], 'acme-logo.png', { type: 'image/png' });
      fireEvent.change(screen.getByTestId('agent-maker-pdf-logo-input'), {
        target: { files: [logo] },
      });

      await waitFor(() => expect(onUploadImage).toHaveBeenCalledWith(logo));
      await waitFor(() =>
        expect(lastConfig().tool_settings.generate_pdf).toEqual({
          logo_attachment_id: 'att-logo-9',
        })
      );

      // The host applies the change; the form then shows the logo by name
      rerender(
        <AgentMaker
          node={toolNode(lastConfig())}
          catalogEntry={{
            nodeType: 'TOOL_EXECUTOR',
            label: 'Tool executor',
            defaultConfig: '{}',
            hasPrompt: false,
          }}
          onConfigChange={onConfigChange}
          onUploadImage={onUploadImage}
        />
      );
      expect(screen.getByTestId('agent-maker-pdf-logo')).toHaveTextContent(
        'acme-logo.png'
      );
      expect(
        screen.getByTestId('agent-maker-pdf-logo-upload')
      ).toHaveTextContent('Replace…');

      fireEvent.click(screen.getByTestId('agent-maker-pdf-logo-remove'));
      expect(lastConfig()).toEqual({ tools: ['generate_pdf'] });
    });

    test('a logo that is not a PNG/JPEG, or over 2 MB, is turned down before uploading', () => {
      const onUploadImage = jest.fn();
      renderTools({ tools: ['generate_pdf'] }, { onUploadImage });
      fireEvent.change(screen.getByTestId('agent-maker-pdf-logo-input'), {
        target: {
          files: [new File(['gif'], 'logo.gif', { type: 'image/gif' })],
        },
      });
      expect(
        screen.getByTestId('agent-maker-pdf-logo-error')
      ).toHaveTextContent('PNG or JPEG image of at most 2 MB');

      const big = new File(['x'], 'big.png', { type: 'image/png' });
      Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 });
      fireEvent.change(screen.getByTestId('agent-maker-pdf-logo-input'), {
        target: { files: [big] },
      });
      expect(onUploadImage).not.toHaveBeenCalled();
    });

    test('a failed upload shows an error and stores nothing', async () => {
      const onUploadImage = jest.fn().mockRejectedValue(new Error('s3 down'));
      renderTools({ tools: ['generate_pdf'] }, { onUploadImage });
      fireEvent.change(screen.getByTestId('agent-maker-pdf-logo-input'), {
        target: {
          files: [new File(['png'], 'logo.png', { type: 'image/png' })],
        },
      });
      expect(
        await screen.findByTestId('agent-maker-pdf-logo-error')
      ).toHaveTextContent('The logo upload failed');
      expect(onConfigChange).not.toHaveBeenCalled();
    });

    test('without an upload service the logo can only be removed', () => {
      renderTools({ tools: ['generate_pdf'] });
      expect(
        screen.queryByTestId('agent-maker-pdf-logo-upload')
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('agent-maker-pdf-logo-unavailable')
      ).toBeInTheDocument();
    });

    test('the raw JSON editor leaves the branding to the form and keeps it on apply', () => {
      renderTools({
        tools: ['generate_pdf'],
        tool_settings: {
          generate_pdf: { company_name: 'Acme' },
          web_search: { max_results: 5 },
        },
      });
      const raw = screen.getByTestId('agent-maker-raw') as HTMLTextAreaElement;
      expect(JSON.parse(raw.value)).toEqual({
        tools: ['generate_pdf'],
        tool_settings: { web_search: { max_results: 5 } },
      });

      fireEvent.change(raw, {
        target: {
          value: JSON.stringify({
            tools: ['generate_pdf', 'fs_write', 'fs_read'],
            tool_settings: { web_search: { max_results: 3 } },
          }),
        },
      });
      fireEvent.click(screen.getByTestId('agent-maker-raw-apply'));
      expect(lastConfig()).toEqual({
        tools: ['generate_pdf', 'fs_write', 'fs_read'],
        tool_settings: {
          web_search: { max_results: 3 },
          generate_pdf: { company_name: 'Acme' },
        },
      });
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
