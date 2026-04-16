#!/bin/bash

# SkillSwap NLP System - API Testing Script
# 
# This script provides curl examples for all NLP endpoints
# Usage: bash test-api.sh
#
# Prerequisites:
# - NLP service running on http://localhost:8000
# - Backend running on http://localhost:5050
# - Valid JWT token (get from login endpoint)

set -e

# Configuration
NLP_SERVICE_URL="http://localhost:8000"
BACKEND_URL="http://localhost:5050"
JWT_TOKEN="${JWT_TOKEN:-your_token_here}"  # Set via environment: export JWT_TOKEN="token"
USER_ID="${USER_ID:-user123}"
TARGET_USER_ID="${TARGET_USER_ID:-user456}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Helper functions
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}$name${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo "METHOD: $method"
    echo "URL: $url"
    if [ -n "$data" ]; then
        echo "DATA: $data"
        echo ""
        if [ "$method" = "POST" ]; then
            curl -X POST "$url" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $JWT_TOKEN" \
                -d "$data" 2>/dev/null | jq . || echo "Response (raw):"
        fi
    else
        echo ""
        curl -X GET "$url" \
            -H "Authorization: Bearer $JWT_TOKEN" 2>/dev/null | jq . || echo "Response (raw):"
    fi
    echo ""
}

# Banner
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     SkillSwap NLP System - API Testing Suite               ║"
echo "║     Production-Grade Semantic Matching                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  NLP Service: $NLP_SERVICE_URL"
echo "  Backend: $BACKEND_URL"
echo "  JWT Token: ${JWT_TOKEN:0:20}..."
echo "  User ID: $USER_ID"
echo "  Target User ID: $TARGET_USER_ID"
echo ""
echo "Note: Set JWT_TOKEN via environment: export JWT_TOKEN=\"your_token\""
echo ""

# Test NLP Service Endpoints
echo ""
echo -e "${YELLOW}╔ NLP Service Tests ═══════════════════════════════╗${NC}"
echo ""

# 1. Health Check
test_endpoint \
    "1. NLP Service Health Check" \
    "GET" \
    "$NLP_SERVICE_URL/health"

# 2. Generate Embeddings
test_endpoint \
    "2. Generate Embeddings" \
    "POST" \
    "$NLP_SERVICE_URL/api/embeddings" \
    '{
        "texts": ["Python programming", "Machine learning", "React development"],
        "model_name": "all-MiniLM-L6-v2"
    }'

# 3. Compute Similarity
test_endpoint \
    "3. Compute Bidirectional Similarity" \
    "POST" \
    "$NLP_SERVICE_URL/api/similarity" \
    '{
        "user_wanted": ["Python", "Machine Learning"],
        "user_offered": ["React", "JavaScript"],
        "target_offered": ["Python", "TensorFlow", "Django"],
        "target_wanted": ["React", "Frontend", "TypeScript"]
    }'

# 4. Get Recommendations
test_endpoint \
    "4. Get Recommendations (Batch)" \
    "POST" \
    "$NLP_SERVICE_URL/api/recommendations" \
    '{
        "user_id": "'$USER_ID'",
        "user_skills_wanted": ["Python", "Machine Learning"],
        "user_skills_offered": ["React", "JavaScript"],
        "candidates": [
            {
                "user_id": "user456",
                "skills_offered": ["Python", "Django"],
                "skills_wanted": ["React", "Frontend"]
            },
            {
                "user_id": "user789",
                "skills_offered": ["React", "Vue"],
                "skills_wanted": ["Python", "Data Science"]
            }
        ]
    }'

# 5. Batch Embeddings
test_endpoint \
    "5. Batch Embeddings (Optimized)" \
    "POST" \
    "$NLP_SERVICE_URL/api/embeddings/batch" \
    '{
        "texts": ["Python", "JavaScript", "React", "Django", "Machine Learning"],
        "model_name": "all-MiniLM-L6-v2"
    }'

# Test Backend Endpoints
echo ""
echo -e "${YELLOW}╔ Backend Recommendation API Tests ════════════════╗${NC}"
echo ""

# 6. Get Recommendations
test_endpoint \
    "6. Get Semantic Recommendations for User" \
    "GET" \
    "$BACKEND_URL/api/recommendations/$USER_ID?limit=10&excludeMatched=true"

# 7. Compute Match Score
test_endpoint \
    "7. Compute Match Score Between Two Users" \
    "POST" \
    "$BACKEND_URL/api/recommendations/score" \
    '{
        "userId": "'$USER_ID'",
        "targetId": "'$TARGET_USER_ID'"
    }'

# 8. Refresh Embeddings
test_endpoint \
    "8. Refresh User Embeddings" \
    "POST" \
    "$BACKEND_URL/api/recommendations/refresh-embeddings/$USER_ID"

# Test Match Creation (Updated)
echo ""
echo -e "${YELLOW}╔ Match Management Tests ══════════════════════════╗${NC}"
echo ""

# 9. Create Match Request (with semantic matching)
test_endpoint \
    "9. Create Match Request (Semantic Scoring)" \
    "POST" \
    "$BACKEND_URL/api/matches" \
    '{
        "recipientId": "'$TARGET_USER_ID'",
        "message": "Hi! I want to learn Python and Machine Learning. I can teach React and JavaScript!"
    }'

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""
echo "Test complete!"
echo ""
echo "Next steps:"
echo "  1. Review all responses above"
echo "  2. Check semantic scores are between 0-1"
echo "  3. Verify match scores are between 0-100"
echo "  4. Ensure response times are acceptable"
echo ""
echo "Troubleshooting:"
echo "  - If NLP service tests fail, ensure it's running: python nlp-service/main.py"
echo "  - If backend tests fail, ensure it's running: npm run dev (in server/)"
echo "  - If auth fails, set JWT_TOKEN: export JWT_TOKEN=\"your_token\""
echo ""
echo "For detailed documentation:"
echo "  - NLP_INTEGRATION_GUIDE.md"
echo "  - IMPLEMENTATION_SUMMARY.md"
echo "  - VERIFICATION_CHECKLIST.md"
echo ""
