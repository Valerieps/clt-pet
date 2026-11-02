# ADR-008: Web Push to the phones, through the browsers' push services

**Status:** Accepted
**Date:** 2026-11-02
**Decision:** Reminders reach the phones as Web Push notifications (PWA, service worker). The Worker
sends them from the cron (`GroupService.tick`) and from commands that escalate. Each device
subscribes from the app and the subscription is stored per member. `SERVER_ORIGINS` in
`network-policy.ts` gains the three push services the browsers use: `https://fcm.googleapis.com`
(Chrome, Android), `https://updates.push.services.mozilla.com` (Firefox) and
`https://web.push.apple.com` (Safari, iPhone). The VAPID private key is a Worker secret
(`VAPID_PRIVATE_KEY`); the public key is in `wrangler.jsonc` vars. The app itself still talks only
to its own origin.
**Why:** The spec (`docs/spec/lembretes.md`) asks for push on the phone and nothing else for now.
Push needs no paid service and no account besides the VAPID key pair. Listing the origins keeps the
rule "one place says which servers" true, and refuses a subscription whose endpoint is anywhere else.
**Alternatives:** E-mail or calendar events (the spec's fallback) need another service or the
member's calendar, and nobody opens them as fast as a push. A third-party push provider adds an
account, a dependency and a place where the members' data goes.
