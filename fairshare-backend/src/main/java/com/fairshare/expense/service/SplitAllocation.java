package com.fairshare.expense.service;

import java.math.BigDecimal;

public record SplitAllocation(Long teamMemberId, BigDecimal amount) {
}
