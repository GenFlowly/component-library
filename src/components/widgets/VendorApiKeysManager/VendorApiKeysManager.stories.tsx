import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import VendorApiKeysManager, {
  VendorApiKeyRowData,
} from './VendorApiKeysManager';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ROWS: VendorApiKeyRowData[] = [
  {
    vendor: 'OPENAI',
    label: 'OpenAI',
    keySet: true,
    savedModel: 'gpt-5-mini',
    savedPriority: 1,
    models: ['gpt-5', 'gpt-5-mini', 'gpt-realtime-2.1'],
  },
  {
    vendor: 'CLAUDE',
    label: 'Claude',
    keySet: true,
    savedModel: null,
    savedPriority: null,
    models: ['claude-fable-5', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  },
  {
    vendor: 'GEMINI',
    label: 'Gemini',
    keySet: false,
    models: [],
  },
];

const meta: Meta<typeof VendorApiKeysManager> = {
  title: 'Components/VendorApiKeysManager',
  component: VendorApiKeysManager,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `Per-vendor AI API key management cards: store/replace (and optionally remove) a key, and — once a key is set — pick the model and failover priority (1 = primary) used for that vendor.

### Anatomy / Behavior

- Purely presentational: persistence, key validation and model listing are the caller's job via the async callbacks, so the same UI serves both system-wide (admin) and per-customer settings.
- \`onSaveKey\` resolves \`{ success, message? }\`; \`success: false\` renders the rejection message. Thrown errors from any callback surface as the row's error message.
- \`onDeleteKey\` is optional — omit it to hide the Remove button (e.g. no delete endpoint). Resolve \`false\` to signal a cancelled removal (e.g. a declined confirm dialog); nothing is shown then.
- \`onSaveConfig\` is optional — omit it to hide the whole model/priority row. The save button stays disabled until the selection differs from the stored values.
- A stored model missing from the fetched \`models\` list is kept visible as an extra option.
- All UI text is overridable via \`strings\` (i18n hook-in point). Labels accept any ReactNode, e.g. brand logo components.

### When to use

- Settings pages that manage per-vendor AI credentials plus a model/priority preference — the admin panel's system keys page and the app's customer AI settings both use it.

### When NOT to use

- Single-credential forms without per-vendor cards — compose \`InputTextWithHint\` + \`PillButton\` directly.`,
      },
    },
  },
  args: {
    rows: ROWS,
    onSaveKey: async (vendor: string, apiKey: string) => {
      await delay(600);
      // Demo: keys containing "bad" are rejected by the vendor
      return { success: !apiKey.includes('bad') };
    },
    onSaveConfig: async () => {
      await delay(600);
    },
  },
};

export default meta;
type Story = StoryObj<typeof VendorApiKeysManager>;

/** Full admin-style setup: replace, remove, and configure model + priority. */
export const AdminSystemKeys: Story = {
  args: {
    onDeleteKey: async (vendor: string) => {
      // eslint-disable-next-line no-alert
      if (!window.confirm(`Remove the ${vendor} API key?`)) return false;
      await delay(600);
    },
  },
};

/** Customer settings: no delete endpoint, so no Remove button; brand-style labels. */
export const CustomerSettings: Story = {
  args: {
    rows: ROWS.map(row => ({
      ...row,
      label: <strong style={{ letterSpacing: '0.02em' }}>{row.label}</strong>,
    })),
    onDeleteKey: undefined,
  },
};

/** Keys only — no onSaveConfig, so the model/priority row is hidden entirely. */
export const KeysOnly: Story = {
  args: {
    onSaveConfig: undefined,
  },
};

/** Vendor-rejected key: type a key containing "bad" and save to see the error path. */
export const RejectedKey: Story = {
  args: {
    onSaveKey: async () => {
      await delay(600);
      return { success: false };
    },
  },
};

/** Models still loading for a keyed vendor. */
export const ModelsLoading: Story = {
  args: {
    rows: [
      {
        vendor: 'OPENAI',
        label: 'OpenAI',
        keySet: true,
        savedModel: null,
        savedPriority: null,
        models: [],
        modelsLoading: true,
      },
    ],
  },
};
