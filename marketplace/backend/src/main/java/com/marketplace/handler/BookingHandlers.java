package com.marketplace.handler;

import com.marketplace.model.*;
import com.marketplace.store.DataStore;
import com.marketplace.util.Router;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

public class BookingHandlers {

    public static void register(Router router, DataStore store) {

        // Create booking request — POST /api/bookings
        // { clientId, influencerId, deliverable, deadline, usageRights, price }
        router.post("/api/bookings", (ex, params, body) -> {
            User client = Router.requireAuthenticated(ex, store);
            if (client.role != User.Role.CLIENT) throw new Router.ApiError(403, "Only clients can create bookings");
            User influencer = UserHandlers.requireInfluencer(store, str(body, "influencerId"));
            String deliverable = str(body, "deliverable");
            String deadline = str(body, "deadline");
            String usageRights = body.get("usageRights") == null ? "" : String.valueOf(body.get("usageRights"));
            double price = ((Number) body.get("price")).doubleValue();

            Booking b = new Booking(store.nextId("bk"), client.id, influencer.id,
                    deliverable, deadline, usageRights, price);
            store.saveBooking(b);
            return b.toMap();
        });

        // Influencer responds — POST /api/bookings/{id}/respond
        // { action: ACCEPT|DECLINE|COUNTER, counterPrice?, counterNote? }
        router.post("/api/bookings/{id}/respond", (ex, params, body) -> {
            Booking b = requireBooking(store, params.get("id"));
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(b.influencerId)) throw new Router.ApiError(403, "Only the influencer can respond");
            requireStatus(b, Booking.Status.REQUESTED, Booking.Status.COUNTERED);
            String action = str(body, "action").toUpperCase();
            switch (action) {
                case "ACCEPT" -> b.status = Booking.Status.ACCEPTED;
                case "DECLINE" -> b.status = Booking.Status.DECLINED;
                case "COUNTER" -> {
                    b.status = Booking.Status.COUNTERED;
                    Object cp = body.get("counterPrice");
                    if (cp != null) b.price = ((Number) cp).doubleValue();
                    b.counterNote = body.get("counterNote") == null ? null : String.valueOf(body.get("counterNote"));
                }
                default -> throw new Router.ApiError(400, "action must be ACCEPT, DECLINE, or COUNTER");
            }
            store.saveBooking(b);
            return b.toMap();
        });

