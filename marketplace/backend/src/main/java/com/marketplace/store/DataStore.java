package com.marketplace.store;

import com.marketplace.model.*;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

/**
 * In-memory store standing in for the PostgreSQL + Spring Data JPA
 * repository layer described in the plan. Swapping this for real
 * repositories later does not require changing the handler/controller
 * layer's method signatures.
 */
public class DataStore {

    private final Map<String, User> users = new ConcurrentHashMap<>();
    private final Map<String, Booking> bookings = new ConcurrentHashMap<>();
    private final AtomicLong idSeq = new AtomicLong(1);

    public String nextId(String prefix) {
        return prefix + "_" + idSeq.getAndIncrement();
    }

    // ---------- Users ----------

    public User saveUser(User u) {
        users.put(u.id, u);
        return u;
    }

    public User getUser(String id) {
        return users.get(id);
    }

    public List<User> allInfluencers() {
        return users.values().stream()
                .filter(u -> u.role == User.Role.INFLUENCER)
                .collect(Collectors.toList());
    }

    /** Core discovery/search — mirrors the "Search + filters" must-have feature. */
    public List<User> searchInfluencers(String location, String niche, String platform,
                                         Double minPrice, Double maxPrice, Long minFollowers) {
        return allInfluencers().stream()
                .filter(u -> location == null || (u.location != null &&
                        u.location.toLowerCase().contains(location.toLowerCase())))
                .filter(u -> niche == null || u.niches.stream()
                        .anyMatch(n -> n.equalsIgnoreCase(niche)))
                .filter(u -> platform == null || u.platforms.stream()
                        .anyMatch(p -> p.equalsIgnoreCase(platform)))
                .filter(u -> minFollowers == null || (u.followerCount != null && u.followerCount >= minFollowers))
                .filter(u -> {
                    if (minPrice == null && maxPrice == null) return true;
                    if (u.rateCard.isEmpty()) return false;
                    double cheapest = u.rateCard.stream().mapToDouble(r -> r.price).min().orElse(Double.MAX_VALUE);
                    if (minPrice != null && cheapest < minPrice) return false;
                    if (maxPrice != null && cheapest > maxPrice) return false;
                    return true;
                })
                .collect(Collectors.toList());
    }

    // ---------- Bookings ----------

    public Booking saveBooking(Booking b) {
        bookings.put(b.id, b);
        return b;
    }

    public Booking getBooking(String id) {
        return bookings.get(id);
    }

    public List<Booking> bookingsForUser(String userId) {
        return bookings.values().stream()
                .filter(b -> b.clientId.equals(userId) || b.influencerId.equals(userId))
                .collect(Collectors.toList());
    }

    public List<Booking> allBookings() {
        return new ArrayList<>(bookings.values());
    }

    // ---------- Reviews / ratings ----------

    public List<Review> reviewsForInfluencer(String influencerId) {
        return bookings.values().stream()
                .map(b -> b.clientReview)
                .filter(Objects::nonNull)
                .filter(r -> r.influencerId.equals(influencerId))
                .collect(Collectors.toList());
    }

    public double avgRating(String influencerId) {
        List<Review> reviews = reviewsForInfluencer(influencerId);
        if (reviews.isEmpty()) return 0.0;
        return reviews.stream().mapToInt(r -> r.rating).average().orElse(0.0);
    }
}
