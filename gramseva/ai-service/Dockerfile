FROM python:3.11-slim

WORKDIR /app

COPY ai-service/requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY ai-service/ ./

EXPOSE 6000

CMD ["python", "app.py"]