        // Client accepts a counter-offer — POST /api/bookings/{id}/accept-counter
        router.post("/api/bookings/{id}/accept-counter", (ex, params, body) -> {
            Booking b = requireBooking(store, params.get("id"));
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(b.clientId)) throw new Router.ApiError(403, "Only the client can accept the counter-offer");
            requireStatus(b, Booking.Status.COUNTERED);
            b.status = Booking.Status.ACCEPTED;
            store.saveBooking(b);
            return b.toMap();
        });

        // Chat — POST /api/bookings/{id}/messages  { senderId, text }
        router.post("/api/bookings/{id}/messages", (ex, params, body) -> {
            Booking b = requireBooking(store, params.get("id"));
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(b.clientId) && !actor.id.equals(b.influencerId))
                throw new Router.ApiError(403, "Only booking participants can send messages");
            String senderId = actor.id;
            String text = str(body, "text");
            Message msg = new Message(store.nextId("msg"), b.id, senderId, text);
            b.messages.add(msg);
            store.saveBooking(b);
            return msg.toMap();
        });

        // Chat — GET /api/bookings/{id}/messages
        router.get("/api/bookings/{id}/messages", (ex, params, body) -> {
            Booking b = requireBooking(store, params.get("id"));
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(b.clientId) && !actor.id.equals(b.influencerId))
                throw new Router.ApiError(403, "Only booking participants can view messages");
            return b.messages.stream().map(Message::toMap).collect(Collectors.toList());
        });

        // Escrow: client funds — POST /api/bookings/{id}/pay
        router.post("/api/bookings/{id}/pay", (ex, params, body) -> {
            Booking b = requireBooking(store, params.get("id"));
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(b.clientId)) throw new Router.ApiError(403, "Only the client can pay");
            requireStatus(b, Booking.Status.ACCEPTED);
            b.status = Booking.Status.FUNDED;
            b.escrowFunded = true;
            b.fundedAt = Instant.now();
            store.saveBooking(b);
            return b.toMap();
        });

        // Influencer marks delivered — POST /api/bookings/{id}/deliver
        router.post("/api/bookings/{id}/deliver", (ex, params, body) -> {
            Booking b = requireBooking(store, params.get("id"));
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(b.influencerId)) throw new Router.ApiError(403, "Only the influencer can deliver");
            requireStatus(b, Booking.Status.FUNDED);
            b.status = Booking.Status.DELIVERED;
            b.deliveredAt = Instant.now();
            b.autoReleaseAt = b.deliveredAt.plusSeconds(Booking.AUTO_RELEASE_WINDOW_SECONDS);
            store.saveBooking(b);
            return b.toMap();
        });

        // Client approves -> release escrow — POST /api/bookings/{id}/approve
        router.post("/api/bookings/{id}/approve", (ex, params, body) -> {
            Booking b = requireBooking(store, params.get("id"));
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(b.clientId)) throw new Router.ApiError(403, "Only the client can approve");
            requireStatus(b, Booking.Status.DELIVERED);
            b.status = Booking.Status.COMPLETED;
            b.escrowReleased = true;
            store.saveBooking(b);
            return b.toMap();
        });

        // Review — POST /api/bookings/{id}/review  { rating: 1-5, comment }
        router.post("/api/bookings/{id}/review", (ex, params, body) -> {
            Booking b = requireBooking(store, params.get("id"));
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(b.clientId)) throw new Router.ApiError(403, "Only the client can review");
            requireStatus(b, Booking.Status.COMPLETED);
            if (b.clientReview != null) throw new Router.ApiError(400, "Booking already reviewed");
            int rating = ((Number) body.get("rating")).intValue();
            if (rating < 1 || rating > 5) throw new Router.ApiError(400, "rating must be 1-5");
            String comment = body.get("comment") == null ? "" : String.valueOf(body.get("comment"));
            Review r = new Review(b.id, b.influencerId, b.clientId, rating, comment);
            b.clientReview = r;
            store.saveBooking(b);
            return r.toMap();
        });

        // Fetch single booking — GET /api/bookings/{id}
        router.get("/api/bookings/{id}", (ex, params, body) -> {
            Booking b = requireBooking(store, params.get("id"));
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(b.clientId) && !actor.id.equals(b.influencerId))
                throw new Router.ApiError(403, "Only booking participants can view this booking");
            return b.toMap();
        });

        // All bookings for a user (client or influencer) — GET /api/users/{id}/bookings
        router.get("/api/users/{id}/bookings", (ex, params, body) -> {
            User actor = Router.requireAuthenticated(ex, store);
            if (!actor.id.equals(params.get("id"))) throw new Router.ApiError(403, "Only the account owner can view booking history");
            return store.bookingsForUser(actor.id).stream().map(Booking::toMap).collect(Collectors.toList());
        });
    }

    private static User requireUser(DataStore store, String id, User.Role role) {
        User u = store.getUser(id);
        if (u == null) throw new Router.ApiError(404, "User not found");
        if (u.role != role) throw new Router.ApiError(400, "User is not a " + role);
        return u;
    }

    private static Booking requireBooking(DataStore store, String id) {
        Booking b = store.getBooking(id);
        if (b == null) throw new Router.ApiError(404, "Booking not found");
        return b;
    }

    private static void requireStatus(Booking b, Booking.Status... allowed) {
        for (Booking.Status s : allowed) if (b.status == s) return;
        throw new Router.ApiError(409, "Booking is in status " + b.status + "; expected one of " + Arrays.toString(allowed));
    }

    private static String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null) throw new Router.ApiError(400, "Missing required field: " + key);
        return String.valueOf(v);
    }
}
