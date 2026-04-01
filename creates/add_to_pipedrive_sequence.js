/**
 * Action: Add a Person to a Pipedrive Sequence (Campaigns)
 *
 * Uses the Pipedrive Campaigns API to subscribe a person to a
 * specific email sequence/campaign.
 *
 * Requires the Pipedrive Campaigns add-on to be active on the account.
 * API docs: https://developers.pipedrive.com/docs/api/v1/Campaigns
 */

const PIPEDRIVE_API = 'https://api.pipedrive.com/v1';

/**
 * Fetch all available Pipedrive sequences/campaigns for the dropdown.
 */
const getPipedriveSequences = async (z, bundle) => {
  const response = await z.request({
    url: `${PIPEDRIVE_API}/campaigns`,
    method: 'GET',
    params: { status: 'active', limit: 100 },
  });

  const campaigns = response.data?.data || [];
  return campaigns.map((c) => ({ id: String(c.id), label: c.name }));
};

/**
 * Subscribe a Pipedrive Person to a sequence/campaign.
 */
const addToSequence = async (z, bundle) => {
  const { personId, sequenceId } = bundle.inputData;

  if (!personId) {
    throw new z.errors.Error('Person ID is required to enroll in a sequence.');
  }
  if (!sequenceId) {
    throw new z.errors.Error('Sequence ID is required.');
  }

  // Subscribe the person to the campaign
  const response = await z.request({
    url: `${PIPEDRIVE_API}/campaigns/${sequenceId}/subscriptions`,
    method: 'POST',
    body: {
      person_id: Number(personId),
    },
  });

  if (!response.data?.success) {
    throw new z.errors.Error(
      `Failed to enroll person ${personId} in sequence ${sequenceId}: ${JSON.stringify(
        response.data
      )}`
    );
  }

  return {
    id: `${sequenceId}-${personId}`,
    person_id: Number(personId),
    sequence_id: Number(sequenceId),
    enrolled_at: new Date().toISOString(),
    status: 'enrolled',
  };
};

module.exports = {
  key: 'add_to_pipedrive_sequence',
  noun: 'Sequence Enrollment',

  display: {
    label: 'Add Person to Pipedrive Sequence',
    description:
      'Subscribes a Pipedrive Person to a specific email sequence (campaign). Requires the Pipedrive Campaigns add-on.',

  },

  operation: {
    inputFields: [
      {
        key: 'personId',
        label: 'Person ID',
        type: 'integer',
        required: true,
        helpText:
          'The Pipedrive Person ID. Use the output from the "Create Person in Pipedrive" step.',
      },
      {
        key: 'sequenceId',
        label: 'Sequence / Campaign',
        type: 'string',
        required: true,
        dynamic: 'get_pipedrive_sequences.id.label',
        helpText:
          'Select the Pipedrive sequence (campaign) to enroll the lead in.',
      },
    ],
    perform: addToSequence,
    sample: {
      id: '42-101',
      person_id: 101,
      sequence_id: 42,
      enrolled_at: new Date().toISOString(),
      status: 'enrolled',
    },
  },
};
