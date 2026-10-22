FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production PORT=3001
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.js ./server.js
COPY package.json ./package.json
EXPOSE 3001
CMD ["node", "server.js"]
