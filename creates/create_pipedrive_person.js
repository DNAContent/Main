/**
 * Action: Create or Update a Person in Pipedrive
 *
 * Maps the Facebook lead fields to a Pipedrive Person.
 * If a person with the same email already exists, returns the existing record
 * instead of creating a duplicate (deduplication by email).
 */

const PIPEDRIVE_API = 'https://api.pipedrive.com/v1';

/**
 * Search for an existing person by email to avoid duplicates.
 * Returns the person's id if found, null otherwise.
 */
const findExistingPerson = async (z, bundle, email) => {
  if (!email) return null;

  const response = await z.request({
    url: `${PIPEDRIVE_API}/persons/search`,
    method: 'GET',
    params: {
      term: email,
      fields: 'email',
      exact_match: true,
    },
  });

  const items = response.data?.data?.items || [];
  return items.length > 0 ? items[0].item : null;
};

/**
 * Create a new Person in Pipedrive from a Facebook lead.
 */
const createPipedrivePerson = async (z, bundle) => {
  const { full_name, first_name, last_name, email, phone, company, job_title } =
    bundle.inputData;

  const name =
    full_name ||
    `${first_name || ''} ${last_name || ''}`.trim() ||
    email ||
    'Unknown Lead';

  // Deduplication: reuse existing person if email matches
  if (email) {
    const existing = await findExistingPerson(z, bundle, email);
    if (existing) {
      z.console.log(`Person already exists in Pipedrive: ${existing.id}`);
      return { ...existing, _was_duplicate: true };
    }
  }

  const body = {
    name,
    ...(email && { email: [{ value: email, primary: true }] }),
    ...(phone && { phone: [{ value: phone, primary: true }] }),
    ...(job_title && { job_title }),
  };

  // Attach org_id if company name provided
  if (company) {
    const orgResponse = await z.request({
      url: `${PIPEDRIVE_API}/organizations/search`,
      method: 'GET',
      params: { term: company, exact_match: true },
    });

    const orgs = orgResponse.data?.data?.items || [];
    if (orgs.length > 0) {
      body.org_id = orgs[0].item.id;
    } else {
      // Create org on the fly
      const newOrg = await z.request({
        url: `${PIPEDRIVE_API}/organizations`,
        method: 'POST',
        body: { name: company },
      });
      if (newOrg.data?.data?.id) {
        body.org_id = newOrg.data.data.id;
      }
    }
  }

  const response = await z.request({
    url: `${PIPEDRIVE_API}/persons`,
    method: 'POST',
    body,
  });

  if (!response.data?.success) {
    throw new z.errors.Error(
      `Failed to create person in Pipedrive: ${JSON.stringify(response.data)}`
    );
  }

  return response.data.data;
};

module.exports = {
  key: 'create_pipedrive_person',
  noun: 'Person',

  display: {
    label: 'Create Person in Pipedrive',
    description:
      'Creates a new Person in Pipedrive from Facebook lead data. Skips creation if a person with the same email already exists.',
  },

  operation: {
    inputFields: [
      {
        key: 'full_name',
        label: 'Full Name',
        type: 'string',
        helpText: 'Maps to the Facebook lead "full_name" or "name" field.',
      },
      {
        key: 'first_name',
        label: 'First Name',
        type: 'string',
      },
      {
        key: 'last_name',
        label: 'Last Name',
        type: 'string',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'string',
        required: true,
      },
      {
        key: 'phone',
        label: 'Phone',
        type: 'string',
      },
      {
        key: 'company',
        label: 'Company Name',
        type: 'string',
        helpText: 'Creates or links to an existing Organization in Pipedrive.',
      },
      {
        key: 'job_title',
        label: 'Job Title',
        type: 'string',
      },
    ],
    perform: createPipedrivePerson,
    sample: {
      id: 1,
      name: 'Jane Sample',
      email: [{ value: 'jane.sample@example.com', primary: true }],
      phone: [{ value: '+1-555-000-0001', primary: true }],
      job_title: 'Marketing Manager',
      _was_duplicate: false,
    },
  },
};
