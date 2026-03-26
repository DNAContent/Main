/**
 * Search/Dynamic Dropdown: List Pipedrive Sequences (Campaigns)
 *
 * Powers the dynamic dropdown in the "Add to Sequence" action
 * so users can pick a sequence by name instead of entering a raw ID.
 */

const PIPEDRIVE_API = 'https://api.pipedrive.com/v1';

const listSequences = async (z, bundle) => {
  const response = await z.request({
    url: `${PIPEDRIVE_API}/campaigns`,
    method: 'GET',
    params: { status: 'active', limit: 100 },
  });

  const campaigns = response.data?.data || [];
  return campaigns.map((c) => ({
    id: String(c.id),
    label: c.name,
    status: c.status,
    created_at: c.created_at,
  }));
};

module.exports = {
  key: 'get_pipedrive_sequences',
  noun: 'Sequence',

  display: {
    label: 'Find Pipedrive Sequences',
    description: 'Lists all active Pipedrive email sequences (campaigns).',
    hidden: true, // Used only as a dynamic dropdown source
  },

  operation: {
    inputFields: [],
    perform: listSequences,
    sample: {
      id: '42',
      label: 'Onboarding Sequence',
      status: 'active',
      created_at: '2024-01-15T10:00:00Z',
    },
  },
};
