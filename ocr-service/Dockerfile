FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source files
COPY . .

EXPOSE 8001
ENV OCR_ENABLED=false
ENV PORT=8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
