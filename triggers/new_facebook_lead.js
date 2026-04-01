/**
 * Trigger: New Lead from Facebook Lead Ads
 *
 * Uses Facebook's Lead Ads API to poll for new leads submitted
 * through a specific form on a Facebook Page.
 *
 * Required Facebook permissions: leads_retrieval, pages_manage_ads,
 * pages_read_engagement, ads_management
 */

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v19.0';

/**
 * Fetch new leads from a Facebook Lead Ads form.
 * Zapier calls this on each poll interval (every ~5 minutes).
 */
const getFacebookLeads = async (z, bundle) => {
  const { formId, pageAccessToken } = bundle.inputData;

  const response = await z.request({
    url: `${FACEBOOK_GRAPH_API}/${formId}/leads`,
    method: 'GET',
    params: {
      access_token: pageAccessToken,
      fields: 'id,created_time,field_data',
    },
  });

  const leads = response.data.data || [];

  return leads.map((lead) => {
    const fields = {};
    (lead.field_data || []).forEach(({ name, values }) => {
      fields[name] = values && values.length > 0 ? values[0] : null;
    });

    return {
      id: lead.id,
      created_time: lead.created_time,
      // Normalized common fields — Facebook form field names vary by form setup
      full_name: fields.full_name || fields.name || `${fields.first_name || ''} ${fields.last_name || ''}`.trim() || null,
      first_name: fields.first_name || null,
      last_name: fields.last_name || null,
      email: fields.email || null,
      phone: fields.phone_number || fields.phone || null,
      company: fields.company_name || fields.company || null,
      job_title: fields.job_title || null,
      // All raw field_data in case the form has custom questions
      raw_fields: fields,
    };
  });
};

/**
 * Sample lead returned during Zap setup so the user can map fields.
 */
const getFacebookLeadsSample = async (z, bundle) => {
  const results = await getFacebookLeads(z, bundle);
  return results.length > 0 ? results : [
    {
      id: 'sample_lead_001',
      created_time: new Date().toISOString(),
      full_name: 'Jane Sample',
      first_name: 'Jane',
      last_name: 'Sample',
      email: 'jane.sample@example.com',
      phone: '+1-555-000-0001',
      company: 'Acme Corp',
      job_title: 'Marketing Manager',
      raw_fields: {},
    },
  ];
};

module.exports = {
  key: 'new_facebook_lead',
  noun: 'Lead',

  display: {
    label: 'New Lead from Facebook Lead Ads',
    description:
      'Triggers when a new lead is submitted through a Facebook Lead Ad form.',

  },

  operation: {
    type: 'polling',
    inputFields: [
      {
        key: 'pageAccessToken',
        label: 'Facebook Page Access Token',
        type: 'password',
        required: true,
        helpText:
          'A long-lived Page Access Token with `leads_retrieval` and `pages_read_engagement` permissions. Generate one from the Facebook Developer Console.',
      },
      {
        key: 'formId',
        label: 'Lead Form ID',
        type: 'string',
        required: true,
        helpText:
          'The numeric ID of your Facebook Lead Ad form. Find it in Meta Business Suite → Instant Forms.',
      },
    ],
    perform: getFacebookLeads,
    sample: {
      id: 'sample_lead_001',
      created_time: new Date().toISOString(),
      full_name: 'Jane Sample',
      first_name: 'Jane',
      last_name: 'Sample',
      email: 'jane.sample@example.com',
      phone: '+1-555-000-0001',
      company: 'Acme Corp',
      job_title: 'Marketing Manager',
      raw_fields: {},
    },
  },
};
