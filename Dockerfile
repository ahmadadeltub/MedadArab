
# Python slim image
FROM python:3.11-slim

# Avoid Python buffering
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Expose port (platforms often set $PORT)
ENV PORT=8080
EXPOSE 8080

# Start with gunicorn
CMD [ "gunicorn", "-b", "0.0.0.0:8080", "app:app", "--workers=2", "--threads=4", "--timeout=60" ]
