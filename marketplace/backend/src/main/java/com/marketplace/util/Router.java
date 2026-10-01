package com.marketplace.util;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import com.marketplace.model.User;
import com.marketplace.store.DataStore;

/**
 * Minimal REST router standing in for Spring MVC's @RestController/@GetMapping
 * annotations, since Spring Boot cannot be downloaded without network access
 * in this sandbox. Route signatures below mirror what the equivalent
 * @RestController methods would look like.
 */
public class Router implements HttpHandler {

    public interface Route {
        Object handle(HttpExchange ex, Map<String, String> pathParams, Map<String, Object> body) throws Exception;
    }

    private record Entry(String method, Pattern pattern, List<String> paramNames, Route route) {}

    private final List<Entry> entries = new ArrayList<>();

    public void add(String method, String pathTemplate, Route route) {
        List<String> names = new ArrayList<>();
        StringBuilder regex = new StringBuilder("^");
        for (String part : pathTemplate.split("/")) {
            if (part.isEmpty()) continue;
            regex.append('/');
            if (part.startsWith("{") && part.endsWith("}")) {
                names.add(part.substring(1, part.length() - 1));
                regex.append("([^/]+)");
            } else {
                regex.append(Pattern.quote(part));
            }
        }
        regex.append("/?$");
        entries.add(new Entry(method, Pattern.compile(regex.toString()), names, route));
    }

    public void get(String path, Route route) { add("GET", path, route); }
    public void post(String path, Route route) { add("POST", path, route); }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String fullPath = exchange.getRequestURI().getPath();
        Map<String, String> query = parseQuery(exchange.getRequestURI().getQuery());

        // CORS so the demo frontend (served separately) can call this API.
        String origin = exchange.getRequestHeaders().getFirst("Origin");
        if ("http://localhost:8080".equals(origin) || "http://127.0.0.1:8080".equals(origin)) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", origin);
            exchange.getResponseHeaders().set("Vary", "Origin");
        }
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if ("OPTIONS".equals(method)) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        for (Entry e : entries) {
            if (!e.method.equals(method)) continue;
            Matcher m = e.pattern.matcher(fullPath);
            if (!m.matches()) continue;

            Map<String, String> pathParams = new LinkedHashMap<>();
            for (int i = 0; i < e.paramNames.size(); i++) {
                pathParams.put(e.paramNames.get(i), m.group(i + 1));
            }
            pathParams.putAll(query); // query params available too

            try {
                String bodyText = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                Map<String, Object> body = bodyText.isBlank() ? new LinkedHashMap<>() : Json.parseObject(bodyText);
                Object result = e.route.handle(exchange, pathParams, body);
                writeJson(exchange, 200, result);
            } catch (ApiError ae) {
                writeJson(exchange, ae.status, Map.of("error", ae.getMessage()));
            } catch (Exception ex) {
                writeJson(exchange, 500, Map.of("error", "Internal error: " + ex.getMessage()));
            }
            return;
        }
        writeJson(exchange, 404, Map.of("error", "No route for " + method + " " + fullPath));
    }

    public static User requireAuthenticated(HttpExchange exchange, DataStore store) {
        String token = bearerToken(exchange);
        if (token == null) {
            throw new ApiError(401, "Authentication required");
        }
        User user = store.userForToken(token);
        if (user == null) throw new ApiError(401, "Invalid or expired token");
        return user;
    }

    public static String bearerToken(HttpExchange exchange) {
        String header = exchange.getRequestHeaders().getFirst("Authorization");
        if (header == null || !header.startsWith("Bearer ") || header.length() <= 7) return null;
        String token = header.substring(7).trim();
        return token.isEmpty() ? null : token;
    }

    public static class ApiError extends RuntimeException {
        public final int status;
        public ApiError(int status, String message) { super(message); this.status = status; }
    }

    private void writeJson(HttpExchange exchange, int status, Object payload) throws IOException {
        byte[] bytes = Json.write(payload).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> map = new LinkedHashMap<>();
        if (query == null || query.isBlank()) return map;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            String key = java.net.URLDecoder.decode(kv[0], StandardCharsets.UTF_8);
            String val = kv.length > 1 ? java.net.URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "";
            map.put(key, val);
        }
        return map;
    }
}
