# SkillSwap NLP Implementation Verification Checklist

Use this checklist to verify that the semantic NLP system is properly installed and working.

---

## 🔍 Pre-Installation Checks

### System Requirements
- [ ] Python 3.9 or higher installed (`python --version`)
- [ ] Node.js 16 or higher installed (`node --version`)
- [ ] MongoDB running (`mongod` process or MongoDB Atlas connection)
- [ ] At least 1GB free disk space
- [ ] Port 5050 (backend) available
- [ ] Port 8000 (NLP service) available
- [ ] Port 5173 (frontend) available

---

## 🚀 Installation Verification

### Step 1: NLP Service Setup

- [ ] NLP service directory exists: `nlp-service/`
- [ ] `nlp-service/main.py` exists
- [ ] `nlp-service/requirements.txt` exists
- [ ] Python virtual environment created: `nlp-service/venv/`
- [ ] All Python packages installed:
  ```bash
  cd nlp-service
  source venv/bin/activate  # or venv\Scripts\activate on Windows
  pip list | grep -E "fastapi|sentence-transformers|uvicorn"
  ```

### Step 2: Backend Setup

- [ ] `server/package.json` includes `"axios"` dependency
- [ ] `server/.env` exists with correct variables:
  ```
  PORT=5050
  MONGODB_URI=mongodb://localhost:27017/skillswap
  NLP_SERVICE_URL=http://localhost:8000
  ```
- [ ] `server/src/services/embeddingService.js` exists
- [ ] `server/src/utils/logger.js` exists
- [ ] `server/src/controllers/recommendationController.js` exists
- [ ] `server/src/routes/recommendationRoutes.js` exists
- [ ] `server/node_modules` directory populated (`npm install` successful)

### Step 3: Database Model Updates

- [ ] `server/src/models/User.js` includes embedding fields:
  ```javascript
  embeddingOffered: [Number]
  embeddingWanted: [Number]
  embeddingUpdatedAt: Date
  ```
- [ ] `server/src/models/Match.js` includes:
  ```javascript
  semanticDetails: mongoose.Schema.Types.Mixed
  ```

### Step 4: Migration Script

- [ ] `server/scripts/migrate-add-embeddings.js` exists
- [ ] Script is executable: `chmod +x server/scripts/migrate-add-embeddings.js`

### Step 5: Documentation

- [ ] `NLP_INTEGRATION_GUIDE.md` exists
- [ ] `IMPLEMENTATION_SUMMARY.md` exists
- [ ] `nlp-service/README.md` exists
- [ ] `setup-nlp.sh` and `setup-nlp.bat` exist

---

## ✅ Runtime Verification

### Phase 1: Start NLP Service

```bash
cd nlp-service
source venv/bin/activate  # Windows: venv\Scripts\activate
python main.py
```

**Expected Output:**
```
INFO:     Started server process [12345]
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

- [ ] NLP service starts without errors
- [ ] Listens on port 8000

### Phase 2: Verify NLP Service Health

```bash
curl http://localhost:8000/health
```

**Expected Output:**
```json
{
  "status": "ok",
  "service": "SkillSwap NLP",
  "model": "all-MiniLM-L6-v2",
  "embedding_dimension": 384
}
```

- [ ] Health check succeeds
- [ ] Returns correct status
- [ ] Model dimension is 384

### Phase 3: Start Backend

```bash
cd server
npm run dev
```

**Expected Output:**
```
✅ Server running in development mode on port 5050
```

- [ ] Backend starts without errors
- [ ] Listens on port 5050
- [ ] No "NLP Service unreachable" warnings in initial startup

### Phase 4: Test Embedding Endpoint

```bash
curl -X POST http://localhost:8000/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Python programming"]}'
```

**Expected Output:**
```json
{
  "embeddings": [[0.123, 0.456, ..., 0.789]],
  "texts": ["Python programming"],
  "dimension": 384
}
```

- [ ] Embedding generation works
- [ ] Returns 384-dimensional vectors
- [ ] Response time < 100ms

### Phase 5: Test Similarity Endpoint

```bash
curl -X POST http://localhost:8000/api/similarity \
  -H "Content-Type: application/json" \
  -d '{
    "user_wanted": ["Python"],
    "user_offered": ["React"],
    "target_offered": ["Python"],
    "target_wanted": ["React"]
  }'
