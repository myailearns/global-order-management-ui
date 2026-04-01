import type { Preview } from '@storybook/angular';

const preview: Preview = {
  parameters: {
    viewMode: 'docs',
    docs: {
      codePanel: true,
      source: { state: 'open' },
      canvas: { sourceState: 'shown' },
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile (428px)',
          styles: {
            width: '428px',
            height: '100%',
          },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet (840px)',
          styles: {
            width: '840px',
            height: '100%',
          },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop (1440px)',
          styles: {
            width: '1440px',
            height: '100%',
          },
          type: 'desktop',
        },
        wide: {
          name: 'Wide (1920px)',
          styles: {
            width: '1920px',
            height: '100%',
          },
          type: 'desktop',
        },
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#424242',
        },
        {
          name: 'grey',
          value: '#f0f0f0',
        },
      ],
    },
  },
};

export default preview;
