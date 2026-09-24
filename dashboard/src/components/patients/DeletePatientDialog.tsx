import type * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ApiRequestError, api } from '@/lib/api';
import type { Patient } from '@/lib/types';

type DeletePatientDialogProps = {
  patient: Patient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (patientId: string) => void;
};

export const DeletePatientDialog = ({ patient, open, onOpenChange, onDeleted }: DeletePatientDialogProps): React.JSX.Element => {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async (): Promise<void> => {
    setDeleting(true);
    try {
      await api.deletePatient(patient.patient_id);
      toast.success('Patient removed from the registry');
      onDeleted(patient.patient_id);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to delete patient.';
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {patient.first_name} {patient.last_name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This soft-deletes the patient record. They will no longer appear in searches, but the record is retained for compliance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleConfirm()} disabled={deleting}>
            {deleting ? 'Removing…' : 'Remove patient'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
