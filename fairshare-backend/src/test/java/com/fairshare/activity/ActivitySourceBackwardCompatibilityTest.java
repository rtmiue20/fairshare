package com.fairshare.activity;

import com.fairshare.activity.controller.ActivityController;
import com.fairshare.activity.dto.ActivityEventDto;
import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.activity.service.ActivityService;
import com.fairshare.common.dto.ApiResponse;
import com.fairshare.team.entity.Team;
import com.fairshare.user.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Backward Compatibility Tests for ActivitySource.TRELLO legacy data (M1)")
class ActivitySourceBackwardCompatibilityTest {

    @Mock
    private ActivityService activityService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("1. ActivitySource.TRELLO enum exists and can be parsed from legacy string")
    void testActivitySourceTrelloExistsAndParses() {
        assertNotNull(ActivitySource.TRELLO, "ActivitySource.TRELLO must be preserved for legacy compatibility");
        assertEquals(ActivitySource.TRELLO, ActivitySource.valueOf("TRELLO"));
        assertEquals("TRELLO", ActivitySource.TRELLO.name());
    }

    @Test
    @DisplayName("2. ActivityEvent with TRELLO source serializes and deserializes cleanly")
    void testActivityEventTrelloSerialization() throws Exception {
        ActivityEventDto dto = ActivityEventDto.builder()
                .id(999L)
                .teamId(10L)
                .userId(1L)
                .source(ActivitySource.TRELLO)
                .eventType("CARD_MOVED")
                .storyPoints(5.0)
                .details("{\"cardId\":\"trello-legacy-123\",\"listName\":\"Done\"}")
                .build();

        String json = objectMapper.writeValueAsString(dto);
        assertTrue(json.contains("\"source\":\"TRELLO\""));

        ActivityEventDto deserialized = objectMapper.readValue(json, ActivityEventDto.class);
        assertEquals(ActivitySource.TRELLO, deserialized.getSource());
        assertEquals("CARD_MOVED", deserialized.getEventType());
    }

    @Test
    @DisplayName("3. ActivityController returns legacy TRELLO activity events without error")
    void testActivityControllerReturnsLegacyTrelloEvents() {
        Team team = new Team();
        team.setId(10L);

        User user = new User();
        user.setId(1L);

        ActivityEvent legacyEvent = new ActivityEvent();
        legacyEvent.setId(1001L);
        legacyEvent.setTeam(team);
        legacyEvent.setUser(user);
        legacyEvent.setSource(ActivitySource.TRELLO);
        legacyEvent.setEventType("CARD_CREATED");
        legacyEvent.setDetails("{\"trelloCardId\":\"c123\"}");
        legacyEvent.setStoryPoints(3.0);
        legacyEvent.setDifficultyLevel(2);
        legacyEvent.setIsOnTime(true);
        legacyEvent.setOccurredAt(LocalDateTime.now());

        when(activityService.getEventsByTeam(10L)).thenReturn(List.of(legacyEvent));

        ActivityController controller = new ActivityController(activityService);
        ResponseEntity<ApiResponse<List<ActivityEventDto>>> response = controller.getByTeam(10L);

        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        List<ActivityEventDto> dtos = response.getBody().getData();
        assertEquals(1, dtos.size());
        assertEquals(ActivitySource.TRELLO, dtos.get(0).getSource());
        assertEquals(1001L, dtos.get(0).getId());
    }
}

