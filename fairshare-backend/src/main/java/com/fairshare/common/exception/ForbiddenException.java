package com.fairshare.common.exception;

/**
 * Exception nem ra khi nguoi dung khong co du quyen han (vi du: Thanh vien goi API chi danh cho Leader).
 * Ke thua BusinessException de tuong thich 100% voi cac exception handler va unit test hien co,
 * dong thoi duoc GlobalExceptionHandler map ve HTTP 403 Forbidden.
 */
public class ForbiddenException extends BusinessException {

    public ForbiddenException(String message) {
        super(message);
    }
}

