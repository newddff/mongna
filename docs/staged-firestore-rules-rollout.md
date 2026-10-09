# Firestore staged rules rollout — not yet deployed

## Findings from source audit
- SOOP collector (`src/app/api/soop/route.ts`) uses server-only Firebase Admin SDK to write `mongna_streams` and `mongna_calendar_data/broad_status`.
- Admin settings and calendar/wiki (`src/app/api/admin/**`) use Firebase Admin SDK for `home_settings_v2`, `schedule_data`, `sidebar_state`, `category_colors`, `streamer_directory`, `wiki_data`.
- **Important exceptions:** `public/reward.html` still directly writes `reward_data_v3` and `reward_settings_v4`; `public/song.html` writes `song_book` using browser Firebase Web SDK. Their existing editing functionality would break if all `mongna_calendar_data` writes were denied at once.
- Legacy VOD client still writes `mongna_users`, `mongna_records`, `mongna_live_viewers`; older plaintext passwords and exposed writes are **still a separate security issue**.

## Exact behavior of `firestore.rules.staged`
- Read access remains public for broadcast, admin-display, reward and song data.
- Client writes denied on `mongna_streams` and migrated admin/broadcast docs.
- Client writes remain permitted on exactly three static-page docs: `reward_data_v3`, `reward_settings_v4`, `song_book`. **These remain unprotected and can still be modified by strangers**; must be migrated later.
- Current VOD permissions preserved without destructive migration.
- `custom_vods` writes stay denied as in supplied live rules; verify separate VOD override admin page before changing it.

## Before publishing in Firebase Console
1. Obtain **current live Firestore Rules** and compare with the staged file; this proposal is based on the rules previously supplied and a source-code inventory, not a current rules export. Do not overwrite any additional deployed collection rules blindly.
2. Use Firebase Rules Playground or Emulator to simulate unauthenticated writes: `mongna_streams/test` -> DENY; `mongna_calendar_data/home_settings_v2` -> DENY; `.../schedule_data` -> DENY; `.../reward_data_v3` -> ALLOW; `.../song_book` -> ALLOW.
3. Verify that Firestore owner/server SDK writes (Admin SDK) are unaffected; deploy this only after Production Admin SDK routes and the external SOOP cron job have been observed operating correctly.
4. Record currently deployed rules as rollback copy before any publish.
5. Publish during a quiet period. Test Production homepage admin save, calendar add/edit/delete, wiki edit, SOOP cron, reward save, song save, VOD playback/login/ranking/new video addition. Check function logs and Firestore permission errors. If failures occur, roll back promptly.
6. Next: move reward/song to authenticated server API and remove their temporary exceptions; then plan privacy-safe migration of VOD accounts and collection rules.

No security rules have been published from this GitHub PR. Firebase console publication is a **separate deliberate action**.
