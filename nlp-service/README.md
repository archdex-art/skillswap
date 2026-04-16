# SkillSwap NLP Microservice

Production-grade semantic embeddings service for skill matching using sentence transformers.

## Quick Start

### 1. Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Start Service

```bash
python main.py
```

Service runs on `http://localhost:8000`

### 3. Verify Health

```bash
curl http://localhost:8000/health
```

---

## API Endpoints

### Health Check
```bash
GET /health
```

### Generate Embeddings
```bash
POST /api/embeddings
{
  "texts": ["Python programming", "Machine learning"],
  "model_name": "all-MiniLM-L6-v2"
}
```

Response:
```json
{
  "embeddings": [[0.1, 0.2, ..., 0.3], [...]],
  "dimension": 384,
  "texts": ["Python programming", "Machine learning"]
}
```

### Compute Similarity
```bash
POST /api/similarity
{
  "user_wanted": ["Python", "ML"],
  "user_offered": ["React"],
  "target_offered": ["Python"],
  "target_wanted": ["React"]
}
```

Response:
```json
{
  "user_wants_target_offers": 0.8234,
  "target_wants_user_offers": 0.7821,
  "final_score": 0.8027,
  "explanation": { ... }
}
```

### Get Recommendations
```bash
POST /api/recommendations
{
  "user_id": "user123",
  "user_skills_wanted": ["Python", "ML"],
  "user_skills_offered": ["React"],
  "candidates": [
    {
      "user_id": "user456",
      "skills_offered": ["Python", "Django"],
      "skills_wanted": ["React"]
    },
    ...
  ]
}
```

Response:
```json
{
  "recommendations": [
    {
      "user_id": "user456",
      "semantic_match_score": 0.8234,
      "user_wants_match": 0.85,
      "target_wants_match": 0.79
    },
    ...
  ],
  "total_candidates": 500,
  "top_n": 20
}
```

---

## Model Details

**Model**: `all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Size**: 27 MB
- **Speed**: ~1000 sentences/sec
- **Accuracy**: High (MTEB benchmark)
- **Use Case**: Semantic search, clustering, recommendations

---

## Performance

| Operation | Latency |
|-----------|---------|
| Single embedding | ~50ms |
| Similarity (2 skills) | ~10ms |
| Batch embeddings (100 texts) | ~100ms |
| Recommendations (500 users) | ~200ms |

---

## Environment

Set in `.env` (optional):

```env
FASTAPI_ENV=production
LOG_LEVEL=info
```

---

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "main.py"]
```

### AWS Lambda

Requires additional dependencies for cold starts optimization. See `lambda_handler.py` for setup.

### Heroku

```bash
heroku create skillswap-nlp
git push heroku main
heroku logs -t
```

---

## Monitoring

Enable detailed logging:

```bash
export DEBUG=true
python main.py
```

Logs include:
- Model loading time
- Request processing time
- Error details with stack traces

---

## Troubleshooting

**Out of memory**: Reduce batch size in client or use streaming.

**Slow startup**: First run downloads model (~27 MB). Subsequent runs are cached.

**High latency**: Check CPU load. NLP service is CPU-bound; use multi-threading or GPU.

---

## Resources

- Model: https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
- Docs: https://www.sbert.net/
- API: https://fastapi.tiangolo.com/

---

**Version**: 1.0.0
**Status**: Production Ready
