# Supabase manual backup — 2026-09-29

Project: `zjtofadvudkfijlpptmb`

The Supabase Table Editor exported row-level SQL for every non-empty public table before the v2 schema migration:

- `missionary_points_rows.sql` — 22 rows
- `pois_rows.sql` — 4 rows
- `user_submissions_rows.sql` — 1 row
- `vr_scenes_rows.sql` — 1 row
- `vr_works_rows.sql` — 1 row
- `vr_hotspots` — 0 rows, so the dashboard produced no row export

SHA-256:

```text
ecc5cdd114c8c4716e3f7cbcf6eddaab47421d0dab225e0839a502751eaff1eb  missionary_points_rows.sql
911b184429ab22fa538113c6d1b6afd6b640cedd0ca765b32272aa41283249d0  pois_rows.sql
3604d7b58575c17d8228fe57a0ae12eb1c45aaac91b6c1b6be9c656ed1ce3209  user_submissions_rows.sql
886b4da677431d80ff2276995fa129e22559f6f8318eade4e09c8bf1d0148883  vr_scenes_rows.sql
2fda3b57cadb19aab8f93fac5acac937c8f58dc7c746eb59b60de5a02f5cccaa  vr_works_rows.sql
```

Storage audit:

- `history-media`: empty
- `media/videos`: dashboard directory existed but contained no object
- `vr-media/image`: empty
- `poi-media/cover`, `docs`, and `gallery`: empty
- `poi-media/video`: one object was visible in the dashboard

The legacy `missionary_points` export contains one `video_url` pointing at a different object under `media/videos`; that referenced object was not present during the audit. Treat it as a broken legacy link until a separate copy is recovered.

This is a manual data export, not a Supabase physical backup. Authentication secrets and managed service internals are intentionally not included.
