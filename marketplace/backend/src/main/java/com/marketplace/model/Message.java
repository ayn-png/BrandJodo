package com.marketplace.model;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

public class Message {
    public final String id;
    public final String bookingId;
    public final String senderId;
    public final String text;
    public final Instant sentAt = Instant.now();

    public Message(String id, String bookingId, String senderId, String text) {
        this.id = id;
        this.bookingId = bookingId;
        this.senderId = senderId;
        this.text = text;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("bookingId", bookingId);
        m.put("senderId", senderId);
        m.put("text", text);
        m.put("sentAt", sentAt.toString());
        return m;
    }
}
