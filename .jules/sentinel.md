## 2025-04-13 - [Overly Permissive CORS and Missing Rate Limit on Public API Endpoint]
**Vulnerability:** The public `api/report.mjs` API endpoint used `res.setHeader("Access-Control-Allow-Origin", "*");` and was missing the standard rate limiter mechanism `consumeRateLimit(ip)`.
**Learning:** Hardcoded wildcard CORS headers combined with missing rate limiting allow unrestricted cross-origin requests, opening the door for CSRF, scraping, and DoS attacks (e.g., spamming the report database with fake reports from any domain). This was an oversight when adding the new serverless function.
**Prevention:** Always use the centralized `standardHeaders()` helper for setting secure CORS headers, and ensure all public-facing endpoints wrap logic in a rate-limiting check (`consumeRateLimit`).
