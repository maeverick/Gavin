FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the source
COPY . .

# Create uploads directory (used by multer for temp file storage)
RUN mkdir -p uploads

# Expose the port Express listens on
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
