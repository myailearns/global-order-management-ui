import { Meta, StoryObj } from '@storybook/angular';

import { GomInputComponent } from './gom-input.component';

const meta: Meta<GomInputComponent> = {
  title: 'Shared/Form Controls/Input',
  component: GomInputComponent,
  tags: ['autodocs'],
  args: {
    label: 'Product Name',
    placeholder: 'Enter product name',
    hint: 'Use a unique product name',
    type: 'text',
    error: '',
  },
};

export default meta;

type Story = StoryObj<GomInputComponent>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: 'Product name is required',
    hint: '',
  },
  parameters: {
    docs: {
      source: {
        code: `<gom-input
  label="Product Name"
  placeholder="Enter product name"
  hint="Use a unique product name"
></gom-input>`,
      },
    },
  },
};

export const Disabled: Story = {
  render: (args) => ({
    props: args,
    template: '<gom-input [label]="label" [placeholder]="placeholder" [hint]="hint" [error]="error" [type]="type" [disabled]="true"></gom-input>',
  }),
  parameters: {
    docs: {
      source: {
        code: `<gom-input
  label="Product Name"
  placeholder="Enter product name"
  [disabled]="true"
></gom-input>`,
      },
    },
  },
};
