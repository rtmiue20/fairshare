package com.fairshare.team.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConsentRequest {
    private boolean consented;
    private Boolean shareTrelloActivity;
    private Boolean shareDocsActivity;
}
