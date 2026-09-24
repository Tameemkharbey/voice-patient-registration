import { Check, Copy, Pencil, Trash2 } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { CallLogList } from './CallLogList';
import { DeletePatientDialog } from './DeletePatientDialog';
import { DetailField, DetailGroup } from './DetailField';
import { EditPatientDialog } from './EditPatientDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePatientDetail } from '@/hooks/usePatientDetail';
import { ageFromUsDate, formatDateTime, formatPhone } from '@/lib/format';
import type { Patient } from '@/lib/types';

type PatientDetailSheetProps = {
  patientId: string | null;
  onOpenChange: (open: boolean) => void;
  onPatientUpdated: (patient: Patient) => void;
  onPatientDeleted: (patientId: string) => void;
};

const CopyId = ({ id }: { id: string }): React.JSX.Element => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable; silently ignore, id is still visible for manual copy.
    }
  };
  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Copy patient ID"
    >
      <span className="font-mono">{id}</span>
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

export const PatientDetailSheet = ({
  patientId,
  onOpenChange,
  onPatientUpdated,
  onPatientDeleted,
}: PatientDetailSheetProps): React.JSX.Element => {
  const { patient, calls, loading, error, refetch } = usePatientDetail(patientId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const age = patient ? ageFromUsDate(patient.date_of_birth) : null;

  return (
    <>
      <Sheet open={Boolean(patientId)} onOpenChange={onOpenChange}>
        <SheetContent className="p-0">
          <SheetHeader>
            <SheetTitle>{patient ? `${patient.first_name} ${patient.last_name}` : 'Patient details'}</SheetTitle>
            <SheetDescription>
              {patient ? `${patient.sex} · ${age !== null ? `${age} years old` : patient.date_of_birth}` : 'Loading patient record…'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loading && (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {error && !loading && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
                <Button variant="outline" size="sm" className="mt-3" onClick={refetch}>
                  Retry
                </Button>
              </div>
            )}

            {patient && !loading && (
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="calls">Calls ({calls.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)} className="gap-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                    {patient.insurance_provider ? (
                      <Badge variant="success" className="ml-auto">Insured</Badge>
                    ) : (
                      <Badge variant="outline" className="ml-auto">Self-pay</Badge>
                    )}
                  </div>

                  <DetailGroup title="Identity">
                    <DetailField label="First name" value={patient.first_name} />
                    <DetailField label="Last name" value={patient.last_name} />
                    <DetailField label="Date of birth" value={patient.date_of_birth} />
                    <DetailField label="Sex" value={patient.sex} />
                    <DetailField label="Preferred language" value={patient.preferred_language} />
                  </DetailGroup>

                  <DetailGroup title="Contact">
                    <DetailField label="Phone" value={formatPhone(patient.phone_number)} />
                    <DetailField label="Email" value={patient.email} />
                  </DetailGroup>

                  <DetailGroup title="Address">
                    <DetailField label="Address line 1" value={patient.address_line_1} />
                    <DetailField label="Address line 2" value={patient.address_line_2} />
                    <DetailField label="City" value={patient.city} />
                    <DetailField label="State" value={patient.state} />
                    <DetailField label="ZIP code" value={patient.zip_code} />
                  </DetailGroup>

                  <DetailGroup title="Insurance">
                    <DetailField label="Provider" value={patient.insurance_provider} />
                    <DetailField label="Member ID" value={patient.insurance_member_id} />
                  </DetailGroup>

                  <DetailGroup title="Emergency contact">
                    <DetailField label="Name" value={patient.emergency_contact_name} />
                    <DetailField
                      label="Phone"
                      value={patient.emergency_contact_phone ? formatPhone(patient.emergency_contact_phone) : null}
                    />
                  </DetailGroup>

                  <DetailGroup title="Record metadata">
                    <DetailField label="Patient ID" value={<CopyId id={patient.patient_id} />} />
                    <DetailField label="Created" value={formatDateTime(patient.created_at)} />
                    <DetailField label="Last updated" value={formatDateTime(patient.updated_at)} />
                  </DetailGroup>
                </TabsContent>

                <TabsContent value="calls">
                  <CallLogList calls={calls} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {patient && editOpen && (
        <EditPatientDialog
          patient={patient}
          open={editOpen}
          onOpenChange={setEditOpen}
          onUpdated={(updated) => {
            onPatientUpdated(updated);
            refetch();
          }}
        />
      )}

      {patient && deleteOpen && (
        <DeletePatientDialog
          patient={patient}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={onPatientDeleted}
        />
      )}
    </>
  );
};
