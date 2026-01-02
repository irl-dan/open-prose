/**
 * Analytics types following Segment/analytics.js conventions.
 *
 * Standard interface allows swapping to other providers later.
 * https://segment.com/docs/connections/spec/
 */

// Event types following Segment spec
export type AnalyticsEventType = 'page' | 'track' | 'identify';

// Base event structure
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  anonymousId: string;
  userId?: string;
  timestamp: string; // ISO 8601
  context: AnalyticsContext;
}

// Page view event
export interface PageEvent extends AnalyticsEvent {
  type: 'page';
  name?: string;
  properties?: Record<string, unknown>;
}

// Track event (custom events)
export interface TrackEvent extends AnalyticsEvent {
  type: 'track';
  event: string;
  properties?: Record<string, unknown>;
}

// Identify event (user traits)
export interface IdentifyEvent extends AnalyticsEvent {
  type: 'identify';
  traits?: Record<string, unknown>;
}

// Context attached to all events
export interface AnalyticsContext {
  // UTM parameters
  campaign?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };

  // Page context
  page?: {
    url?: string;
    path?: string;
    referrer?: string;
    title?: string;
  };

  // Device/browser context
  userAgent?: string;
  screen?: {
    width?: number;
    height?: number;
  };

  // Session info
  sessionId?: string;

  // Additional context
  [key: string]: unknown;
}

// Batch request format (matches Segment)
export interface AnalyticsBatchRequest {
  batch: Array<PageEvent | TrackEvent | IdentifyEvent>;
}

// Stats query parameters
export type StatsMetric =
  | 'pageviews'
  | 'visitors'
  | 'events'
  | 'sources'
  | 'scroll_depth'
  | 'bounce_rate'
  | 'top_events'
  | 'referrers';

export interface StatsQuery {
  metric: StatsMetric;
  from?: string; // ISO 8601 date
  to?: string;   // ISO 8601 date
  groupBy?: string;
  limit?: number;
}

// Stats response types
export interface StatsResponse {
  metric: StatsMetric;
  value: number | Record<string, number> | StatsBreakdown[];
  period: {
    from: string;
    to: string;
  };
}

export interface StatsBreakdown {
  key: string;
  count: number;
  percentage?: number;
}
