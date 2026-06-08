FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install 

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:dev"]
