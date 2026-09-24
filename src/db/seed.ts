import { config } from '../config/env';
import { log } from '../lib/logger';
import { createPatientService } from '../services/patientService';
import { openDatabase } from './connection';
import { createPatientRepository } from './patientRepository';

// Fictional demo records; skipped if a patient with the same phone already exists.
const SEED_PATIENTS = [
  {
    first_name: 'Jane',
    last_name: 'Doe',
    date_of_birth: '04/12/1988',
    sex: 'Female',
    phone_number: '(415) 555-0142',
    email: 'jane.doe@example.com',
    address_line_1: '742 Evergreen Terrace',
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94110',
    insurance_provider: 'Blue Shield of California',
    insurance_member_id: 'BSC123456789',
  },
  {
    first_name: 'Carlos',
    last_name: "O'Neil-Ramirez",
    date_of_birth: '11/02/1975',
    sex: 'Male',
    phone_number: '312-555-0199',
    address_line_1: '1200 N Lake Shore Dr',
    address_line_2: 'Apt 14B',
    city: 'Chicago',
    state: 'IL',
    zip_code: '60610-2201',
    preferred_language: 'Spanish',
    emergency_contact_name: 'Maria Ramirez',
    emergency_contact_phone: '312-555-0123',
  },
];

const db = openDatabase(config.dbPath);
const service = createPatientService(createPatientRepository(db));

for (const patient of SEED_PATIENTS) {
  if (service.findByPhone(patient.phone_number).length > 0) {
    log.info('seed.skipped', { phone_number: patient.phone_number });
    continue;
  }
  service.create(patient);
}
db.close();
