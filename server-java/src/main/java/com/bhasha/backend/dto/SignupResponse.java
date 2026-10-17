
package com.bhasha.backend.dto;

public record SignupResponse(
    String id,
    String email,
    String role,
    String message
) {}
