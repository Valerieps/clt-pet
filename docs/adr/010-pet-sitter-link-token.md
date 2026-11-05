# ADR-010: The pet sitter's link carries a random token, stored as is

**Status:** Accepted
**Date:** 2026-11-05
**Decision:** The Manual do Funcionário Temporário (docs/spec/manual-temporario.md) is a link
`/temporario/<token>`, where the token is 64 hex characters (two `crypto.randomUUID()` without
dashes, generated in `server/application/sitter.ts`). The token is stored in `sitter_links.token` as
is, not hashed, so members can copy the link again later. The Worker serves
`GET /api/temporario/<token>` and `GET /api/temporario/<token>/foto/<petId>` without a session and
without the `Origin` check; the `Group` answers only while the link is not revoked and
`expires_on` (Brasília date) has not passed, and returns only `SitterManualView`: names, species,
tags, photo, microchip, allergies, grave active conditions, food and meals, emergency contacts and
the tutors' names. Responses carry `Cache-Control: no-store` and `X-Robots-Tag: noindex`.
**Why:** the sitter is not a member and has no Google invite (spec: "sem login"). A capability link
is the only practical credential. Keeping the token readable lets the owners re-share the same link
instead of creating a new one each time; the database is only reachable through the Worker (ADR-004),
and the exposure of a leaked token is limited by the expiry (at most 90 days), by revoking, and by
the read-only, minimal view (no e-mails, no history).
**Alternatives:** hashing the token like the sessions (the link could not be copied again; a new
link per share). A PIN typed by the sitter (one more thing to pass along, little gain for a link that
is already private). A real account for the sitter (contradicts the spec).
