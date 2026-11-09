# ADR-009: Pet photos live in the Group's SQLite, shrunk by the app

**Status:** Accepted
**Date:** 2026-11-04
**Decision:** The app shrinks the picture (canvas, at most 640 px on the long side, JPEG) and sends it as base64 in the `pet.setPhoto` command. The server accepts only a base64 JPEG of at most `PHOTO_MAX_BASE64` characters (about 300 kB) and stores it in `pet_photos` (one row per pet, with `updated_at`). `GET /api/pets/<id>/photo` serves it to signed-in members; the address carries `?v=<updated_at>` (the `photoVersion` of `PetView`), so the browser caches it for good and a new photo is a new address.
**Why:** Three pets, two tutors: a few dozen kilobytes in total. The data already lives in one Durable Object (ADR-004), so the photo shares its transaction, backup and access check, and no new Cloudflare resource, binding or secret is needed. `img-src` stays `'self'`, so `network-policy.ts` does not change.
**Alternatives:** R2: a second paid-plan-shaped resource to create by hand, bind and secure for a handful of small files. A direct upload to R2 with signed URLs: needs a new origin in the CSP and in `network-policy.ts`. Revisit when exam PDFs arrive (phase 2), which are large and may justify R2 on their own; the photos can move then.
