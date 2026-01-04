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
import { insertInquiry, inquiryQueries, type InquiryPayload } from './inquiry-db';
import type { IdeGenerateRequest } from './ide-types';
import { getProseSystemPrompt, warmCache } from './prose-spec';

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

// Inquiry submission endpoint
app.post('/v1/inquiries', (req, res) => {
  try {
    const payload = req.body as InquiryPayload;

    // Validate required fields
    if (!payload.name || !payload.name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!payload.email || !payload.email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!payload.message || !payload.message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Limit message length
    if (payload.message.length > 5000) {
      return res.status(400).json({ error: 'Message too long (max 5000 characters)' });
    }

    // Insert inquiry
    insertInquiry.run(
      payload.name.trim(),
      payload.email.trim().toLowerCase(),
      payload.company?.trim() || null,
      payload.message.trim(),
      payload.source || 'landing'
    );

    res.status(201).json({ status: 'received' });
  } catch (error) {
    console.error('Inquiry submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List inquiries (for CLI access)
app.get('/v1/inquiries', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const inquiries = inquiryQueries.all.all(limit);
    const total = (inquiryQueries.count.get() as { count: number }).count;

    res.json({ inquiries, total });
  } catch (error) {
    console.error('Inquiries list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// IDE generation endpoint (SSE streaming)
app.post('/v1/ide/generate', async (req, res) => {
  try {
    const { currentProse, history, prompt } = req.body as IdeGenerateRequest;

    // Validate required fields
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    // Check for API key
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not configured');
      return res.status(500).json({ error: 'API not configured' });
    }

    // Fetch the prose.md spec (cached with TTL)
    let systemPrompt: string;
    try {
      systemPrompt = await getProseSystemPrompt();
    } catch (error) {
      console.error('Failed to fetch prose.md:', error);
      return res.status(503).json({ error: 'Language spec unavailable' });
    }

    // Build messages array for OpenRouter
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current request
    const userContent = currentProse?.trim()
      ? `Current .prose file:\n\`\`\`prose\n${currentProse}\n\`\`\`\n\n${prompt}`
      : prompt;
    messages.push({ role: 'user', content: userContent });

    // Call OpenRouter with streaming
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://prose.md',
        'X-Title': 'OpenProse IDE',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', response.status, errorText);
      return res.status(502).json({ error: 'Upstream API error', details: errorText });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Stream the response
    const reader = response.body?.getReader();
    if (!reader) {
      res.write('data: {"error": "No response body"}\n\n');
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              continue;
            }

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                // Forward just the content to the client
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
              }
            } catch {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      }
    } catch (streamError) {
      console.error('Stream error:', streamError);
      res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('IDE generate error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
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
  // Pre-warm the prose.md cache (non-blocking)
  warmCache();
});
