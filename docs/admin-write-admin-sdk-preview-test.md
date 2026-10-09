# Admin writes via Firebase Admin SDK

This PR migrates the existing authenticated POST routes for home settings and calendar/wiki to server-only Firebase Admin SDK. They continue to require a valid signed HttpOnly admin session and matching request Origin. Existing document IDs and merge semantics remain unchanged.

## Preview smoke tests (before merge)
- Confirm Preview has `FIREBASE_SERVICE_ACCOUNT`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` configured, and redeploy Preview after environment edits.
- Log in on the **same Preview hostname**; try home settings save, then refresh.
- Calendar: add, edit, delete a *test-only* schedule; verify refresh.
- Wiki: change a reversible test entry, save, refresh, revert.
- Check unauthenticated POSTs return 401; cross-origin POST should return 403.
- If Firebase throws 500, check Vercel function logs and service-account project/permissions. Never expose secrets.

**Do not change Firestore rules yet.** SOOP is migrated, but other clients and recorders may still rely on Firestore public writes, especially legacy VOD `mongna_users`, `mongna_records`, `mongna_live_viewers`, and any private recording service.

This PR does not modify existing VOD data, subscriptions, SOOP cron route, homepage reads, calendar/wiki reads, or Firestore rules.
