package com.fairshare.integration.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncResult {
    private boolean success;
    private int eventsSynced;
    private String message;
}
