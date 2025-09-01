# Dockerfile for Railway deployment of Zwift API

FROM python:3.11-slim

# Set working directory and copy source
WORKDIR /app
# Copy project into a subfolder matching the package name
COPY . /app/zwift_api_client

# Install build dependencies and the API client package
RUN pip install --upgrade pip setuptools wheel \
	&& pip install -e /app/zwift_api_client

# Expose port and run Uvicorn via installed package
EXPOSE 8000
CMD ["uvicorn", "zwift_api_client.standalone_api:app", "--host", "0.0.0.0", "--port", "8000"]
