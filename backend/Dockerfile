FROM python:3.11-slim

# HF Spaces runs as uid 1000
RUN useradd -m -u 1000 user
WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Copy satellite data
COPY data/ ./data/

# Tell the app where data lives inside the container
ENV DATA_DIR=/app/data

# city_generator writes new city dirs at runtime — needs write access
RUN chown -R user:user /app

USER user

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
