FROM registry.access.redhat.com/hi/nodejs:22-builder AS build
WORKDIR /app
COPY package.json server.js ./
COPY public/ ./public/

FROM registry.access.redhat.com/hi/nodejs:22
WORKDIR /app
ENV HOME=/tmp PORT=8080
COPY --from=build /app/ /app/
USER 65532
EXPOSE 8080
CMD ["node", "server.js"]
