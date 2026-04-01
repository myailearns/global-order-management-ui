import { Meta, StoryObj } from '@storybook/angular';

import { GomSelectComponent, GomSelectOption } from './gom-select.component';

const options: GomSelectOption[] = [
  { label: 'Electronics', value: 'electronics' },
  { label: 'Food', value: 'food' },
  { label: 'Clothing', value: 'clothing' },
];

const meta: Meta<GomSelectComponent> = {
  title: 'Shared/Form Controls/Select',
  component: GomSelectComponent,
  tags: ['autodocs'],
  args: {
    label: 'Category',
    placeholder: 'Select category',
    hint: 'Choose one category',
    options,
    error: '',
  },
};

export default meta;

type Story = StoryObj<GomSelectComponent>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: 'Category is required',
    hint: '',
  },
  parameters: {
    docs: {
      source: {
        code: `<gom-select
  label="Category"
  placeholder="Select category"
  [options]="[
    { label: 'Electronics', value: 'electronics' },
    { label: 'Food', value: 'food' },
    { label: 'Clothing', value: 'clothing' }
  ]"
  error="Category is required"
></gom-select>`,
      },
    },
  },
};
