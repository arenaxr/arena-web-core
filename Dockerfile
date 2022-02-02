# build the js
FROM node:latest
RUN mkdir -p /arena-core
WORKDIR /arena-core 
COPY ./package.json .
RUN npm install --legacy-peer-deps 
COPY . . 
RUN echo export const ARENA_VERSION_MSG=\"ARENA commit hash $(git rev-parse --short HEAD)\" > src/arena-version.js
RUN mkdir -p dist && npm run build
RUN rm -fr node_modules

# create the final container
FROM nginx
WORKDIR /usr/share/nginx/html/
COPY --from=0 /arena-core ./
