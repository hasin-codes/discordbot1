jest.mock('../../lib/ingestion/supabaseClient', () => ({
  getCheckpoints: jest.fn().mockResolvedValue({}),
}));

const { getCheckpoints } = require('../../lib/ingestion/supabaseClient');
const { backfill, structureMessage, BACKFILL_WINDOW_SECONDS } = require('../../lib/ingestion/ingestionCheckpoint');

function makeMockMessage(overrides = {}) {
  return {
    id: overrides.id || '111',
    channelId: overrides.channelId || 'c1',
    guildId: overrides.guildId || 'g1',
    author: {
      id: overrides.userId || 'u1',
      username: overrides.username || 'alice',
      bot: overrides.bot || false,
    },
    content: overrides.content || 'hello',
    createdAt: overrides.createdAt || new Date('2026-01-01T00:00:00Z'),
    channel: {
      isThread: () => overrides.isThread || false,
    },
    attachments: overrides.attachments || new Map(),
    system: false,
    ...overrides,
  };
}

describe('ingestionCheckpoint', () => {
  describe('BACKFILL_WINDOW_SECONDS', () => {
    test('is 300 (5 minutes)', () => {
      expect(BACKFILL_WINDOW_SECONDS).toBe(300);
    });
  });

  describe('structureMessage', () => {
    test('converts a basic message correctly', () => {
      const msg = makeMockMessage({ id: '123', content: 'hello world' });
      const result = structureMessage(msg);
      expect(result).toEqual({
        message_id: '123',
        channel_id: 'c1',
        guild_id: 'g1',
        user_id: 'u1',
        username: 'alice',
        content: 'hello world',
        timestamp: '2026-01-01T00:00:00.000Z',
        thread_id: null,
        attachments: [],
      });
    });

    test('sets thread_id when message is in a thread', () => {
      const msg = makeMockMessage({ isThread: true, channelId: 'thread1' });
      const result = structureMessage(msg);
      expect(result.thread_id).toBe('thread1');
    });

    test('handles null content', () => {
      const msg = makeMockMessage({ content: null });
      const result = structureMessage(msg);
      expect(result.content).toBeNull();
    });

    test('maps attachments', () => {
      const attachments = new Map([
        ['a1', { id: 'a1', filename: 'img.png', url: 'https://example.com/img.png', size: 1024, contentType: 'image/png' }],
      ]);
      const msg = makeMockMessage({ attachments });
      const result = structureMessage(msg);
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].filename).toBe('img.png');
    });
  });

  describe('backfill', () => {
    test('returns empty for empty channel list', async () => {
      const result = await backfill({}, []);
      expect(result).toEqual([]);
    });

    test('fetches messages after checkpoint for each channel', async () => {
      getCheckpoints.mockResolvedValue({ c1: { last_message_id: '100' } });

      const mockChannel = {
        messages: {
          fetch: jest.fn().mockResolvedValue(new Map([
            ['101', makeMockMessage({ id: '101', channelId: 'c1' })],
            ['102', makeMockMessage({ id: '102', channelId: 'c1' })],
          ])),
        },
      };

      const client = {
        channels: {
          fetch: jest.fn().mockResolvedValue(mockChannel),
        },
      };

      const result = await backfill(client, ['c1']);
      expect(result).toHaveLength(2);
      expect(client.channels.fetch).toHaveBeenCalledWith('c1');
    });

    test('skips the checkpoint message itself', async () => {
      getCheckpoints.mockResolvedValue({ c1: { last_message_id: '100' } });

      const mockChannel = {
        messages: {
          fetch: jest.fn().mockResolvedValue(new Map([
            ['100', makeMockMessage({ id: '100', channelId: 'c1' })],
            ['101', makeMockMessage({ id: '101', channelId: 'c1' })],
          ])),
        },
      };

      const client = {
        channels: {
          fetch: jest.fn().mockResolvedValue(mockChannel),
        },
      };

      const result = await backfill(client, ['c1']);
      expect(result).toHaveLength(1);
      expect(result[0].message_id).toBe('101');
    });

    test('handles channel fetch failure gracefully', async () => {
      getCheckpoints.mockResolvedValue({});

      const client = {
        channels: {
          fetch: jest.fn().mockRejectedValue(new Error('Missing access')),
        },
      };

      // Should not throw
      const result = await backfill(client, ['c1']);
      expect(result).toEqual([]);
    });

    test('handles channel with no messages property', async () => {
      getCheckpoints.mockResolvedValue({});
      const client = {
        channels: {
          fetch: jest.fn().mockResolvedValue(null),
        },
      };

      const result = await backfill(client, ['c1']);
      expect(result).toEqual([]);
    });

    test('works when no checkpoint exists (first run)', async () => {
      getCheckpoints.mockResolvedValue({});

      const mockChannel = {
        messages: {
          fetch: jest.fn().mockResolvedValue(new Map([
            ['101', makeMockMessage({ id: '101', channelId: 'c1' })],
          ])),
        },
      };

      const client = {
        channels: {
          fetch: jest.fn().mockResolvedValue(mockChannel),
        },
      };

      const result = await backfill(client, ['c1']);
      // fetch called with limit only (no after cursor)
      expect(mockChannel.messages.fetch).toHaveBeenCalledWith({ limit: 100 });
      expect(result).toHaveLength(1);
    });
  });
});
