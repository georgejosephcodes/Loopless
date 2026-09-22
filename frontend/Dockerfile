FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5174

# --host exposes the app outside the container; --port keeps the container's
# own port in sync with docker-compose.yml's published port (5174), separate
# from the host-run "npm run dev" default of 5173 so both can run at once.
CMD ["npm", "run", "dev", "--", "--host", "--port", "5174"]