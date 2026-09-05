# Backend — Influencer Marketplace API (Java)

Plain-JDK HTTP API (no Maven/Spring — see `../README.md` and
`SPRING_BOOT_MIGRATION.md` for why, and how to move to real Spring Boot
later). Java 21, zero external dependencies.

## Build & run

This sandbox has no `javac` on `PATH` (JRE-only image), so `Build.java`
compiles the project in-process using `javax.tools.ToolProvider`
(the JDK's compiler module is present even though the `javac` binary isn't).
If you're running this on a normal machine with a full JDK, `javac` works
exactly the same way — you can also just run `javac -d out $(find src -name '*.java')`
directly.

```bash
java Build.java                          # -> BUILD SUCCESS, classes in out/
java -cp out com.marketplace.Main 8080   # starts the server on :8080
```

Health check: `curl http://localhost:8080/api/health` → `{"status":"ok"}`

## API summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/users` | Sign up (`role: CLIENT` or `INFLUENCER`) |
| GET | `/api/users/{id}` | Fetch any user |
| POST | `/api/influencers/{id}/profile` | Set bio/location/niches/platforms/portfolio |
| POST | `/api/influencers/{id}/ratecard` | Set fixed-price deliverables |
| GET | `/api/influencers?location=&niche=&platform=&minPrice=&maxPrice=&minFollowers=` | Search |
| GET | `/api/influencers/{id}` | Profile detail + reviews + avg rating |
| POST | `/api/bookings` | Client sends a booking request |
| POST | `/api/bookings/{id}/respond` | Influencer: `ACCEPT`, `DECLINE`, or `COUNTER` |
| POST | `/api/bookings/{id}/accept-counter` | Client accepts a counter-offer |
| POST | `/api/bookings/{id}/messages` / GET | In-app chat, scoped to the booking |
| POST | `/api/bookings/{id}/pay` | Client funds escrow (status → `FUNDED`) |
| POST | `/api/bookings/{id}/deliver` | Influencer marks delivered, starts the auto-release clock |
| POST | `/api/bookings/{id}/approve` | Client approves, escrow releases (status → `COMPLETED`) |
| POST | `/api/bookings/{id}/review` | Client rates 1–5 after completion |
| GET | `/api/bookings/{id}` / `/api/users/{id}/bookings` | Booking status/history |

Booking state machine: `REQUESTED → (COUNTERED ⇄) → ACCEPTED → FUNDED → DELIVERED → COMPLETED`,
or `DECLINED` at the response step. A background job (every 10s in this
demo; the plan specifies a 5–7 day window, implemented here as 6 days —
see `Booking.AUTO_RELEASE_WINDOW_SECONDS`) auto-completes bookings stuck in
`DELIVERED` past the window, protecting influencers from unresponsive clients.

## Verified run (actual output from this build)

```
== signup client ==
{"id":"user_1","name":"Cafe Mocha","email":"cafe@example.com","role":"CLIENT","businessCategory":"food"}

== signup influencer ==
{"id":"user_2","name":"Priya K", ... "role":"INFLUENCER", ...}

== search (location=Nashik, niche=food, maxPrice=5000) ==
[{"id":"user_2","name":"Priya K", ..., "rateCard":[{"deliverable":"1 Reel","price":3000.0}, ...]}]

== booking created -> accepted -> chat -> paid -> delivered -> approved -> reviewed ==
final status: "COMPLETED", escrowFunded: true, escrowReleased: true
final influencer profile: "avgRating":5.0,"reviewCount":1
```

This was run against the compiled server in this sandbox, not simulated.

## Files

```
src/main/java/com/marketplace/
  Main.java                 entry point, route registration, auto-release job
  model/User.java            client or influencer, incl. profile fields
  model/RateCardItem.java    deliverable + fixed price
  model/Booking.java         booking + state machine + escrow fields
  model/Message.java         chat message
  model/Review.java          rating + comment
  store/DataStore.java       in-memory repository + search/filter logic
  handler/UserHandlers.java  signup/profile/ratecard/search routes
  handler/BookingHandlers.java booking lifecycle + chat + reviews routes
  util/Router.java           minimal HTTP router (JDK HttpServer based)
  util/Json.java             minimal JSON read/write
```
