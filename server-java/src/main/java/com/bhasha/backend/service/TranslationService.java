
package com.bhasha.backend.service;

import com.bhasha.backend.dto.TranslationRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
public class TranslationService {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    private static final int MAX_ATTEMPTS = 3;

    public TranslationService(
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model}") String model) {

        this.apiKey = apiKey;
        this.model = model;
        this.restClient = RestClient.create();
    }

    public Map<String, String> translate(TranslationRequest request) {

        if (apiKey.isBlank()) {
            throw new IllegalStateException(
                    "GEMINI_API_KEY environment variable is missing");
        }

        String dialect = request.dialect();

        if (dialect == null || dialect.isBlank()) {
            dialect = "Standard";
        }

        String prompt = """
                Translate the following text from language code %s
                to language code %s.

                Dialect or style: %s

                Return only the translated text, without explanations.

                Text:
                %s
                """.formatted(
                request.sourceLang(),
                request.targetLang(),
                dialect,
                request.text());

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)))));

        Map<?, ?> response = callGeminiWithRetry(requestBody);

        if (response == null) {
            throw new IllegalStateException(
                    "Gemini returned an empty response");
        }

        List<?> candidates = (List<?>) response.get("candidates");

        if (candidates == null || candidates.isEmpty()) {
            throw new IllegalStateException(
                    "Gemini did not return a translation");
        }

        Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
        Map<?, ?> content = (Map<?, ?>) candidate.get("content");
        List<?> parts = (List<?>) content.get("parts");
        Map<?, ?> firstPart = (Map<?, ?>) parts.get(0);

        String translatedText = (String) firstPart.get("text");

        return Map.of(
                "translated_text", translatedText,
                "source_lang", request.sourceLang(),
                "target_lang", request.targetLang(),
                "dialect", dialect);
    }

    private Map<?, ?> callGeminiWithRetry(
            Map<String, Object> requestBody) {

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                return restClient.post()
                        .uri("https://generativelanguage.googleapis.com/v1beta/models/"
                                + model + ":generateContent")
                        .header("x-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(Map.class);

            } catch (HttpStatusCodeException ex) {

                int status = ex.getStatusCode().value();
                boolean retryable = status == 429 || status == 503;

                if (!retryable) {
                    throw ex;
                }

                if (attempt == MAX_ATTEMPTS) {
                    throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "Translation service is temporarily busy. Please try again in a minute.",
                            ex);
                }

                long delayMillis = attempt * 1000L;

                try {
                    Thread.sleep(delayMillis);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();

                    throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "Translation retry was interrupted.",
                            interrupted);
                }
            }
        }

        throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Translation service is temporarily busy.");
    }
}