```

**Expected Output:**
```json
{
  "user_wants_target_offers": 0.95,
  "target_wants_user_offers": 0.95,
  "final_score": 0.95,
  "explanation": {...}
}
```

- [ ] Similarity computation works
- [ ] Returns scores between 0-1
- [ ] Response time < 50ms

---

## 🗄️ Database Verification

### Check MongoDB Connection

```javascript
// In MongoDB shell
use skillswap
db.users.findOne()
```

- [ ] MongoDB is running
- [ ] Database `skillswap` exists
- [ ] `users` collection exists

### Check User Schema

```javascript
db.users.findOne({ embeddingOffered: { $exists: true } })
```

**Expected:** Returns a user with embedding fields (or empty if no migrations run yet)

- [ ] User documents have `embeddingOffered` field
- [ ] User documents have `embeddingWanted` field
- [ ] User documents have `embeddingUpdatedAt` field

### Run Migration

```bash
cd server
node scripts/migrate-add-embeddings.js
```

**Expected Output:**
```
ℹ️  Starting embedding migration...
✅ Connected to MongoDB
✅ NLP Service healthy: ok
ℹ️  Found N users needing embeddings
✅ Updated user Alice (user_id)
...
✨ Migration complete! Updated N users
```

- [ ] Migration connects to MongoDB
- [ ] Migration detects NLP service
- [ ] Migration processes all users
- [ ] No errors during migration
- [ ] Embeddings now stored in database:
  ```javascript
  db.users.findOne().embeddingOffered.length  // Should be 384
  db.users.findOne().embeddingWanted.length   // Should be 384
  ```

---

## 🧪 API Testing

### Test 1: Get Recommendations

```bash
# First, get a valid JWT token by logging in
TOKEN="your_jwt_token_here"
USER_ID="your_user_id_here"

curl -X GET "http://localhost:5050/api/recommendations/$USER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "message": "Recommendations generated successfully",
  "recommendations": [
    {
      "user_id": "...",
      "semantic_match_score": 0.82,
      "user_wants_match": 0.85,
      "target_wants_match": 0.79,
      "user": {...}
    },
    ...
  ],
  "total": 5
}
```

- [ ] Endpoint returns 200 status
- [ ] Recommendations include semantic scores
- [ ] Scores are between 0-1
- [ ] Response time < 500ms

### Test 2: Compute Match Score

```bash
curl -X POST "http://localhost:5050/api/recommendations/score" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1",
    "targetId": "user2"
  }'
```

**Expected Response:**
```json
{
  "userId": "user1",
  "targetId": "user2",
  "semantic_match_score": 82,
  "trust_component": 75,
  "final_match_score": 81,
  "match_tag": "Great Match",
  "details": {...}
}
```

- [ ] Endpoint returns 200 status
- [ ] Match score is between 0-100
- [ ] Match tag is one of: Perfect Match, Great Match, Good Match, Average Match

### Test 3: Create Match Request

```bash
curl -X POST "http://localhost:5050/api/matches" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user2",
    "message": "Hi! I want to learn Python and can teach React"
  }'
