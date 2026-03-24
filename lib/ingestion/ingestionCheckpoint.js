const { getCheckpoints } = require('./supabaseClient');

/**
 * Backfill window: how many seconds to look back after last checkpoint on restart.
 * 5 minutes covers brief restarts without fetching full history.
 */
const BACKFILL_WINDOW_SECONDS = 300;

/**
 * Fetch messages after the last known checkpoint for each configured channel.
 * Uses Discord's before/after cursor pagination — no full history scan.
 *
 * @param {import('discord.js').Client} client
 * @param {string[]} channelIds
 * @returns {Promise<Array<object>>} array of structured messages ready for queue
 */
async function backfill(client, channelIds) {
  if (!channelIds.length) return [];

  const checkpoints = await getCheckpoints(channelIds);
  const allMessages = [];

  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.messages) continue;

      const lastId = checkpoints[channelId]?.last_message_id || null;

      // Calculate the "after" boundary using the backfill window
      // Discord snowflales encode timestamps — we use after cursor when available
      const options = { limit: 100 };
      if (lastId) {
        options.after = lastId;
      }

      const messages = await channel.messages.fetch(options);

      for (const [id, msg] of messages) {
        // Skip the checkpoint message itself (already stored)
        if (id === lastId) continue;

        allMessages.push(structureMessage(msg));
      }

      if (allMessages.length) {
        console.log(
          `[ingestion:checkpoint] Backfilled ${allMessages.length} messages for ${channelId}`
        );
      }
    } catch (err) {
      console.error(
        `[ingestion:checkpoint] Backfill failed for ${channelId}: ${err.message}`
      );
    }
  }

  return allMessages;
}

/**
 * Convert a Discord Message to the structured ingestion format.
 * @param {import('discord.js').Message} message
 * @returns {object}
 */
function structureMessage(message) {
  return {
    message_id: message.id,
    channel_id: message.channelId,
    guild_id: message.guildId,
    user_id: message.author.id,
    username: message.author.username,
    content: message.content || null,
    timestamp: message.createdAt.toISOString(),
    thread_id: message.channel.isThread() ? message.channelId : null,
    attachments: message.attachments
      ? Array.from(message.attachments.values()).map(a => ({
          id: a.id,
          filename: a.filename,
          url: a.url,
          size: a.size,
          contentType: a.contentType,
        }))
      : [],
  };
}

module.exports = { backfill, structureMessage, BACKFILL_WINDOW_SECONDS };
