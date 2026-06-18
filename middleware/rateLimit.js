// Simple in-memory rate limiter
const requests = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per window

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = requests.get(ip);
  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ message: 'Too many requests, try again later' });
  }
  next();
}

// Input sanitization
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>\"\';&|`$]/g, '');
}

module.exports = { rateLimit, sanitize };
