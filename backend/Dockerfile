FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv/tapas
RUN apt-get update && apt-get install -y --no-install-recommends libsqlite3-mod-spatialite \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini pytest.ini ./
RUN useradd --create-home --uid 10001 tapas && chown -R tapas:tapas /srv/tapas
USER tapas
EXPOSE 8000
CMD ["sh", "-c", "python -m alembic upgrade head && python -m app.seed.run_seed && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
