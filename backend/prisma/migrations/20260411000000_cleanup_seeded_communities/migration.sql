-- Delete auto-seeded default communities.
-- All related rows (community_members, community_posts, community_polls, etc.)
-- have ON DELETE CASCADE foreign keys, so one DELETE is enough.
DELETE FROM "communities"
WHERE name IN (
  'MBBS Finals 2026',
  'Bar Exam Prep',
  'Engineering Survivors',
  'ICAN 2026 Prep',
  'Pharm D Cohort'
);
