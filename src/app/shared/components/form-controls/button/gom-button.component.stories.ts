import { Meta, StoryObj } from '@storybook/angular';

import { GomButtonComponent } from './gom-button.component';

const meta: Meta<GomButtonComponent> = {
  title: 'Shared/Form Controls/Button',
  component: GomButtonComponent,
  tags: ['autodocs'],
  args: {
    variant: 'primary',
    disabled: false,
    type: 'button',
  },
};

export default meta;

type Story = StoryObj<GomButtonComponent>;

export const Primary: Story = {
  render: (args) => ({
    props: args,
    template: '<gom-button [variant]="variant" [disabled]="disabled" [type]="type">Save</gom-button>',
  }),
  parameters: {
    docs: {
      source: {
        code: `<gom-button variant="primary" type="button">Save</gom-button>`,
      },
    },
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
  render: (args) => ({
    props: args,
    template: '<gom-button [variant]="variant" [disabled]="disabled" [type]="type">Cancel</gom-button>',
  }),
  parameters: {
    docs: {
      source: {
        code: `<gom-button variant="secondary" type="button">Cancel</gom-button>`,
      },
    },
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
  },
  render: (args) => ({
    props: args,
    template: '<gom-button [variant]="variant" [disabled]="disabled" [type]="type">Delete</gom-button>',
  }),
  parameters: {
    docs: {
      source: {
        code: `<gom-button variant="danger" type="button">Delete</gom-button>`,
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => ({
    props: args,
    template: '<gom-button [variant]="variant" [disabled]="disabled" [type]="type">Disabled</gom-button>',
  }),
  parameters: {
    docs: {
      source: {
        code: `<gom-button variant="primary" [disabled]="true" type="button">Disabled</gom-button>`,
      },
    },
  },
};
