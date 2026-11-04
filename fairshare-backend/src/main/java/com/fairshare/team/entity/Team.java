package com.fairshare.team.entity;

import com.fairshare.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "teams")
public class Team extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "course_name")
    private String courseName;

    private String description;

    @Column(name = "invite_code", unique = true)
    private String inviteCode;
}
