-- ============================================================================
-- Daily Keyword Insights Table
-- ============================================================================
-- Stores top 5 keywords extracted from Discord messages per calendar day (UTC).
-- Used for daily digests, Feishu reports, and community insights.
--
-- Each row represents one keyword's statistics for a specific date.
-- Processed daily at midnight UTC via Supabase Edge Function + pg_cron.
-- ============================================================================

-- Create the table
CREATE TABLE IF NOT EXISTS daily_keyword_insights (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,                  -- Processing date (UTC 00:00-23:59:59)
  keyword TEXT NOT NULL,               -- Extracted keyword (e.g., "API", "billing")
  mention_count INTEGER NOT NULL,      -- Number of times keyword appeared
  peak_timestamp TIMESTAMPTZ,          -- When keyword was most mentioned (hourly precision)
  peak_channel_id TEXT,                -- Discord channel ID with most mentions
  created_at TIMESTAMPTZ DEFAULT NOW() -- When this row was inserted
);

-- Add comment for documentation
COMMENT ON TABLE daily_keyword_insights IS 
  'Top 5 keywords per calendar day (UTC), extracted using YAKE algorithm. Used for daily digests and community insights.';

COMMENT ON COLUMN daily_keyword_insights.date IS 
  'Calendar date (UTC) these keywords belong to. Messages from 00:00:00 to 23:59:59 UTC are grouped together.';

COMMENT ON COLUMN daily_keyword_insights.keyword IS 
  'Extracted keyword (unigram, 3-30 characters, stopwords filtered).';

COMMENT ON COLUMN daily_keyword_insights.mention_count IS 
  'Number of messages containing this keyword on this date.';

COMMENT ON COLUMN daily_keyword_insights.peak_timestamp IS 
  'Hour (UTC) when this keyword was most frequently mentioned. Format: YYYY-MM-DDTHH:00:00.000Z';

COMMENT ON COLUMN daily_keyword_insights.peak_channel_id IS 
  'Discord channel ID where this keyword was most frequently mentioned.';


-- ============================================================================
-- Indexes for Fast Queries
-- ============================================================================

-- Index for date-based queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_daily_keyword_insights_date 
  ON daily_keyword_insights (date DESC);

-- Index for keyword-based queries (e.g., "show all dates where API was mentioned")
CREATE INDEX IF NOT EXISTS idx_daily_keyword_insights_keyword 
  ON daily_keyword_insights (keyword);

-- Composite index for date + keyword queries (e.g., "get API mentions on March 24")
CREATE INDEX IF NOT EXISTS idx_daily_keyword_insights_date_keyword 
  ON daily_keyword_insights (date, keyword);

-- Index for sorting by mention count (top keywords)
CREATE INDEX IF NOT EXISTS idx_daily_keyword_insights_mention_count 
  ON daily_keyword_insights (date, mention_count DESC);


-- ============================================================================
-- Useful Views for Reporting
-- ============================================================================

-- View: Today's keywords (convenient shortcut)
CREATE OR REPLACE VIEW daily_keyword_insights_today AS
SELECT * 
FROM daily_keyword_insights
WHERE date = CURRENT_DATE
ORDER BY mention_count DESC;

COMMENT ON VIEW daily_keyword_insights_today IS 
  'Convenient view for querying today''s top keywords.';


-- View: This week's keywords (past 7 days)
CREATE OR REPLACE VIEW daily_keyword_insights_week AS
SELECT * 
FROM daily_keyword_insights
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, mention_count DESC;

COMMENT ON VIEW daily_keyword_insights_week IS 
  'Convenient view for querying the past 7 days of keywords.';


-- View: Aggregated weekly keyword trends (keyword + total mentions + days appeared)
CREATE OR REPLACE VIEW weekly_keyword_trends AS
SELECT 
  keyword,
  SUM(mention_count) AS total_mentions,
  COUNT(DISTINCT date) AS days_appeared,
  MAX(mention_count) AS peak_daily_mentions,
  MAX(date) AS last_mentioned
FROM daily_keyword_insights
GROUP BY keyword
ORDER BY total_mentions DESC;

COMMENT ON VIEW weekly_keyword_trends IS 
  'Aggregated keyword trends: total mentions, days appeared, and peak mentions per keyword across all dates.';


-- ============================================================================
-- Example Queries (for reference)
-- ============================================================================

-- Get top keywords for a specific date:
-- SELECT * FROM daily_keyword_insights
-- WHERE date = '2026-03-24'
-- ORDER BY mention_count DESC
-- LIMIT 5;

-- Get top keywords for the past 7 days:
-- SELECT * FROM daily_keyword_insights_week;

-- Find when a specific keyword peaked:
-- SELECT date, keyword, mention_count, peak_timestamp
-- FROM daily_keyword_insights
-- WHERE keyword = 'API'
-- ORDER BY date DESC;

-- Aggregate: most common keywords this week:
-- SELECT keyword, SUM(mention_count) AS total_mentions
-- FROM daily_keyword_insights
-- WHERE date >= CURRENT_DATE - INTERVAL '7 days'
-- GROUP BY keyword
-- ORDER BY total_mentions DESC
-- LIMIT 10;

-- ============================================================================
-- Permissions (if using Row Level Security)
-- ============================================================================

-- Enable RLS if needed (optional, for multi-tenant setups)
-- ALTER TABLE daily_keyword_insights ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to read/write all data
-- CREATE POLICY "Service role has full access"
--   ON daily_keyword_insights
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next steps:
-- 1. Create lib/keywords.js (YAKE extraction logic)
-- 2. Create supabase/functions/keyword-extraction/index.ts (Edge Function)
-- 3. Schedule via pg_cron: runs daily at midnight UTC
-- ============================================================================
