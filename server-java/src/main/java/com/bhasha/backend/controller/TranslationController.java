
package com.bhasha.backend.controller;

import com.bhasha.backend.dto.TranslationRequest;
import com.bhasha.backend.service.LanguageValidationService;
import com.bhasha.backend.service.TranslationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class TranslationController {

    private final TranslationService translationService;
    private final LanguageValidationService languageValidationService;

    public TranslationController(
            TranslationService translationService,
            LanguageValidationService languageValidationService) {
        this.translationService = translationService;
        this.languageValidationService = languageValidationService;
    }

    @PostMapping("/translate")
    public Map<String, String> translate(
            @Valid @RequestBody TranslationRequest request) {

        languageValidationService.validate(
                request.sourceLang(),
                request.targetLang());

        return translationService.translate(request);
    }
}
