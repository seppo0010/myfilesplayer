FROM node:12-alpine3.12

COPY package* /app/
RUN cd /app && npm install
COPY . /app
RUN cd /app && npm run build

CMD cd /app/dist && node index.js
