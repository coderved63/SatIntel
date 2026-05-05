# Legacy: build only if `data/` is copied next to this file (e.g. CI that vendors data into backend/).
# For Hugging Face Spaces and normal monorepo builds, use the root Dockerfile:
#   docker build -t satintel-api -f Dockerfile .
FROM python:3.11-slim

RUN useradd -m -u 1000 user
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

RUN mkdir -p ./data

ENV DATA_DIR=/app/data
ENV PYTHONUNBUFFERED=1

RUN chown -R user:user /app
USER user

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
