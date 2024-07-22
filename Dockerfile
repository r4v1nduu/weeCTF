# Use a specific version of Node.js
FROM node:16-slim

# Set environment variable
ENV NODE_ENV=development

# Set the working directory
WORKDIR /express-docker

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the application port
EXPOSE 80

# Start the application
CMD ["node", "app.js"]