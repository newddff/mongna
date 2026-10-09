# Firebase Admin SDK rollout for SOOP collector

## Status: DRAFT — DO NOT MERGE UNTIL LOCKFILE AND PREVIEW TESTS PASS

The collector now initializes a server-only Firebase Admin credential from `FIREBASE_SERVICE_ACCOUNT` (service-account JSON stored in Vercel), and migrates all SOOP stream and broadcast-status Firestore reads/writes and transaction operations to Admin SDK.

**Known blocker:** `package.json` adds `firebase-admin`, but `package-lock.json` has NOT been regenerated. Before merging, run `npm install --package-lock-only` using the repository checkout and commit the updated `package-lock.json`; verify `npm ci && npm run build`. Do not merge a PR where the lockfile is out of sync.

The deployed key must be for Firebase project `mongna-vod`, valid JSON with `project_id`, `client_email`, `private_key`. Never paste this value into GitHub, chat or logs. Use a distinct, minimally privileged account when feasible.

## Preview testing
1. Ensure `FIREBASE_SERVICE_ACCOUNT` exists for Preview and Production, and `CRON_SECRET` is provisioned on the intended target.
2. Check an unauthenticated GET `/api/soop` returns 401 (never share CRON_SECRET).
3. Trigger an authenticated request through existing trusted scheduler and verify 200. Ensure offline collection updates `mongna_calendar_data/broad_status` without deleting history.
4. Verify online stream creation, viewer sampling, category/title changes and offline closure against original document data. Admin SDK bypasses Firestore client rules, so check correct project and permissions carefully.
5. After production deployment, watch Vercel logs and check historical data and scheduled run health.

Do not modify Firestore security rules yet. Home/calendar/wiki APIs still use Firebase Web SDK. VOD legacy login, scores, recorded media and `custom_vods` are unchanged.
