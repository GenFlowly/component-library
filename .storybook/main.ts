import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  webpackFinal: async config => {
    config.module = config.module ?? {};
    config.module.rules = config.module.rules ?? [];
    config.module.rules.push(
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: require.resolve('babel-loader'),
            options: {
              presets: [
                [require.resolve('@babel/preset-env'), { targets: 'defaults' }],
                [
                  require.resolve('@babel/preset-react'),
                  { runtime: 'automatic' },
                ],
                require.resolve('@babel/preset-typescript'),
              ],
            },
          },
        ],
      },
      {
        // scss only: Storybook's built-in rule already handles plain .css
        // (matching .css here would double-process node_modules styles).
        test: /\.scss$/,
        use: [
          require.resolve('style-loader'),
          {
            loader: require.resolve('css-loader'),
            options: {
              modules: {
                auto: /\.module\.\w+$/i,
                exportLocalsConvention: 'asIs',
              },
            },
          },
          require.resolve('sass-loader'),
        ],
      }
      // (no svg rule: Storybook's built-in asset handling already covers .svg)
    );
    config.resolve = config.resolve ?? {};
    config.resolve.extensions = [
      '.tsx',
      '.ts',
      '.js',
      '.jsx',
      ...(config.resolve.extensions ?? []),
    ];
    return config;
  },
};
export default config;
