/**
 * Trigger: Task Marked as Done on Nicky's Monday.com Task Board
 *
 * Polls Nicky's personal task board for items whose Status column
 * matches the configured "done" label. Only surfaces items that were
 * originally mirrored from another board (they carry a source_board_id
 * and source_item_id in text columns). Used to trigger a sync-back
 * that updates the source board — e.g., marking the "Ad Distribution"
 * column on the Distribution Studio board as Done.
 *
 * Zapier deduplicates on `id` which combines item ID + updated_at
 * so the trigger re-fires if the same item is re-opened and re-completed.
 */

const MONDAY_API = 'https://api.monday.com/v2';

const buildCompletedItemsQuery = (boardId) => ({
  query: `
    query GetTaskBoardItems($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        name
        items_page(limit: 100) {
          items {
            id
            name
            state
            updated_at
            created_at
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `,
  variables: { boardId: String(boardId) },
});

/**
 * Poll Nicky's task board for items that are marked done AND
 * have a source board reference (meaning they came from cross-board sync).
 */
const getMondayCompletedTasks = async (z, bundle) => {
  const {
    mondayApiKey,
    nickysTaskBoardId,
    statusColumnId,
    doneLabel,
    sourceBoardIdColumnId,
    sourceItemIdColumnId,
  } = bundle.inputData;

  const targetStatusColId = statusColumnId || 'color_mm20e4gj';
  const targetDoneLabel = (doneLabel || 'Done').toLowerCase();
  const sourceBoardCol = sourceBoardIdColumnId || 'text_mm20pkn1';
  const sourceItemCol = sourceItemIdColumnId || 'text_mm20q5v5';

  const response = await z.request({
    url: MONDAY_API,
    method: 'POST',
    headers: {
      Authorization: mondayApiKey,
      'Content-Type': 'application/json',
      'API-Version': '2024-01',
    },
    body: buildCompletedItemsQuery(nickysTaskBoardId),
  });

  if (response.data.errors) {
    throw new z.errors.Error(
      `Monday.com API error: ${JSON.stringify(response.data.errors)}`
    );
  }

  const boards = response.data?.data?.boards || [];
  if (boards.length === 0) return [];

  const items = boards[0].items_page?.items || [];

  return items
    .filter((item) => {
      if (item.state !== 'active') return false;
      const statusCol = item.column_values.find(
        (col) => col.id === targetStatusColId
      );
      return statusCol && (statusCol.text || '').toLowerCase() === targetDoneLabel;
    })
    .map((item) => {
      const columns = {};
      item.column_values.forEach((col) => {
        columns[col.id] = col.text || '';
      });
      return {
        // Include updated_at in the dedup key so re-completions re-trigger
        id: `${item.id}_${item.updated_at}`,
        item_id: item.id,
        name: item.name,
        updated_at: item.updated_at,
        created_at: item.created_at,
        source_board_id: columns[sourceBoardCol] || '',
        source_item_id: columns[sourceItemCol] || '',
        columns,
      };
    })
    // Only return items that have a source reference — Slack-originated tasks
    // don't need to sync back to another board
    .filter((item) => item.source_board_id && item.source_item_id);
};

module.exports = {
  key: 'monday_task_completed',
  noun: 'Task',

  display: {
    label: "Task Marked Done on Nicky's Monday.com Task Board",
    description:
      "Triggers when Nicky marks a task as Done on his personal Monday.com task board. Only fires for tasks that were mirrored from another board (e.g., Distribution Studio), so the completion can be synced back to the source board.",

  },

  operation: {
    type: 'polling',
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
        key: 'nickysTaskBoardId',
        label: "Nicky's Task Board ID",
        type: 'string',
        required: true,
        default: '18406873751',
        helpText:
          "Nicky's Monday.com task board. Pre-filled: 18406873751.",
      },
      {
        key: 'statusColumnId',
        label: 'Status Column ID',
        type: 'string',
        required: false,
        default: 'color_mm20e4gj',
        helpText:
          'Column ID of the Task Status column on the task board. Pre-filled: color_mm20tj9.',
      },
      {
        key: 'doneLabel',
        label: 'Done Status Label',
        type: 'string',
        required: false,
        default: 'Done',
        helpText:
          'The exact label text that means a task is complete (e.g., "Done", "Complete"). Case-insensitive.',
      },
      {
        key: 'sourceBoardIdColumnId',
        label: 'Source Board ID Column ID',
        type: 'string',
        required: false,
        default: 'text_mm20pkn1',
        helpText:
          'Column ID that stores the source board ID (for sync-back). Pre-filled: text_mm20pkn1.',
      },
      {
        key: 'sourceItemIdColumnId',
        label: 'Source Item ID Column ID',
        type: 'string',
        required: false,
        default: 'text_mm20q5v5',
        helpText:
          'Column ID that stores the source item ID (for sync-back). Pre-filled: text_mm20q5v5.',
      },
    ],
    perform: getMondayCompletedTasks,
    sample: {
      id: '1234567890_2024-04-01T00:00:00Z',
      item_id: '1234567890',
      name: 'Design Q2 Ad Creative',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      source_board_id: '9876543210',
      source_item_id: '1122334455',
      columns: {
        status: 'Done',
        text: '9876543210',
        text0: '1122334455',
      },
    },
  },
};
