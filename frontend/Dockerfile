FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# The --host flag is required for Vite to expose the app outside the container
CMD ["./node_modules/.bin/vite", "--host"]