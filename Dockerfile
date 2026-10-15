# One image for the whole app (ADR 0001): the SPA is built to static files and packaged inside the Spring Boot jar.
#   docker compose up --build

# 1. Build the web app.
FROM node:22-alpine AS web
WORKDIR /web
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# 2. Build the jar with the web app as static resources.
FROM eclipse-temurin:21-jdk AS backend
WORKDIR /src
COPY gradlew settings.gradle.kts ./
COPY gradle/ gradle/
COPY backend/build.gradle.kts backend/
# Resolve dependencies in their own layer so source changes do not download them again.
RUN ./gradlew --no-daemon :backend:dependencies --configuration runtimeClasspath > /dev/null
COPY backend/ backend/
COPY --from=web /web/dist/ backend/src/main/resources/static/
RUN ./gradlew --no-daemon :backend:bootJar -x test

# 3. Run on a JRE as a non-root user.
FROM eclipse-temurin:21-jre
# Server-side DOCX -> PDF conversion, including Vietnamese Unicode fonts.
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    libreoffice-writer fonts-noto-core && rm -rf /var/lib/apt/lists/*
RUN useradd --system --no-create-home hrm
USER hrm
WORKDIR /app
COPY --from=backend /src/backend/build/libs/*-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
