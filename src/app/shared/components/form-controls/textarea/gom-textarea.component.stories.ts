import { Meta, StoryObj } from '@storybook/angular';

import { GomTextareaComponent } from './gom-textarea.component';

const meta: Meta<GomTextareaComponent> = {
  title: 'Shared/Form Controls/Textarea',
  component: GomTextareaComponent,
  tags: ['autodocs'],
  args: {
    label: 'Description',
    placeholder: 'Enter description',
    hint: 'Maximum 500 characters',
    rows: 4,
    error: '',
  },
};

export default meta;

type Story = StoryObj<GomTextareaComponent>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    error: 'Description is required',
    hint: '',
  },
  parameters: {
    docs: {
      source: {
        code: `<gom-textarea
  label="Description"
  placeholder="Enter description"
  [rows]="4"
  error="Description is required"
></gom-textarea>`,
      },
    },
  },
};