```

**Expected Response:**
```json
{
  "_id": "match_id",
  "matchScore": 82,
  "matchTag": "Great Match",
  "semanticDetails": {
    "semanticScore": 82,
    "userWantsMatch": 85,
    "targetWantsMatch": 79
  },
  "status": "pending"
}
```

- [ ] Match is created with semantic details
- [ ] `semanticDetails` field is populated
- [ ] Match score reflects semantic similarity

### Test 4: Refresh Embeddings

```bash
curl -X POST "http://localhost:5050/api/recommendations/refresh-embeddings/$USER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "message": "Embeddings refreshed successfully",
  "userId": "user_id",
  "embeddingOfferedDim": 384,
  "embeddingWantedDim": 384,
  "updatedAt": "2024-01-15T10:30:45.123Z"
}
```

- [ ] Endpoint returns 200 status
- [ ] Embeddings are 384-dimensional
- [ ] `embeddingUpdatedAt` is current timestamp

---

## 📊 Performance Benchmarks

Run these tests to verify performance:

### Embedding Generation
```bash
time curl -X POST http://localhost:8000/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"texts": ["Python programming", "Machine learning", "Web development"]}'
```

- [ ] Response time < 100ms

### Similarity Computation
```bash
time curl -X POST http://localhost:8000/api/similarity \
  -H "Content-Type: application/json" \
  -d '{"user_wanted": ["Python"], "user_offered": ["React"], "target_offered": ["Python"], "target_wanted": ["React"]}'
```

- [ ] Response time < 50ms

### Recommendations (100 users)
```bash
time curl -X GET "http://localhost:5050/api/recommendations/$USER_ID?limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] Response time < 500ms
- [ ] Returns 20 or fewer recommendations

---

## 🐛 Error Handling Verification

### Test NLP Service Failure

1. Stop NLP service: `Ctrl+C` in NLP terminal
2. Create a new match request:
   ```bash
   curl -X POST "http://localhost:5050/api/matches" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"recipientId": "user2", "message": "test"}'
   ```

**Expected:**
```json
{
  "matchScore": 50,  // Fallback value
  "semanticDetails": {
    "method": "keyword_fallback"
  }
}
```

- [ ] System uses keyword matching fallback
- [ ] No API error (graceful degradation)
- [ ] Logs show fallback message

3. Restart NLP service:
   ```bash
   python main.py
   ```

- [ ] System automatically uses semantic matching again

### Test Invalid Input

```bash
curl -X POST "http://localhost:5050/api/recommendations/score" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "invalid"}'
```

- [ ] Returns 400 or 404 status (not 500)
- [ ] Error message is descriptive

---

## 📋 Final Checklist

- [ ] All prerequisites satisfied
- [ ] All files created/modified correctly
- [ ] NLP service starts and responds to health check
- [ ] Backend starts and connects to NLP service
- [ ] Database migration completes successfully
- [ ] Embeddings stored in MongoDB (384-dim vectors)
- [ ] All 4 API endpoints respond correctly
- [ ] Semantic matching produces reasonable scores (0-1)
- [ ] Match requests include semantic details
- [ ] System gracefully falls back to keyword matching
- [ ] Response times within expected ranges
- [ ] Documentation is complete and accurate

---

## 🎯 Success Criteria

Your implementation is complete and production-ready when:

✅ NLP service responds to `/health` endpoint
✅ All recommendation APIs return 200 status
✅ Semantic scores are between 0-1
✅ Match requests include `semanticDetails` field
✅ Fallback mechanism works (NLP service down)
✅ Response times < 500ms for recommendations
✅ 10+ users have embeddings in database
✅ No error logs related to NLP

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| "NLP Service unreachable" | Start NLP service: `cd nlp-service && python main.py` |
| "Cannot find module axios" | Run: `cd server && npm install` |
| "EADDRINUSE: port 8000 in use" | Kill process: `lsof -ti:8000 \| xargs kill` |
| "MongoDB connection failed" | Check MONGODB_URI in .env and MongoDB status |
| "Embeddings not generating" | Check NLP service logs for errors |
| "Slow recommendations" | Check database indexes and NLP service load |

---

## 📞 Support

If issues persist:

1. Check the logs in both services
2. Review `NLP_INTEGRATION_GUIDE.md` for detailed setup
3. Verify all files from `IMPLEMENTATION_SUMMARY.md` are present
4. Test endpoints individually using curl
5. Check network connectivity between services

---

**Version**: 1.0.0
**Last Updated**: 2024-01-15
**Status**: Production Ready
