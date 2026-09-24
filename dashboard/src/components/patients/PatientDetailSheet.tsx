import { Check, Copy, Pencil, Trash2 } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { CallLogList } from './CallLogList';
import { DeletePatientDialog } from './DeletePatientDialog';
import { DetailField, DetailGroup } from './DetailField';
import { EditPatientDialog } from './EditPatientDialog';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePatientDetail } from '@/hooks/usePatientDetail';
import { ageFromUsDate, formatDateTime, formatPhone, initials } from '@/lib/format';
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
  const isReturning = calls.some((c) => c.outcome === 'updated' || c.outcome === 'existing');
  const hasInsurance = Boolean(patient?.insurance_provider || patient?.insurance_member_id);
  const hasEmergencyContact = Boolean(patient?.emergency_contact_name || patient?.emergency_contact_phone);

  return (
    <>
      <Sheet open={Boolean(patientId)} onOpenChange={onOpenChange}>
        <SheetContent className="p-0">
          <SheetHeader>
            <SheetTitle className="sr-only">{patient ? `${patient.first_name} ${patient.last_name}` : 'Patient details'}</SheetTitle>
            <SheetDescription className="sr-only">Patient record details and call history</SheetDescription>

            {patient && !loading ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      initials={initials(patient.first_name, patient.last_name)}
                      seed={patient.patient_id}
                      className="h-11 w-11 text-sm"
                    />
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        {patient.first_name} {patient.last_name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">
                          {patient.sex} · {age !== null ? `${age}y` : patient.date_of_birth}
                        </Badge>
                        {hasInsurance ? <Badge variant="success">Insured</Badge> : <Badge variant="outline">Self-pay</Badge>}
                        {isReturning && <Badge variant="violet">Returning</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteOpen(true)}
                      aria-label="Delete patient"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Phone</p>
                    <p className="text-foreground">{formatPhone(patient.phone_number)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Date of birth</p>
                    <p className="text-foreground">{patient.date_of_birth}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Patient ID</p>
                    <CopyId id={patient.patient_id} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{loading ? 'Loading patient record…' : 'Patient details'}</p>
            )}
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

                  {hasInsurance ? (
                    <DetailGroup title="Insurance">
                      <DetailField label="Provider" value={patient.insurance_provider} />
                      <DetailField label="Member ID" value={patient.insurance_member_id} />
                    </DetailGroup>
                  ) : (
                    <p className="text-sm text-muted-foreground">No insurance on file.</p>
                  )}

                  {hasEmergencyContact ? (
                    <DetailGroup title="Emergency contact">
                      <DetailField label="Name" value={patient.emergency_contact_name} />
                      <DetailField
                        label="Phone"
                        value={patient.emergency_contact_phone ? formatPhone(patient.emergency_contact_phone) : null}
                      />
                    </DetailGroup>
                  ) : (
                    <p className="text-sm text-muted-foreground">No emergency contact on file.</p>
                  )}

                  <DetailGroup title="Record metadata">
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
