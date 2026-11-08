package com.fairshare.activity;

import com.fairshare.activity.controller.ActivityController;
import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.activity.service.ActivityService;
import com.fairshare.team.entity.Team;
import com.fairshare.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.JoinColumn;
import org.hibernate.annotations.Immutable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.lang.invoke.MethodHandles;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Immutability & Append-Only Tests for ActivityEvent (M1)")
class ActivityEventImmutabilityTest {

    @Mock
    private ActivityEventRepository mockedRepository;

    private ActivityService activityService;

    @BeforeEach
    void setUp() {
        activityService = new ActivityService(mockedRepository);
    }

    @Test
    @DisplayName("ActivityEvent entity class is annotated with @org.hibernate.annotations.Immutable")
    void testEntityHasHibernateImmutableAnnotation() {
        assertTrue(ActivityEvent.class.isAnnotationPresent(Immutable.class),
                "ActivityEvent must be annotated with @org.hibernate.annotations.Immutable");
    }

    @Test
    @DisplayName("All @Column and @JoinColumn fields in ActivityEvent have updatable = false")
    void testAllColumnsAreNonUpdatable() {
        for (Field field : ActivityEvent.class.getDeclaredFields()) {
            if (field.isAnnotationPresent(Column.class)) {
                Column col = field.getAnnotation(Column.class);
                assertFalse(col.updatable(),
                        "Field '" + field.getName() + "' @Column must have updatable = false");
            }
            if (field.isAnnotationPresent(JoinColumn.class)) {
                JoinColumn joinCol = field.getAnnotation(JoinColumn.class);
                assertFalse(joinCol.updatable(),
                        "Field '" + field.getName() + "' @JoinColumn must have updatable = false");
            }
        }
    }

    @Test
    @DisplayName("JPA @PreUpdate and @PreRemove callbacks on ActivityEvent throw UnsupportedOperationException")
    void testEntityLifecycleCallbacksBlockUpdateAndRemove() throws Exception {
        ActivityEvent event = new ActivityEvent();

        Method onUpdateMethod = ActivityEvent.class.getDeclaredMethod("onUpdate");
        onUpdateMethod.setAccessible(true);

        InvocationTargetException updateEx = assertThrows(InvocationTargetException.class,
                () -> onUpdateMethod.invoke(event));
        assertInstanceOf(UnsupportedOperationException.class, updateEx.getCause());

        assertThrows(UnsupportedOperationException.class, event::onRemove);
    }

    @Test
    @DisplayName("ActivityService blocks updateActivity, deleteActivity, deleteAllActivities, and updating existing event")
    void testActivityServiceBlocksUpdateAndDelete() {
        ActivityEvent existingEvent = new ActivityEvent();
        existingEvent.setId(99L);

        assertThrows(UnsupportedOperationException.class,
                () -> activityService.updateActivity(99L, existingEvent));
        assertThrows(UnsupportedOperationException.class,
                () -> activityService.deleteActivity(99L));
        assertThrows(UnsupportedOperationException.class,
                () -> activityService.deleteActivity(existingEvent));
        assertThrows(UnsupportedOperationException.class,
                () -> activityService.deleteAllActivities());
        assertThrows(UnsupportedOperationException.class,
                () -> activityService.saveActivity(existingEvent));
    }

    @Test
    @DisplayName("ActivityService allows appending a new ActivityEvent and computes completionStatus accurately")
    void testActivityServiceAllowsInsertAndComputesCompletionStatus() {
        Team team = new Team();
        team.setId(1L);
        User user = new User();
        user.setId(2L);

        when(mockedRepository.save(any(ActivityEvent.class))).thenAnswer(inv -> inv.getArgument(0));

        ActivityEvent onTimeEvent = activityService.logActivity(
                team, user, ActivitySource.BOARD, "CARD_COMPLETED",
                "Completed card on time", LocalDateTime.now(), null,
                5.0, 2, true, 0.0, false, false, false);

        assertEquals("ON_TIME", onTimeEvent.getCompletionStatus());
        assertTrue(onTimeEvent.getIsOnTime());
        assertEquals(0.0, onTimeEvent.getDelayDays());

        ActivityEvent lateEvent = activityService.logActivity(
                team, user, ActivitySource.BOARD, "CARD_COMPLETED",
                "Completed card late", LocalDateTime.now(), null,
                5.0, 3, false, 2.5, false, false, false);

        assertEquals("LATE", lateEvent.getCompletionStatus());
        assertFalse(lateEvent.getIsOnTime());
        assertEquals(2.5, lateEvent.getDelayDays());
    }

    @Test
    @DisplayName("ActivityEventRepository default delete methods throw UnsupportedOperationException")
    void testRepositoryDefaultDeleteMethodsThrowUnsupportedOperationException() {
        ActivityEventRepository repoProxy = (ActivityEventRepository) Proxy.newProxyInstance(
                ActivityEventRepository.class.getClassLoader(),
                new Class<?>[]{ActivityEventRepository.class},
                (proxy, method, args) -> {
                    if (method.isDefault()) {
                        return MethodHandles.lookup()
                                .findSpecial(
                                        ActivityEventRepository.class,
                                        method.getName(),
                                        java.lang.invoke.MethodType.methodType(method.getReturnType(), method.getParameterTypes()),
                                        ActivityEventRepository.class)
                                .bindTo(proxy)
                                .invokeWithArguments(args != null ? args : new Object[0]);
                    }
                    throw new UnsupportedOperationException("Not a default method");
                }
        );

        ActivityEvent event = new ActivityEvent();
        event.setId(1L);

        assertThrows(UnsupportedOperationException.class, () -> repoProxy.deleteById(1L));
        assertThrows(UnsupportedOperationException.class, () -> repoProxy.delete(event));
        assertThrows(UnsupportedOperationException.class, () -> repoProxy.deleteAll());
        assertThrows(UnsupportedOperationException.class, () -> repoProxy.deleteAll(List.of(event)));
        assertThrows(UnsupportedOperationException.class, () -> repoProxy.deleteAllById(List.of(1L)));
        assertThrows(UnsupportedOperationException.class, () -> repoProxy.deleteAllInBatch());
        assertThrows(UnsupportedOperationException.class, () -> repoProxy.deleteAllInBatch(List.of(event)));
        assertThrows(UnsupportedOperationException.class, () -> repoProxy.deleteAllByIdInBatch(List.of(1L)));
    }

    @Test
    @DisplayName("ActivityController exposes zero PUT, PATCH, or DELETE endpoints")
    void testActivityControllerExposesNoMutatingEndpoints() {
        for (Method method : ActivityController.class.getDeclaredMethods()) {
            assertFalse(method.isAnnotationPresent(PutMapping.class),
                    "ActivityController must not expose @PutMapping on " + method.getName());
            assertFalse(method.isAnnotationPresent(PatchMapping.class),
                    "ActivityController must not expose @PatchMapping on " + method.getName());
            assertFalse(method.isAnnotationPresent(DeleteMapping.class),
                    "ActivityController must not expose @DeleteMapping on " + method.getName());

            if (method.isAnnotationPresent(RequestMapping.class)) {
                RequestMapping rm = method.getAnnotation(RequestMapping.class);
                List<RequestMethod> forbidden = List.of(RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE);
                for (RequestMethod m : rm.method()) {
                    assertFalse(forbidden.contains(m),
                            "ActivityController must not expose " + m + " on " + method.getName());
                }
            }
        }
    }
}

