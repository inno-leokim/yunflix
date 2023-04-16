FROM node:16.20-alpine
WORKDIR /usr/src/app 
COPY package*.json ./
ENV PORT=3000
RUN npm install --only=production
COPY ./src ./src
# COPY ./videos ./videos 
CMD npm start