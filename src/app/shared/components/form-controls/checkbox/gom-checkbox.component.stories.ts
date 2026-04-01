import { Meta, StoryObj } from '@storybook/angular';

import { GomCheckboxComponent } from './gom-checkbox.component';

const meta: Meta<GomCheckboxComponent> = {
  title: 'Shared/Form Controls/Checkbox',
  component: GomCheckboxComponent,
  tags: ['autodocs'],
  args: {
    label: 'Mark as active',
    hint: 'Enable to show in listing',
    error: '',
  },
};

export default meta;

type Story = StoryObj<GomCheckboxComponent>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: 'You must accept this option',
    hint: '',
  },
  parameters: {
    docs: {
      source: {
        code: `<gom-checkbox
  label="Mark as active"
  hint="Enable to show in listing"
  [checked]="true"
></gom-checkbox>`,
      },
    },
  },
};
