jest.mock('../../lib/ingestion/batchWriter', () => ({
  pushAndMaybeFlush: jest.fn(),
}));

jest.mock('../../lib/ingestion/ingestionCheckpoint', () => ({
  structureMessage: jest.fn().mockReturnValue({ message_id: 'structured' }),
}));

const { pushAndMaybeFlush } = require('../../lib/ingestion/batchWriter');
const { structureMessage } = require('../../lib/ingestion/ingestionCheckpoint');
const { handleMessage, setChannels, getChannels } = require('../../lib/ingestion/messageListener');

function makeMessage(overrides = {}) {
  return {
    author: { bot: overrides.bot || false, id: 'u1', username: 'alice' },
    system: overrides.system || false,
    channelId: overrides.channelId || 'c1',
    content: overrides.content || 'hello',
    attachments: overrides.attachments || { size: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  setChannels([]);
});

describe('messageListener', () => {
  describe('setChannels / getChannels', () => {
    test('sets and retrieves channel list', () => {
      setChannels(['c1', 'c2']);
      const channels = getChannels();
      expect(channels.has('c1')).toBe(true);
      expect(channels.has('c2')).toBe(true);
      expect(channels.has('c3')).toBe(false);
    });
  });

  describe('handleMessage', () => {
    test('ignores bot messages', () => {
      setChannels(['c1']);
      handleMessage(makeMessage({ bot: true, channelId: 'c1' }));
      expect(structureMessage).not.toHaveBeenCalled();
    });

    test('ignores system messages', () => {
      setChannels(['c1']);
      handleMessage(makeMessage({ system: true, channelId: 'c1' }));
      expect(structureMessage).not.toHaveBeenCalled();
    });

    test('ignores messages from non-watched channels', () => {
      setChannels(['c2']);
      handleMessage(makeMessage({ channelId: 'c1' }));
      expect(structureMessage).not.toHaveBeenCalled();
    });

    test('ignores empty messages (no content, no attachments)', () => {
      setChannels(['c1']);
      handleMessage(makeMessage({ content: '', attachments: { size: 0 } }));
      expect(structureMessage).not.toHaveBeenCalled();
    });

    test('ignores whitespace-only messages', () => {
      setChannels(['c1']);
      handleMessage(makeMessage({ content: '   ', attachments: { size: 0 } }));
      expect(structureMessage).not.toHaveBeenCalled();
    });

    test('accepts messages with only attachments', () => {
      setChannels(['c1']);
      handleMessage(makeMessage({ content: '', attachments: { size: 1 } }));
      expect(structureMessage).toHaveBeenCalled();
      expect(pushAndMaybeFlush).toHaveBeenCalled();
    });

    test('accepts valid messages from watched channels', () => {
      setChannels(['c1']);
      handleMessage(makeMessage({ channelId: 'c1', content: 'hello' }));
      expect(structureMessage).toHaveBeenCalled();
      expect(pushAndMaybeFlush).toHaveBeenCalledWith({ message_id: 'structured' });
    });

    test('never throws — catches internal errors', () => {
      setChannels(['c1']);
      structureMessage.mockImplementation(() => { throw new Error('boom'); });

      // Suppress console.error for this test
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => handleMessage(makeMessage({ channelId: 'c1' }))).not.toThrow();
      expect(pushAndMaybeFlush).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    test('handles null content gracefully', () => {
      setChannels(['c1']);
      // null content with no attachments should be ignored
      handleMessage(makeMessage({ content: null, attachments: { size: 0 } }));
      expect(structureMessage).not.toHaveBeenCalled();
    });
  });
});
