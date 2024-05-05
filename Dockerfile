# Use the official Node.js 14 image as a base image
FROM node:14

# Set the working directory in the container to /app
WORKDIR /app

# Copy the package.json and package-lock.json (if available)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of your application's code
COPY . .

# Make port 8082 available outside this container
EXPOSE 8082

# Run the application
CMD ["node", "server.js"]

