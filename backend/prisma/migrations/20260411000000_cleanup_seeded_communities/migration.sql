-- Delete auto-seeded default communities.
-- CommunityMember, CommunityPost, CommunityPoll etc. all have
-- ON DELETE CASCADE from Community, so one DELETE cleans everything.
DELETE FROM "Community"
WHERE name IN (
  'MBBS Finals 2026',
  'Bar Exam Prep',
  'Engineering Survivors',
  'ICAN 2026 Prep',
  'Pharm D Cohort'
);
