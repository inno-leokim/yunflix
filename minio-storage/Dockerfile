FROM node:16.20-alpine 

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --only=production
COPY ./src ./src 
CMD npm start