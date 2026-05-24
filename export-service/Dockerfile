FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Set playwright browser path to a stable path and install Chromium with dependencies
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

COPY --from=builder /app/dist ./dist

EXPOSE 3001
ENV PORT 3001
ENV EXPORT_SERVICE_PORT 3001

CMD ["node", "dist/server.js"]
