
package com.bhasha.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.HttpServerErrorException;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(
            IllegalArgumentException ex) {

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }
 
    @ExceptionHandler(HttpServerErrorException.ServiceUnavailable.class)
public ResponseEntity<Map<String, String>> handleGeminiUnavailable(
        HttpServerErrorException.ServiceUnavailable ex) {

    return ResponseEntity
            .status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(Map.of(
                    "error", "Translation service is temporarily busy.",
                    "message", "Please try again in a minute."
            ));
}

    // @ExceptionHandler(IllegalArgumentException.class)
    // public ResponseEntity<Map<String, String>> handleIllegalArgument(
    //         IllegalArgumentException ex) {

    //     return ResponseEntity
    //             .status(HttpStatus.CONFLICT)
    //             .body(Map.of("message", ex.getMessage()));
    // }

}
