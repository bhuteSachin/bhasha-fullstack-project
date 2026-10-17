
package com.bhasha.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(

    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    @Size(max = 254, message = "Email is too long")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 12, max = 72,
          message = "Password must be between 12 and 72 characters")
    String password

) {}
