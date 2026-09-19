<div align="center">

# 🗺️ Loopless

**AI-Powered Trip Planning × Real-World Route Optimization**

*Collapse destination discovery, geospatial validation, road-network routing, and exact TSP optimization into a single end-to-end pipeline.*

<br/>

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-loopless.netlify.app-4f46e5?style=for-the-badge)](https://loopless.netlify.app/)&nbsp;
[![GitHub](https://img.shields.io/badge/💻%20GitHub-georgejosephcodes%2FLoopless-24292e?style=for-the-badge&logo=github)](https://github.com/georgejosephcodes/Loopless)

<br/>

![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)
![C++](https://img.shields.io/badge/C%2B%2B-TSP%20Solver-00599C?style=flat-square&logo=cplusplus&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Upstash-dc382d?style=flat-square&logo=redis&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-flash--latest-8e44ad?style=flat-square&logo=google&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?style=flat-square&logo=docker&logoColor=white)

</div>

---

## Table of Contents

| # | Section |
|---|---|
| 1 | [The Problem](#the-problem) |
| 2 | [The Loopless Approach](#the-loopless-approach) |
| 3 | [Why Loopless?](#why-loopless) |
| 4 | [See It in Action](#see-it-in-action) |
| 5 | [Key Features — In Depth](#key-features--in-depth) |
| 6 | [System Architecture](#system-architecture) |
| 7 | [Runtime & Deployment Architecture](#runtime--deployment-architecture) |
| 8 | [Core Workflows](#core-workflows) |
| 9 | [AI Validation Architecture](#ai-validation-architecture) |
| 10 | [The Algorithm — TSP with Bitmask DP](#the-algorithm--tsp-with-bitmask-dp) |
| 11 | [C++ Solver Architecture](#c-solver-architecture) |
| 12 | [Why This Hybrid Architecture?](#why-this-hybrid-architecture) |
| 13 | [Real Road Distance Engine](#real-road-distance-engine) |
| 14 | [Redis Architecture](#redis-architecture) |
| 15 | [Rate Limiting](#rate-limiting) |
| 16 | [API Reference](#api-reference) |
| 17 | [Runtime Data Models](#runtime-data-models) |
| 18 | [Request / Response Data Flow](#request--response-data-flow) |
| 19 | [Engineering Tradeoffs](#engineering-tradeoffs) |
| 20 | [Failure Modes](#failure-modes) |
| 21 | [Security](#security) |
| 22 | [Performance Characteristics](#performance-characteristics) |
| 23 | [Complexity Reference](#complexity-reference) |
| 24 | [Limitations](#limitations) |
| 25 | [Future Architecture](#future-architecture) |
| 26 | [Project Structure](#project-structure) |
| 27 | [Local Development](#local-development) |
| 28 | [Environment Variables](#environment-variables) |
| 29 | [Contributing](#contributing) |
| 30 | [License](#license) |

---

## The Problem

Trip planning involves two fundamentally different problems that most tools treat independently — or leave entirely to the user.

### Problem 1 — Destination Discovery

Deciding *what* to visit requires knowing what exists near a given location, filtered by type, distance, and personal preference. In practice this means manually searching maps, reading reviews, and curating a list — a research task that scales poorly. Most route optimizers assume you already have a final list; they do not help you build one.

### Problem 2 — Route Ordering

Given a set of destinations, deciding *what order* to visit them is a combinatorial optimization problem. Naively it is the **Travelling Salesman Problem**, which is NP-hard. Most consumer tools either present destinations in the order the user entered them or apply a greedy heuristic that approximates without guaranteeing optimality.

### Why Geographic Distance Is Insufficient

The most tempting simplification is to use straight-line (Euclidean) distance between two coordinates. This consistently overestimates road accessibility:

```
Two points 4 km apart on a map may be:
  • 18 km by road because of a river crossing
  • 22 km due to a one-way system forcing a loop
  • Unreachable by driving-car profile (pedestrian path only)
```

An optimizer fed straight-line distances solves a problem that does not correspond to reality. The resulting "optimal" ordering can be worse than a human-intuited one.

### What Loopless Combines

```
Destination Discovery   ─┐
                          ├──► Single integrated pipeline
Route Optimization      ─┘
```

Loopless connects AI-driven discovery, deterministic geospatial validation, real road-network distances, exact combinatorial optimization, and time-aware itinerary scheduling into a single request-response workflow. A user goes from "starting location + category" to "optimized, timed, map-rendered multi-stop trip" without switching tools.

---

## The Loopless Approach

```
User (starting point + category + radius)
            │
            ▼
  ┌─────────────────────┐
  │  Gemini AI           │  Semantic destination discovery
  │  gemini-flash-latest │  → JSON array of place names
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │  Geoapify Geocoding  │  Deterministic location validation
  │  + Haversine Filter  │  → real coordinates or discard
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │  Redis Cache         │  Short-circuit repeated API calls
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │  OpenRouteService    │  Real road-distance matrix
  │  /matrix/driving-car │  → N×N distances (metres) + durations (seconds)
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │  C++ TSP Solver      │  Exact bitmask DP optimization
  │  (subprocess, O3)    │  → optimal stop ordering
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │  ORS Directions API  │  Road geometry for ordered route
  │  /directions/geojson │  → polyline for Leaflet
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────┐
  │  Smart Itinerary     │  Time-scheduled day plan
  │  Engine              │  → arrival / departure per stop
  └─────────────────────┘
```

Each stage has a distinct, non-overlapping responsibility. The pipeline is observable: every intermediate result (distance matrix, optimized indices, route geometry) is returned in the API response.

---

## Why Loopless?

| Capability | Typical Planner | Loopless |
|---|---|---|
| Destination discovery | Manual search | AI-generated by category and radius (Gemini) |
| Location validation | None / implicit | Geoapify geocoding + Haversine radius filter |
| Distance model | Straight-line or vague heuristic | Real road-network matrix (OpenRouteService) |
| Route ordering | Manual or simple greedy | Exact TSP (bitmask DP) for supported sizes |
| Caching | Absent | Redis-backed, per-pair, per-query |
| Itinerary | None or static | Time-aware, day-rollover-capable schedule |
| Natural-language planning | Absent | Free-text AI Plan pipeline |
| Local environment | Manual setup | Docker Compose (reproducible local dev; C++ compiled at image build) |

---

## See It in Action

No screenshots are committed to the repository. The following describes the actual application workflow.

### Workflow A — AI Autofill

```
1. Open Loopless → enter starting location in the search bar
   (Geoapify autocomplete, client-side)

2. Choose a category from the dropdown
   e.g. Tourist · Nature · Food · Historical · Romantic · ...

3. Set radius (km) and maximum stops

4. Click "AI Autofill"
   → POST /api/ai-autofill called
   → Gemini generates candidate place names
   → Each name geocoded via Geoapify
   → Radius filter applied (Haversine)
   → Duplicate coordinates dropped
   → Verified places returned as JSON

5. Reviewed places appear in the Bucket List component
   → User can add/remove individually

6. Click "Optimize Route"
   → POST /api/optimize called
   → ORS builds N×N road-distance + duration matrices
   → C++ TSP solver finds optimal stop ordering
   → ORS Directions fetches actual road geometry
   → Response: ordered path, total distance (km), matrices, geometry

7. Result page renders on Leaflet
   → route polyline drawn on real road geometry
   → numbered stop pins

8. Click "Smart Itinerary"
   → POST /api/itinerary called with optimized route + duration matrix
   → Scheduling engine distributes stops across day window
   → Arrival / departure times computed per stop
   → Multi-day rollover applied if needed
```

### Workflow B — AI Plan (Natural Language)

```
1. Open AI Plan modal

2. Enter a free-text description
   e.g. "historical temples near Varanasi within 30 km for a weekend trip"

3. Click "Plan"
   → POST /api/ai-plan called
   → Gemini extracts: city, reference location, radius, interests, order
   → Each suggested place geocoded by Geoapify
   → Radius-validated against geocoded city center
   → Duplicates dropped
   → Up to 15 verified places returned with reasoning per place

4. Places loaded into Bucket List
   → Proceed to Optimize → Result → Itinerary as above
```

---

## Key Features — In Depth

### 🤖 AI Destination Discovery

**Autofill mode** (`POST /api/ai-autofill`): The backend constructs a structured prompt using `CATEGORY_MAP`, a constant map of 19 category strings to descriptive prompts (e.g. `Tourist → "major tourist attractions, landmarks, must-visit places"`). The prompt enforces rules: only real existing places, within the specified radius, no duplicates, no fake places, prefer well-known names for geocoding reliability. Gemini returns a raw JSON array `["Place A", "Place B", ...]`. The response text is stripped of markdown artifacts (```` ```json ``` ````) before parsing.

**AI Plan mode** (`POST /api/ai-plan`): Gemini receives the raw user prompt and is instructed to extract structured intent: `city`, `referenceLocation`, `radiusKm`, and an ordered `places` array with `name`, `reason`, and `order` per suggestion. The structured output is validated before use; if intent extraction fails (`INVALID_PROMPT` sentinel), an empty result is returned without propagating to external services.

Both modes cache results in Redis after the first successful call.

### 📍 Geospatial Validation

Every AI-suggested place name goes through `geocodePlace()` — a shared helper that calls `Geoapify /v1/geocode/search?text=...&limit=1`. The function returns `{ lat, lng, formatted }` or `null` if Geoapify cannot resolve the name.

After geocoding, three filters run:

1. **Radius filter**: Haversine distance between the starting coordinate and the geocoded coordinate is computed. If `distance > radiusKm`, the place is discarded. The Haversine implementation uses Earth radius `R = 6371 km`.

2. **Duplicate coordinate filter**: Coordinates are rounded to 4 decimal places (`toFixed(4)`) and stored in a `Set`. If a new place maps to an already-seen coordinate key, it is discarded.

3. **Null filter**: Any place that Geoapify fails to geocode is silently skipped.

Only places that pass all three filters are added to `verifiedPlaces`. The loop breaks as soon as `verifiedPlaces.length >= maxStops`.

**Invariant**: The route optimizer and itinerary scheduler only ever receive coordinates that have been confirmed real by Geoapify and confirmed within radius by Haversine. No AI hallucination can propagate past this layer.

### 🛣️ Real Road Distance Matrix

`getORSMatrices(locations)` calls OpenRouteService's Matrix API:

```
POST https://api.openrouteservice.org/v2/matrix/driving-car
{
  "locations": [[lng, lat], [lng, lat], ...],
  "metrics": ["distance", "duration"],
  "units": "m"
}
```

The response produces two N×N matrices:
- `distances[i][j]` — road distance in **metres** (rounded to integer)
- `durations[i][j]` — travel time in **seconds** (rounded to integer)

Both matrices are stored individually per directed pair in Redis before being returned. The TSP solver consumes the distance matrix; the itinerary scheduler consumes the duration matrix.

### 🧠 Exact TSP Optimization

See [The Algorithm](#the-algorithm--tsp-with-bitmask-dp) for full detail. The C++ binary is invoked as a child process. The distance matrix is serialised and written to stdin. Optimal total distance and ordered node indices are read from stdout.

### ⚡ Redis Caching

See [Redis Architecture](#redis-architecture) for full detail. Four distinct cache namespaces with different TTLs target different cost categories.

### 🗺️ Interactive Map

react-leaflet renders the result. Route geometry comes from a separate ORS Directions call (`/v2/directions/driving-car/geojson`) made *after* TSP optimization, so the polyline exactly follows the optimized stop order. The Directions call uses `geometry_simplify: true` to reduce coordinate density. The geometry is returned from the backend as an array of `{ lat, lng }` objects, ready for Leaflet.

### 📋 Smart Itinerary

`scheduleItinerary()` in `itinerary.service.js` is a pure, side-effect-free function. It never reorders stops (the optimized order is treated as fixed) and never estimates travel time independently — it reads only from the ORS `durationMatrix`. The algorithm:

```
currentTime = startMinutes
for each stop i:
  travelMinutes = durationMatrix[prev.originalIdx][stop.originalIdx] / 60
  arrival = currentTime + travelMinutes
  if arrival + stayMinutes > endMinutes:   # day rollover
    day++
    currentTime = startMinutes
    travelMinutes = 0
    arrival = startMinutes
  departure = arrival + stayMinutes
  currentTime = departure
```

Day rollover resets to `startTime` on `day + 1`. Travel time across a day boundary is zeroed because no overnight travel origin/destination is modeled.

---

## System Architecture

```mermaid
flowchart TB
    User(["👤 User\nBrowser"])

    subgraph FE["React Frontend (Vite)"]
        direction TB
        Home["Home Page\nSearch · Bucket List · AI Autofill"]
        Result["Result Page\nLeaflet Map · Distance"]
        ItinPage["Smart Itinerary Page\nDay-by-Day Schedule"]
    end

    subgraph BE["Node.js / Express 5 Backend"]
        direction TB
        OPT["POST /api/optimize\n(rate-limited)"]
        AIA["POST /api/ai-autofill"]
        AIP["POST /api/ai-plan"]
        ITN["POST /api/itinerary"]
    end

    subgraph External["External Services"]
        GEMINI["Gemini API\ngemini-flash-latest"]
        GEO["Geoapify\n/v1/geocode/search"]
        ORS_M["OpenRouteService\n/v2/matrix/driving-car"]
        ORS_D["OpenRouteService\n/v2/directions/driving-car/geojson"]
    end

    REDIS[("Redis\nUpstash Cloud")]
    CPP["⚙️ C++ TSP Solver\nsrc/solver/tsp\nchild_process.exec"]

    User --> Home
    Home -->|"POST /api/ai-autofill\nPOST /api/ai-plan"| AIA
    Home -->|"POST /api/ai-plan"| AIP
    Home -->|"POST /api/optimize"| OPT
    Result --> ItinPage
    ItinPage -->|"POST /api/itinerary"| ITN

    AIA --> GEMINI
    AIP --> GEMINI
    GEMINI -->|"place names"| GEO
    GEO -->|"lat, lng, formatted"| AIA
    GEO -->|"lat, lng, formatted"| AIP

    AIA <-->|"ai: key\n7-day TTL"| REDIS
    AIP <-->|"ai-plan:sha1 key\n7-day TTL"| REDIS

    OPT <-->|"dist: dur: keys\n30-day TTL\nrate-limit counters"| REDIS
    OPT -->|"cache miss"| ORS_M
    ORS_M -->|"N×N distance + duration"| OPT

    OPT -->|"distance matrix\nvia stdin"| CPP
    CPP -->|"optimal distance\nordered indices\nvia stdout"| OPT

    OPT -->|"ordered coordinates"| ORS_D
    ORS_D -->|"GeoJSON geometry"| OPT

    OPT -->|"path · distance · matrices · geometry"| Result
    AIA -->|"verified places"| Home
    AIP -->|"verified places"| Home
```

---

## Local Development Architecture

> Docker Compose is provided for reproducible local development and testing. It is **not** the production hosting mechanism for the live application.

```mermaid
flowchart LR
    Browser["🌐 Browser\nlocalhost:5173"]

    subgraph DC["Docker Compose (local dev)"]
        FEC["frontend container\nnode:20-bullseye\nvite --host\nport 5173"]
        BEC["backend container\nnode:20-bullseye\nnode src/server.js\nport 5000"]
        BIN["tsp binary\ng++ -O3\ncompiled at image build"]
    end

    Upstash["Upstash Redis\nCloud (TLS)"]
    APIs["External APIs\nGemini · Geoapify · ORS"]

    Browser -->|"HTTP"| FEC
    FEC -->|"API calls\nVITE_API_URL"| BEC
    BEC -->|"child_process.exec"| BIN
    BEC -->|"REDIS_URL"| Upstash
    BEC -->|"HTTPS"| APIs
```

**Dockerfile (backend)** — key steps verified from source:

```dockerfile
FROM node:20-bullseye

RUN apt-get update && apt-get install -y g++   # install C++ compiler

COPY package*.json ./
RUN npm install

COPY . .

RUN g++ -O3 -o src/solver/tsp src/solver/tsp.cpp  # compile solver at build time

EXPOSE 5000
CMD ["node", "src/server.js"]
```

The Docker image compiles the C++ solver at image-build time, providing a reproducible local development environment. The application does not compile the solver on each request — the pre-built binary is invoked directly via `child_process.exec`.

The frontend container runs `vite --host` (dev-server mode) and mounts `src/` and `public/` as volumes for live reload in development.

Redis is not self-hosted in the Compose file. `REDIS_URL` points to Upstash Cloud Redis over TLS. The application gracefully logs a `CRITICAL` error on connection failure but does not terminate.

---

## Production Deployment

**Frontend — Netlify**

The React frontend is deployed to [Netlify](https://www.netlify.com/) and served from the Netlify CDN at [loopless.netlify.app](https://loopless.netlify.app/). The `public/_redirects` file configures SPA routing so all paths resolve to `index.html`:

```
/*    /index.html    200
```

This ensures React Router handles client-side navigation without Netlify returning 404s on direct URL access.

**Backend — hosting provider not determinable from repository**

The backend deployment target for the live application is not specified in any configuration file committed to this repository (no `railway.toml`, `render.yaml`, `fly.toml`, `Procfile`, or equivalent). The `VITE_API_URL` environment variable in the frontend `.env` points to the deployed backend URL at runtime.

**External services (both environments)**

| Service | Role | Environment |
|---|---|---|
| Upstash Redis | Cache + rate-limit store | Both |
| Gemini API | AI destination discovery | Both |
| Geoapify | Geocoding + autocomplete | Both |
| OpenRouteService | Road matrix + geometry | Both |

---

## Core Workflows

### 10.1 Optimize Route — `POST /api/optimize`

```mermaid
sequenceDiagram
    actor User
    participant FE as React Frontend
    participant RL as Rate Limiter (Redis)
    participant API as Express Backend
    participant Cache as Redis Cache
    participant ORS as ORS Matrix API
    participant CPP as C++ TSP Solver
    participant Dirs as ORS Directions API

    User->>FE: Click "Optimize Route"
    FE->>API: POST /api/optimize\n{locations:[{name,lat,lng},...]}

    API->>RL: Increment counter for client IP
    alt Limit exceeded (>10 / 15 min)
        RL-->>FE: 429 {error: "Optimization limit reached. Please wait 15 minutes."}
    end

    Note over API: Validate: locations must be array length >= 2

    loop For each directed pair (i→j), i≠j
        API->>Cache: GET dist:lat1,lng1:lat2,lng2
        API->>Cache: GET dur:lat1,lng1:lat2,lng2
    end

    alt All pairs cached
        Cache-->>API: Full distance + duration matrices
    else Any pair missing
        API->>ORS: POST /v2/matrix/driving-car\n{locations:[[lng,lat],...],\n metrics:["distance","duration"], units:"m"}
        ORS-->>API: {distances:[[...]], durations:[[...]]}
        loop Store each pair (i≠j)
            API->>Cache: SETEX dist:... 2592000 (30 days)
            API->>Cache: SETEX dur:...  2592000 (30 days)
        end
    end

    Note over API: Serialise stdin:\n"N 0\n[row0]\n[row1]\n..."

    API->>CPP: exec(./solver/tsp)\n write distance matrix to stdin
    CPP-->>API: stdout line 1: total distance (metres)\nstdout line 2: "0 2 1 3 ..." (ordered indices)

    Note over API: Reconstruct ordered locations\nAppend start to close the cycle

    API->>Dirs: POST /v2/directions/driving-car/geojson\n{coordinates:[[lng,lat],...], geometry_simplify:true}
    Dirs-->>API: GeoJSON Feature with LineString geometry

    API-->>FE: {path, distance (km), matrix, durationMatrix, routeGeometry}
    FE-->>User: Leaflet map with optimized route polyline
```

**Implementation details:**

- Minimum 2 locations enforced before any external call.
- Cache lookup is individual per directed pair (`i→j`). If even one pair is absent, the full ORS matrix call is made and all pairs are stored. If all pairs are cached, ORS is never called.
- The C++ process is spawned via `child_process.exec`. Input is written to `child.stdin` and `child.stdin.end()` is called to signal EOF. Output is collected from the `stdout` callback argument.
- The solver always starts from node index `0`. `startNode` is hardcoded to `0` in the input string (`"N 0\n..."`).
- After TSP, the ordered location sequence has the first stop appended at the end to close the return-to-origin loop before the Directions API call.
- `distance` in the response is `(Number(lines[0]) / 1000).toFixed(2)` — metres from the solver converted to km with 2 decimal places.

---

### 10.2 AI Autofill — `POST /api/ai-autofill`

```mermaid
flowchart TD
    REQ(["Request\nstartPlace · lat · lng\nradiusKm · maxStops · category"])
    VAL{"Validate:\nstartPlace, lat, lng present?"}
    REQ --> VAL
    VAL -->|No| E400["400: starting place, lat, lng required"]

    VAL -->|Yes| KEY["Build cache key:\nai:startPlace:norm-lat,norm-lng:radius:stops:cat"]
    KEY --> CHK{"Redis GET cache key"}

    CHK -->|Hit| RET(["Return JSON.parse(cached)"])

    CHK -->|Miss| PROMPT["Look up CATEGORY_MAP[category]\nBuild structured Gemini prompt"]
    PROMPT --> GEM["Gemini generateContent\ngemini-flash-latest"]
    GEM --> PARSE["Strip markdown fences\nJSON.parse → string[]"]
    PARSE --> LOOP

    subgraph LOOP["For each place name in suggestions"]
        G1["Geoapify geocode/search\n?text=...&limit=1"]
        G1 --> NF{"geocoded?"}
        NF -->|No| SKIP1["skip"]
        NF -->|Yes| RAD{"haversineDistance\n<= radiusKm?"}
        RAD -->|No| SKIP2["skip"]
        RAD -->|Yes| DUP{"coordKey in usedCoords Set?\nnorm(lat).norm(lng)"}
        DUP -->|Yes| SKIP3["skip"]
        DUP -->|No| ADD["push to verifiedPlaces\nadd coordKey to Set"]
    end

    ADD -->|"verifiedPlaces.length >= maxStops"| STORE
    STORE["Redis SETEX\nai:key 604800 s (7 days)\nJSON.stringify(verifiedPlaces)"]
    STORE --> RESP(["200: {places:[{name,lat,lng},...]}"])
```

**Cache key construction:**

```
ai:<startPlace>:<norm(lat)>,<norm(lng)>:<radiusKm>:<maxStops>:<category>
```

Where `norm(val) = parseFloat(val).toFixed(4)`. This normalizes coordinates to 4 decimal places (~11 m precision), preventing cache misses from floating-point drift on the same location.

---

### 10.3 AI Plan — `POST /api/ai-plan`

```mermaid
flowchart TD
    REQ(["Request\nprompt: string"])
    VAL{"prompt present\nand non-empty?"}
    REQ --> VAL
    VAL -->|No| E400["400: trip description required"]

    VAL -->|Yes| HASH["sha1Hex(prompt.trim().toLowerCase())\n→ cache key: ai-plan:sha1"]
    HASH --> CHK{"Redis GET ai-plan:sha1"}
    CHK -->|Hit| RET(["Return JSON.parse(cached)"])

    CHK -->|Miss| GEM["Gemini generateContent\nStructured extraction prompt:\ncity · referenceLocation\nradiusKm · places[]"]
    GEM --> PARSE["Strip markdown fences\nJSON.parse → {city,referenceLocation,\nradiusKm,places:[{name,reason,order}]}"]
    PARSE --> INV{"plan.places\nexists and non-empty?"}
    INV -->|No| EMPTY(["Return []"])

    INV -->|Yes| SORT["Sort suggestions by .order"]
    SORT --> GC["Geocode referenceLocation or city\n→ center coordinate"]
    GC --> LOOP

    subgraph LOOP["For each suggestion (up to 15 total)"]
        G2["Geoapify geocode suggestion.name"]
        G2 --> NF{"geocoded?"}
        NF -->|No| SK1["skip"]
        NF -->|Yes| RC{"center exists?\nhaversineDistance <= radiusKm?"}
        RC -->|No| SK2["skip (if center exists)"]
        RC -->|Yes| DUP2{"coordKey\nin usedCoords?"}
        DUP2 -->|Yes| SK3["skip"]
        DUP2 -->|No| ADD2["push {name,lat,lng,reason}\nto verifiedPlaces"]
    end

    ADD2 -->|"verifiedPlaces.length >= 15"| STORE2
    STORE2["Redis SETEX\nai-plan:sha1 604800 s (7 days)"]
    STORE2 --> RESP(["200: {places:[{name,lat,lng,reason},...]}"])
```

**Key difference from Autofill**: AI Plan also geocodes the city/reference location to produce a `center` coordinate. Each suggested place is then validated against this independently geocoded center, not merely against user-provided lat/lng. This double-geocoding improves geographic constraint accuracy when the user-provided prompt does not include precise coordinates.

The SHA-1 hash of the normalized prompt (`trim().toLowerCase()`) serves as the cache key. Semantically identical prompts differing only in case or whitespace hit the same cache entry.

---

### 10.4 Smart Itinerary — `POST /api/itinerary`

```mermaid
flowchart TD
    REQ(["Request\noptimizedRoute · durationMatrix\nstartTime · endTime · stayMinutes"])

    V1{"optimizedRoute\narray, length >= 1?"}
    REQ --> V1
    V1 -->|No| E1["400: optimized route required"]

    V1 -->|Yes| V2{"durationMatrix\narray, non-empty?"}
    V2 -->|No| E2["400: duration matrix required (re-run Optimize)"]

    V2 -->|Yes| V3{"startTime/endTime\nHH:MM format?"}
    V3 -->|No| E3["400: must be HH:MM format"]

    V3 -->|Yes| V4{"endTime > startTime?"}
    V4 -->|No| E4["400: end must be after start"]

    V4 -->|Yes| V5{"5 <= stayMinutes\n<= (endMinutes - startMinutes)?"}
    V5 -->|No| E5["400: stay must fit within day window"]

    V5 -->|Yes| SCHED["scheduleItinerary()"]

    subgraph SCHED["scheduleItinerary (pure function)"]
        direction LR
        INIT["day=1\ncurrentTime=startMinutes"]
        LOOP2["for i in optimizedRoute"]
        TRAVEL["travelMinutes =\ndurationMatrix\n  prev.originalIdx\n  stop.originalIdx\n÷ 60"]
        ARRIVE["arrival = currentTime + travelMinutes"]
        ROLL{"arrival + stayMinutes\n> endMinutes?"}
        NEXT["day++\ncurrentTime=startMinutes\ntravelMinutes=0\narrival=startMinutes"]
        PUSH["push {day,place,arrival,departure,\nstayMinutes,travelMinutes}"]
        ADV["currentTime = departure"]

        INIT --> LOOP2 --> TRAVEL --> ARRIVE --> ROLL
        ROLL -->|Yes| NEXT --> PUSH
        ROLL -->|No| PUSH
        PUSH --> ADV --> LOOP2
    end

    SCHED --> RESP(["200: {itinerary:[{day,place,arrival,departure,...},...]}"])
```

**Important constraints:**
- `durationMatrix[i][j]` is indexed by `originalIdx` values, not by position in `optimizedRoute`. This preserves correct matrix lookup regardless of the stop order.
- Travel time across a day-rollover boundary is explicitly set to `0`. The scheduler does not model overnight transit.
- `minutesToTimeString` clamps to `[0, 1440)` and formats as `HH:MM`.

---

## AI Validation Architecture

The AI pipeline uses two services with fundamentally different roles. Conflating them would introduce unacceptable geographic errors.

```
┌──────────────────────────────────────────────────────────────┐
│  SEMANTIC LAYER — Gemini API                                 │
│                                                              │
│  Input:  startPlace + category + radius (human-readable)     │
│  Output: ["Place A", "Place B", "Place C", ...]              │
│                                                              │
│  Gemini understands context. It knows that "historical gems  │
│  near Lucknow" implies Bara Imambara, Residency, etc.        │
│                                                              │
│  Gemini does NOT guarantee:                                  │
│   • the place physically exists at a geocodable address      │
│   • the name is spelled correctly for geocoding              │
│   • the place falls within the requested radius              │
│   • two suggestions are not the same physical location       │
└──────────────────────────────────────────────────────────────┘
                           │
                           │  String names only
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  VERIFICATION LAYER — Geoapify                               │
│                                                              │
│  Input:  place name string                                   │
│  Output: {lat, lng, formatted} or null                       │
│                                                              │
│  Geoapify is a deterministic geocoding service.              │
│  It resolves a name to coordinates or rejects it entirely.   │
│                                                              │
│  Enforces:                                                   │
│   ✓ Physical existence (geocodable)                          │
│   ✓ Canonical formatted address                              │
└──────────────────────────────────────────────────────────────┘
                           │
                           │  {lat, lng, formatted}
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  GEOGRAPHIC CONSTRAINT LAYER — Haversine + Coord Dedup       │
│                                                              │
│  Haversine radius check:                                     │
│    d = 2R · arctan2(√a, √(1−a))                             │
│    a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)     │
│    R = 6371 km                                               │
│    If d > radiusKm → discard                                 │
│                                                              │
│  Coordinate deduplication:                                   │
│    coordKey = norm(lat) + "," + norm(lng)                    │
│    norm(v) = parseFloat(v).toFixed(4)                        │
│    If coordKey ∈ usedCoords Set → discard                    │
└──────────────────────────────────────────────────────────────┘
                           │
                           │  Verified {name, lat, lng}
                           ▼
              Route Optimizer / Itinerary Scheduler
```

**Safety invariant**: No coordinate reaches the route optimizer unless it has passed through all three layers. The C++ solver only ever receives real, validated, unique coordinates.

---

## The Algorithm — TSP with Bitmask DP

### Problem Formulation

Given N locations and a pairwise road-distance matrix `dist[i][j]` (in metres), find the ordering of all N nodes that minimizes the total road distance, starting and ending at node `0`.

This is the Travelling Salesman Problem. For small N it is solved exactly using bitmask dynamic programming in O(n² · 2ⁿ) time.

### State Definition

```
dp[mask][i] = minimum road distance to visit exactly the set of nodes
              encoded in the integer bitmask `mask`, ending at node i

mask: an n-bit integer; bit k is set iff node k has been visited
i:    the current position (must be set in mask)
```

The state space has `n × 2ⁿ` entries.

### Base Case

```
If mask == (1 << n) - 1   (all nodes visited):
    dp[mask][i] = dist[i][startNode]   (return to origin)
```

The solver always returns to `startNode` (node 0). The base case adds the return leg.

### Transition

```
For each unvisited node j (bit j NOT set in mask):

    candidate = dp[mask][i] + dist[i][j]

    If candidate < dp[mask | (1 << j)][j]:
        dp[mask | (1 << j)][j] = candidate
        parent[mask | (1 << j)][j] = i
```

The `parent` array stores, for each `(mask, pos)` pair, which next node was chosen to achieve the minimum. This enables path reconstruction by backtracking through parent pointers.

### Implementation — `tsp.cpp`

```cpp
const long long INF = 1e15;
int n, startNode;

long long dist[16][16];          // distance matrix (metres, integer)
long long memo[1 << 16][16];     // memoization; -1 = uncomputed
int parent[1 << 16][16];         // for path reconstruction

long long solve(int mask, int pos) {
    if (mask == (1 << n) - 1) return dist[pos][startNode];
    if (memo[mask][pos] != -1) return memo[mask][pos];

    long long ans = INF;
    for (int next = 0; next < n; next++) {
        if (!(mask & (1 << next))) {
            long long newDist = dist[pos][next] + solve(mask | (1 << next), next);
            if (newDist < ans) {
                ans = newDist;
                parent[mask][pos] = next;
            }
        }
    }
    return memo[mask][pos] = ans;
}
```

The solver uses **top-down memoized recursion**, which is equivalent to bottom-up DP but avoids computing states that are never reachable from the initial configuration.

### Path Reconstruction

```cpp
void printPath(int mask, int pos) {
    cout << pos << " ";
    if (mask == (1 << n) - 1) return;
    int nextNode = parent[mask][pos];
    printPath(mask | (1 << nextNode), nextNode);
}
```

Output is the sequence of node indices (space-separated, line 2 of stdout). Node.js splits this and maps each index back to the original `locations` array.

### Entry Point

```
stdin:  "N startNode\n"
        "[row 0, space-separated distances]\n"
        "[row 1, ...]\n"
        ...

stdout: "<total distance in metres>\n"
        "<idx0> <idx1> <idx2> ... \n"
```

`startNode` is always `0` in the current invocation (`"${n} 0\n"`).

### Complexity

| Dimension | Value | Notes |
|---|---|---|
| Time | O(n² · 2ⁿ) | n transitions per state, 2ⁿ masks |
| Space | O(n · 2ⁿ) | memo + parent tables |
| Static limit | **16 nodes** | `dist[16][16]`, `memo[1<<16][16]` |
| Integer type | `long long` | fits cumulative metre-distances up to ~1e15 |
| Sentinel | `INF = 1e15` | safe given long long max ~9.2e18 |
| Init | `memset(memo, -1, sizeof(memo))` | bitwise -1 = all 0xFF bytes |

At n = 16: 16 × 65,536 = 1,048,576 state-action pairs. Tractable for a compiled binary.
At n = 20: 20 × 1,048,576 = 20,971,520 pairs — still feasible but memory grows significantly (arrays statically sized at 16; would require recompilation).

---

## C++ Solver Architecture

```
Node.js (Express controller)
    │
    │  child_process.exec("./src/solver/tsp")
    ▼
C++ subprocess (tsp binary)
    │
    │  stdin ← distance matrix (text)
    │  stdout → total distance + ordered indices
    ▼
Node.js (callback)
    │
    │  Parse stdout, reconstruct path, call ORS Directions
    ▼
HTTP Response
```

**Process communication:**

```javascript
const child = exec(SOLVER_PATH, async (error, stdout) => {
    // stdout contains both lines when process exits
    const lines = stdout.trim().split('\n');
    const totalDistance = lines[0];          // line 1: metres
    const indices = lines[1].trim().split(' ').map(Number);  // line 2: node order
});

child.stdin.write(inputData);   // write full matrix
child.stdin.end();              // signal EOF to C++ cin
```

The entire interaction is asynchronous. Node.js does not block during C++ execution; the callback fires when the child process exits.

**Compilation (verified in `backend/Dockerfile`):**

```dockerfile
RUN apt-get update && apt-get install -y g++
RUN g++ -O3 -o src/solver/tsp src/solver/tsp.cpp
```

`-O3` enables full compiler optimization: loop unrolling, inlining, vectorization, and aggressive scheduling. The Docker image compiles the solver once at image-build time, providing a reproducible local development environment with no per-request compilation overhead.

**Input serialisation (verified in `optimize.controller.js`):**

```javascript
let inputData = `${n} 0\n`;
matrix.forEach(row => {
    inputData += row.join(' ') + '\n';
});
```

The matrix contains integer metres (rounded at the ORS fetch stage). The `0` is the hardcoded `startNode`.

---

## Why This Hybrid Architecture?

### Node.js Responsibility — I/O Orchestration

Express handles HTTP, JSON parsing, CORS, request validation, Redis cache coordination, and three external HTTPS API calls (Gemini, Geoapify, ORS). These are all I/O-bound operations. Node's event loop and async/await model are well-suited: while waiting for ORS, Gemini, or Redis, the event loop can serve other requests. Maintaining this orchestration layer in JavaScript keeps the API readable and reduces operational complexity.

### C++ Responsibility — Numeric DP

The TSP solver is:
- Exponential in state space: `n × 2ⁿ` entries
- Dominated by tight inner loops over a flat integer 2D array
- Allocation-heavy: `memo[1<<16][16]` = 1M long long values ≈ 8 MB, plus parent table

These characteristics suit a statically compiled language:
- No garbage collection pauses during DP traversal
- Compiler can vectorize inner loops
- Cache-local flat array access
- No dynamic dispatch or prototype chain overhead

### The IPC Tradeoff

Subprocess communication via stdin/stdout adds process-spawn latency per optimize request. For the bounded problem size (≤16 nodes), the solver's execution time is very short, making spawn overhead the dominant cost. An alternative — a native Node.js addon (N-API) — would eliminate spawn overhead but significantly complicates the build (requires `node-gyp`, binding.gyp, platform-specific compilation). The current approach keeps the build simple and reproducible: `g++ -O3 tsp.cpp` is a single step with no additional toolchain.

> **This is an architectural decomposition choice, not a performance benchmark claim.** Actual latency depends on host environment, matrix size, and process scheduling.

---

## Real Road Distance Engine

### Why Coordinates Are Not Enough

```
Scenario 1 — River barrier:
  Location A: 26.8550° N, 80.9200° E
  Location B: 26.8600° N, 80.9150° E
  Straight-line distance: ~0.8 km
  Road distance: ~9.4 km (bridge 4 km north, then back)

Scenario 2 — One-way urban grid:
  A and B appear adjacent on map
  Road system forces: A → north 1km → east 0.5km → south 1km → B
  Effective road distance: 2.5× straight-line

Scenario 3 — Highway-separated suburb:
  Divided highway between A and B
  No crossing for 6 km
  Road distance = 3× straight-line
```

Feeding Euclidean distances to TSP produces the optimal ordering *on the Euclidean graph*. That ordering may be suboptimal — sometimes severely — on the actual road network.

### Matrix Fetch

```
Coordinates [{lat, lng}...]
    │
    │  map to [[lng, lat]...]   (ORS expects [lng, lat] not [lat, lng])
    ▼
POST /v2/matrix/driving-car
{
  "locations": [[lng0,lat0], [lng1,lat1], ...],
  "metrics": ["distance", "duration"],
  "units": "m"
}
    │
    ▼
Response: {
  "distances": [[0, d01, d02], [d10, 0, d12], ...],  // metres
  "durations": [[0, t01, t02], [t10, 0, t12], ...]   // seconds
}
    │
    │  Math.round() each value
    │  Store individual pairs in Redis
    ▼
N×N integer distance matrix → C++ TSP solver
N×N integer duration matrix → Smart Itinerary scheduler
```

ORS uses the **driving-car** routing profile, which respects:
- road type and speed limits
- turn restrictions
- one-way streets
- access restrictions
- ferry connections (if applicable)

### Geometry Fetch (Post-Optimization)

After TSP determines the optimal ordering, route geometry is fetched separately:

```
Optimized indices [0, 2, 1, 3, 0]   (return-to-start appended)
    │
    │  map to ordered [{lat, lng}]
    ▼
POST /v2/directions/driving-car/geojson
{
  "coordinates": [[lng0,lat0], [lng2,lat2], [lng1,lat1], [lng3,lat3], [lng0,lat0]],
  "geometry_simplify": true
}
    │
    ▼
Response GeoJSON LineString coordinates [[lng,lat],...]
    │
    │  map to [{lat, lng}]
    ▼
routeGeometry → Leaflet polyline
```

`geometry_simplify: true` reduces the coordinate density of the returned polyline, decreasing payload size and rendering overhead at acceptable visual quality.

---

## Redis Architecture

Redis (Upstash Cloud, connected via `REDIS_URL`) serves two distinct roles: **application cache** and **rate-limit counter store**.

### Cache Flow

```mermaid
flowchart LR
    REQ["Incoming Request"]
    CHK{"Redis GET\ncache key"}
    EXT["External API\n(Gemini / Geoapify / ORS)"]
    PROC["Process result"]
    STORE["Redis SETEX\nkey TTL value"]
    RESP["Return to caller"]

    REQ --> CHK
    CHK -->|"Hit"| RESP
    CHK -->|"Miss"| EXT
    EXT --> PROC
    PROC --> STORE
    STORE --> RESP
```

### Cache Namespace Reference

| Namespace | Key Pattern | Stored Value | TTL | Rationale |
|---|---|---|---|---|
| Distance | `dist:N(lat1),N(lng1):N(lat2),N(lng2)` | Road distance in metres (string integer) | **2,592,000 s (30 days)** | Road networks change infrequently; individual pairs allow partial hits |
| Duration | `dur:N(lat1),N(lng1):N(lat2),N(lng2)` | Travel time in seconds (string integer) | **2,592,000 s (30 days)** | Same ORS call; both metrics stored per pair |
| AI Autofill | `ai:<startPlace>:N(lat),N(lng):<radiusKm>:<maxStops>:<category>` | `JSON.stringify([{name,lat,lng},...])` | **604,800 s (7 days)** | Gemini + N×Geoapify calls; places are stable over days |
| AI Plan | `ai-plan:<sha1(prompt)>` | `JSON.stringify([{name,lat,lng,reason},...])` | **604,800 s (7 days)** | Same cost profile as autofill |

> All TTL values verified directly from `ors.service.js` (line 76–77) and `ai.service.js` (lines 102–103, 298).

### Coordinate Normalization

```javascript
const norm = (val) => parseFloat(val).toFixed(4);
// e.g. norm(26.84671234) → "26.8467"
// e.g. norm(26.84669999) → "26.8467"  (same key)
```

Rounding to 4 decimal places corresponds to ~11 m precision at the equator. This prevents cache misses from floating-point representation differences in identical real-world coordinates.

### AI Plan Cache Key

```javascript
const sha1Hex = (str) => crypto.createHash('sha1').update(str).digest('hex');
const cacheKey = `ai-plan:${sha1Hex(userPrompt.trim().toLowerCase())}`;
```

SHA-1 of the lowercased, trimmed prompt ensures:
- Case-insensitive cache hits ("Lucknow temples" = "lucknow temples")
- Fixed-length key regardless of prompt length
- Semantically identical prompts (same content, different whitespace) hit the same entry

### Rate Limiting via Redis

```javascript
const limiter = rateLimit({
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 10,
    message: { error: "Optimization limit reached. Please wait 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});
```

Rate-limit counters are stored in Redis, not in Node.js process memory. This means counters are consistent across multiple backend instances, and survive server restarts.

Applied exclusively to `POST /api/optimize`. AI endpoints do not have a separate rate limit.

### Graceful Degradation

If Redis is unavailable at startup, the application logs a `CRITICAL` error but does not exit. Subsequent cache calls will throw errors that may propagate to the endpoint. The `cache.service.js` layer provides no automatic fallback to in-memory caching — Redis failure will surface as request errors.

---

## Rate Limiting

| Property | Value |
|---|---|
| Middleware | `express-rate-limit` v8 |
| Store | `rate-limit-redis` (`RedisStore`) |
| Applied to | `POST /api/optimize` only |
| Window | 15 minutes (900,000 ms) |
| Max requests | 10 per window per IP |
| Headers | Standard RateLimit headers (`RateLimit-*`) |
| Legacy headers | Disabled |
| Rejection body | `{"error":"Optimization limit reached. Please wait 15 minutes."}` |
| Rejection status | `429 Too Many Requests` |
| Counter storage | Upstash Redis (shared across instances) |

---

## API Reference

### `POST /api/optimize`

Computes the optimal stop ordering for a set of locations using a real road-distance matrix and the C++ TSP solver. Returns optimized path, matrices, total distance, and road geometry.

> **Rate limited: 10 requests per 15-minute window per IP.**

#### Request

```json
{
  "locations": [
    { "name": "IIIT Lucknow",   "lat": 26.8467, "lng": 80.9462 },
    { "name": "Bara Imambara",  "lat": 26.8691, "lng": 80.9120 },
    { "name": "Hazratganj",     "lat": 26.8562, "lng": 80.9381 },
    { "name": "Lucknow Zoo",    "lat": 26.8338, "lng": 80.9342 }
  ]
}
```

#### Request Schema

| Field | Type | Required | Constraint | Description |
|---|---|---|---|---|
| `locations` | `array` | ✅ | length ≥ 2 | Array of stop objects |
| `locations[].name` | `string` | ✅ | — | Display name (passed through; not geocoded here) |
| `locations[].lat` | `number` | ✅ | — | Latitude |
| `locations[].lng` | `number` | ✅ | — | Longitude |

#### Response

```json
{
  "path": [
    { "name": "IIIT Lucknow",  "lat": 26.8467, "lng": 80.9462, "originalIdx": 0 },
    { "name": "Hazratganj",    "lat": 26.8562, "lng": 80.9381, "originalIdx": 2 },
    { "name": "Bara Imambara", "lat": 26.8691, "lng": 80.9120, "originalIdx": 1 },
    { "name": "Lucknow Zoo",   "lat": 26.8338, "lng": 80.9342, "originalIdx": 3 }
  ],
  "distance": "18.47",
  "matrix": [
    [0,    4521, 3102, 6810],
    [4618, 0,    2340, 5920],
    [3200, 2280, 0,    4310],
    [6900, 5980, 4280, 0   ]
  ],
  "durationMatrix": [
    [0,   780, 540, 1200],
    [820, 0,   390,  980],
    [560, 400, 0,    750],
    [1250,990, 760,  0  ]
  ],
  "routeGeometry": [
    { "lat": 26.8467, "lng": 80.9462 },
    { "lat": 26.8510, "lng": 80.9420 },
    "..."
  ]
}
```

#### Response Schema

| Field | Type | Description |
|---|---|---|
| `path` | `object[]` | Ordered stops in optimal sequence. Each element is the original location object with `originalIdx` added (its 0-based index in the input `locations` array). |
| `distance` | `string` | Total road distance in **kilometres**, 2 decimal places. Converted from metres: `(totalMetres / 1000).toFixed(2)`. |
| `matrix` | `number[][]` | Full N×N road distance matrix in **metres** (integer). `matrix[i][j]` = road distance from `locations[i]` to `locations[j]`. |
| `durationMatrix` | `number[][]` | Full N×N travel duration matrix in **seconds** (integer). Used by `/api/itinerary`. |
| `routeGeometry` | `object[]` | Array of `{lat, lng}` coordinates describing the actual road path for the ordered route (including return to origin). For Leaflet rendering. |

#### Error Cases

| Status | Condition |
|---|---|
| `400` | `locations` missing or `locations.length < 2` |
| `429` | Rate limit exceeded (10 req / 15 min) |
| `500` | ORS matrix fetch failed, or C++ solver error, or invalid solver output |

---

### `POST /api/ai-autofill`

Discovers and validates nearby destinations using Gemini (semantic) and Geoapify (deterministic geocoding + radius filtering).

#### Request

```json
{
  "startPlace": "IIIT Lucknow",
  "lat": 26.8467,
  "lng": 80.9462,
  "radiusKm": 20,
  "maxStops": 5,
  "category": "Tourist"
}
```

#### Request Schema

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `startPlace` | `string` | ✅ | — | Human-readable starting location (used in Gemini prompt context) |
| `lat` | `number` | ✅ | — | Starting latitude |
| `lng` | `number` | ✅ | — | Starting longitude |
| `radiusKm` | `number` | ❌ | `25` | Maximum distance in km from starting point |
| `maxStops` | `number` | ❌ | `5` | Maximum number of validated places to return |
| `category` | `string` | ❌ | `"Mixed"` | Destination category — see supported values below |

**Supported categories:**

```
Mixed · Nature · Food · Tourist · Shopping · Hidden Gems · Historical
Religious · Adventure · Nightlife · Family Friendly · Romantic · Luxury
Budget · Photography Spots · Road Trip · Local Favorites · Cafes · Museums · Beaches
```

#### Response

```json
{
  "places": [
    { "name": "Bara Imambara, Lucknow, India", "lat": 26.8691, "lng": 80.9120 },
    { "name": "Rumi Darwaza, Lucknow, India",  "lat": 26.8693, "lng": 80.9105 },
    { "name": "Residency, Lucknow, India",     "lat": 26.8617, "lng": 80.9106 }
  ]
}
```

#### Error Cases

| Status | Condition |
|---|---|
| `400` | `startPlace`, `lat`, or `lng` missing |
| `500` | No validated places produced (Gemini failure, all rejected by Geoapify/radius) |

---

### `POST /api/ai-plan`

Accepts a free-text trip description. Gemini extracts intent (city, radius, interests), suggests places in visiting order, and Geoapify validates each one.

#### Request

```json
{
  "prompt": "I want to visit historical and religious places near Lucknow within 25 km"
}
```

#### Request Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | ✅ | Free-text trip description. Must be non-empty after trimming. |

#### Response

```json
{
  "places": [
    {
      "name": "Bara Imambara, Lucknow, India",
      "lat": 26.8691,
      "lng": 80.9120,
      "reason": "One of the most iconic Shia Muslim monuments in India"
    },
    {
      "name": "Rumi Darwaza, Lucknow, India",
      "lat": 26.8693,
      "lng": 80.9105,
      "reason": "A grand Mughal gateway and architectural landmark"
    }
  ]
}
```

Places include a `reason` field (from Gemini's structured output) explaining relevance to the user's prompt. Places in Autofill do not include this field.

#### Error Cases

| Status | Condition |
|---|---|
| `400` | `prompt` missing, non-string, or empty after trim |
| `500` | Gemini returns `INVALID_PROMPT` sentinel, JSON parse fails, or no places validate |

---

### `POST /api/itinerary`

Generates a time-scheduled day-by-day itinerary from an optimized route, using ORS duration data for travel time between stops.

#### Request

```json
{
  "optimizedRoute": [
    { "name": "IIIT Lucknow",   "originalIdx": 0 },
    { "name": "Hazratganj",     "originalIdx": 2 },
    { "name": "Bara Imambara",  "originalIdx": 1 }
  ],
  "durationMatrix": [
    [0,   780, 540],
    [820, 0,   390],
    [560, 400, 0  ]
  ],
  "startTime": "09:00",
  "endTime": "18:00",
  "stayMinutes": 60
}
```

#### Request Schema

| Field | Type | Required | Default | Constraints | Description |
|---|---|---|---|---|---|
| `optimizedRoute` | `object[]` | ✅ | — | length ≥ 1 | Stops from `/api/optimize` `.path` field. Must include `originalIdx`. |
| `durationMatrix` | `number[][]` | ✅ | — | non-empty | Duration matrix from `/api/optimize` `.durationMatrix` field (seconds). |
| `startTime` | `string` | ❌ | `"09:00"` | HH:MM | Daily trip start time |
| `endTime` | `string` | ❌ | `"18:00"` | HH:MM, > startTime | Daily trip end time |
| `stayMinutes` | `number` | ❌ | `60` | ≥ 5, ≤ (endTime − startTime) | Minutes spent at each stop |

#### Response

```json
{
  "itinerary": [
    {
      "day": 1,
      "place": "IIIT Lucknow",
      "arrival": "09:00",
      "departure": "10:00",
      "stayMinutes": 60,
      "travelMinutes": 0
    },
    {
      "day": 1,
      "place": "Hazratganj",
      "arrival": "10:13",
      "departure": "11:13",
      "stayMinutes": 60,
      "travelMinutes": 13
    },
    {
      "day": 1,
      "place": "Bara Imambara",
      "arrival": "11:23",
      "departure": "12:23",
      "stayMinutes": 60,
      "travelMinutes": 10
    }
  ]
}
```

#### Error Cases

| Status | Condition |
|---|---|
| `400` | `optimizedRoute` not array or empty |
| `400` | `durationMatrix` not array or empty |
| `400` | `startTime` or `endTime` not in `HH:MM` format |
| `400` | `endTime` ≤ `startTime` |
| `400` | `stayMinutes` < 5 or > (endMinutes − startMinutes) |
| `500` | Internal scheduling error |

---

## Runtime Data Models

These are the key JavaScript objects as they flow through the system. There is no persistent database schema; all storage is Redis (strings/JSON) and in-memory within a request lifecycle.

### Location (frontend/backend shared)

```json
{ "name": "Bara Imambara", "lat": 26.8691, "lng": 80.9120 }
```

### Optimized Path Entry

```json
{
  "name": "Bara Imambara",
  "lat": 26.8691,
  "lng": 80.9120,
  "originalIdx": 1
}
```

`originalIdx` is the 0-based position of this stop in the input `locations` array. It is the matrix index used by the itinerary scheduler.

### Distance Matrix (N×N)

```json
[[0, 4521, 3102], [4618, 0, 2340], [3200, 2280, 0]]
```

Integers, metres. `matrix[i][j]` = road distance from location `i` to location `j`. Diagonal is `0`. Not necessarily symmetric (one-way roads).

### AI Place (Autofill)

```json
{ "name": "Rumi Darwaza, Lucknow, India", "lat": 26.8693, "lng": 80.9105 }
```

### AI Place (Plan)

```json
{
  "name": "Rumi Darwaza, Lucknow, India",
  "lat": 26.8693,
  "lng": 80.9105,
  "reason": "A grand Mughal gateway and architectural landmark"
}
```

### Itinerary Entry

```json
{
  "day": 1,
  "place": "Hazratganj",
  "arrival": "10:13",
  "departure": "11:13",
  "stayMinutes": 60,
  "travelMinutes": 13
}
```

### Route Geometry Point

```json
{ "lat": 26.8510, "lng": 80.9420 }
```

Array of these constitutes the Leaflet polyline input.

---

## Request / Response Data Flow

```
Frontend location object
  { name, lat, lng }
        │
        │  POST /api/optimize  [{name,lat,lng},...]
        ▼
Backend validation
  locations.length >= 2
        │
        ▼
Redis cache lookup (per directed pair)
  key: dist:norm(lat1),norm(lng1):norm(lat2),norm(lng2)
        │
        │  miss → ORS Matrix API → store pairs → continue
        │  hit  → use cached values
        ▼
N×N distance matrix (metres, integer)
N×N duration matrix (seconds, integer)
        │
        ▼
C++ stdin serialisation
  "4 0\n"
  "0 4521 3102 6810\n"
  "4618 0 2340 5920\n"
  ...
        │
        ▼
C++ stdout
  "18472\n"            ← total distance in metres
  "0 2 1 3\n"         ← ordered node indices
        │
        ▼
Node.js path reconstruction
  indices.map(i => ({ ...locations[i], originalIdx: i }))
        │
        ▼
Return-to-start appended
  orderedLocations.push(locations[indices[0]])
        │
        ▼
ORS Directions API
  POST /v2/directions/driving-car/geojson
  { coordinates: [[lng,lat],...], geometry_simplify: true }
        │
        ▼
GeoJSON LineString → [{lat,lng},...]
        │
        ▼
HTTP Response
  {
    path:           [{name,lat,lng,originalIdx},...],
    distance:       "18.47",    (km, 2dp)
    matrix:         [[...],...],
    durationMatrix: [[...],...],
    routeGeometry:  [{lat,lng},...]
  }
        │
        ▼
Frontend React state
        │
        ▼
Leaflet map + polyline render
```

---

## Engineering Tradeoffs

### Exact Optimization vs. Scalability

Bitmask DP provides the **provably optimal** stop ordering for the given distance matrix. The cost is exponential: each additional waypoint doubles the number of bitmask states. Static arrays in `tsp.cpp` are sized for 16 nodes — exceeding this requires recompilation. For larger trip sizes, a heuristic approach (nearest-neighbour, 2-opt, Lin-Kernighan, or hybrid branch-and-bound) would be needed at the cost of optimality guarantees.

**The decision**: For the use case (≤15–16 tourist stops), exact optimization is tractable and produces correct results. This is more valuable than a fast heuristic that may leave suboptimal ordering in place.

### AI Generation vs. Deterministic Validation

Using a large language model for destination discovery introduces non-determinism: the same prompt may produce different suggestions, and Gemini cannot guarantee geocodability or geographic accuracy of its output. The two-layer pipeline (Gemini → Geoapify → Haversine) makes this safe by ensuring only deterministically-validated coordinates reach the optimizer. The tradeoff is latency: N sequential Geoapify API calls (one per AI suggestion) add wall-clock time proportional to `maxStops`.

### External Routing vs. Self-Hosted Infrastructure

Using OpenRouteService avoids maintaining a routing engine (OSRM, Valhalla, GraphHopper) with the full OSM road graph. The tradeoffs are:
- **Quota limits**: ORS API imposes request rate and daily limits
- **Latency**: Each matrix call crosses the public internet
- **Dependency**: If ORS is unavailable, optimization fails
- **Cost**: Per-request API billing at scale

Redis caching partially mitigates the first three: repeated coordinate pairs never re-hit ORS within the 30-day TTL window.

### Per-Pair Caching vs. Matrix-Level Caching

Distance pairs are cached individually (`dist:lat1,lng1:lat2,lng2`) rather than as full N×N matrices. This means a trip with partially-seen locations can reconstruct most of the matrix from cache and only request the missing pairs — except the current implementation performs a full ORS matrix call if any pair is missing. The individual pair storage still benefits future trips that share any coordinate pair.

**Limitation**: The current implementation does not implement partial matrix population from cache (calling ORS only for missing pairs). It either uses all-cached or fetches the full matrix. This is an implementation simplicity tradeoff.

### Redis Subprocess vs. Process-Local Counters

Rate-limit counters are stored in Redis via `RedisStore`. This means the rate limit is consistent across multiple backend instances and survives restarts. The tradeoff is a Redis round-trip per rate-limited request (in addition to any cache round-trips). For a single instance the extra latency is unnecessary, but the design handles horizontal scaling without changes.

### Subprocess IPC vs. Native Addon

Using `child_process.exec` for C++ communication is significantly simpler than writing a native addon (N-API). The IPC cost (process spawn, stdin pipe, stdout read) is proportionally larger at small input sizes. For ≤16 nodes the solver terminates in microseconds; the dominant cost is the subprocess lifecycle, not the DP computation.

---

## Failure Modes

| Dependency | Failure Scenario | Actual Behavior |
|---|---|---|
| Gemini API | Call fails or returns malformed JSON | `ai.service.js` catches exception, logs error, returns `[]`. Endpoint responds `500 {error: "Could not generate autofill places."}` |
| Gemini API | Returns `INVALID_PROMPT` sentinel | `plan.places` check fails, returns `[]`. Endpoint responds `500 {error: "Could not generate a plan..."}` |
| Geoapify | Geocoding fails for a place | `geocodePlace()` returns `null`; place is silently skipped. If all places fail, returns `[]` |
| OpenRouteService Matrix | HTTP error | `getORSMatrices()` catches exception, logs error, returns `{distanceMatrix: null, durationMatrix: null}`. Controller responds `500 {error: "Failed to retrieve distance data."}` |
| OpenRouteService Directions | HTTP error | `getORSRouteGeometry()` catches exception, returns `[]`. Route response is sent with empty `routeGeometry`. |
| C++ Solver | Exits with non-zero code | Controller detects `error` in exec callback, responds `500 {error: "Optimization engine failed."}` |
| C++ Solver | Returns fewer than 2 lines | Controller validates stdout structure, responds `500 {error: "Invalid solver output."}` |
| Redis | Connection unavailable | `redisClient.connect()` logs `CRITICAL` and rejects. Cache calls will throw; API requests involving cache will fail with unhandled exceptions. No in-memory fallback is implemented. |
| Rate limit | >10 optimize requests / 15 min | `429 {error: "Optimization limit reached. Please wait 15 minutes."}` |
| Invalid input | Missing required fields | `400` responses with specific error messages from controller validation |

---

## Security

| Control | Implementation | Notes |
|---|---|---|
| API key isolation | `GEMINI_API_KEY`, `ORS_API_KEY`, `REDIS_URL` exist only in `backend/.env` | Never transmitted to browser |
| Geoapify (frontend) | `VITE_GEOAPIFY_API_KEY` exposed to browser | Used only for address autocomplete in SearchBar component; scoped to geocoding read operations |
| Rate limiting | `express-rate-limit` + Redis: 10 req/15 min on `/api/optimize` | Prevents optimizer abuse; AI endpoints are not rate-limited |
| Input validation | All 4 controllers validate field presence and types before processing | Prevents empty/invalid requests reaching external APIs |
| AI output validation | All Gemini output goes through Geoapify geocoding before use | LLM hallucinations cannot inject arbitrary coordinates |
| Subprocess input | Distance matrix is an integer array serialised to a newline-delimited string | No shell injection risk; `exec()` does not pass stdin through shell |
| CORS | `app.use(cors())` with default settings | Accepts any origin; this is appropriate for a public demo but should be restricted in production |
| External API errors | All external calls wrapped in try/catch | Errors return structured JSON, not raw stack traces |

The application does not implement authentication, API key rotation, request signing, or output sanitization beyond the JSON structure. These are appropriate omissions for a public demo but would be required before production deployment.

---

## Performance Characteristics

No latency benchmarks are present in the repository. The following describes cost drivers for each component.

| Component | Main Cost Driver | Cache Impact |
|---|---|---|
| AI Autofill (Gemini) | One external LLM API call | Cached 7 days; zero cost on hit |
| AI Autofill (Geoapify) | N sequential geocoding calls (N = AI suggestions) | No per-place geocoding cache; full response cached |
| AI Plan (Gemini) | One external LLM API call (larger prompt) | Cached 7 days by SHA-1 |
| AI Plan (Geoapify) | N geocoding calls + 1 city geocoding call | Same as autofill |
| ORS Matrix | One HTTPS request for full N×N matrix | Per-pair cache; 0 cost if all pairs hit |
| C++ TSP Solver | O(n² · 2ⁿ) DP + process spawn overhead | Not cached; runs per optimize request |
| ORS Directions | One HTTPS request for road geometry | Not cached; runs per optimize request |
| Redis operations | Network round-trip to Upstash (per GET/SET) | N/A — is the cache |
| Rate limit check | One Redis increment + read per request | N/A — is Redis |

**Dominant cost on cache miss**: Gemini + N×Geoapify + ORS matrix (3 external API categories in serial/parallel combination).

**Dominant cost on cache hit**: ORS Directions (geometry not cached) + C++ subprocess.

---

## Complexity Reference

| Component | Complexity |
|---|---|
| Geoapify radius filter | O(n) — one Haversine per candidate |
| Haversine computation | O(1) per pair |
| Coordinate deduplication | O(1) amortized — Set lookup |
| ORS matrix (external) | O(n²) location pairs per request |
| Matrix Redis storage | O(n²) SETEX calls |
| TSP DP — time | **O(n² · 2ⁿ)** |
| TSP DP — space | **O(n · 2ⁿ)** |
| TSP path reconstruction | O(n) — linear backtrack through parent pointers |
| Itinerary scheduling | O(n) — single pass over stops |
| Redis GET/SET | O(1) — key-value lookup |

---

## Limitations

**Algorithmic hard limit**
The C++ solver's static arrays (`dist[16][16]`, `memo[1<<16][16]`, `parent[1<<16][16]`) are sized for **at most 16 nodes**. Inputs with more than 16 locations are not supported without recompiling the solver with larger constants.

**Exponential scaling**
Even if the solver were recompiled, the O(n² · 2ⁿ) complexity makes exact TSP impractical beyond roughly 20–22 nodes in a typical server environment. Larger trips would require heuristic approaches.

**Full matrix re-fetch on any cache miss**
If even one directed pair is absent from Redis, the full ORS matrix call is made. Partial matrix reconstruction from cache is not implemented.

**AI non-determinism**
Gemini may return different suggestions for the same prompt across calls. Response quality depends on model state, which is not under the application's control.

**AI plan validity**
If the user's free-text prompt does not contain enough geographic context for Gemini to extract a city and radius, no valid plan can be generated.

**Driving profile only**
All ORS calls use `driving-car`. Walking, cycling, or transit routing is not supported.

**30-day distance cache**
Road network changes (new roads, closures, speed limit updates) within the 30-day TTL window will not be reflected in cached distance values.

**Geoapify client key**
`VITE_GEOAPIFY_API_KEY` is visible in the browser bundle. This is a standard pattern for geocoding/autocomplete APIs where the service is read-only and key rotation is the primary abuse mitigation.

**No persistent storage**
Bucket lists, optimized routes, and itineraries exist only in browser state. There is no user account, saved trip, or server-side persistence beyond the Redis cache.

---

## Future Architecture

These are potential improvements tied to current limitations. None are implemented.

### Larger Trip Sizes

Replace the exact TSP solver with a hybrid approach:

```
N <= 16:     exact bitmask DP (current)
16 < N <= 50: 2-opt local search
N > 50:      nearest-neighbour initialization → Lin-Kernighan improvement
```

Or expose a `solver=exact|heuristic` request parameter.

### Time-Window Constraints

The itinerary scheduler currently assumes all stops are always available. Integrating opening hours would require:
- A data source for place hours (Google Places, Foursquare, OSM amenities)
- Modified scheduling: skip a stop if arrival time falls outside hours, or add it to the following day
- Possibly re-ordering stops to respect time windows (a variant TSP — the TSPTW)

### Partial Matrix Cache

Instead of full-matrix-or-nothing, implement partial population:
- Identify which pairs are cached and which are missing
- Construct a sub-request to ORS containing only missing pairs
- Merge sub-matrix results with cached values

### Worker Queue for Optimization

For larger inputs, move route optimization to a background job queue:
- Frontend submits job and receives a job ID
- Backend processes asynchronously (possibly in a separate worker container)
- Frontend polls or receives webhook on completion

### Persistent Routes

Add user authentication and a database layer for:
- Saved bucket lists
- Stored optimized routes
- Named itineraries
- Sharing via link

### Observability

- Structured JSON logging with request IDs
- Redis hit/miss rate metrics
- External API call latency histograms
- TSP solve-time distribution
- Error rate monitoring per endpoint

---

## Project Structure

```
Loopless/
│
├── backend/
│   ├── src/
│   │   ├── server.js                    # Entry point — app.listen(PORT)
│   │   ├── app.js                       # Express init: CORS, JSON body, 3 route groups
│   │   │
│   │   ├── config/
│   │   │   ├── env.js                   # dotenv loader; exports GEMINI/GEOAPIFY/ORS/REDIS/PORT
│   │   │   ├── gemini.js                # GoogleGenerativeAI(GEMINI_API_KEY); model: gemini-flash-latest
│   │   │   └── redis.js                 # createClient(REDIS_URL).connect(); Upstash TLS
│   │   │
│   │   ├── constants/
│   │   │   └── categories.js            # CATEGORY_MAP: 19 category → prompt-string mappings
│   │   │
│   │   ├── controllers/
│   │   │   ├── optimize.controller.js   # POST /api/optimize: matrix → stdin → solver → geometry
│   │   │   ├── ai.controller.js         # POST /api/ai-autofill, POST /api/ai-plan
│   │   │   └── itinerary.controller.js  # POST /api/itinerary: validation + scheduleItinerary()
│   │   │
│   │   ├── middleware/
│   │   │   └── rateLimiter.js           # express-rate-limit + RedisStore: 10 req/15min
│   │   │
│   │   ├── routes/
│   │   │   ├── optimize.routes.js       # router.post('/optimize', limiter, optimizeRoute)
│   │   │   ├── ai.routes.js             # /ai-autofill, /ai-plan (no rate limit)
│   │   │   └── itinerary.routes.js      # /itinerary
│   │   │
│   │   ├── services/
│   │   │   ├── ai.service.js            # getAIAutofillPlaces(), getAIPlanPlaces()
│   │   │   │                            #   Gemini prompt → JSON parse → Geoapify loop → cache
│   │   │   ├── ors.service.js           # getORSMatrices(), getORSRouteGeometry()
│   │   │   │                            #   ORS matrix/directions API + per-pair Redis cache
│   │   │   ├── geocode.service.js       # geocodePlace(): Geoapify → {lat,lng,formatted}|null
│   │   │   ├── itinerary.service.js     # scheduleItinerary(): pure time-scheduling engine
│   │   │   └── cache.service.js         # getCache(key), setCache(key, ttl, val) — Redis wrappers
│   │   │
│   │   ├── solver/
│   │   │   └── tsp.cpp                  # Bitmask DP TSP; static arrays for 16 nodes
│   │   │                                # Compiled to ./solver/tsp at Docker build time
│   │   │
│   │   └── utils/
│   │       ├── geo.js                   # norm(val): toFixed(4), haversineDistance(lat1,lng1,lat2,lng2)
│   │       ├── hashing.js               # sha1Hex(str): crypto SHA-1 hex digest
│   │       └── time.js                  # timeStringToMinutes(), minutesToTimeString()
│   │
│   ├── .env.example                     # Template for required env vars
│   ├── Dockerfile                       # node:20-bullseye + g++ + compile tsp.cpp -O3
│   ├── package.json                     # scripts: start (node), dev (nodemon)
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx                     # React 19 entry point
│   │   ├── App.jsx                      # BrowserRouter + ThemeProvider + Toaster
│   │   │                                # Routes: / → Home, /result → Result, /itinerary → SmartItinerary
│   │   ├── ThemeContext.jsx             # Dark/light mode context provider
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx                 # Main planner: search, AI autofill/plan, bucket list, optimize trigger
│   │   │   ├── Result.jsx               # Leaflet map + optimized route + distance display
│   │   │   └── SmartItinerary.jsx       # Day-by-day timetable; calls /api/itinerary
│   │   │
│   │   └── components/
│   │       ├── Map.jsx                  # react-leaflet MapContainer + Polyline + Markers
│   │       ├── BucketList.jsx           # Stop list management: add/remove, show/hide
│   │       └── SearchBar.jsx            # Geoapify autocomplete; coordinates extraction
│   │
│   ├── public/
│   │   ├── _redirects                   # Netlify SPA redirect: /* → /index.html
│   │   └── pic.svg                      # Static SVG asset
│   │
│   ├── .env.example                     # VITE_API_URL, VITE_GEOAPIFY_API_KEY
│   ├── vite.config.js                   # @vitejs/plugin-react
│   ├── Dockerfile                       # node:20-bullseye + vite --host
│   └── package.json                     # dev/build/preview scripts
│
├── docker-compose.yml                   # backend:5000 + frontend:5173; .env file mounting
└── README.md
```

---

## Local Development

### Prerequisites

| Requirement | Purpose | Docker? |
|---|---|---|
| Node.js ≥ 20 | Backend and frontend | Handled by base image |
| g++ (GCC) | Compile `tsp.cpp` | Installed in backend Dockerfile |
| Docker + Compose | Full stack containerisation | — |
| Gemini API key | AI destination discovery | Required |
| Geoapify API key | Geocoding (backend + frontend) | Required |
| OpenRouteService API key | Road distance matrix | Required |
| Upstash Redis URL | Cache + rate limiting | Required |

---

### Option A — Docker Compose (recommended)

The Dockerfile handles `g++` installation and solver compilation automatically.

```bash
git clone https://github.com/georgejosephcodes/Loopless.git
cd Loopless
```

Create `backend/.env`:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
GEOAPIFY_API_KEY=your_geoapify_api_key
ORS_API_KEY=your_openrouteservice_api_key
REDIS_URL=rediss://your_upstash_url
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_GEOAPIFY_API_KEY=your_geoapify_api_key
```

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |

---

### Option B — Manual Setup

**Step 1 — Compile the C++ solver** (requires `g++`):

```bash
cd backend
g++ -O3 -o src/solver/tsp src/solver/tsp.cpp
```

**Step 2 — Backend:**

```bash
cd backend
npm install
# ensure backend/.env exists with all 5 variables
npm run dev       # hot-reload with nodemon
# or
npm start         # node src/server.js
```

**Step 3 — Frontend:**

```bash
cd frontend
npm install
# ensure frontend/.env exists
npm run dev       # Vite dev server → http://localhost:5173
```

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `PORT` | ❌ (default: `5000`) | Express server port |
| `GEMINI_API_KEY` | ✅ | Google Generative AI API key for `gemini-flash-latest` |
| `GEOAPIFY_API_KEY` | ✅ | Geoapify API key for geocoding (`/v1/geocode/search`) |
| `ORS_API_KEY` | ✅ | OpenRouteService API key (passed as `Authorization` header) |
| `REDIS_URL` | ✅ | Full Redis connection URL (e.g. `rediss://user:pass@host:port`) |

### Frontend — `frontend/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend base URL — `http://localhost:5000` for local dev; set to the deployed backend URL in hosted environments |
| `VITE_GEOAPIFY_API_KEY` | ✅ | Geoapify key for client-side address autocomplete in SearchBar |

> `VITE_*` variables are embedded into the browser bundle at build time. `VITE_GEOAPIFY_API_KEY` is visible in the client — this is standard for autocomplete/geocoding APIs where the key is read-only and rate-limited by the provider.

---

## Contributing

```bash
# 1. Fork on GitHub
# 2. Clone your fork
git clone https://github.com/your-username/Loopless.git
cd Loopless

# 3. Create a branch
git checkout -b feature/your-feature-name

# 4. Make changes
#    • Do not modify tsp.cpp array sizes without updating all three arrays:
#      dist[N][N], memo[1<<N][N], parent[1<<N][N]
#    • Do not commit .env files
#    • Test the full flow: AI autofill → optimize → itinerary

# 5. Open a pull request
```

---

## License

No `LICENSE` file is present in this repository. The code is not published under an open-source license. Contact the author before reusing or redistributing any part of this codebase.

---

<div align="center">

Built with **React**, **Node.js**, **C++**, **Redis**, **Gemini API**, and real-world geospatial data.

[🚀 Live Demo](https://loopless.netlify.app/) &nbsp;·&nbsp; [💻 GitHub](https://github.com/georgejosephcodes/Loopless)

</div>
