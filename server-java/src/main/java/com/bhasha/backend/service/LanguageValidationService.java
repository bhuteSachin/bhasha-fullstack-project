
package com.bhasha.backend.service;

import org.springframework.stereotype.Service;
import java.util.Set;

@Service
public class LanguageValidationService {

    private final Set<String> supportedLanguages =
            Set.of("en", "hi", "mr");

    public void validate(String sourceLang, String targetLang) {
        if (!supportedLanguages.contains(sourceLang)) {
            throw new IllegalArgumentException(
                    "Unsupported source language: " + sourceLang);
        }

        if (!supportedLanguages.contains(targetLang)) {
            throw new IllegalArgumentException(
                    "Unsupported target language: " + targetLang);
        }
    }
}
