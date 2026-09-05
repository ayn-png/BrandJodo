package com.marketplace.model;

import java.time.Instant;
import java.util.*;

public class Booking {

    public enum Status {
        REQUESTED,   // client sent a booking request
        COUNTERED,   // influencer proposed a different price/terms
        ACCEPTED,    // influencer accepted; awaiting client payment
        DECLINED,    // influencer declined
        FUNDED,      // client paid into escrow
        DELIVERED,   // influencer marked content delivered
        COMPLETED,   // client approved (or auto-release fired) -> payment released
        CANCELLED
    }

    public final String id;
    public final String clientId;
    public final String influencerId;

    // brief
    public String deliverable;
    public String deadline;      // ISO date string, client-supplied
    public String usageRights;
    public double price;

    public Status status = Status.REQUESTED;
    public String counterNote;   // set when influencer counters

    public boolean escrowFunded = false;
    public boolean escrowReleased = false;
    public Instant fundedAt;
    public Instant deliveredAt;
    public Instant autoReleaseAt;     // deliveredAt + AUTO_RELEASE window
    public static final long AUTO_RELEASE_WINDOW_SECONDS = 6L * 24 * 60 * 60; // 6 days, per plan's 5-7 day window

    public final List<Message> messages = new ArrayList<>();
    public Review clientReview;      // client reviewing influencer

    public final Instant createdAt = Instant.now();

    public Booking(String id, String clientId, String influencerId, String deliverable,
                    String deadline, String usageRights, double price) {
        this.id = id;
        this.clientId = clientId;
        this.influencerId = influencerId;
        this.deliverable = deliverable;
        this.deadline = deadline;
        this.usageRights = usageRights;
        this.price = price;
    }

    /** Auto-release fires if delivered, not yet released, and the window has passed. */
    public boolean isAutoReleaseDue() {
        return status == Status.DELIVERED && !escrowReleased && autoReleaseAt != null
                && Instant.now().isAfter(autoReleaseAt);
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("clientId", clientId);
        m.put("influencerId", influencerId);
        m.put("deliverable", deliverable);
        m.put("deadline", deadline);
        m.put("usageRights", usageRights);
        m.put("price", price);
        m.put("status", status.name());
        m.put("counterNote", counterNote);
        m.put("escrowFunded", escrowFunded);
        m.put("escrowReleased", escrowReleased);
        m.put("fundedAt", fundedAt == null ? null : fundedAt.toString());
        m.put("deliveredAt", deliveredAt == null ? null : deliveredAt.toString());
        m.put("autoReleaseAt", autoReleaseAt == null ? null : autoReleaseAt.toString());
        m.put("createdAt", createdAt.toString());
        m.put("reviewed", clientReview != null);
        return m;
    }
}
