import { SEX_VALUES } from '../validation/normalizers';
import { FIRST_MESSAGE, SYSTEM_PROMPT } from './systemPrompt';

// Declarative Vapi assistant definition, pushed by src/scripts/vapiSetup.ts.
// Keeping it in code (not only in the Vapi dashboard) makes the agent reviewable and reproducible.

export type AssistantOptions = {
  webhookUrl: string;
  webhookSecret: string;
  model: string;
  voiceId: string;
  transcriberLanguage: string;
};

export const ASSISTANT_NAME = 'Riley - Patient Registration';

const str = (description: string) => ({ type: 'string', description });

const patientFieldProperties = {
  first_name: str('Legal first name, correctly spelled.'),
  last_name: str('Legal last name, correctly spelled (join spelled-out letters).'),
  date_of_birth: str('Date of birth in MM/DD/YYYY format.'),
  sex: { type: 'string', enum: [...SEX_VALUES], description: 'Sex as stated by the caller.' },
  phone_number: str('10-digit U.S. phone number, digits only.'),
  address_line_1: str('Street address.'),
  address_line_2: str('Apartment, suite or unit, if any.'),
  city: str('City.'),
  state: str('2-letter U.S. state abbreviation, e.g. CA.'),
  zip_code: str('5-digit ZIP or ZIP+4 (12345-6789).'),
  email: str('Email address, only if the caller provided one.'),
  insurance_provider: str('Insurance company name, only if provided.'),
  insurance_member_id: str('Insurance member/subscriber ID, letters and digits, only if provided.'),
  preferred_language: str('Preferred language, only if provided. Defaults to English.'),
  emergency_contact_name: str('Emergency contact full name, only if provided.'),
  emergency_contact_phone: str('Emergency contact 10-digit U.S. phone number, only if provided.'),
};

const REQUIRED_FIELDS = [
  'first_name', 'last_name', 'date_of_birth', 'sex', 'phone_number',
  'address_line_1', 'city', 'state', 'zip_code',
];

// request-failed covers the case where our server is unreachable: the caller still hears something.
const SAVE_FAILED = "I'm sorry, I'm having trouble reaching our system right now, so your information was not saved.";

export const buildAssistant = (opts: AssistantOptions) => {
  const server = { url: opts.webhookUrl, headers: { 'x-vapi-secret': opts.webhookSecret } };

  const tools = [
    {
      type: 'function',
      function: {
        name: 'find_patient_by_phone',
        description:
          'Look up existing patient records by phone number to detect a returning caller. Call with no arguments to use caller ID.',
        parameters: {
          type: 'object',
          properties: { phone_number: str('Optional 10-digit U.S. phone number; omit to use caller ID.') },
          required: [],
        },
      },
      server,
    },
    {
      type: 'function',
      function: {
        name: 'create_patient',
        description:
          'Save a NEW patient registration. Only call after reading all details back and the caller clearly confirmed they are correct.',
        parameters: { type: 'object', properties: patientFieldProperties, required: REQUIRED_FIELDS },
      },
      server,
      messages: [
        { type: 'request-start', content: 'One moment while I save that for you.' },
        { type: 'request-failed', content: SAVE_FAILED },
      ],
    },
    {
      type: 'function',
      function: {
        name: 'update_patient',
        description:
          'Update an EXISTING patient record. Pass patient_id from find_patient_by_phone and ONLY the fields that changed, after the caller confirmed them.',
        parameters: {
          type: 'object',
          properties: { patient_id: str('patient_id of the record to update.'), ...patientFieldProperties },
          required: ['patient_id'],
        },
      },
      server,
      messages: [
        { type: 'request-start', content: 'One moment while I update that.' },
        { type: 'request-failed', content: SAVE_FAILED },
      ],
    },
  ];

  return {
    name: ASSISTANT_NAME,
    firstMessage: FIRST_MESSAGE,
    model: {
      provider: 'openai',
      model: opts.model,
      temperature: 0.3,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }],
      tools,
    },
    // Filler injection produced audible stutters ("the the", "or or") in test calls.
    voice: { provider: 'vapi', voiceId: opts.voiceId, fillerInjectionEnabled: false },
    transcriber: { provider: 'deepgram', model: 'nova-3', language: opts.transcriberLanguage },
    server,
    serverMessages: ['tool-calls', 'end-of-call-report', 'status-update'],
    // Adds analysis.summary to the end-of-call report; stored in call_logs and shown in the dashboard.
    analysisPlan: { summaryPlan: { enabled: true } },
    endCallFunctionEnabled: true,
    endCallMessage: 'Thanks for calling Sunrise Health Clinic. Take care!',
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 900,
    backgroundSound: 'office',
  };
};
