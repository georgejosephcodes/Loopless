🚦 Loopless — DSA-Powered Route Optimizer

Loopless is a full-stack route optimization application that finds the most efficient path between multiple destinations using real-world road data.
It combines a high-performance C++ backend for solving the Traveling Salesperson Problem (TSP) with a modern React frontend for an intuitive map-based experience.

🚀 Features

Real-World Routing
Uses the OSRM (Open Source Routing Machine) API to fetch actual driving distances instead of straight-line (Euclidean) distances.

DSA Core (TSP Solver)
Implements the Held-Karp algorithm (Dynamic Programming + Bitmasking) in C++, achieving
O(n² · 2ⁿ) time complexity.

Fixed Start Point Constraint
The first location added is treated as the mandatory starting point of the journey.

Interactive Mapping
Integrated with Leaflet and OpenStreetMap for real-time visualization of routes and markers.

Progressive Analytics
Displays:

Total optimized trip distance

Accumulated distance after each leg of the journey

🛠️ Tech Stack
Component	Technology
Frontend	React, React-Leaflet, Axios, Lucide-React
Backend	Node.js, Express
Algorithm Engine	C++ (DP + Bitmasking)
APIs	OSRM (Distance Matrix), Nominatim (Geocoding)
📋 Prerequisites

Node.js (v18 or higher recommended)

G++ Compiler (for compiling the C++ solver)

NPM (Node Package Manager)

🔧 Installation & Setup
1️⃣ Backend Setup
cd backend
npm install express cors axios

# Compile the C++ TSP solver
g++ -O3 solver/tsp.cpp -o solver/tsp_solver

# Start the backend server
node index.js


Backend runs at:
👉 http://localhost:5000

2️⃣ Frontend Setup
cd frontend
npm install react-leaflet leaflet axios lucide-react react-router-dom

# Start the frontend
npm run dev


Frontend runs at:
👉 http://localhost:5173

🧠 How It Works

Input
Users search and add up to 15 locations.
The first location is automatically marked as the starting point.

Distance Matrix Generation
The backend sends coordinates to the OSRM API, retrieving a real-world driving distance matrix.

Optimization (C++ Engine)
The matrix is passed to a compiled C++ binary, which uses bitmask DP (Held-Karp) to compute the shortest Hamiltonian cycle.

Output
The optimized route order and total distance are returned to the frontend, which renders:

The optimized path on the map

Step-by-step accumulated distances

🎯 Why Loopless?

Demonstrates advanced DSA (TSP, Bitmasking, DP)

Uses real-world data, not toy examples

Separates algorithmic compute (C++) from API orchestration (Node.js)

Designed with scalability and performance in mind