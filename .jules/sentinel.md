## 2024-05-18 - [Missing Authorization and Weak PRNG]
**Vulnerability:** The `/api/report` DELETE endpoint was missing an authorization check, allowing any user to delete reports. Additionally, the report IDs were generated using a weak pseudo-random number generator (`Math.random()`), which could allow attackers to guess the `reportId`.
**Learning:** Found two common security vulnerabilities that must be actively guarded against: unprotected admin/moderation endpoints and the use of weak PRNGs for sensitive ID generation.
**Prevention:** Always verify that state-mutating or privileged operations are authenticated and authorized (e.g., using `assertAdminAccess`). Use `crypto.randomBytes` or a similar cryptographically secure method for generating random IDs.
