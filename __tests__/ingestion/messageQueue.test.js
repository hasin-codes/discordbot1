const { push, drain, releaseDrain, size, getHighWaterMark, reset } = require('../../lib/ingestion/messageQueue');

beforeEach(() => reset());

describe('messageQueue', () => {
  test('push adds message and returns queue length', () => {
    const msg = { message_id: '1', channel_id: 'c1' };
    const len = push(msg);
    expect(len).toBe(1);
    expect(size()).toBe(1);
  });

  test('push tracks high water mark', () => {
    push({ message_id: '1' });
    push({ message_id: '2' });
    push({ message_id: '3' });
    expect(getHighWaterMark()).toBe(3);
  });

  test('drain removes all messages and returns them', () => {
    push({ message_id: '1' });
    push({ message_id: '2' });
    const batch = drain();
    expect(batch).toHaveLength(2);
    expect(batch[0].message_id).toBe('1');
    expect(size()).toBe(0);
  });

  test('drain returns null when already draining (concurrent lock)', () => {
    push({ message_id: '1' });
    const first = drain();
    expect(first).not.toBeNull();

    const second = drain();
    expect(second).toBeNull();
  });

  test('releaseDrain allows drain again', () => {
    push({ message_id: '1' });
    drain();
    releaseDrain();

    push({ message_id: '2' });
    const batch = drain();
    expect(batch).toHaveLength(1);
    expect(batch[0].message_id).toBe('2');
  });

  test('drain on empty queue returns empty array', () => {
    const batch = drain();
    expect(batch).toEqual([]);
  });

  test('reset clears all state', () => {
    push({ message_id: '1' });
    drain();
    reset();
    expect(size()).toBe(0);
    expect(getHighWaterMark()).toBe(0);
    // drain should work again after reset
    const batch = drain();
    expect(batch).not.toBeNull();
  });
});
