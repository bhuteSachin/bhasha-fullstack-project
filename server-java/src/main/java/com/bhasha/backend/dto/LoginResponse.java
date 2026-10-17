
package com.bhasha.backend.dto;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        String id,
        String email,
        String role
) {}
