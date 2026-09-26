FROM python:3.12-slim

WORKDIR /app

# Copy requirements or directly install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install asyncpg sqlalchemy langgraph-checkpoint-postgres

# Copy the rest of the backend files
COPY backend/ ./backend/
COPY agents/ ./agents/
# The `.env` file should be mounted or passed via docker-compose, but we can copy it for now if needed. 
# Usually we rely on docker-compose env_file.

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
