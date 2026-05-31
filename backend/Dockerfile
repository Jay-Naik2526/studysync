FROM node:20-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy source code
COPY . .

# HuggingFace Spaces requires port 7860
EXPOSE 7860

CMD ["node", "server.js"]
