// STRICT tables enforce column types; CHECK constraints mirror the core validation
// rules so the database rejects bad rows even if a caller bypasses the service layer.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS patients (
  patient_id              TEXT PRIMARY KEY CHECK (length(patient_id) = 36),
  first_name              TEXT NOT NULL CHECK (length(first_name) BETWEEN 1 AND 50),
  last_name               TEXT NOT NULL CHECK (length(last_name) BETWEEN 1 AND 50),
  date_of_birth           TEXT NOT NULL CHECK (date_of_birth GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  sex                     TEXT NOT NULL CHECK (sex IN ('Male', 'Female', 'Other', 'Decline to Answer')),
  phone_number            TEXT NOT NULL CHECK (length(phone_number) = 10 AND phone_number NOT GLOB '*[^0-9]*'),
  email                   TEXT,
  address_line_1          TEXT NOT NULL CHECK (length(address_line_1) BETWEEN 1 AND 100),
  address_line_2          TEXT,
  city                    TEXT NOT NULL CHECK (length(city) BETWEEN 1 AND 100),
  state                   TEXT NOT NULL CHECK (length(state) = 2),
  zip_code                TEXT NOT NULL CHECK (
                            zip_code GLOB '[0-9][0-9][0-9][0-9][0-9]'
                            OR zip_code GLOB '[0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9]'),
  insurance_provider      TEXT,
  insurance_member_id     TEXT,
  preferred_language      TEXT NOT NULL DEFAULT 'English',
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT CHECK (
                            emergency_contact_phone IS NULL
                            OR (length(emergency_contact_phone) = 10 AND emergency_contact_phone NOT GLOB '*[^0-9]*')),
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  deleted_at              TEXT
) STRICT;

CREATE INDEX IF NOT EXISTS idx_patients_phone     ON patients (phone_number)                 WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_last_name ON patients (last_name COLLATE NOCASE)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_patients_dob       ON patients (date_of_birth)                WHERE deleted_at IS NULL;
`;
