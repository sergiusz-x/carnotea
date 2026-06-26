import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  AppForm,
  DateField,
  FormSubmit,
  NumberField,
  SelectField,
  setServerErrors,
  TextField,
  useZodForm,
} from '.';

const TestSchema = z.object({
  name: z.string().min(2),
  count: z.number().int().nonnegative(),
  category: z.string().min(1),
  date: z.string().optional(),
});

type TestValues = z.infer<typeof TestSchema>;

function TestFormComponent({ onSubmit = vi.fn() }: { onSubmit?: (v: TestValues) => void }) {
  const form = useZodForm(TestSchema, { defaultValues: { name: '', category: '', date: '' } });
  return (
    <AppForm form={form} onSubmit={onSubmit}>
      <TextField name="name" label="Name" />
      <NumberField name="count" label="Count" />
      <SelectField
        name="category"
        label="Category"
        options={[
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ]}
      />
      <DateField name="date" label="Date" />
      <FormSubmit>Submit</FormSubmit>
    </AppForm>
  );
}

describe('forms foundation', () => {
  it('blocks submit and shows a localized error when a field is invalid', async () => {
    const onSubmit = vi.fn();
    render(<TestFormComponent onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole('button', { name: 'Submit' });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    fireEvent.submit(submitBtn.closest('form')!);

    // Errors should appear and use translated strings, not raw Zod English messages
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
      alerts.forEach((el) => {
        expect(el.textContent).not.toMatch(/must contain/i);
      });
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with typed parsed values when the form is valid', async () => {
    const onSubmit = vi.fn();
    render(<TestFormComponent onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Count'), { target: { value: '42' } });

    // interact with SelectField
    const trigger = screen.getByRole('combobox', { name: /category/i });
    fireEvent.click(trigger);
    const optionA = screen.getByRole('option', { name: 'Option A' });
    fireEvent.click(optionA);

    const form = screen.getByLabelText('Name').closest('form');
    if (!form) {
      throw new Error('form element not found');
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce();
    });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const submitted = onSubmit.mock.calls[0]![0] as TestValues;
    expect(submitted.name).toBe('Alice');
    // NumberField coerces the string \"42\" input to a JS number
    expect(typeof submitted.count).toBe('number');
    expect(submitted.count).toBe(42);
    expect(submitted.category).toBe('a');
  });

  it('setServerErrors maps issues onto the matching fields', () => {
    const setError = vi.fn();

    setServerErrors(setError, {
      code: 'VALIDATION',
      message: 'Validation failed',
      issues: [{ code: 'unique', path: ['name'], message: 'Name is already taken' }],
    });

    expect(setError).toHaveBeenCalledWith('name', { message: 'Name is already taken' });
  });

  it('setServerErrors falls back to root when there are no issues', () => {
    const setError = vi.fn();

    setServerErrors(setError, { code: 'SERVER_ERROR', message: 'Something went wrong' });

    expect(setError).toHaveBeenCalledWith('root', { message: 'Something went wrong' });
  });

  it('SelectField renders all provided options', () => {
    render(<TestFormComponent />);
    // open the combobox to see options
    const trigger = screen.getByRole('combobox', { name: /category/i });
    fireEvent.click(trigger);
    const optionA = screen.getByRole('option', { name: 'Option A' });
    const optionB = screen.getByRole('option', { name: 'Option B' });
    expect(optionA).toBeInTheDocument();
    expect(optionB).toBeInTheDocument();
  });
});
