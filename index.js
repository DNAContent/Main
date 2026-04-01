/**
 * Zapier Integration App
 *
 * Integration 1 — Facebook Lead Ads → Pipedrive Sequence
 *   1. TRIGGER  — New Lead from Facebook Lead Ads
 *   2. ACTION   — Create Person in Pipedrive (deduplicates by email)
 *   3. ACTION   — Add Person to Pipedrive Sequence (campaign enrollment)
 *
 * Integration 2 — Slack → Nicky's Monday.com Task Board
 *   Zap A: Slack message → Monday task
 *     1. TRIGGER  — New task-like message in Slack channel
 *     2. ACTION   — Create item on Monday.com (Nicky's task board)
 *
 *   Zap B: Distribution Studio board → Nicky's task board (mirror)
 *     1. TRIGGER  — New item assigned to Nicky on Monday.com source board
 *     2. ACTION   — Create item on Monday.com (Nicky's task board)
 *
 *   Zap C: Sync completion back to source board
 *     1. TRIGGER  — Task marked Done on Nicky's Monday.com task board
 *     2. ACTION   — Update column value on source board (e.g., "Ad Distribution" → Done)
 */

const { version: platformVersion } = require('zapier-platform-core');
const { version: packageVersion } = require('./package.json');

const { authentication, includeBearerToken } = require('./authentication');

// ── Triggers ────────────────────────────────────────────────────────────────

// Facebook Lead Ads
const newFacebookLead = require('./triggers/new_facebook_lead');

// Slack / Monday.com
const newSlackTaskMessage = require('./triggers/new_slack_message');
const mondayAssignedItem = require('./triggers/monday_assigned_item');
const mondayTaskCompleted = require('./triggers/monday_task_completed');

// ── Actions ─────────────────────────────────────────────────────────────────

// Pipedrive
const createPipedrivePerson = require('./creates/create_pipedrive_person');
const addToSequence = require('./creates/add_to_pipedrive_sequence');

// Monday.com
const createMondayItem = require('./creates/create_monday_item');
const updateMondayItemColumn = require('./creates/update_monday_item_column');

// ── Searches ─────────────────────────────────────────────────────────────────

const getPipedriveSequences = require('./searches/get_pipedrive_sequences');

// ── App definition ───────────────────────────────────────────────────────────

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
    [newSlackTaskMessage.key]: newSlackTaskMessage,
    [mondayAssignedItem.key]: mondayAssignedItem,
    [mondayTaskCompleted.key]: mondayTaskCompleted,
  },

  creates: {
    [createPipedrivePerson.key]: createPipedrivePerson,
    [addToSequence.key]: addToSequence,
    [createMondayItem.key]: createMondayItem,
    [updateMondayItemColumn.key]: updateMondayItemColumn,
  },

  searches: {
    [getPipedriveSequences.key]: getPipedriveSequences,
  },
};

module.exports = App;
