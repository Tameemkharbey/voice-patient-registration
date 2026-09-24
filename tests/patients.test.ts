import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db/connection';

const valid = {
  first_name: 'Jane',
  last_name: 'Davis',
  date_of_birth: '04/12/1988',
  sex: 'female',
  phone_number: '+1 (415) 555-0142',
  address_line_1: '742 Evergreen Terrace',
  city: 'San Francisco',
  state: 'California',
  zip_code: '94110',
};

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  app = createApp(openDatabase(':memory:'));
});

const create = (body: object = valid) => request(app).post('/patients').send(body);

describe('POST /patients', () => {
  it('creates a patient, normalizes fields and applies defaults', async () => {
    const res = await create();
    expect(res.status).toBe(201);
    expect(res.body.error).toBeNull();
    expect(res.body.data).toMatchObject({
      sex: 'Female',
      phone_number: '4155550142',
      state: 'CA',
      date_of_birth: '04/12/1988',
      preferred_language: 'English',
      email: null,
    });
    expect(res.body.data.patient_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns 422 with field details for invalid values', async () => {
    const res = await create({ ...valid, phone_number: '555', date_of_birth: '01/01/2999', zip_code: '1234' });
    expect(res.status).toBe(422);
    expect(res.body.data).toBeNull();
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['phone_number', 'date_of_birth', 'zip_code']));
  });

  it('rejects impossible calendar dates', async () => {
    const res = await create({ ...valid, date_of_birth: '02/30/1990' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when required fields are missing', async () => {
    const { city: _city, ...rest } = valid;
    const res = await create(rest);
    expect(res.status).toBe(422);
    expect(res.body.error.details).toContainEqual({ field: 'city', message: 'city is required' });
  });

  it('returns 400 for unknown fields and malformed JSON', async () => {
    expect((await create({ ...valid, ssn: '123' })).status).toBe(400);
    const malformed = await request(app).post('/patients').set('Content-Type', 'application/json').send('{bad');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('GET /patients', () => {
  it('filters by last_name, date_of_birth and phone_number', async () => {
    await create();
    await create({ ...valid, first_name: 'Bob', last_name: 'Smith', phone_number: '3125550199' });

    const byName = await request(app).get('/patients?last_name=davis');
    expect(byName.body.data).toHaveLength(1);

    const byDob = await request(app).get('/patients?date_of_birth=04/12/1988');
    expect(byDob.body.data).toHaveLength(2);

    const byPhone = await request(app).get('/patients?phone_number=312-555-0199');
    expect(byPhone.body.data[0].first_name).toBe('Bob');
  });

  it('returns 400 for a malformed filter', async () => {
    expect((await request(app).get('/patients?date_of_birth=yesterday')).status).toBe(400);
  });
});

describe('GET/PUT/DELETE /patients/:id', () => {
  it('reads, partially updates and soft-deletes a patient', async () => {
    const id = (await create()).body.data.patient_id;

    expect((await request(app).get(`/patients/${id}`)).body.data.first_name).toBe('Jane');

    const updated = await request(app).put(`/patients/${id}`).send({ last_name: 'Davies', email: 'JANE@Example.com' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ last_name: 'Davies', email: 'jane@example.com', city: 'San Francisco' });

    const deleted = await request(app).delete(`/patients/${id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data.deleted_at).toBeTruthy();

    expect((await request(app).get(`/patients/${id}`)).status).toBe(404);
    expect((await request(app).get('/patients')).body.data).toHaveLength(0);
    expect((await request(app).delete(`/patients/${id}`)).status).toBe(404);
  });

  it('validates ids and update payloads', async () => {
    const id = (await create()).body.data.patient_id;
    expect((await request(app).get('/patients/not-a-uuid')).status).toBe(400);
    expect((await request(app).get('/patients/00000000-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await request(app).put(`/patients/${id}`).send({})).status).toBe(400);
    expect((await request(app).put(`/patients/${id}`).send({ first_name: null })).status).toBe(422);
    expect((await request(app).put(`/patients/${id}`).send({ state: 'ZZ' })).status).toBe(422);
  });
});

describe('ZIP / state consistency', () => {
  it('rejects a ZIP that belongs to another state on create and update', async () => {
    const res = await create({ ...valid, city: 'New York', state: 'NY', zip_code: '17800' });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ field: 'zip_code', message: 'zip_code 17800 does not belong to state NY' }]);

    const id = (await create()).body.data.patient_id;
    expect((await request(app).put(`/patients/${id}`).send({ state: 'NY' })).status).toBe(422);
    const moved = await request(app).put(`/patients/${id}`).send({ city: 'New York', state: 'NY', zip_code: '10001' });
    expect(moved.status).toBe(200);
  });
});
