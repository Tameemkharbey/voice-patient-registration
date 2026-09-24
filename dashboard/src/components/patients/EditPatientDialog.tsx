import type * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiRequestError, api } from '@/lib/api';
import type { Patient, UpdatePatientInput } from '@/lib/types';

type EditPatientDialogProps = {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (patient: Patient) => void;
};

type FormState = {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  zip_code: string;
  insurance_provider: string;
  insurance_member_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

const toFormState = (patient: Patient): FormState => ({
  first_name: patient.first_name,
  last_name: patient.last_name,
  phone_number: patient.phone_number,
  email: patient.email ?? '',
  address_line_1: patient.address_line_1,
  address_line_2: patient.address_line_2 ?? '',
  city: patient.city,
  state: patient.state,
  zip_code: patient.zip_code,
  insurance_provider: patient.insurance_provider ?? '',
  insurance_member_id: patient.insurance_member_id ?? '',
  emergency_contact_name: patient.emergency_contact_name ?? '',
  emergency_contact_phone: patient.emergency_contact_phone ?? '',
});

const FIELDS: { key: keyof FormState; label: string; span?: boolean }[] = [
  { key: 'first_name', label: 'First name' },
  { key: 'last_name', label: 'Last name' },
  { key: 'phone_number', label: 'Phone number' },
  { key: 'email', label: 'Email' },
  { key: 'address_line_1', label: 'Address line 1', span: true },
  { key: 'address_line_2', label: 'Address line 2', span: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip_code', label: 'ZIP code' },
  { key: 'insurance_provider', label: 'Insurance provider' },
  { key: 'insurance_member_id', label: 'Insurance member ID' },
  { key: 'emergency_contact_name', label: 'Emergency contact name' },
  { key: 'emergency_contact_phone', label: 'Emergency contact phone' },
];

export const EditPatientDialog = ({ patient, open, onOpenChange, onUpdated }: EditPatientDialogProps): React.JSX.Element => {
  const [form, setForm] = useState<FormState>(() => toFormState(patient));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleOpenChange = (next: boolean): void => {
    if (next) {
      setForm(toFormState(patient));
      setErrors({});
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    const payload: UpdatePatientInput = {
      first_name: form.first_name,
      last_name: form.last_name,
      phone_number: form.phone_number,
      email: form.email,
      address_line_1: form.address_line_1,
      address_line_2: form.address_line_2,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,
      insurance_provider: form.insurance_provider,
      insurance_member_id: form.insurance_member_id,
      emergency_contact_name: form.emergency_contact_name,
      emergency_contact_phone: form.emergency_contact_phone,
    };
    try {
      const updated = await api.updatePatient(patient.patient_id, payload);
      toast.success('Patient updated');
      onUpdated(updated);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiRequestError && err.details) {
        setErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
        toast.error('Please fix the highlighted fields');
      } else {
        const message = err instanceof ApiRequestError ? err.message : 'Failed to update patient.';
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit patient</DialogTitle>
          <DialogDescription>Update {patient.first_name} {patient.last_name}'s record.</DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map(({ key, label, span }) => (
            <div key={key} className={span ? 'sm:col-span-2 flex flex-col gap-1.5' : 'flex flex-col gap-1.5'}>
              <Label htmlFor={`field-${key}`}>{label}</Label>
              <Input
                id={`field-${key}`}
                value={form[key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                aria-invalid={Boolean(errors[key])}
                className={errors[key] ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
            </div>
          ))}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
