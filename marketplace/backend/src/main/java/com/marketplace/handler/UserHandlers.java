package com.marketplace.handler;

import com.marketplace.model.*;
import com.marketplace.store.DataStore;
import com.marketplace.util.Router;

import java.util.*;
import java.util.stream.Collectors;

public class UserHandlers {

    public static void register(Router router, DataStore store) {

        // Signup — POST /api/users  { name, email, role: CLIENT|INFLUENCER, businessCategory? }
        router.post("/api/users", (ex, params, body) -> {
            String name = str(body, "name", true);
            String email = str(body, "email", true);
            String roleStr = str(body, "role", true);
            User.Role role;
            try {
                role = User.Role.valueOf(roleStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new Router.ApiError(400, "role must be CLIENT or INFLUENCER");
            }
            User u = new User(store.nextId("user"), name, email, role);
            if (role == User.Role.CLIENT) {
                u.businessCategory = str(body, "businessCategory", false);
            }
            store.saveUser(u);
            return u.toMap(false, null, null);
        });

        // Update influencer profile — POST /api/influencers/{id}/profile
        router.post("/api/influencers/{id}/profile", (ex, params, body) -> {
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
                    .map(u -> u.toMap(true, store.avgRating(u.id), store.reviewsForInfluencer(u.id).size()))
                    .collect(Collectors.toList());
        });

        // Influencer profile detail — GET /api/influencers/{id}
        router.get("/api/influencers/{id}", (ex, params, body) -> {
            User u = requireInfluencer(store, params.get("id"));
            Map<String, Object> map = u.toMap(true, store.avgRating(u.id), store.reviewsForInfluencer(u.id).size());
            map.put("reviews", store.reviewsForInfluencer(u.id).stream().map(Review::toMap).collect(Collectors.toList()));
            return map;
        });

        // Fetch any user (client or influencer) — GET /api/users/{id}
        router.get("/api/users/{id}", (ex, params, body) -> {
            User u = store.getUser(params.get("id"));
            if (u == null) throw new Router.ApiError(404, "User not found");
            return u.toMap(u.role == User.Role.INFLUENCER, store.avgRating(u.id), store.reviewsForInfluencer(u.id).size());
        });
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
