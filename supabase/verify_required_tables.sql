-- Read-only check. Does not drop or alter data.
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'properties',
    'inventory_blocks',
    'admin_profiles',
    'runtime_state',
    'stay_bookings',
    'event_enquiries'
  )
ORDER BY tablename;
