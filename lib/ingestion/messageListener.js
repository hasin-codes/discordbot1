const { pushAndMaybeFlush } = require('./batchWriter');
const { structureMessage } = require('./ingestionCheckpoint');

/** @type {Set<string>} */
let watchedChannels = new Set();

/**
 * Set the channels to watch for message ingestion.
 * @param {string[]} channelIds
 */
function setChannels(channelIds) {
  watchedChannels = new Set(channelIds);
}

/**
 * Get the current set of watched channels.
 * @returns {Set<string>}
 */
function getChannels() {
  return watchedChannels;
}

/**
 * Handle a Discord messageCreate event.
 * Filters by watched channels and bot/system messages, then enqueues.
 *
 * This function MUST NOT throw — it's called from the main event loop.
 * @param {import('discord.js').Message} message
 */
function handleMessage(message) {
  try {
    // Ignore bot messages
    if (message.author.bot) return;

    // Ignore system/pin/join messages
    if (message.system) return;

    // Only capture from configured channels
    if (!watchedChannels.has(message.channelId)) return;

    // Ignore empty content (no text and no attachments)
    const hasContent = message.content && message.content.trim().length > 0;
    const hasAttachments = message.attachments && message.attachments.size > 0;
    if (!hasContent && !hasAttachments) return;

    const structured = structureMessage(message);
    pushAndMaybeFlush(structured);
  } catch (err) {
    // Never let ingestion errors bubble up to the main bot loop
    console.error('[ingestion:listener] Error processing message:', err.message);
  }
}

module.exports = { handleMessage, setChannels, getChannels };
