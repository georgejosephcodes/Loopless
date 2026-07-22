FROM node:20-bullseye

WORKDIR /app

# Install g++ to compile the C++ TSP solver
RUN apt-get update && apt-get install -y g++

COPY package*.json ./
RUN npm install

COPY . .

# Compile the C++ solver automatically
RUN g++ -O3 -o src/solver/tsp src/solver/tsp.cpp

# Adjust this if your Express server uses a different port
EXPOSE 5000

CMD ["node", "src/server.js"]