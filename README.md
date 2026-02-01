# Loopless — DSA-Powered Route Optimizer

Live Demo: https://loopless.netlify.app/

A **high-performance route optimization system** that solves the **Traveling Salesperson Problem (TSP)** using real-world road data and advanced algorithms.

This project demonstrates **algorithmic problem-solving**, **optimal data structure design**, and **system architecture**, prioritizing computational efficiency over UI complexity.

---

## Problem Statement

Delivery services, logistics companies, and travelers need to optimize routes with:

- Multiple destinations to visit
- Real-world driving distances (not straight lines)
- A fixed starting point
- Minimal total travel distance
- Fast computation even with many locations

Most simple route planners fail to:

- Use actual road distances
- Find the mathematically optimal route
- Handle the computational complexity efficiently

**Loopless** solves these problems using the **Held-Karp algorithm**, **OSRM road network data**, and **optimized C++ execution**.

---

## Core Features

### Real-World Distance Matrix

- Fetches actual driving distances via **OSRM API**
- No straight-line approximations
- Accounts for real road networks and geography

---

### TSP Solver (Algorithmic Core)

- **Held-Karp Algorithm** implementation
  - Dynamic Programming with Bitmasking
  - Time Complexity: **O(n² · 2ⁿ)**
  - Space Complexity: **O(n · 2ⁿ)**
- Compiled **C++ binary** for maximum performance
- Finds provably optimal Hamiltonian cycle

---

### Fixed Start Point Constraint

- First location added is the **mandatory starting point**
- Route optimization begins and ends at this location
- Realistic for delivery/sales route planning

---

### Interactive Map Visualization

- Real-time route rendering using **Leaflet** and **OpenStreetMap**
- Visual markers for all destinations
- Step-by-step distance breakdown

---

### Progressive Analytics

Route metrics displayed:

- **Total optimized distance**
- **Leg-by-leg accumulated distance**
- **Optimized visit order**

---

## Key Design Decisions

### Why C++ for the TSP Solver

JavaScript/Node.js is too slow for:

- Exponential time complexity algorithms
- Bitwise operations on large sets
- Memory-intensive DP tables

**C++ provides:**

- 10-100x faster execution
- Efficient bit manipulation
- Direct memory control

The solver runs as a **compiled binary**, called via Node.js child process.

---

### Why OSRM Over Euclidean Distance

Straight-line distance (Euclidean) is **inaccurate** for real-world routing:

- Ignores roads, rivers, mountains
- Doesn't account for one-way streets
- Produces invalid routes

**OSRM** provides:

- Actual drivable distances
- Road network topology
- Realistic travel times

---

### Why Held-Karp Over Heuristics

Heuristic algorithms (e.g., nearest neighbor, genetic algorithms):

- Provide **approximate** solutions
- May miss the optimal route by 20-40%
- Lack mathematical guarantees

**Held-Karp** guarantees:

- Provably optimal solution
- Deterministic results
- Suitable for up to ~15 locations

---

### Why Bitmasking for DP State

TSP state = "visited set + current node"

**Bitmasking approach:**
```cpp
// State: dp[mask][node]
// mask = bitmask of visited cities
// node = current position

if (mask & (1 << i)) // City i is visited
mask |= (1 << next)  // Mark next city as visited
```

**Benefits:**

- Compact state representation
- O(1) set operations
- Cache-friendly memory access

---

## Architecture Overview
```
User Input (Locations)
        ↓
React Frontend (Leaflet Map)
        ↓
Node.js API (Express)
        ↓
OSRM API → Distance Matrix
        ↓
C++ TSP Solver (Held-Karp)
        ↓
Optimized Route
        ↓
Frontend (Route Visualization)
```

---

## Algorithm Breakdown

### Held-Karp Dynamic Programming

**Problem:** Find shortest Hamiltonian cycle starting from node 0

**State Definition:**
- `dp[mask][i]` = minimum cost to visit all cities in `mask`, ending at city `i`

