/**
 * Trigger: Monday.com Item Assigned to Nicky on a Source Board
 *
 * Polls a Monday.com board (e.g., Distribution Studio) for active items
 * where the person column includes Nicky's user ID. Used to mirror those
 * items onto Nicky's personal task board so he has a single unified view.
 *
 * Zapier deduplicates on the `id` field (the Monday item ID).
 */

const MONDAY_API = 'https://api.monday.com/v2';

/**
 * GraphQL query to fetch all active items from a board with full column values.
 * Uses the PersonValue inline fragment to get structured person/team data.
 */
const buildItemsQuery = (boardId) => ({
  query: `
    query GetBoardItems($boardId: ID!) {
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
              ... on PersonValue {
                persons_and_teams {
                  id
                  kind
                }
              }
            }
          }
        }
      }
    }
  `,
  variables: { boardId: String(boardId) },
});

/**
 * Poll the source Monday.com board for items assigned to Nicky.
 */
const getMondayAssignedItems = async (z, bundle) => {
  const { mondayApiKey, sourceBoardId, nickysUserId, personColumnId } =
    bundle.inputData;

  const response = await z.request({
    url: MONDAY_API,
    method: 'POST',
    headers: {
      Authorization: mondayApiKey,
      'Content-Type': 'application/json',
      'API-Version': '2024-01',
    },
    body: buildItemsQuery(sourceBoardId),
  });

  if (response.data.errors) {
    throw new z.errors.Error(
      `Monday.com API error: ${JSON.stringify(response.data.errors)}`
    );
  }

  const boards = response.data?.data?.boards || [];
  if (boards.length === 0) return [];

  const board = boards[0];
  const items = board.items_page?.items || [];
  const targetColumnId = personColumnId || 'person';

  return items
    .filter((item) => {
      if (item.state !== 'active') return false;
      const personCol = item.column_values.find(
        (col) => col.id === targetColumnId
      );
      if (!personCol || !personCol.persons_and_teams) return false;
      return personCol.persons_and_teams.some(
        (p) =>
          String(p.id) === String(nickysUserId) && p.kind === 'person'
      );
    })
    .map((item) => {
      // Flatten column values into a plain key→text map for easy field mapping
      const columns = {};
      item.column_values.forEach((col) => {
        columns[col.id] = col.text || '';
      });

      return {
        id: item.id,
        name: item.name,
        state: item.state,
        updated_at: item.updated_at,
        created_at: item.created_at,
        source_board_id: String(sourceBoardId),
        source_board_name: board.name,
        source_item_id: item.id,
        columns,
      };
    });
};

module.exports = {
  key: 'monday_assigned_item',
  noun: 'Item',

  display: {
    label: "New Item Assigned to Nicky on Monday.com Board",
    description:
      "Triggers when an active item is assigned to Nicky on a source Monday.com board (e.g., Distribution Studio). Used to mirror the item onto his personal task board for a unified view.",
    important: true,
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
        key: 'sourceBoardId',
        label: 'Source Board ID',
        type: 'string',
        required: true,
        helpText:
          'The numeric ID of the Monday.com board to watch for Nicky\'s assignments (e.g., the Distribution Studio board). Find it in the board URL: monday.com/boards/XXXXXXXXXX.',
      },
      {
        key: 'nickysUserId',
        label: "Nicky's Monday.com User ID",
        type: 'string',
        required: true,
        helpText:
          "Nicky's numeric Monday.com user ID. Find it under Admin → Users → click Nicky — the ID appears in the URL.",
      },
      {
        key: 'personColumnId',
        label: 'Person Column ID',
        type: 'string',
        required: false,
        default: 'person',
        helpText:
          'The column ID of the "Person" (assignee) column on the source board. Defaults to "person". Check your board\'s column IDs in the Monday.com API playground.',
      },
    ],
    perform: getMondayAssignedItems,
    sample: {
      id: '1234567890',
      name: 'Design Q2 Ad Creative',
      state: 'active',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      source_board_id: '9876543210',
      source_board_name: 'Distribution Studio',
      source_item_id: '1234567890',
      columns: { status: 'Working on it', person: 'Nicky' },
    },
  },
};
