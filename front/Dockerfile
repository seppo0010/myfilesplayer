FROM node:12-alpine3.12 AS react

COPY package* /app/
RUN cd /app && npm install
COPY . /app
RUN cd /app && npm run build

FROM nginx:1.21.5-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=react /app/build /usr/share/nginx/html
