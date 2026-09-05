package com.marketplace;

import com.marketplace.handler.BookingHandlers;
import com.marketplace.handler.UserHandlers;
import com.marketplace.model.Booking;
import com.marketplace.store.DataStore;
import com.marketplace.util.Router;
import com.sun.net.httpserver.HttpServer;

import java.net.InetSocketAddress;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Influencer Marketplace App — MVP backend.
 *
 * This is the Java implementation of Phase 1 of the build plan:
 *   1. Influencer profile + portfolio
 *   2. Fixed rate card per deliverable type
 *   3. Search + filters (location, price, niche, platform)
 *   4. Booking request with brief template (accept/decline/counter)
 *   5. In-app chat
 *   6. Basic escrow payment (fund -> deliver -> approve/auto-release)
 *   7. Reviews & ratings
 *
 * NOTE ON STACK: the plan specifies Spring Boot + PostgreSQL. This sandbox
 * has no network access, so Maven/Spring artifacts cannot be fetched. This
 * file uses only the JDK (com.sun.net.httpserver + an in-memory DataStore)
 * to stay 100% buildable offline while keeping the exact same layering
 * (model / store / handler) a Spring Boot app would have. See
 * backend/README.md for the direct Spring Boot equivalent of every class
 * here, so migrating later is a mechanical exercise.
 */
public class Main {

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8080;

        DataStore store = new DataStore();
        Router router = new Router();

        UserHandlers.register(router, store);
        BookingHandlers.register(router, store);

        router.get("/api/health", (ex, params, body) -> java.util.Map.of("status", "ok"));

        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", router);
        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();

        // Escrow auto-release job: protects influencers against unresponsive
        // clients, per the plan's "auto-release window" requirement.
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(() -> {
            for (Booking b : store.allBookings()) {
                if (b.isAutoReleaseDue()) {
                    b.status = Booking.Status.COMPLETED;
                    b.escrowReleased = true;
                    store.saveBooking(b);
                    System.out.println("[auto-release] booking " + b.id + " released after auto-release window");
                }
            }
        }, 10, 10, TimeUnit.SECONDS);

        System.out.println("Influencer Marketplace backend listening on http://localhost:" + port);
    }
}
