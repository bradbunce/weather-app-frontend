FROM node:lts-iron

# Set timezone
ENV TZ="America/New_York"

# Switch to root to install system dependencies
USER root

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages
RUN npm install -g prettier @aws-amplify/cli

# Switch back to node user and set working directory
USER node
WORKDIR /home/node/app