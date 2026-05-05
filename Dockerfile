# Hugging Face Spaces (Docker SDK) — build from repository root:
#   docker build -t satintel-api .
#
# Copies only backend + bundled `data/`. Exclude secrets: set API keys in Space Settings → Variables (not in git).
FROM python:3.11-slim

RUN useradd -m -u 1000 user
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY data ./data

ENV DATA_DIR=/app/data
ENV SKIP_WARMUP=1
ENV PYTHONUNBUFFERED=1

RUN chown -R user:user /app
USER user

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
