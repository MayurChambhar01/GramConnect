FROM node:20-alpine

WORKDIR /app/server

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy server code
COPY server/ ./

EXPOSE 5000

CMD ["npm", "start"]
