FROM node:20-alpine AS builder
WORKDIR /app
ARG BACKEND_INTERNAL_URL
ARG NEXT_PUBLIC_API_BASE_URL
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy other sources and build production package
COPY . .
RUN npm run build

# Run stage
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# Copy node_modules and built assets
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

EXPOSE 3000

CMD ["npm", "start"]
