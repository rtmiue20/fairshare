# Build stage – JDK 21 khớp với <java.version>21</java.version> trong pom.xml
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline || true
COPY src ./src
RUN mvn -B clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S fairshare && adduser -S fairshare -G fairshare
COPY --from=build /app/target/*.jar app.jar
USER fairshare
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
