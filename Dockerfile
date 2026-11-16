# Multi-stage Dockerfile for single-service deployment (e.g., Render Free 512MB)
# Stage 1: Build React + Vite frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Spring Boot JAR with embedded frontend static assets
FROM maven:3.9-eclipse-temurin-21-alpine AS backend-build
WORKDIR /app/backend
COPY fairshare-backend/pom.xml ./
RUN mvn -B dependency:go-offline || true
COPY fairshare-backend/src ./src
COPY --from=frontend-build /app/frontend/dist ./src/main/resources/static
RUN mvn -B clean package -DskipTests

# Stage 3: Minimal Java 21 runtime tuned for 512MB container
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S fairshare && adduser -S fairshare -G fairshare
COPY --from=backend-build /app/backend/target/*.jar app.jar
USER fairshare
EXPOSE 10000
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=65 -Xss256k -XX:+UseSerialGC -jar app.jar"]
