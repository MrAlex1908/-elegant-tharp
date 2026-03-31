FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src/ src/

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 8080
ENV PORT=8080
CMD ["node", "src/server.js"]
