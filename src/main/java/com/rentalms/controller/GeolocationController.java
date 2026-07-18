package com.rentalms.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rentalms.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Proxy IP geolocation — tranh bi ad-blocker chan o client side.
 * Backend goi truc tiep toi dich vu mien phi, tra ve toa do cho FE.
 */
@RestController
@RequestMapping("/api/geolocate")
@RequiredArgsConstructor
@Slf4j
public class GeolocationController {

    private static final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private static final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me() {
        // Thu ipwho.is truoc (CORS free, HTTPS, khong can key)
        Map<String, Object> result = callIpwho();
        if (result == null) {
            // Fallback ipapi.co
            result = callIpapi();
        }
        if (result == null) {
            return ResponseEntity.status(503)
                    .body(ApiResponse.error("Khong lay duoc vi tri theo IP"));
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    private Map<String, Object> callIpwho() {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://ipwho.is/"))
                    .timeout(Duration.ofSeconds(5))
                    .header("User-Agent", "RentalMS/1.0")
                    .GET()
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;

            JsonNode node = mapper.readTree(resp.body());
            if (!node.path("success").asBoolean(false)) return null;

            Map<String, Object> out = new LinkedHashMap<>();
            out.put("latitude", node.path("latitude").asDouble());
            out.put("longitude", node.path("longitude").asDouble());
            out.put("city", node.path("city").asText(null));
            out.put("region", node.path("region").asText(null));
            out.put("country", node.path("country").asText(null));
            out.put("ip", node.path("ip").asText(null));
            out.put("source", "ipwho.is");
            return out;
        } catch (Exception e) {
            log.warn("ipwho.is failed: {}", e.getMessage());
            return null;
        }
    }

    private Map<String, Object> callIpapi() {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://ipapi.co/json/"))
                    .timeout(Duration.ofSeconds(5))
                    .header("User-Agent", "RentalMS/1.0")
                    .GET()
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) return null;

            JsonNode node = mapper.readTree(resp.body());
            if (!node.has("latitude") || !node.has("longitude")) return null;

            Map<String, Object> out = new LinkedHashMap<>();
            out.put("latitude", node.path("latitude").asDouble());
            out.put("longitude", node.path("longitude").asDouble());
            out.put("city", node.path("city").asText(null));
            out.put("region", node.path("region").asText(null));
            out.put("country", node.path("country_name").asText(null));
            out.put("ip", node.path("ip").asText(null));
            out.put("source", "ipapi.co");
            return out;
        } catch (Exception e) {
            log.warn("ipapi.co failed: {}", e.getMessage());
            return null;
        }
    }
}
