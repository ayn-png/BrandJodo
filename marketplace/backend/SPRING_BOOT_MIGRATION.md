# Migrating this to real Spring Boot + PostgreSQL

The plan specifies Spring Boot + PostgreSQL. Everything in this codebase is
laid out so that migration is a mechanical, class-by-class swap — no logic
changes, because the booking state machine, search filters, and escrow flow
already live in plain Java classes that don't know about the web layer.

## `model/User.java` → JPA entity

```java
@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    private String name;
    private String email;

    @Enumerated(EnumType.STRING)
    private Role role;

    private String businessCategory;
    private String bio;
    private String location;

    @ElementCollection
    private List<String> niches = new ArrayList<>();

    @ElementCollection
    private List<String> platforms = new ArrayList<>();

    private Long followerCount;

    @ElementCollection
    private List<String> portfolio = new ArrayList<>();

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RateCardItem> rateCard = new ArrayList<>();

    public enum Role { CLIENT, INFLUENCER }
    // getters/setters
}
```

## `store/DataStore.java` → Spring Data JPA repository

```java
public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("""
        select u from User u where u.role = 'INFLUENCER'
        and (:location is null or lower(u.location) like lower(concat('%', :location, '%')))
        and (:niche is null or :niche member of u.niches)
        and (:platform is null or :platform member of u.platforms)
        and (:minFollowers is null or u.followerCount >= :minFollowers)
        """)
    List<User> search(String location, String niche, String platform, Long minFollowers);
}
```

(Price-range filtering against the rate card would join `RateCardItem` or
be done in the service layer, same as `DataStore.searchInfluencers` does now.)

## `handler/UserHandlers.java` → `@RestController`

```java
@RestController
@RequestMapping("/api")
public class InfluencerController {

    private final UserRepository users;
    private final ReviewRepository reviews;

    public InfluencerController(UserRepository users, ReviewRepository reviews) {
        this.users = users;
        this.reviews = reviews;
    }

    @PostMapping("/users")
    public User signUp(@RequestBody SignUpRequest req) { ... }

    @PostMapping("/influencers/{id}/profile")
    public User updateProfile(@PathVariable UUID id, @RequestBody ProfileRequest req) { ... }

    @GetMapping("/influencers")
    public List<InfluencerSummary> search(
        @RequestParam(required = false) String location,
        @RequestParam(required = false) String niche,
        @RequestParam(required = false) String platform,
        @RequestParam(required = false) Double minPrice,
        @RequestParam(required = false) Double maxPrice) { ... }
}
```

## `util/Router.java` + `util/Json.java` → deleted entirely

Spring MVC + Jackson (bundled with `spring-boot-starter-web`) replace both
of these outright — no equivalent class needed once Spring is available.

## `Main.java` → `@SpringBootApplication`

```java
@SpringBootApplication
public class MarketplaceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MarketplaceApplication.class, args);
    }
}
```

The auto-release job becomes a `@Scheduled(fixedRate = ...)` method on a
`@Component`, using `Booking.AUTO_RELEASE_WINDOW_SECONDS` unchanged.

## `pom.xml` starter (once Maven/internet access exists)

```xml
<dependencies>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
  <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
  <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
</dependencies>
```

Nothing else in the plan (escrow via Stripe Connect, chat via Stream/Sendbird,
React Native frontend) changes because of this migration — those integrate
at the same REST boundary this API already exposes.
