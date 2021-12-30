FROM node:12-alpine3.12

COPY . /app
RUN cd /app && npm install
RUN cd /app && npm run build

CMD cd /app/dist && node index.js
