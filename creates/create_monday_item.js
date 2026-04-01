/**
 * Action: Create an Item on a Monday.com Board
 *
 * Creates a new task item on a specified Monday.com board (Nicky's task board).
 * Handles two source types:
 *   - Slack-originated: stores channel ID and message timestamp for reference
 *   - Cross-board mirror: stores source_board_id and source_item_id so that
 *     when Nicky marks the task done, the completion can sync back to the
 *     original board (e.g., Distribution Studio).
 *
 * Column ID conventions used on Nicky's task board:
 *   status    → Status (working on it / done / stuck)
 *   text      → Source Board ID  (for cross-board sync back)
 *   text0     → Source Item ID   (for cross-board sync back)
 *   text1     → Source Board Name (human-readable label)
 *   text2     → Slack Channel ID  (for Slack-sourced tasks)
 *   text3     → Slack Message Timestamp
 *   long_text → Notes / full Slack message body
 */

const MONDAY_API = 'https://api.monday.com/v2';

const createMondayItem = async (z, bundle) => {
  const {
    mondayApiKey,
    boardId,
    groupId,
    itemName,
    statusLabel,
    sourceBoardId,
    sourceItemId,
    sourceBoardName,
    slackChannelId,
    slackMessageTs,
    notes,
  } = bundle.inputData;

  // Build the column_values JSON for the Monday.com mutation
  const columnValues = {};

  if (statusLabel) {
    columnValues['status'] = { label: statusLabel };
  }

  // Cross-board sync metadata — written when item is mirrored from another board
  if (sourceBoardId) columnValues['text'] = sourceBoardId;
  if (sourceItemId) columnValues['text0'] = sourceItemId;
  if (sourceBoardName) columnValues['text1'] = sourceBoardName;

  // Slack source metadata — written when item comes from a Slack message
  if (slackChannelId) columnValues['text2'] = slackChannelId;
  if (slackMessageTs) columnValues['text3'] = slackMessageTs;

  if (notes) columnValues['long_text'] = { text: notes };

  const mutation = {
    query: `
      mutation CreateItem(
        $boardId: ID!
        $groupId: String
        $itemName: String!
        $columnValues: JSON!
      ) {
        create_item(
          board_id: $boardId
          group_id: $groupId
          item_name: $itemName
          column_values: $columnValues
        ) {
          id
          name
          created_at
          board {
            id
            name
          }
        }
      }
    `,
    variables: {
      boardId: String(boardId),
      groupId: groupId || undefined,
      itemName: String(itemName),
      columnValues: JSON.stringify(columnValues),
    },
  };

  const response = await z.request({
    url: MONDAY_API,
    method: 'POST',
    headers: {
      Authorization: mondayApiKey,
      'Content-Type': 'application/json',
      'API-Version': '2024-01',
    },
    body: mutation,
  });

  if (response.data.errors) {
    throw new z.errors.Error(
      `Monday.com API error: ${JSON.stringify(response.data.errors)}`
    );
  }

  const item = response.data?.data?.create_item;
  if (!item) {
    throw new z.errors.Error('Monday.com did not return the created item.');
  }

  return {
    id: item.id,
    name: item.name,
    created_at: item.created_at,
    board_id: item.board?.id,
    board_name: item.board?.name,
  };
};

module.exports = {
  key: 'create_monday_item',
  noun: 'Item',

  display: {
    label: 'Create Item on Monday.com Board',
    description:
      "Creates a new task item on a Monday.com board (Nicky's task board). Stores source metadata so tasks from other boards or Slack can be tracked and synced back when completed.",
  },

  operation: {
    inputFields: [
      {
        key: 'mondayApiKey',
        label: 'Monday.com API Key',
        type: 'password',
        required: true,
        helpText:
          'Your Monday.com API v2 token. Find it under Profile → Developers → API → My Access Tokens.',
      },
      {
        key: 'boardId',
        label: "Target Board ID (Nicky's Task Board)",
        type: 'string',
        required: true,
        helpText:
          "The numeric ID of Nicky's Monday.com task board. Find it in the board URL: monday.com/boards/XXXXXXXXXX.",
      },
      {
        key: 'groupId',
        label: 'Group ID',
        type: 'string',
        required: false,
        helpText:
          'The ID of the group (section) within the board to add the item to. Leave blank to use the top group.',
      },
      {
        key: 'itemName',
        label: 'Task Name',
        type: 'string',
        required: true,
        helpText:
          'The name of the task to create. For Slack-sourced tasks, map the "task_name" field from the Slack trigger.',
      },
      {
        key: 'statusLabel',
        label: 'Initial Status',
        type: 'string',
        required: false,
        default: 'Not Started',
        helpText:
          'The initial status label (e.g., "Not Started", "Working on it"). Must match a valid label defined in the Status column.',
      },
      {
        key: 'sourceBoardId',
        label: 'Source Board ID',
        type: 'string',
        required: false,
        helpText:
          'If mirroring from another Monday.com board, map the "source_board_id" field here. Required for sync-back when Nicky marks the task done.',
      },
      {
        key: 'sourceItemId',
        label: 'Source Item ID',
        type: 'string',
        required: false,
        helpText:
          'If mirroring from another Monday.com board, map the "source_item_id" field here. Required for sync-back.',
      },
      {
        key: 'sourceBoardName',
        label: 'Source Board Name',
        type: 'string',
        required: false,
        helpText:
          'Human-readable name of the source board (e.g., "Distribution Studio"). Stored for display purposes.',
      },
      {
        key: 'slackChannelId',
        label: 'Slack Channel ID',
        type: 'string',
        required: false,
        helpText:
          'If this task came from a Slack message, map the "channel_id" field from the Slack trigger here.',
      },
      {
        key: 'slackMessageTs',
        label: 'Slack Message Timestamp',
        type: 'string',
        required: false,
        helpText:
          'If this task came from a Slack message, map the "ts" field from the Slack trigger here.',
      },
      {
        key: 'notes',
        label: 'Notes / Description',
        type: 'text',
        required: false,
        helpText:
          'Additional notes or the full Slack message text. Stored in the long text column.',
      },
    ],
    perform: createMondayItem,
    sample: {
      id: '1234567890',
      name: 'Update Q2 Ad Creatives',
      created_at: new Date().toISOString(),
      board_id: '9876543210',
      board_name: "Nicky's Task Board",
    },
  },
};
