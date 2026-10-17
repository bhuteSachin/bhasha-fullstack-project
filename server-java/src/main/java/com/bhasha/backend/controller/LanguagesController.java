
package com.bhasha.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LanguagesController {

    @GetMapping("/languages")
    public Map<String, Object> getLanguages() {

        List<Map<String, String>> languages = List.of(
            Map.of("code", "en", "name", "English"),
            Map.of("code", "hi", "name", "Hindi"),
            Map.of("code", "mr", "name", "Marathi")
        );

        List<String> dialects = List.of(
            "Standard",
            "Formal",
            "Informal",
            "Rural (Varhadi - Marathi)",
            "Urban (Mumbaiya - Hindi/Marathi)",
            "Pure/Shuddh"
        );

        return Map.of(
            "supported_languages", languages,
            "dialects", dialects
        );
    }
}
