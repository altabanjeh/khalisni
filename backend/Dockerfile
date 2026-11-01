FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --root-user-action=ignore -r requirements.txt

COPY . .

RUN chmod +x /app/entrypoint.sh

# Build identity, reported by GET /api/health/version/ (core/version.py).
# Declared after the dependency layers so a new commit does not reinstall them.
# docker-compose.yml passes BUILD_SHA / BUILD_TIME; without them: "unknown".
ARG BUILD_SHA=unknown
ARG BUILD_TIME=unknown
ENV BUILD_SHA=${BUILD_SHA} \
    BUILD_TIME=${BUILD_TIME}

EXPOSE 8000

CMD ["/app/entrypoint.sh"]
