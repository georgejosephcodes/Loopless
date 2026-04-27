# 🗺️ Loopless — AI-Powered Trip Planning & Route Optimization

> Plan smarter trips. Optimize every stop. Powered by AI + real road data.

**Live Demo →** [loopless.netlify.app](https://loopless.netlify.app/)

---

## What is Loopless?

Loopless is a full-stack trip planning platform that combines **algorithmic route optimization**, **real-world road-distance matrices**, and **AI-powered destination discovery** to generate the most efficient multi-stop travel itineraries.

Unlike typical route planners, Loopless uses a **server-side C++ TSP solver**, actual road networks (not straight-line estimates), and Gemini AI to suggest and validate real nearby places — all with Redis caching for speed and cost efficiency.

---

## Features

### 🤖 AI Trip Autofill (Gemini + Geoapify)
Starting from a single location, Loopless generates nearby destinations by category using Gemini AI, then validates each place through Geoapify for real-world accuracy and radius filtering.

**Supported categories:**
Nature · Food · Tourist · Shopping · Hidden Gems · Historical · Religious · Adventure · Nightlife · Family Friendly · Romantic · Luxury · Budget · Photography Spots · Road Trip · Local Favorites · Cafes · Museums · Beaches

### 🛣️ Real-World Distance Matrix
Uses the **OpenRouteService Matrix API** for actual drivable road distances — respecting roads, terrain, and one-way systems. No Euclidean shortcuts.

### ⚙️ Server-Side C++ TSP Solver
A compiled C++ solver handles route optimization using bitmask dynamic programming — faster and more efficient than JS for exponential-complexity problems. Handles up to ~15 waypoints optimally.

### ⚡ Redis Caching Layer
Distance matrices, AI autofill responses, and geospatial queries are cached via **Upstash Redis**, reducing API costs and improving response times on repeated requests.

### 🗺️ Interactive Frontend
- Real-road route rendering via Leaflet
- AI Trip Planner modal
- Dynamic radius controls
- Duplicate-stop prevention
- Dark mode
- Custom pin rendering + toast notifications

---

## Architecture

```
User Input / AI Autofill
        ↓
React Frontend (Leaflet + UI)
        ↓
Node.js / Express API Layer
        ↓
Gemini API → Smart Place Suggestions
        ↓
Geoapify → Validation + Geocoding
        ↓
OpenRouteService → Road Distance Matrix
        ↓
Redis Cache Layer
        ↓
C++ TSP Solver
        ↓
Optimized Route + Geometry
        ↓
Frontend Visualization
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Leaflet, Axios |
| Backend | Node.js, Express |
| Algorithm Core | C++ (Bitmask DP / TSP) |
| AI Layer | Gemini API |
| Geocoding | Geoapify |
| Routing | OpenRouteService |
| Caching | Redis (Upstash) |
| Rate Limiting | express-rate-limit |

---

## API Endpoints

### `POST /api/optimize`
Optimizes stop order for selected destinations.

**Returns:** optimized path, distance matrix, total distance, real-road geometry

### `POST /api/ai-autofill`
Generates AI-suggested nearby destinations based on category and radius.

**Inputs:** starting place, radius, max stops, category  
**Returns:** verified nearby places

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/georgejosephcodes/Loopless.git
cd Loopless
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in `/backend`:
```env
PORT=5000
ORS_API_KEY=your_openrouteservice_key
GEOAPIFY_API_KEY=your_geoapify_key
GEMINI_API_KEY=your_gemini_key
REDIS_URL=your_upstash_redis_url
```

Start the backend:
```bash
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env` file in `/frontend`:
```env
VITE_API_URL=http://localhost:5000
VITE_GEOAPIFY_API_KEY=your_geoapify_key
```

Start the frontend:
```bash
npm run dev
```

---

## Practical Limits

The C++ TSP solver is optimal for up to **~15 waypoints**. Beyond this, exponential complexity becomes a bottleneck.

---

## Security

- Rate-limited API endpoints
- Input validation on all routes
- External requests cached server-side
- No client-side key exposure for optimization logic

---

## License

MIT License — free to use, modify, and distribute.