FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# Dev: Vite dev server with HMR (source mounted via volume at runtime)
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# UAT / Prod: build static files, serve with vite preview
FROM deps AS build
COPY . .
ARG BUILD_MODE=prod
RUN npx vite build --mode ${BUILD_MODE}
EXPOSE 5173
CMD ["npm", "run", "serve"]