**Recurrence:**
```
dp[mask][i] = min(dp[mask ^ (1<<i)][j] + dist[j][i])
              for all j in mask where j ≠ i
```

**Base Case:**
```
dp[1][0] = 0  // Start at city 0 with only city 0 visited
```

**Final Answer:**
```
min(dp[(1<<n)-1][i] + dist[i][0]) for all i ≠ 0
```

---

## Tech Stack

| Component          | Technology                          |
|--------------------|-------------------------------------|
| **Frontend**       | React, React-Leaflet, Axios         |
| **Map Provider**   | Leaflet, OpenStreetMap              |
| **Backend**        | Node.js, Express                    |
| **Algorithm**      | C++ (Compiled with G++)             |
| **Routing API**    | OSRM (Distance Matrix)              |
| **Geocoding API**  | Nominatim                           |

---

## API Highlights

### Routes
- `POST /optimize` — Main TSP solver endpoint
  - Accepts array of coordinates
  - Returns optimized route order and total distance

---

## Getting Started

### Prerequisites

- **Node.js** (v18+)
- **G++ Compiler** (for C++ solver)
- **NPM** (Node Package Manager)

---

### 1. Backend Setup
```bash
cd backend
npm install
```

**Compile the C++ TSP Solver:**
```bash
g++ -O3 solver/tsp.cpp -o solver/tsp_solver
```

**Start the Backend:**
```bash
node index.js
```

Backend runs at: `http://localhost:5000`

---

### 2. Frontend Setup
```bash
cd frontend
npm install
```

**Start the Frontend:**
```bash
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## How It Works

### Step 1: Location Input
Users search and add up to **15 locations**.  
The **first location** is automatically set as the starting point.

### Step 2: Distance Matrix Generation
Backend sends coordinates to **OSRM API**, which returns a matrix of real-world driving distances between all pairs of locations.

### Step 3: TSP Optimization
The distance matrix is passed to the **compiled C++ binary**.  
The Held-Karp algorithm computes the shortest Hamiltonian cycle using **dynamic programming + bitmasking**.

### Step 4: Route Visualization
The optimized route is returned to the frontend, which displays:

- **Optimized path** on the interactive map
- **Step-by-step accumulated distances**
- **Total trip distance**

---

## Limitations & Trade-offs

### Exponential Complexity
TSP is **NP-hard**. Held-Karp runs in **O(n² · 2ⁿ)** time.

**Practical limit:** ~15 locations  
Beyond this, heuristic algorithms (genetic, simulated annealing) would be needed.

### API Rate Limits
OSRM public API has request limits.  
For production use, consider:

- Self-hosted OSRM instance
- Caching distance matrices

### Fixed Start Constraint
The first location **must** be the start/end point.  
General TSP (any start point) requires minor algorithm modification.

---

## Why Loopless?

**Demonstrates:**

- Advanced **Data Structures & Algorithms** (DP, Bitmasking, TSP)
- **System Design** (separating compute-heavy C++ from API orchestration)
- **Real-world API integration** (OSRM, Nominatim)
- **Performance optimization** (compiled binaries, algorithmic efficiency)

**Use Cases:**

- Delivery route optimization
- Sales territory planning
- Multi-destination travel planning
- Educational TSP demonstration

---

## Future Enhancements (Planned)

- **Heuristic solvers** for 20+ locations (Genetic Algorithm, Ant Colony)
- **Time windows** for delivery constraints
- **Vehicle capacity** modeling
- **Multi-vehicle routing** (VRP extension)
- **Historical route caching**
- **Mobile app** for on-the-go planning

---

## Security Notes

- No user authentication (demo application)
- OSRM API calls are rate-limited
- Input validation for coordinate arrays
- Compiled C++ binary is sandboxed via child process

---

## Live Demo

🔗 **https://loopless.netlify.app/**

Try optimizing routes with real locations and see the Held-Karp algorithm in action!

---

## License

MIT License — Free to use, modify, and distribute.

---
