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

# The ./backend/src bind mount (docker-compose.yml, for live reload) can shadow
# this image's own compiled solver with a host-built binary (e.g. Fedora glibc
# vs this image's Debian bullseye glibc), which fails at exec time even though
# build-solver.js's mtime check thinks it's already up to date. Force a fresh
# in-container compile on every start so the running binary always matches
# this container's glibc, regardless of what the mount brought in.
CMD ["sh", "-c", "rm -f src/solver/tsp && npm run dev"]