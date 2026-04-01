/**
 * Action: Update a Column Value on a Monday.com Board Item
 *
 * Updates a single column (e.g., the "Ad Distribution" status column) on a
 * specific item in a Monday.com board. Used as the final step in the
 * sync-back Zap: when Nicky marks a task Done on his personal task board,
 * this action updates the corresponding column on the source board
 * (e.g., Distribution Studio) so both boards stay in sync.
 */

const MONDAY_API = 'https://api.monday.com/v2';

const updateMondayItemColumn = async (z, bundle) => {
  const { mondayApiKey, boardId, itemId, columnId, statusLabel } =
    bundle.inputData;

  const mutation = {
    query: `
      mutation UpdateColumnValue(
        $boardId: ID!
        $itemId: ID!
        $columnId: String!
        $value: JSON!
      ) {
        change_column_value(
          board_id: $boardId
          item_id: $itemId
          column_id: $columnId
          value: $value
        ) {
          id
          name
          updated_at
          board {
            id
            name
          }
        }
      }
    `,
    variables: {
      boardId: String(boardId),
      itemId: String(itemId),
      columnId: String(columnId),
      value: JSON.stringify({ label: statusLabel }),
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

  const item = response.data?.data?.change_column_value;
  if (!item) {
    throw new z.errors.Error('Monday.com did not return the updated item.');
  }

  return {
    id: item.id,
    name: item.name,
    updated_at: item.updated_at,
    board_id: item.board?.id,
    board_name: item.board?.name,
    column_id: columnId,
    new_value: statusLabel,
  };
};

module.exports = {
  key: 'update_monday_item_column',
  noun: 'Item',

  display: {
    label: 'Update Column Value on Monday.com Item',
    description:
      "Updates a specific column on a Monday.com item — for example, marking the 'Ad Distribution' status column as Done on the Distribution Studio board when Nicky completes the task on his personal task board.",
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
        label: 'Source Board ID',
        type: 'string',
        required: true,
        helpText:
          'The numeric ID of the source board containing the item to update (e.g., Distribution Studio). Map the "source_board_id" field from the task-completed trigger.',
      },
      {
        key: 'itemId',
        label: 'Source Item ID',
        type: 'string',
        required: true,
        helpText:
          'The numeric ID of the item on the source board to update. Map the "source_item_id" field from the task-completed trigger.',
      },
      {
        key: 'columnId',
        label: 'Column ID to Update',
        type: 'string',
        required: true,
        default: 'ad_distribution',
        helpText:
          'The ID of the column to update on the source board (e.g., the "Ad Distribution" status column). Find column IDs via the Monday.com API playground or by opening the column settings.',
      },
      {
        key: 'statusLabel',
        label: 'New Status Value',
        type: 'string',
        required: true,
        default: 'Done',
        helpText:
          'The status label to set (e.g., "Done"). Must exactly match a label configured in that column\'s settings on the source board.',
      },
    ],
    perform: updateMondayItemColumn,
    sample: {
      id: '1122334455',
      name: 'Design Q2 Ad Creative',
      updated_at: new Date().toISOString(),
      board_id: '9876543210',
      board_name: 'Distribution Studio',
      column_id: 'ad_distribution',
      new_value: 'Done',
    },
  },
};
