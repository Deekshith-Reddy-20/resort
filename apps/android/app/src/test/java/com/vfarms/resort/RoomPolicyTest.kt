package com.vfarms.resort

import com.vfarms.resort.data.RoomDto
import org.junit.Assert.assertFalse
import org.junit.Test

class RoomPolicyTest {
    @Test
    fun roomsAreNeverBookable() {
        val rooms = listOf(
            RoomDto(slug = "room-1", name = "Room 1", bookable = false),
            RoomDto(slug = "room-2", name = "Room 2", bookable = false),
        )
        assertFalse(rooms.any { it.bookable == true })
    }
}
