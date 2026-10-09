# Firestore write-path inventory and safe rules migration (2026-10-09)

## Decision
**Do not deploy deny-write Firestore rules yet.** The existing browser and server code both rely on Firestore Web SDK writes accepted by current permissive rules. A Next.js route using the Web SDK is **not** a privileged Firebase Admin SDK writer. The signed administrator cookie protects only the HTTP endpoint, not direct Firestore requests.

## Observed write/read paths

| Path | Collection / document | Writes | Migration blocker |
|---|---|---|---|
| `src/app/api/soop/route.ts` | `mongna_streams/{broadcastId}`, `mongna_calendar_data/broad_status` | Live stream creation, samples, title/category changes, offline closure | Uses Firestore Web SDK. Closing writes breaks scheduled collection. |
| `src/app/api/admin/home-settings/route.ts` | `mongna_calendar_data/home_settings_v2` | Admin settings | Signed admin cookie and Origin checked, **but Web SDK writes**; direct Firestore access bypasses API. |
| `src/app/api/admin/calendar-data/route.ts` | Five `mongna_calendar_data` docs | Calendar/wiki/directory/sidebar/colors | Same API-to-Web-SDK limitation. |
| `public/vod.html` | `mongna_users`, `mongna_records`, `mongna_live_viewers` | Signup, legacy login-related updates, points, monthly snapshots, presence | Client directly writes; keep account login/rank/history and VOD access working. |
| `src/app/admin/custom-vod/page.tsx` | `custom_vods` | Manual VOD ID add/delete attempted from browser | Current reported rules deny writes; do not treat existing admin page as functional without test. |
| `src/app/api/custom-vods/route.ts` and `public/vod.html` | `custom_vods` | Reads saved override IDs | Preserve existing list and playback. |

## Required safe implementation order

1. Add `firebase-admin` as a **server-only** dependency with matching `package-lock.json`. Provision a dedicated Firebase service account JSON to Vercel **encrypted environment variables**, Preview and Production, with only the permissions required. Keep credentials outside Git and never expose to client code. Rotate/restrict keys if exposed.
2. Migrate the SOOP cron route to Admin SDK first. Preserve current transaction behavior, sample arrays, stream IDs, offline closure and category timestamps. Run a real scheduled collection test while current rules remain; verify both live and offline processing.
3. Move authenticated admin route writers to the same server-only Admin SDK. Check admin-session expiration/logout and same-origin enforcement; do not rely on client `localStorage` for permission.
4. Identify any other writes to `mongna_calendar_data` and `mongna_streams` outside the paths listed here, including any private backend or separate external recorder, **before** publishing rules.
5. Separately plan a VOD user migration: legacy plaintext password fields in publicly readable `mongna_users` documents must cease to be exposed. Preserve old login, account IDs, saved historical rankings and ability to add new VODs. Avoid locking `mongna_users` until this has been tested end-to-end.
6. After the server-side routes are deployed, tested and the other writers are accounted for, publish restrictive Firestore rules in a controlled rollout, with rollback plans and monitoring.

## Production smoke-test checklist
- Admin home settings save, persist after refresh; unauthenticated POST -> 401.
- Calendar add/edit/delete, sidebar, colors, streamer directory; wiki edit and reload.
- SOOP cron authorized with existing configured secret; no access without secret; stream goes live, samples update, stream closes offline.
- Existing VOD playback, manual override reads, user login/signup, points and past monthly rankings.
- Check Firestore errors and Vercel logs before narrowing any rules.

## Scope of this PR
The only executable change is safer comparison of the incoming SOOP bearer token with the configured `CRON_SECRET`, without changing authorization outcomes for valid/invalid tokens or the SOOP data collection logic. **No Firebase rules, stored VOD data, or write paths are changed.**
