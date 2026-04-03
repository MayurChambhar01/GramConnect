# Build stage
FROM node:20-alpine AS builder

WORKDIR /app/client

COPY client/package*.json ./

RUN npm install

COPY client/ ./

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
