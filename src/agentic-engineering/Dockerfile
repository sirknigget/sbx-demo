FROM node:22.22.1-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html ./
COPY app ./app
RUN npm run build

FROM node:22.22.1-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=build /app/dist ./dist
COPY server.js ./
USER node
EXPOSE 3001
CMD ["node", "server.js"]
