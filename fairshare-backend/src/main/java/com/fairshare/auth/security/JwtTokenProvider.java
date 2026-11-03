package com.fairshare.auth.security;

import org.springframework.security.core.userdetails.UserDetails;

public interface JwtTokenProvider {
    String generateToken(String email);
    String generateToken(UserDetails userDetails);
    String extractUsername(String token);
    boolean validateToken(String token);
    boolean validateToken(String token, UserDetails userDetails);
}

