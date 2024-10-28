# Use the NVIDIA CUDA runtime base image with Ubuntu
FROM nvidia/cuda:12.4.0-runtime-ubuntu20.04

# Install FFmpeg, Node.js (16.15.1), and other dependencies
RUN apt update && \
  apt install -y ffmpeg curl vim && \
  curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
  apt install -y nodejs=16.15.1-1nodesource1 && \
  rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /home/github/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --legacy-peer-deps
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

CMD [ "npm", "run", "dev" ]
