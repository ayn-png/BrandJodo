package com.marketplace.model;

import java.util.*;

public class User {
    public enum Role { CLIENT, INFLUENCER }

    public final String id;
    public String name;
    public String email;
    public final String passwordHash;
    public Role role;
    public String businessCategory; // clients only, optional

    // influencer-only profile fields
    public String bio;
    public String location;
    public List<String> niches = new ArrayList<>();
    public List<String> platforms = new ArrayList<>();
    public Long followerCount;
    public List<String> portfolio = new ArrayList<>();
    public List<RateCardItem> rateCard = new ArrayList<>();

    public User(String id, String name, String email, Role role, String passwordHash) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.passwordHash = passwordHash;
    }

    public Map<String, Object> toMap(boolean includeRatingSummary, Double avgRating, Integer reviewCount) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("email", email);
        m.put("role", role.name());
        if (role == Role.CLIENT) {
            m.put("businessCategory", businessCategory);
        } else {
            m.put("bio", bio);
            m.put("location", location);
            m.put("niches", niches);
            m.put("platforms", platforms);
            m.put("followerCount", followerCount);
            m.put("portfolio", portfolio);
            List<Map<String, Object>> rc = new ArrayList<>();
            for (RateCardItem item : rateCard) rc.add(item.toMap());
            m.put("rateCard", rc);
            if (includeRatingSummary) {
                m.put("avgRating", avgRating);
                m.put("reviewCount", reviewCount);
            }
        }
        return m;
    }

    public Map<String, Object> toPublicMap(boolean includeRatingSummary, Double avgRating, Integer reviewCount) {
        Map<String, Object> m = toMap(includeRatingSummary, avgRating, reviewCount);
        m.remove("email");
        return m;
    }
}
