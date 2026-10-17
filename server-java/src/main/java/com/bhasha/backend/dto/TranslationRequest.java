
package com.bhasha.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TranslationRequest(

    @NotBlank(message = "Text is required")
    @Size(max = 5000, message = "Text cannot exceed 5000 characters")
    String text,

    @JsonProperty("source_lang")
    @NotBlank(message = "Source language is required")
    String sourceLang,

    @JsonProperty("target_lang")
    @NotBlank(message = "Target language is required")
    String targetLang,

    String dialect
) {}
