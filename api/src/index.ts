import express from 'express';
import { db, insertTelemetry, queries } from './db';
import type { TelemetryPayload } from './telemetry-types';
import {
  insertBatch,
  analyticsQueries,
  getBounceRate,
  getScrollDepthStats,
} from './analytics-db';
import type {
  AnalyticsBatchRequest,
  PageEvent,
  TrackEvent,
  IdentifyEvent,
  StatsMetric,
} from './analytics-types';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json({ limit: '100kb' }));

// CORS for telemetry from CLI (though CLI won't need it, good to have)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telemetry ingestion endpoint
app.post('/v1/telemetry', (req, res) => {
  try {
    const payload = req.body as TelemetryPayload;

    // Basic validation
    if (!payload.schemaVersion || !payload.installId || !payload.pluginVersion) {
      return res.status(400).json({
        error: 'Missing required fields: schemaVersion, installId, pluginVersion'
      });
    }

    // Store the event
    insertTelemetry.run(
      payload.installId,
      payload.pluginVersion,
      payload.schemaVersion,
      payload.timestamp || new Date().toISOString(),
      JSON.stringify(payload)
    );

    res.status(202).json({ status: 'accepted' });
  } catch (error) {
    console.error('Telemetry ingestion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Simple stats endpoint (for your own dashboarding)
app.get('/v1/stats', (req, res) => {
  try {
    const totalEvents = queries.totalEvents.get() as { count: number };
    const uniqueInstalls = queries.uniqueInstalls.get() as { count: number };
    const byVersion = queries.eventsByVersion.all();

    res.json({
      totalEvents: totalEvents.count,
      uniqueInstalls: uniqueInstalls.count,
      byVersion,
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics batch ingestion endpoint (Segment-compatible)
app.post('/v1/analytics', (req, res) => {
  try {
    const body = req.body as AnalyticsBatchRequest;

    // Validate batch structure
    if (!body.batch || !Array.isArray(body.batch)) {
      return res.status(400).json({
        error: 'Missing required field: batch (array)'
      });
    }

    if (body.batch.length === 0) {
      return res.status(400).json({
        error: 'Batch array cannot be empty'
      });
    }

    if (body.batch.length > 100) {
      return res.status(400).json({
        error: 'Batch size exceeds maximum of 100 events'
      });
    }

    // Validate each event
    for (const event of body.batch) {
      if (!event.type || !['page', 'track', 'identify'].includes(event.type)) {
        return res.status(400).json({
          error: 'Each event must have a valid type: page, track, or identify'
        });
      }
      if (!event.anonymousId) {
        return res.status(400).json({
          error: 'Each event must have an anonymousId'
        });
      }
      if (event.type === 'track' && !(event as TrackEvent).event) {
        return res.status(400).json({
          error: 'Track events must have an event name'
        });
      }
    }

    // Insert all events
    insertBatch(body.batch);

    res.status(202).json({
      status: 'accepted',
      eventsReceived: body.batch.length
    });
  } catch (error) {
    console.error('Analytics ingestion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Analytics stats endpoint (CLI-queryable)
app.get('/v1/analytics/stats', (req, res) => {
  try {
    const metric = (req.query.metric as StatsMetric) || 'pageviews';
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const now = new Date().toISOString();
    const from = (req.query.from as string) || '1970-01-01T00:00:00Z';
    const to = (req.query.to as string) || now;

    let result: unknown;

    switch (metric) {
      case 'pageviews': {
        const data = analyticsQueries.pageviews.get() as { count: number };
        result = data.count;
        break;
      }

      case 'visitors': {
        const data = analyticsQueries.visitors.get() as { count: number };
        result = data.count;
        break;
      }

      case 'events': {
        result = analyticsQueries.eventsByType.all();
        break;
      }

      case 'top_events': {
        result = analyticsQueries.topEvents.all(limit);
        break;
      }

      case 'sources': {
        result = analyticsQueries.sources.all(limit);
        break;
      }

      case 'referrers': {
        result = analyticsQueries.referrers.all(limit);
        break;
      }

      case 'scroll_depth': {
        result = getScrollDepthStats();
        break;
      }

      case 'bounce_rate': {
        result = getBounceRate();
        break;
      }

      default:
        return res.status(400).json({
          error: `Unknown metric: ${metric}. Valid metrics: pageviews, visitors, events, top_events, sources, referrers, scroll_depth, bounce_rate`
        });
    }

    res.json({
      metric,
      value: result,
      period: { from, to },
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing database...');
  db.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`OpenProse API listening on port ${PORT}`);
});
