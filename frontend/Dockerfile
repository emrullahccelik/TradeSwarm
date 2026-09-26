FROM nginx:alpine

# Copy the vanilla JS frontend file
COPY index.html /usr/share/nginx/html/index.html

# Copy the Nginx template for envsubst
COPY default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
