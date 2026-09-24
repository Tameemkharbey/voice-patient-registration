import { motion } from 'framer-motion';
import type * as React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ageFromUsDate, formatPhone, initials, relativeTime } from '@/lib/format';
import type { Patient } from '@/lib/types';

type PatientTableProps = {
  patients: Patient[];
  onSelect: (patient: Patient) => void;
};

export const PatientTable = ({ patients, onSelect }: PatientTableProps): React.JSX.Element => (
  <div className="overflow-hidden rounded-lg border border-border">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Patient</th>
            <th scope="col" className="px-4 py-3 font-medium">Date of birth</th>
            <th scope="col" className="px-4 py-3 font-medium">Phone</th>
            <th scope="col" className="px-4 py-3 font-medium hidden md:table-cell">Location</th>
            <th scope="col" className="px-4 py-3 font-medium">Insurance</th>
            <th scope="col" className="px-4 py-3 font-medium text-right">Registered</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {patients.map((patient, index) => {
            const age = ageFromUsDate(patient.date_of_birth);
            return (
              <motion.tr
                key={patient.patient_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                onClick={() => onSelect(patient)}
                tabIndex={0}
                role="button"
                aria-label={`View details for ${patient.first_name} ${patient.last_name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(patient);
                  }
                }}
                className="cursor-pointer transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar initials={initials(patient.first_name, patient.last_name)} seed={patient.patient_id} />
                    <div>
                      <p className="font-medium text-foreground">
                        {patient.first_name} {patient.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{patient.email ?? 'No email on file'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {patient.date_of_birth}
                  {age !== null && <span className="ml-1 text-xs">({age}y)</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatPhone(patient.phone_number)}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {patient.city}, {patient.state}
                </td>
                <td className="px-4 py-3">
                  {patient.insurance_provider ? (
                    <Badge variant="success">{patient.insurance_provider}</Badge>
                  ) : (
                    <Badge variant="outline">Self-pay</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{relativeTime(patient.created_at)}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);
