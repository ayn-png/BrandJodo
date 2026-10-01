package com.marketplace.handler;

import com.marketplace.model.*;
import com.marketplace.store.DataStore;
import com.marketplace.util.Router;

import java.util.*;
import java.util.stream.Collectors;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.util.Base64;

public class UserHandlers {

    public static void register(Router router, DataStore store) {

        // Signup — POST /api/users  { name, email, role: CLIENT|INFLUENCER, businessCategory? }
        router.post("/api/users", (ex, params, body) -> {
            String name = str(body, "name", true);
            String email = str(body, "email", true);
            String password = str(body, "password", true);
            if (password.length() < 8) throw new Router.ApiError(400, "password must be at least 8 characters");
            if (store.findUserByEmail(email) != null) throw new Router.ApiError(409, "email already registered");
            String roleStr = str(body, "role", true);
            User.Role role;
            try {
                role = User.Role.valueOf(roleStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new Router.ApiError(400, "role must be CLIENT or INFLUENCER");
            }
            User u = new User(store.nextId("user"), name, email, role, hashPassword(password));
            if (role == User.Role.CLIENT) {
                u.businessCategory = str(body, "businessCategory", false);
            }
            store.saveUser(u);
            return Map.of("user", u.toMap(false, null, null), "token", store.createSession(u));
        });

        router.post("/api/auth/login", (ex, params, body) -> {
            String email = str(body, "email", true);
            String password = str(body, "password", true);
            User u = store.findUserByEmail(email);
            if (u == null || !verifyPassword(password, u.passwordHash)) {
                throw new Router.ApiError(401, "Invalid email or password");
            }
            return Map.of("user", u.toMap(u.role == User.Role.INFLUENCER,
                    store.avgRating(u.id), store.reviewsForInfluencer(u.id).size()),
                    "token", store.createSession(u));
        });

        router.post("/api/auth/logout", (ex, params, body) -> {
            Router.requireAuthenticated(ex, store);
            store.revokeSession(Router.bearerToken(ex));
            return Map.of("ok", true);
        });

        // Update influencer profile — POST /api/influencers/{id}/profile
        router.post("/api/influencers/{id}/profile", (ex, params, body) -> {
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(params.get("id"))) throw new Router.ApiError(403, "Only the account owner can edit this profile");
            User u = requireInfluencer(store, params.get("id"));
            u.bio = str(body, "bio", false);
            u.location = str(body, "location", false);
            u.niches = strList(body, "niches");
            u.platforms = strList(body, "platforms");
            Object fc = body.get("followerCount");
            u.followerCount = fc == null ? null : ((Number) fc).longValue();
            u.portfolio = strList(body, "portfolio");
            store.saveUser(u);
            return u.toMap(true, store.avgRating(u.id), store.reviewsForInfluencer(u.id).size());
        });

        // Add/replace rate card — POST /api/influencers/{id}/ratecard  { items: [{deliverable, price}] }
        router.post("/api/influencers/{id}/ratecard", (ex, params, body) -> {
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(params.get("id"))) throw new Router.ApiError(403, "Only the account owner can edit this rate card");
            User u = requireInfluencer(store, params.get("id"));
            Object itemsObj = body.get("items");
            if (!(itemsObj instanceof List<?> items)) {
                throw new Router.ApiError(400, "items must be a list of {deliverable, price}");
            }
            List<RateCardItem> rateCard = new ArrayList<>();
            for (Object o : items) {
                Map<?, ?> m = (Map<?, ?>) o;
                String deliverable = String.valueOf(m.get("deliverable"));
                double price = ((Number) m.get("price")).doubleValue();
                rateCard.add(new RateCardItem(deliverable, price));
            }
            u.rateCard = rateCard;
            store.saveUser(u);
            return u.toMap(true, store.avgRating(u.id), store.reviewsForInfluencer(u.id).size());
        });

        // Search — GET /api/influencers?location=&niche=&platform=&minPrice=&maxPrice=&minFollowers=
        router.get("/api/influencers", (ex, params, body) -> {
            String location = params.get("location");
            String niche = params.get("niche");
            String platform = params.get("platform");
            Double minPrice = numOrNull(params.get("minPrice"));
            Double maxPrice = numOrNull(params.get("maxPrice"));
            Long minFollowers = params.get("minFollowers") == null ? null : Long.valueOf(params.get("minFollowers"));

            List<User> results = store.searchInfluencers(location, niche, platform, minPrice, maxPrice, minFollowers);
            return results.stream()
                    .map(u -> u.toPublicMap(true, store.avgRating(u.id), store.reviewsForInfluencer(u.id).size()))
                    .collect(Collectors.toList());
        });

        // Influencer profile detail — GET /api/influencers/{id}
        router.get("/api/influencers/{id}", (ex, params, body) -> {
            User u = requireInfluencer(store, params.get("id"));
            Map<String, Object> map = u.toPublicMap(true, store.avgRating(u.id), store.reviewsForInfluencer(u.id).size());
            map.put("reviews", store.reviewsForInfluencer(u.id).stream().map(Review::toMap).collect(Collectors.toList()));
            return map;
        });

        // Fetch any user (client or influencer) — GET /api/users/{id}
        router.get("/api/users/{id}", (ex, params, body) -> {
            User u = store.getUser(params.get("id"));
            if (u == null) throw new Router.ApiError(404, "User not found");
            if (u.role == User.Role.CLIENT) {
                User actor = Router.requireAuthenticated(ex, store);
                if (!actor.id.equals(u.id)) throw new Router.ApiError(403, "Client profiles are private");
            }
            return u.toMap(u.role == User.Role.INFLUENCER, store.avgRating(u.id), store.reviewsForInfluencer(u.id).size());
        });
    }

    private static String hashPassword(String password) {
        try {
            int iterations = 120_000;
            byte[] salt = new byte[16];
            new SecureRandom().nextBytes(salt);
            byte[] hash = derive(password, salt, iterations);
            return iterations + ":" + Base64.getEncoder().encodeToString(salt) + ":"
                    + Base64.getEncoder().encodeToString(hash);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Password hashing unavailable", e);
        }
    }

    private static boolean verifyPassword(String password, String stored) {
        try {
            String[] parts = stored.split(":", 3);
            if (parts.length != 3) return false;
            int iterations = Integer.parseInt(parts[0]);
            byte[] salt = Base64.getDecoder().decode(parts[1]);
            byte[] expected = Base64.getDecoder().decode(parts[2]);
            return java.security.MessageDigest.isEqual(expected, derive(password, salt, iterations));
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            return false;
        }
    }

    private static byte[] derive(String password, byte[] salt, int iterations) throws GeneralSecurityException {
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, 256);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } finally {
            spec.clearPassword();
        }
    }

    static User requireInfluencer(DataStore store, String id) {
        User u = store.getUser(id);
        if (u == null) throw new Router.ApiError(404, "Influencer not found");
        if (u.role != User.Role.INFLUENCER) throw new Router.ApiError(400, "User is not an influencer");
        return u;
    }

    static String str(Map<String, Object> body, String key, boolean required) {
        Object v = body.get(key);
        if (v == null) {
            if (required) throw new Router.ApiError(400, "Missing required field: " + key);
            return null;
        }
        return String.valueOf(v);
    }

    @SuppressWarnings("unchecked")
    static List<String> strList(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null) return new ArrayList<>();
        return ((List<Object>) v).stream().map(String::valueOf).collect(Collectors.toList());
    }

    static Double numOrNull(String s) {
        return s == null || s.isBlank() ? null : Double.valueOf(s);
    }
}
