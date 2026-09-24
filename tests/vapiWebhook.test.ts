import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { openDatabase, type Database } from '../src/db/connection';

const SECRET = 'test-secret';
const CALL = { id: 'call-1', customer: { number: '+14155550142' } };

const patient = {
  first_name: 'Jane',
  last_name: 'Davis',
  date_of_birth: '04/12/1988',
  sex: 'Female',
  phone_number: '4155550142',
  address_line_1: '742 Evergreen Terrace',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94110',
};

let db: Database;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  db = openDatabase(':memory:');
  app = createApp(db, SECRET);
});

const toolCall = (name: string, parameters: object) =>
  request(app)
    .post('/vapi/webhook')
    .set('x-vapi-secret', SECRET)
    .send({ message: { type: 'tool-calls', call: CALL, toolCallList: [{ id: 'tc-1', name, parameters }] } });

const resultOf = (res: request.Response) => JSON.parse(res.body.results[0].result);

describe('Vapi webhook', () => {
  it('rejects requests without the shared secret', async () => {
    const res = await request(app).post('/vapi/webhook').send({ message: { type: 'tool-calls' } });
    expect(res.status).toBe(401);
  });

  it('finds no record for a new caller, using caller ID by default', async () => {
    const res = await toolCall('find_patient_by_phone', {});
    expect(res.body.results[0].toolCallId).toBe('tc-1');
    expect(resultOf(res).status).toBe('not_found');
  });

  it('creates a patient, then recognizes the returning caller', async () => {
    expect(resultOf(await toolCall('create_patient', patient)).status).toBe('success');
    const found = resultOf(await toolCall('find_patient_by_phone', {}));
    expect(found.status).toBe('found');
    expect(found.patients[0]).toMatchObject({ first_name: 'Jane', last_name: 'Davis' });
  });

  it('does not create a duplicate when create_patient is retried', async () => {
    await toolCall('create_patient', patient);
    const retry = resultOf(await toolCall('create_patient', patient));
    expect(retry.status).toBe('already_exists');
    expect((await request(app).get('/patients')).body.data).toHaveLength(1);
  });

  it('returns field-specific validation errors so the agent re-prompts one field', async () => {
    const result = resultOf(await toolCall('create_patient', { ...patient, date_of_birth: '01/01/2999' }));
    expect(result.status).toBe('validation_error');
    expect(result.errors).toEqual([{ field: 'date_of_birth', message: 'date_of_birth cannot be in the future' }]);
  });

  it('updates a returning patient with only the changed fields', async () => {
    const created = resultOf(await toolCall('create_patient', patient));
    const updated = resultOf(
      await toolCall('update_patient', { patient_id: created.patient.patient_id, last_name: 'Davies' }),
    );
    expect(updated.status).toBe('success');
    expect(updated.patient.last_name).toBe('Davies');
  });

  it('turns a database failure into a spoken system_error, never silence', async () => {
    db.close();
    const res = await toolCall('create_patient', patient);
    expect(res.status).toBe(200);
    const result = resultOf(res);
    expect(result.status).toBe('system_error');
    expect(result.instruction).toMatch(/not saved/i);
  });

  it('stores the end-of-call transcript linked to the registered patient', async () => {
    const created = resultOf(await toolCall('create_patient', patient));
    await request(app)
      .post('/vapi/webhook')
      .set('x-vapi-secret', SECRET)
      .send({
        message: {
          type: 'end-of-call-report',
          call: CALL,
          endedReason: 'customer-ended-call',
          artifact: { transcript: 'AI: Hi. User: Hello.' },
          analysis: { summary: 'Registered Jane Davis.' },
        },
      })
      .expect(200);
    const calls = await request(app).get(`/patients/${created.patient.patient_id}/calls`);
    expect(calls.body.data[0]).toMatchObject({ call_id: 'call-1', transcript: 'AI: Hi. User: Hello.' });
  });
});
