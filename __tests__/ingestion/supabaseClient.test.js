// Mock supabase before requiring the module
jest.mock('../../lib/supabase', () => ({
  from: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockResolvedValue({ error: null }),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
}));

const supabase = require('../../lib/supabase');
const {
  bulkInsertMessages,
  getCheckpoint,
  getCheckpoints,
  setCheckpoint,
  setCheckpoints,
} = require('../../lib/ingestion/supabaseClient');

beforeEach(() => {
  jest.clearAllMocks();
  // Rebuild the chain mock
  supabase.from.mockReturnThis();
  supabase.upsert.mockResolvedValue({ error: null });
  supabase.select.mockReturnThis();
  supabase.eq.mockReturnThis();
  supabase.in.mockReturnThis();
  supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
});

describe('supabaseClient', () => {
  describe('bulkInsertMessages', () => {
    test('returns early for empty array', async () => {
      const result = await bulkInsertMessages([]);
      expect(result).toEqual({ inserted: 0, error: null });
      expect(supabase.upsert).not.toHaveBeenCalled();
    });

    test('calls upsert with correct rows', async () => {
      const messages = [
        { message_id: '1', channel_id: 'c1', guild_id: 'g1', user_id: 'u1', username: 'alice', content: 'hi', timestamp: '2026-01-01T00:00:00Z' },
      ];
      const result = await bulkInsertMessages(messages);
      expect(result.inserted).toBe(1);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('community_messages');
      expect(supabase.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ message_id: '1', channel_id: 'c1' }),
        ]),
        { onConflict: 'message_id', count: 'exact' }
      );
    });

    test('handles null fields gracefully', async () => {
      const msg = { message_id: '2', channel_id: 'c2', guild_id: 'g2', user_id: 'u2', timestamp: '2026-01-01T00:00:00Z' };
      const result = await bulkInsertMessages([msg]);
      expect(result.inserted).toBe(1);
    });

    test('returns error on failure', async () => {
      supabase.upsert.mockResolvedValue({ error: { message: 'DB down' } });
      const result = await bulkInsertMessages([
        { message_id: '1', channel_id: 'c1', guild_id: 'g1', user_id: 'u1', timestamp: '2026-01-01T00:00:00Z' },
      ]);
      expect(result.inserted).toBe(0);
      expect(result.error).toBe('DB down');
    });
  });

  describe('getCheckpoint', () => {
    test('returns null values when no row exists', async () => {
      const result = await getCheckpoint('c1');
      expect(result).toEqual({ last_message_id: null, last_processed_at: null });
    });

    test('returns data when row exists', async () => {
      supabase.maybeSingle.mockResolvedValue({
        data: { last_message_id: '123', last_processed_at: '2026-01-01' },
        error: null,
      });
      const result = await getCheckpoint('c1');
      expect(result.last_message_id).toBe('123');
    });

    test('returns nulls on DB error', async () => {
      supabase.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'fail' },
      });
      const result = await getCheckpoint('c1');
      expect(result).toEqual({ last_message_id: null, last_processed_at: null });
    });
  });

  describe('getCheckpoints', () => {
    test('returns empty for empty input', async () => {
      const result = await getCheckpoints([]);
      expect(result).toEqual({});
    });

    test('returns map of channel_id to checkpoint', async () => {
      supabase.in.mockReturnThis();
      // Need to return from the chain: from().select().in() → { data, error }
      // The mock above sets from→this, select→this, in→this, then maybeSingle for single
      // For getCheckpoints, the chain ends at .in() which needs to resolve
      // Let's override the chain specifically
      const chain = supabase.from();
      chain.select.mockReturnThis();
      chain.in.mockResolvedValue({
        data: [
          { channel_id: 'c1', last_message_id: '100' },
          { channel_id: 'c2', last_message_id: '200' },
        ],
        error: null,
      });

      const result = await getCheckpoints(['c1', 'c2']);
      expect(result.c1.last_message_id).toBe('100');
      expect(result.c2.last_message_id).toBe('200');
    });
  });

  describe('setCheckpoint', () => {
    test('calls upsert with correct data', async () => {
      await setCheckpoint('c1', '123');
      expect(supabase.from).toHaveBeenCalledWith('message_ingestion_state');
      expect(supabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          channel_id: 'c1',
          last_message_id: '123',
        }),
        { onConflict: 'channel_id' }
      );
    });
  });

  describe('setCheckpoints', () => {
    test('returns early for empty object', async () => {
      await setCheckpoints({});
      expect(supabase.from).not.toHaveBeenCalledWith('message_ingestion_state');
    });

    test('bulk upserts multiple checkpoints', async () => {
      await setCheckpoints({ c1: '100', c2: '200' });
      expect(supabase.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ channel_id: 'c1', last_message_id: '100' }),
          expect.objectContaining({ channel_id: 'c2', last_message_id: '200' }),
        ]),
        { onConflict: 'channel_id' }
      );
    });
  });
});
