import { db } from './db';
import type {
  PageEvent,
  TrackEvent,
  IdentifyEvent,
  StatsBreakdown,
} from './analytics-types';

// Initialize analytics schema
db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    type TEXT NOT NULL,
    anonymous_id TEXT NOT NULL,
    user_id TEXT,
    event TEXT,
    name TEXT,
    properties TEXT,
    context TEXT,
    timestamp TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_analytics_anonymous_id ON analytics_events(anonymous_id);
  CREATE INDEX IF NOT EXISTS idx_analytics_received_at ON analytics_events(received_at);
  CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(type);
  CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event);
`);

// Prepared statements for inserting events
export const insertPageEvent = db.prepare(`
  INSERT INTO analytics_events (type, anonymous_id, user_id, name, properties, context, timestamp)
  VALUES ('page', ?, ?, ?, ?, ?, ?)
`);

export const insertTrackEvent = db.prepare(`
  INSERT INTO analytics_events (type, anonymous_id, user_id, event, properties, context, timestamp)
  VALUES ('track', ?, ?, ?, ?, ?, ?)
`);

export const insertIdentifyEvent = db.prepare(`
  INSERT INTO analytics_events (type, anonymous_id, user_id, properties, context, timestamp)
  VALUES ('identify', ?, ?, ?, ?, ?)
`);

// Insert a batch of events in a transaction
export function insertBatch(
  events: Array<PageEvent | TrackEvent | IdentifyEvent>
): void {
  const transaction = db.transaction(() => {
    for (const event of events) {
      const contextJson = JSON.stringify(event.context || {});

      if (event.type === 'page') {
        const e = event as PageEvent;
        insertPageEvent.run(
          e.anonymousId,
          e.userId || null,
          e.name || null,
          JSON.stringify(e.properties || {}),
          contextJson,
          e.timestamp
        );
      } else if (event.type === 'track') {
        const e = event as TrackEvent;
        insertTrackEvent.run(
          e.anonymousId,
          e.userId || null,
          e.event,
          JSON.stringify(e.properties || {}),
          contextJson,
          e.timestamp
        );
      } else if (event.type === 'identify') {
        const e = event as IdentifyEvent;
        insertIdentifyEvent.run(
          e.anonymousId,
          e.userId || null,
          JSON.stringify(e.traits || {}),
          contextJson,
          e.timestamp
        );
      }
    }
  });
  transaction();
}

// Stats queries
export const analyticsQueries = {
  // Total page views
  pageviews: db.prepare(`
    SELECT COUNT(*) as count FROM analytics_events WHERE type = 'page'
  `),

  // Unique visitors (distinct anonymous IDs)
  visitors: db.prepare(`
    SELECT COUNT(DISTINCT anonymous_id) as count FROM analytics_events
  `),

  // Total events by type
  eventsByType: db.prepare(`
    SELECT type, COUNT(*) as count
    FROM analytics_events
    GROUP BY type
    ORDER BY count DESC
  `),

  // Top tracked events
  topEvents: db.prepare(`
    SELECT event, COUNT(*) as count
    FROM analytics_events
    WHERE type = 'track' AND event IS NOT NULL
    GROUP BY event
    ORDER BY count DESC
    LIMIT ?
  `),

  // UTM sources breakdown
  sources: db.prepare(`
    SELECT
      json_extract(context, '$.campaign.source') as source,
      COUNT(*) as count
    FROM analytics_events
    WHERE type = 'page' AND json_extract(context, '$.campaign.source') IS NOT NULL
    GROUP BY source
    ORDER BY count DESC
    LIMIT ?
  `),

  // Referrers breakdown
  referrers: db.prepare(`
    SELECT
      json_extract(context, '$.page.referrer') as referrer,
      COUNT(*) as count
    FROM analytics_events
    WHERE type = 'page' AND json_extract(context, '$.page.referrer') IS NOT NULL AND json_extract(context, '$.page.referrer') != ''
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT ?
  `),

  // Scroll depth distribution (from track events with event = 'scroll_depth')
  scrollDepth: db.prepare(`
    SELECT
      json_extract(properties, '$.depth') as depth,
      COUNT(DISTINCT anonymous_id) as count
    FROM analytics_events
    WHERE type = 'track' AND event = 'scroll_depth'
    GROUP BY depth
    ORDER BY CAST(depth AS INTEGER) ASC
  `),

  // Bounce rate calculation
  // A bounce = visitor who had only page events with session duration < 10s
  bounceSessions: db.prepare(`
    SELECT
      json_extract(context, '$.sessionId') as session_id,
      COUNT(*) as event_count,
      MIN(timestamp) as first_event,
      MAX(timestamp) as last_event
    FROM analytics_events
    WHERE json_extract(context, '$.sessionId') IS NOT NULL
    GROUP BY session_id
  `),

  // Recent events for debugging
  recentEvents: db.prepare(`
    SELECT * FROM analytics_events
    ORDER BY received_at DESC
    LIMIT ?
  `),

  // Events in date range
  eventsInRange: db.prepare(`
    SELECT * FROM analytics_events
    WHERE received_at >= ? AND received_at <= ?
    ORDER BY received_at DESC
    LIMIT ?
  `),

  // Daily pageviews
  dailyPageviews: db.prepare(`
    SELECT
      DATE(received_at) as date,
      COUNT(*) as count
    FROM analytics_events
    WHERE type = 'page'
    GROUP BY DATE(received_at)
    ORDER BY date DESC
    LIMIT ?
  `),
};

// Helper to calculate bounce rate
export function getBounceRate(): { bounceRate: number; totalSessions: number; bouncedSessions: number } {
  const sessions = analyticsQueries.bounceSessions.all() as Array<{
    session_id: string;
    event_count: number;
    first_event: string;
    last_event: string;
  }>;

  if (sessions.length === 0) {
    return { bounceRate: 0, totalSessions: 0, bouncedSessions: 0 };
  }

  let bouncedSessions = 0;
  for (const session of sessions) {
    const first = new Date(session.first_event).getTime();
    const last = new Date(session.last_event).getTime();
    const durationSeconds = (last - first) / 1000;

    // Bounce: only 1 event OR session duration < 10 seconds
    if (session.event_count === 1 || durationSeconds < 10) {
      bouncedSessions++;
    }
  }

  return {
    bounceRate: Math.round((bouncedSessions / sessions.length) * 100),
    totalSessions: sessions.length,
    bouncedSessions,
  };
}

// Helper to get scroll depth stats
export function getScrollDepthStats(): StatsBreakdown[] {
  const rows = analyticsQueries.scrollDepth.all() as Array<{
    depth: string;
    count: number;
  }>;

  const totalVisitors = (analyticsQueries.visitors.get() as { count: number }).count || 1;

  return rows.map((row) => ({
    key: `${row.depth}%`,
    count: row.count,
    percentage: Math.round((row.count / totalVisitors) * 100),
  }));
}
