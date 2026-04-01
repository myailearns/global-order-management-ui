import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-links',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/angular',
    options: {
      enableIvy: true,
    },
  },
};
export default config;
