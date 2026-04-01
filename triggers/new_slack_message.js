/**
 * Trigger: New Task-Like Message in Slack Channel
 *
 * Polls a Slack channel for new messages and filters for ones
 * that sound like tasks (assignments, action items, requests).
 * Used as the first step in the Slack → Monday.com task creation Zap.
 */

const SLACK_API = 'https://slack.com/api';

/**
 * Detect if a Slack message sounds like a task or assignment.
 * Scores the message against common task-language patterns.
 * Returns true if the score meets the threshold (2+).
 */
const isTaskLike = (text) => {
  if (!text) return false;

  const lower = text.toLowerCase();

  const taskPatterns = [
    /\bcan you\b/,
    /\bcould you\b/,
    /\bwould you\b/,
    /\bplease\b/,
    /\bneed (to|you to)\b/,
    /\bneeds? to\b/,
    /\bmake sure\b/,
    /\bdon'?t forget\b/,
    /\breminder\b/,
    /\btask\b/,
    /\baction item\b/,
    /\bto-?do\b/,
    /\basap\b/,
    /\burgent\b/,
    /\bdeadline\b/,
    /\bby (eod|eow|tomorrow|monday|tuesday|wednesday|thursday|friday|end of)\b/,
    /\bdue (date|by|on)\b/,
    /\bfollow[- ]?up\b/,
    /\bschedule\b/,
    /\bprepare\b/,
    /\bsubmit\b/,
    /\bsend (me|us|him|her|them|over|the)\b/,
    /\bupload\b/,
    /\bupdate\b/,
    /\bcreate\b/,
    /\bbuild\b/,
    /\breview\b/,
    /\bcheck\b/,
    /\bfix\b/,
    /\blaunch\b/,
    /\bpost\b/,
    /\bpublish\b/,
  ];

  let score = 0;
  for (const pattern of taskPatterns) {
    if (pattern.test(lower)) score++;
  }

  // Boost score if Nicky is directly mentioned
  if (/\bnicky\b/.test(lower) || /\bmedia buyer\b/.test(lower)) score += 2;

  // Threshold: 2 or more signals = task-like
  return score >= 2;
};

/**
 * Derive a short task name from the raw Slack message text.
 * Strips Slack mention/emoji markup and takes the first line up to 100 chars.
 */
const deriveTaskName = (text) => {
  if (!text) return 'New Task from Slack';
  return text
    .split('\n')[0]
    .replace(/<[^>]+>/g, '')   // strip <@USER>, <#CHANNEL>, <URL> etc.
    .replace(/:[a-z0-9_]+:/g, '') // strip :emoji:
    .trim()
    .substring(0, 100) || 'New Task from Slack';
};

/**
 * Poll the Slack channel for new task-like messages.
 * Zapier deduplicates on the `id` field (the message timestamp).
 */
const getSlackMessages = async (z, bundle) => {
  const { slackBotToken, channelId } = bundle.inputData;

  // Fetch messages from the past 24 hours on each poll to avoid gaps
  const oldest = bundle.meta.isLoadingSample
    ? undefined
    : String(Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000));

  const params = { channel: channelId, limit: 50 };
  if (oldest) params.oldest = oldest;

  const response = await z.request({
    url: `${SLACK_API}/conversations.history`,
    method: 'GET',
    headers: { Authorization: `Bearer ${slackBotToken}` },
    params,
  });

  if (!response.data.ok) {
    throw new z.errors.Error(
      `Slack API error: ${response.data.error || 'unknown_error'}`
    );
  }

  const messages = response.data.messages || [];

  // Exclude bot messages, system subtypes, thread replies, and non-task messages
  return messages
    .filter(
      (msg) =>
        !msg.subtype &&
        !msg.thread_ts &&
        isTaskLike(msg.text)
    )
    .map((msg) => ({
      id: msg.ts,
      ts: msg.ts,
      channel_id: channelId,
      text: msg.text || '',
      user: msg.user || msg.bot_id || 'unknown',
      created_time: new Date(parseFloat(msg.ts) * 1000).toISOString(),
      task_name: deriveTaskName(msg.text),
    }));
};

module.exports = {
  key: 'new_slack_task_message',
  noun: 'Message',

  display: {
    label: 'New Task-Like Message in Slack Channel',
    description:
      'Triggers when a new message posted to a Slack channel sounds like a task or assignment (e.g., "Can you…", "Please…", "Need to…"). Used to auto-create items on a Monday.com task board.',
    important: true,
  },

  operation: {
    type: 'polling',
    inputFields: [
      {
        key: 'slackBotToken',
        label: 'Slack Bot Token',
        type: 'password',
        required: true,
        helpText:
          'Your Slack Bot User OAuth Token (starts with xoxb-). The bot needs `channels:history` and `channels:read` scopes. Create a Slack app at api.slack.com/apps and invite the bot to the channel.',
      },
      {
        key: 'channelId',
        label: 'Slack Channel ID',
        type: 'string',
        required: true,
        helpText:
          'The ID of the Slack channel to monitor (e.g., C01234ABCD). Right-click the channel in Slack → "Copy link" — the ID is the last path segment of the URL.',
      },
    ],
    perform: getSlackMessages,
    sample: {
      id: '1712000000.000100',
      ts: '1712000000.000100',
      channel_id: 'C01234ABCD',
      text: 'Hey Nicky, can you please update the ad creatives for the Q2 campaign by EOD Friday?',
      user: 'U09876WXYZ',
      created_time: new Date().toISOString(),
      task_name: 'Hey Nicky, can you please update the ad creatives for the Q2 campaign by EOD Friday?',
    },
  },
};
