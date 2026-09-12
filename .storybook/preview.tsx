import React, { useEffect } from 'react';
import type { Preview } from '@storybook/react';
import '../i18n';
import '../src/styles/themes.scss';

const ThemeDecorator = (
  Story: React.ComponentType,
  context: { globals: { theme?: string } }
) => {
  const theme = context.globals.theme ?? 'light';
  useEffect(() => {
    // Same attributes the app's ThemeContext sets: data-theme drives the CSS
    // custom properties, data-color-mode drives the @uiw markdown editor.
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color-mode', theme);
    // The app's page chrome paints these; in Storybook the preview body must
    // do it, or dark mode renders light-on-light.
    document.body.style.background = 'var(--color-background)';
    document.body.style.color = 'var(--color-text-primary)';
  }, [theme]);
  return <Story />;
};

const preview: Preview = {
  parameters: {
    options: {
      // Keep grouped-family folders reading top-down: overview docs first.
      storySort: {
        order: [
          'Components',
          [
            'Buttons',
            [
              'PillButton',
              'RectangleButton',
              'ButtonGroups',
              ['About', '*'],
              '*',
            ],
            '*',
          ],
          '*',
        ],
      },
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Color theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [ThemeDecorator],
};

export default preview;
