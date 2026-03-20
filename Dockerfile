FROM nginx:alpine

# Copy static files
COPY ai-cost-calculator.html /usr/share/nginx/html/calculator/index.html
COPY ai-calculator-methodology.html /usr/share/nginx/html/calculator/methodology/index.html
COPY landingpage.html /usr/share/nginx/html/index.html
COPY logo.png /usr/share/nginx/html/logo.png

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Cloud Run requires port 8080
EXPOSE 8080
