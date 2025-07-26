FROM nvidia/cuda:12.2.0-base-ubuntu22.04

# System dependencies
RUN apt-get update && \
    apt-get install -y git python3 python3-pip python3-venv ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

# Create user and set workdir
RUN useradd -ms /bin/bash chatterbox
WORKDIR /home/chatterbox

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set ownership
RUN chown -R chatterbox:chatterbox /home/chatterbox

# Switch to user
USER chatterbox

# Expose port
EXPOSE 8000

# Default command
CMD ["python3", "app.py"] 