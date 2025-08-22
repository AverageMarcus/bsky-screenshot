FROM nginx:latest
WORKDIR /usr/share/nginx/html
ADD src ./
