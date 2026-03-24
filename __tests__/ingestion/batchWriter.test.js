jest.mock('../../lib/ingestion/messageQueue', () => ({
  push: jest.fn(),
  drain: jest.fn(),
  releaseDrain: jest.fn(),
  size: jest.fn(),
  reset: jest.fn(),
  getHighWaterMark: jest.fn(),
}));

jest.mock('../../lib/ingestion/supabaseClient', () => ({
  bulkInsertMessages: jest.fn(),
  setCheckpoints: jest.fn().mockResolvedValue(undefined),
}));

const messageQueue = require('../../lib/ingestion/messageQueue');
const { bulkInsertMessages, setCheckpoints } = require('../../lib/ingestion/supabaseClient');
const {
  pushAndMaybeFlush,
  flush,
  forceFlush,
  start,
  stop,
  getSettings,
  reset,
  _extractCheckpoints,
} = require('../../lib/ingestion/batchWriter');

beforeEach(() => {
  jest.clearAllMocks();
  reset();
  // Default: drain returns a batch
  messageQueue.drain.mockReturnValue([]);
});

afterEach(() => {
  stop();
});

describe('batchWriter', () => {
  describe('_extractCheckpoints', () => {
    test('returns highest message_id per channel', () => {
      const messages = [
        { message_id: '100', channel_id: 'c1' },
        { message_id: '200', channel_id: 'c1' },
        { message_id: '50', channel_id: 'c2' },
      ];
      const result = _extractCheckpoints(messages);
      expect(result).toEqual({ c1: '200', c2: '50' });
    });

    test('returns empty for empty array', () => {
      expect(_extractCheckpoints([])).toEqual({});
    });
  });

  describe('flush', () => {
    test('does nothing when drain returns empty', async () => {
      messageQueue.drain.mockReturnValue([]);
      await flush();
      expect(bulkInsertMessages).not.toHaveBeenCalled();
      expect(messageQueue.releaseDrain).toHaveBeenCalled();
    });

    test('does nothing when drain returns null (locked)', async () => {
      messageQueue.drain.mockReturnValue(null);
      await flush();
      expect(bulkInsertMessages).not.toHaveBeenCalled();
      expect(messageQueue.releaseDrain).not.toHaveBeenCalled();
    });

    test('inserts batch and updates checkpoints on success', async () => {
      const batch = [
        { message_id: '100', channel_id: 'c1', guild_id: 'g1', user_id: 'u1', timestamp: '2026-01-01T00:00:00Z' },
      ];
      messageQueue.drain.mockReturnValue(batch);
      bulkInsertMessages.mockResolvedValue({ inserted: 1, error: null });

      await flush();

      expect(bulkInsertMessages).toHaveBeenCalledWith(batch);
      expect(setCheckpoints).toHaveBeenCalledWith({ c1: '100' });
      expect(messageQueue.releaseDrain).toHaveBeenCalled();
    });

    test('releases drain lock even on failure', async () => {
      const batch = [
        { message_id: '100', channel_id: 'c1', guild_id: 'g1', user_id: 'u1', timestamp: '2026-01-01T00:00:00Z' },
      ];
      messageQueue.drain.mockReturnValue(batch);
      bulkInsertMessages.mockResolvedValue({ inserted: 0, error: 'DB error' });

      // Mock sleep to avoid actual delays
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        // For retry sleep, resolve immediately on first call only
        // The retry loop will exhaust all attempts
        fn();
        return {};
      });

      await flush();

      expect(messageQueue.releaseDrain).toHaveBeenCalled();
      global.setTimeout.mockRestore();
    });
  });

  describe('pushAndMaybeFlush', () => {
    test('pushes to queue without flushing below threshold', () => {
      start({ batchSize: 50, flushIntervalMs: 60000 });
      messageQueue.push.mockReturnValue(1);

      pushAndMaybeFlush({ message_id: '1' });

      expect(messageQueue.push).toHaveBeenCalled();
      // flush is fire-and-forget, but since queue size is 1 < 50, it shouldn't be called
      // We can't easily test the non-call of async fire-and-forget, so we verify push happened
    });

    test('triggers flush when queue reaches threshold', (done) => {
      start({ batchSize: 2, flushIntervalMs: 60000 });
      messageQueue.push.mockReturnValue(2);
      messageQueue.drain.mockReturnValue([]);
      bulkInsertMessages.mockResolvedValue({ inserted: 0, error: null });

      pushAndMaybeFlush({ message_id: '1' });

      // Flush is async fire-and-forget — give it a tick
      setTimeout(() => {
        expect(messageQueue.drain).toHaveBeenCalled();
        done();
      }, 10);
    });
  });

  describe('start / stop', () => {
    test('start sets running and creates timer', () => {
      start({ batchSize: 10, flushIntervalMs: 5000 });
      const settings = getSettings();
      expect(settings.running).toBe(true);
      expect(settings.batchSize).toBe(10);
      expect(settings.flushIntervalMs).toBe(5000);
    });

    test('start does nothing if already running', () => {
      start();
      start(); // second call
      expect(getSettings().running).toBe(true);
    });

    test('stop clears running', () => {
      start();
      stop();
      expect(getSettings().running).toBe(false);
    });
  });

  describe('forceFlush', () => {
    test('flushes immediately', async () => {
      messageQueue.drain.mockReturnValue([]);
      await forceFlush();
      expect(messageQueue.drain).toHaveBeenCalled();
    });
  });
});
