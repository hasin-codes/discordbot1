const yake = require('yake');

// YAKE configuration optimized for Discord messages
const yakeExtractor = yake({
  lan: 'en',
  n: 1,           // Unigrams only (single keywords)
  top: 20,        // Extract top 20 candidates
  minChar: 3,     // Minimum 3 characters (filters "the", "a")
  maxChar: 30,    // Maximum 30 characters
  stopWords: [
    'the', 'a', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'can', 'could', 'should', 'may', 'might', 'must', 'shall',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
    'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'an', 'and',
    'or', 'but', 'if', 'then', 'else', 'when', 'where', 'how', 'why',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
    'about', 'after', 'before', 'between', 'into', 'through', 'during',
    'without', 'again', 'further', 'once', 'any', 'up', 'down', 'out',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here'
  ]
});

/**
 * Extract keywords from messages for a SINGLE DATE
 * @param {Array} messages - Array of {content, timestamp, channel_id} for one date
 * @returns {Array} Top 5 keywords with metadata
 */
function extractKeywordsForDate(messages) {
  if (!messages || messages.length === 0) {
    return [];
  }

  // Step 1: Combine all message content for the date
  const allText = messages.map(m => m.content).join(' ');
  
  // Step 2: Extract keywords with YAKE
  let yakeKeywords;
  try {
    yakeKeywords = yakeExtractor.extract(allText);
  } catch (err) {
    console.error('YAKE extraction failed:', err.message);
    return [];
  }
  
  if (!yakeKeywords || yakeKeywords.length === 0) {
    return [];
  }
  
  // Step 3: Count frequency and find peak timestamp for each keyword
  const keywordStats = yakeKeywords.slice(0, 20).map(([keyword, score]) => {
    // Find all messages containing this keyword
    const matchingMessages = messages.filter(m => 
      m.content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // Count mentions
    const mentionCount = matchingMessages.length;
    
    // Find peak timestamp (when keyword was most mentioned)
    const peakTimestamp = findPeakTimestamp(matchingMessages);
    
    // Find peak channel
    const peakChannelId = findPeakChannel(matchingMessages);
    
    return {
      keyword,
      mention_count: mentionCount,
      peak_timestamp: peakTimestamp,
      peak_channel_id: peakChannelId
    };
  });
  
  // Step 4: Sort by mention count and return top 5
  return keywordStats
    .sort((a, b) => b.mention_count - a.mention_count)
    .slice(0, 5);
}

/**
 * Find the timestamp when keyword was most mentioned (peak hour)
 * @param {Array} messages - Array of messages containing the keyword
 * @returns {string} ISO timestamp of peak hour
 */
function findPeakTimestamp(messages) {
  if (!messages || messages.length === 0) {
    return null;
  }
  
  // Group by hour
  const hourlyCounts = {};
  messages.forEach(m => {
    if (!m.timestamp) return;
    const hour = new Date(m.timestamp).toISOString().slice(0, 13); // "2026-03-24T14"
    hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
  });
  
  if (Object.keys(hourlyCounts).length === 0) {
    return new Date().toISOString();
  }
  
  // Find peak hour
  const peakHour = Object.entries(hourlyCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  return `${peakHour}:00:00.000Z`;
}

/**
 * Find the channel where keyword was most mentioned
 * @param {Array} messages - Array of messages containing the keyword
 * @returns {string} Channel ID with most mentions
 */
function findPeakChannel(messages) {
  if (!messages || messages.length === 0) {
    return null;
  }
  
  const channelCounts = {};
  messages.forEach(m => {
    if (!m.channel_id) return;
    channelCounts[m.channel_id] = (channelCounts[m.channel_id] || 0) + 1;
  });
  
  const peakChannel = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  return peakChannel;
}

/**
 * Validate that a date string is in correct format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} True if valid
 */
function isValidDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  
  // Check format YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  // Check if it's a valid date
  const date = new Date(dateStr + 'T00:00:00.000Z');
  return !isNaN(date.getTime());
}

module.exports = { 
  extractKeywordsForDate,
  findPeakTimestamp,
  findPeakChannel,
  isValidDate,
  yakeExtractor
};
