# Influencer Marketplace App — MVP (Phase 1 build)

This is a working implementation of **Phase 1** from the build plan: the seven
must-have features, built as a real running client/server app.

| Plan feature | Where it lives |
|---|---|
| Influencer profile + portfolio | `POST/GET /api/influencers/{id}/profile` |
| Fixed rate card per deliverable | `POST /api/influencers/{id}/ratecard` |
| Search + filters | `GET /api/influencers?location=&niche=&platform=&maxPrice=` |
| Booking request + accept/decline/counter | `POST /api/bookings`, `POST /api/bookings/{id}/respond` |
| In-app chat | `POST/GET /api/bookings/{id}/messages` |
| Basic escrow payment | `POST /api/bookings/{id}/pay` → `/deliver` → `/approve`, plus an auto-release background job |
| Reviews & ratings | `POST /api/bookings/{id}/review`, rolled up into `avgRating` on search/profile results |

## What's here

```
backend/    Java HTTP API implementing the booking state machine
frontend/   A single-page web client that exercises every flow above
```

## A note on the stack vs. the plan

The plan calls for **Java/Spring Boot + PostgreSQL**. This sandbox has no
network access, so Maven/Spring artifacts can't be downloaded — `apt-get`
and Maven Central are both unreachable here. Rather than hand you
non-runnable Spring code, the backend is written in **plain Java (JDK
21, no external dependencies)**, using the same layering a Spring Boot app
would have:

- `model/` — plain data classes (would be `@Entity` classes)
- `store/` — in-memory repository (would be Spring Data JPA repositories over Postgres)
- `handler/` — route handlers (would be `@RestController` classes)
- `util/Router.java` — a tiny hand-rolled router (would be Spring MVC's dispatcher)
- `util/Json.java` — hand-rolled JSON (would be Jackson, which Spring wires in automatically)

`backend/SPRING_BOOT_MIGRATION.md` shows the direct Spring Boot equivalent of
each class, so moving to the real stack once you have internet/Maven access
is a mechanical swap, not a rewrite. The API surface (URLs, request/response
JSON) is identical either way, so the frontend doesn't change.

## Run it

```bash
cd backend
java Build.java        # compiles everything into backend/out (see backend/README.md)
java -cp out com.marketplace.Main 8080
```

Then open `frontend/index.html` directly in a browser (or serve it with
`python3 -m http.server` from the `frontend/` folder) and point the "API
base" field at `http://localhost:8080`.

## Verified end to end

The full Phase 1 loop has been run and confirmed working: sign up a business
and a creator → set profile + rate card → search with filters → send a
booking request → creator accepts → in-app chat → client pays into escrow →
creator marks delivered → client approves (escrow releases) → client leaves
a review → the creator's `avgRating` updates on their public profile. See
`backend/README.md` for the exact `curl` transcript.
