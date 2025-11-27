FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1


WORKDIR /app

COPY requirements.txt .

RUN pip install --user --no-warn-script-location -r requirements.txt

# --------------------------

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/django/.local/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=core.settings
    
RUN useradd -m -u 1000 django && \
    mkdir -p /app/static /app/media && \
    chown -R django:django /app

WORKDIR /app

COPY --from=builder --chown=django:django /root/.local /home/django/.local
COPY --chown=django:django . .

USER root
RUN chmod +x /app/docker-entrypoint.sh && chown django:django /app/docker-entrypoint.sh
USER django

EXPOSE 8089

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8089/api/docs/ || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]

CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8089", "--workers", "3", "--threads", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]