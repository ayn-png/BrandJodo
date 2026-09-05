package com.marketplace.model;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

public class Review {
    public final String bookingId;
    public final String influencerId;
    public final String clientId;
    public final int rating; // 1-5
    public final String comment;
    public final Instant createdAt = Instant.now();

    public Review(String bookingId, String influencerId, String clientId, int rating, String comment) {
        this.bookingId = bookingId;
        this.influencerId = influencerId;
        this.clientId = clientId;
        this.rating = rating;
        this.comment = comment;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("bookingId", bookingId);
        m.put("influencerId", influencerId);
        m.put("clientId", clientId);
        m.put("rating", rating);
        m.put("comment", comment);
        m.put("createdAt", createdAt.toString());
        return m;
    }
}
