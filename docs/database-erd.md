# FairShare database ERD

The existing `teams` and `team_members` tables represent the Group and Member
concepts in the M4 checklist. They are reused rather than introducing duplicate
Group/Member tables.

```mermaid
erDiagram
    USERS ||--o{ TEAM_MEMBERS : joins
    TEAMS ||--o{ TEAM_MEMBERS : contains
    TEAMS ||--o{ EXPENSES : records
    TEAM_MEMBERS ||--o{ EXPENSES : pays
    EXPENSES ||--|{ SPLITS : allocates
    TEAM_MEMBERS ||--o{ SPLITS : owes

    USERS {
        bigint id PK
        varchar email UK
        varchar password
        varchar full_name
    }
    TEAMS {
        bigint id PK
        varchar name
        text description
    }
    TEAM_MEMBERS {
        bigint id PK
        bigint team_id FK
        bigint user_id FK
        varchar role
    }
    EXPENSES {
        bigint id PK
        bigint team_id FK
        bigint paid_by_member_id FK
        varchar title
        decimal amount
        varchar currency
        varchar split_method
        date expense_date
    }
    SPLITS {
        bigint id PK
        bigint expense_id FK
        bigint team_member_id FK
        decimal amount
    }
```

Database constraints prevent duplicate team membership and duplicate member
allocations for one expense. `SplitService` also verifies that all participants
belong to the expense team and that their allocated amounts add up exactly to
the expense amount.
