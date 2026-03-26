/**
 * Zapier Integration: Facebook Lead Ads → Pipedrive Sequence
 *
 * Zap flow:
 *   1. TRIGGER  — New Lead from Facebook Lead Ads
 *   2. ACTION   — Create Person in Pipedrive  (deduplicates by email)
 *   3. ACTION   — Add Person to Pipedrive Sequence (campaign enrollment)
 */

const { version: platformVersion } = require('zapier-platform-core');
const { version: packageVersion } = require('./package.json');

const { authentication, includeBearerToken } = require('./authentication');

// Trigger
const newFacebookLead = require('./triggers/new_facebook_lead');

// Actions
const createPipedrivePerson = require('./creates/create_pipedrive_person');
const addToSequence = require('./creates/add_to_pipedrive_sequence');

// Dynamic dropdown search
const getPipedriveSequences = require('./searches/get_pipedrive_sequences');

const App = {
  version: packageVersion,
  platformVersion,

  authentication,

  beforeRequest: [includeBearerToken],

  afterResponse: [
    (response, z) => {
      if (response.status === 401) {
        throw new z.errors.RefreshAuthError();
      }
      return response;
    },
  ],

  triggers: {
    [newFacebookLead.key]: newFacebookLead,
  },

  creates: {
    [createPipedrivePerson.key]: createPipedrivePerson,
    [addToSequence.key]: addToSequence,
  },

  searches: {
    [getPipedriveSequences.key]: getPipedriveSequences,
  },
};

module.exports = App;
