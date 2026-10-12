UPDATE room_profiles
SET image_path = '/images/rooms/' || slug || '.png',
    details_status = 'owner_photograph_published'
WHERE slug IN ('room-1', 'room-2', 'room-3', 'room-4', 'room-5');
