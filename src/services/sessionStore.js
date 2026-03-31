/**
 * In-memory session store with TTL cleanup.
 * Maintains a forward map (sessionId → session) and a reverse map (callId → sessionId).
 */

const DEFAULT_TTL = 600_000; // 10 minutes
const CLEANUP_INTERVAL = 60_000; // 1 minute

/** @type {Map<string, {sseResponse: object|null, callId: string|null, createdAt: Date, ttl: number}>} */
const sessions = new Map();

/** @type {Map<string, string>} callId → sessionId */
const callIdIndex = new Map();

let cleanupTimer = null;

/**
 * Create a new session entry.
 * @param {string} sessionId
 * @param {object} [options]
 * @param {string} [options.callId]
 * @param {number} [options.ttl]
 */
export function createSession(sessionId, { callId = null, ttl = DEFAULT_TTL } = {}) {
  sessions.set(sessionId, {
    sseResponse: null,
    callId,
    createdAt: new Date(),
    ttl,
  });
  if (callId) {
    callIdIndex.set(callId, sessionId);
  }
}

/**
 * Get a session by its ID.
 * @param {string} sessionId
 * @returns {object|undefined}
 */
export function getSession(sessionId) {
  return sessions.get(sessionId);
}

/**
 * Find a session by Retell call ID.
 * @param {string} callId
 * @returns {object|undefined}
 */
export function getSessionByCallId(callId) {
  const sessionId = callIdIndex.get(callId);
  if (!sessionId) return undefined;
  return sessions.get(sessionId);
}

/**
 * Link a Retell call_id to an existing session.
 * @param {string} sessionId
 * @param {string} callId
 * @returns {boolean} true if session found and linked
 */
export function linkCallId(sessionId, callId) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.callId = callId;
  callIdIndex.set(callId, sessionId);
  return true;
}

/**
 * Set the SSE response stream for a session.
 * @param {string} sessionId
 * @param {object} response - Fastify raw response
 */
export function setSseResponse(sessionId, response) {
  const session = sessions.get(sessionId);
  if (session) {
    session.sseResponse = response;
  }
}

/**
 * Remove a session and its reverse index.
 * @param {string} sessionId
 */
export function removeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session?.callId) {
    callIdIndex.delete(session.callId);
  }
  sessions.delete(sessionId);
}

/**
 * Remove expired sessions.
 */
function cleanup() {
  const now = Date.now();
  for (const [sessionId, session] of sessions) {
    if (now - session.createdAt.getTime() > session.ttl) {
      if (session.callId) {
        callIdIndex.delete(session.callId);
      }
      sessions.delete(sessionId);
    }
  }
}

/**
 * Start the periodic cleanup timer.
 */
export function startCleanup() {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL);
    cleanupTimer.unref();
  }
}

/**
 * Stop the cleanup timer (for graceful shutdown).
 */
export function stopCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
