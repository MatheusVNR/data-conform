# ==============================================================================
# DataConform Frontend - Multi-stage Dockerfile (Node 22 + Nginx Alpine)
# ==============================================================================

FROM node:22-alpine AS build
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . .

# Environment build variables
ARG VITE_API_URL=""
ARG VITE_STRIPE_PRO_URL=""
ARG VITE_STRIPE_ENTERPRISE_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_STRIPE_PRO_URL=$VITE_STRIPE_PRO_URL
ENV VITE_STRIPE_ENTERPRISE_URL=$VITE_STRIPE_ENTERPRISE_URL

# Build static production bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Runtime stage (Nginx)
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
