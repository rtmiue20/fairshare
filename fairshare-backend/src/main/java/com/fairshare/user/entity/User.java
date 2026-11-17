package com.fairshare.user.entity;

import com.fairshare.common.audit.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "student_id", length = 50)
    private String studentId;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "major")
    private String major;

    @Column(name = "team_role")
    private String teamRole;

    @Column(name = "bio", length = 1000)
    private String bio;

    @Column(name = "github_username", length = 100)
    private String githubUsername;
}
