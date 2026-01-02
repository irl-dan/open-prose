/**
 * Lightweight analytics tracker following Segment/analytics.js conventions.
 *
 * Standard interface: page(), track(), identify()
 * Easy to swap to Segment, PostHog, etc. later.
 */

const API_ENDPOINT = 'https://api.prose.md/v1/analytics';
const FLUSH_INTERVAL = 5000; // 5 seconds
const STORAGE_KEY = 'prose_analytics_id';
const SESSION_KEY = 'prose_session_id';

// Event types
interface AnalyticsEvent {
  type: 'page' | 'track' | 'identify';
  anonymousId: string;
  userId?: string;
  timestamp: string;
  context: AnalyticsContext;
  // Type-specific fields
  name?: string;
  event?: string;
  properties?: Record<string, unknown>;
  traits?: Record<string, unknown>;
}

interface AnalyticsContext {
  campaign?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  page?: {
    url?: string;
    path?: string;
    referrer?: string;
    title?: string;
  };
  userAgent?: string;
  screen?: {
    width?: number;
    height?: number;
  };
  sessionId?: string;
}

// Event queue
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let anonymousId: string | null = null;
let sessionId: string | null = null;
let initialized = false;

// Generate UUID
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get or create anonymous ID
function getAnonymousId(): string {
  if (anonymousId) return anonymousId;

  if (typeof window !== 'undefined' && window.localStorage) {
    anonymousId = localStorage.getItem(STORAGE_KEY);
    if (!anonymousId) {
      anonymousId = generateId();
      localStorage.setItem(STORAGE_KEY, anonymousId);
    }
  } else {
    anonymousId = generateId();
  }

  return anonymousId;
}

// Get or create session ID (per tab/session)
function getSessionId(): string {
  if (sessionId) return sessionId;

  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = generateId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } else {
    sessionId = generateId();
  }

  return sessionId;
}

// Parse UTM parameters from URL
function getUtmParams(): AnalyticsContext['campaign'] | undefined {
  if (typeof window === 'undefined') return undefined;

  const params = new URLSearchParams(window.location.search);
  const utm: AnalyticsContext['campaign'] = {};

  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  const campaign = params.get('utm_campaign');
  const term = params.get('utm_term');
  const content = params.get('utm_content');

  if (source) utm.source = source;
  if (medium) utm.medium = medium;
  if (campaign) utm.campaign = campaign;
  if (term) utm.term = term;
  if (content) utm.content = content;

  return Object.keys(utm).length > 0 ? utm : undefined;
}

// Build context object
function buildContext(): AnalyticsContext {
  if (typeof window === 'undefined') {
    return { sessionId: getSessionId() };
  }

  return {
    campaign: getUtmParams(),
    page: {
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      title: document.title,
    },
    userAgent: navigator.userAgent,
    screen: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    sessionId: getSessionId(),
  };
}

// Flush events to server
async function flush(): Promise<void> {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  try {
    await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: events }),
      keepalive: true, // Ensures request completes even on page unload
    });
  } catch (error) {
    // Re-queue events on failure (best effort)
    eventQueue = [...events, ...eventQueue];
    console.debug('[analytics] flush failed, re-queued', error);
  }
}

// Schedule flush
function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL);
}

// Queue an event
function queueEvent(event: AnalyticsEvent): void {
  eventQueue.push(event);
  scheduleFlush();
}

// Public API

/**
 * Track a page view
 */
export function page(name?: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  queueEvent({
    type: 'page',
    anonymousId: getAnonymousId(),
    timestamp: new Date().toISOString(),
    context: buildContext(),
    name,
    properties,
  });
}

/**
 * Track a custom event
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  queueEvent({
    type: 'track',
    anonymousId: getAnonymousId(),
    timestamp: new Date().toISOString(),
    context: buildContext(),
    event,
    properties,
  });
}

/**
 * Identify a user (optional, for future use)
 */
export function identify(userId?: string, traits?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  queueEvent({
    type: 'identify',
    anonymousId: getAnonymousId(),
    userId,
    timestamp: new Date().toISOString(),
    context: buildContext(),
    traits,
  });
}

/**
 * Initialize analytics and set up auto-tracking
 */
export function init(): void {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  // Track initial page view
  page('Landing');

  // Set up scroll depth tracking
  setupScrollTracking();

  // Set up visibility/unload handlers
  setupUnloadTracking();
}

// Scroll depth tracking
let maxScrollDepth = 0;
const scrollThresholds = [25, 50, 75, 100];
const trackedThresholds = new Set<number>();

function setupScrollTracking(): void {
  if (typeof window === 'undefined') return;

  const handleScroll = () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight <= 0) return;

    const currentDepth = Math.round((window.scrollY / scrollHeight) * 100);
    maxScrollDepth = Math.max(maxScrollDepth, currentDepth);

    // Track when crossing thresholds
    for (const threshold of scrollThresholds) {
      if (currentDepth >= threshold && !trackedThresholds.has(threshold)) {
        trackedThresholds.add(threshold);
        track('scroll_depth', { depth: threshold });
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
}

// Track time on page and flush on unload
let pageLoadTime: number;

function setupUnloadTracking(): void {
  if (typeof window === 'undefined') return;

  pageLoadTime = Date.now();

  // Flush on visibility change (tab switch, minimize)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
      track('page_exit', {
        timeOnPage,
        maxScrollDepth,
        isBounce: timeOnPage < 10 && trackedThresholds.size === 0,
      });
      flush();
    }
  });

  // Flush on beforeunload (closing tab)
  window.addEventListener('beforeunload', () => {
    flush();
  });
}

// Export analytics object for convenience
const analytics = {
  init,
  page,
  track,
  identify,
  flush,
};

export default analytics;
