# Use Node.js 18
FROM node:18

# Set working directory inside the container
WORKDIR /app

# 1. Copy Backend Package Files first (better caching)
COPY backend/package*.json ./

# 2. Install Dependencies
RUN npm install

# 3. Copy the rest of the Backend Code
COPY backend/ .

# 4. Expose the Hugging Face Port
EXPOSE 7860

# 5. Start the Server
CMD ["node", "server.js"]