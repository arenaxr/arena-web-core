# build the js
FROM node:latest
RUN mkdir -p /arena-core
WORKDIR /arena-core 
COPY ./package.json .
RUN npm install --legacy-peer-deps 
COPY . . 
RUN mkdir -p dist && npm run build
RUN rm -fr node_modules src

# create the final container
FROM nginx
WORKDIR /usr/share/nginx/html/
COPY --from=0 /arena-core ./
