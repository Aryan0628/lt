FROM python:3.10-slim

# 1. Install System Tools (FFmpeg is critical for audio)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 2. Install Python Dependencies (FIXED TIMEOUT)
COPY requirements.txt .
# We upgrade pip first, then use a 1000s timeout so it doesn't fail on slow internet
RUN pip install --upgrade pip && \
    pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# 3. DOWNLOAD THE "INDUSTRY GRADE" MODEL (Build Step)
# This downloads the ~750MB model and saves it inside the image at /model_cache
RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('distil-large-v3', device='cpu', compute_type='int8', download_root='./model_cache')"

# 4. Copy your Application Code
COPY . .

# 5. Set Environment Variables
# WHISPER_CACHE_DIR: Tells Python where the model files are hiding
# MODEL_TYPE: Tells your main.py which model name to look for
ENV WHISPER_CACHE_DIR=./model_cache
ENV MODEL_TYPE=distil-large-v3

EXPOSE 8002

# 6. Start the Server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]