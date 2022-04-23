# build the js
FROM node:16-buster
ARG chash
ARG version
RUN mkdir -p /arena-core
WORKDIR /arena-core
COPY . .
RUN npm ci
RUN echo export const ARENA_VERSION_MSG=\"ARENA $version commit hash $chash\" > src/arena-version.js
RUN mkdir -p dist && npm run build
RUN rm -fr node_modules

# create the final container
FROM nginx
WORKDIR /usr/share/nginx/html/
COPY --from=0 /arena-core ./
