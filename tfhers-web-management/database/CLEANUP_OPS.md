# Cleanup ops notes (tfhers-web-management)

## Config (application.yml -> cleanup.*)
- rooms.retention-days: 7 (CLOSED rooms hard-deleted after N days)
- rooms.cron: 0 30 3 * * ? (daily 03:30 server local time)
- oss-orphans.dry-run: true by default (scan only; set false to actually delete)
- oss-orphans.min-age-days: 7
- content-reports.retention-days: 90 (status != 0)

## Manual admin APIs (Bearer admin JWT; userId must exist in admin_users)
- POST /api/admin/cleanup/rooms
- POST /api/admin/cleanup/oss-orphans
- POST /api/admin/cleanup/reports
- POST /api/admin/cleanup/run-all

## Verify SQL
SELECT status, COUNT(*) FROM rooms GROUP BY status;
SELECT COUNT(*) FROM rooms WHERE status='CLOSED' AND closed_at < NOW() - INTERVAL 7 DAY;
SELECT COUNT(*) FROM room_members;
SELECT COUNT(*) FROM room_messages;

## Force a room eligible for purge (test only)
-- UPDATE rooms SET closed_at = NOW() - INTERVAL 8 DAY WHERE id = ? AND status='CLOSED';
-- then POST /api/admin/cleanup/rooms or wait for cron

## Index
database/cleanup_indexes.sql (idx_rooms_closed_at)