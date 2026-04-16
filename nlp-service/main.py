"""
SkillSwap NLP Microservice
Handles semantic embeddings and similarity computation for skill matching
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import numpy as np
from sentence_transformers import SentenceTransformer, util
import logging

# ──────────────────────────────────────────────────────────────────────────────
# Setup
# ──────────────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SkillSwap NLP Service",
    description="Semantic skill matching using sentence embeddings",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:6060", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once on startup (all-MiniLM-L6-v2: 384-dim, fast & accurate)
logger.info("Loading sentence transformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
logger.info("✅ Model loaded successfully")

# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────────────────────────────────────

class EmbeddingRequest(BaseModel):
    """Request to generate embeddings for skill text"""
    texts: List[str]
    model_name: str = "all-MiniLM-L6-v2"

class EmbeddingResponse(BaseModel):
    """Response containing embeddings"""
    embeddings: List[List[float]]
    texts: List[str]
    dimension: int

class SimilarityRequest(BaseModel):
    """Request to compute similarity between skills"""
    user_wanted: List[str]  # User A wants to learn
    user_offered: List[str]  # User A can teach
    target_offered: List[str]  # User B can teach
    target_wanted: List[str]  # User B wants to learn

class SimilarityResponse(BaseModel):
    """Response containing match scores"""
    user_wants_target_offers: float  # Cosine similarity
    target_wants_user_offers: float
    final_score: float  # Average of both directions
    explanation: dict

class RecommendationRequest(BaseModel):
    """Request for recommendations"""
    user_id: str
    user_skills_wanted: List[str]
    user_skills_offered: List[str]
    candidates: List[dict]  # [{user_id, skills_offered, skills_wanted}, ...]

class RecommendationResponse(BaseModel):
    """Response with ranked recommendations"""
    recommendations: List[dict]
    total_candidates: int
    top_n: int

# ──────────────────────────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "SkillSwap NLP",
        "model": "all-MiniLM-L6-v2",
        "embedding_dimension": 384
    }

# ──────────────────────────────────────────────────────────────────────────────
# Embedding Generation
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/api/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(request: EmbeddingRequest):
    """
    Generate embeddings for a list of skill texts
    
    Example:
        POST /api/embeddings
        {
            "texts": ["Python programming", "Machine Learning", "React development"],
            "model_name": "all-MiniLM-L6-v2"
        }
    """
    try:
        if not request.texts or len(request.texts) == 0:
            raise HTTPException(status_code=400, detail="texts cannot be empty")
        
        # Generate embeddings
        embeddings = model.encode(request.texts, convert_to_numpy=True)
        
        # Convert to list format for JSON serialization
        embeddings_list = embeddings.tolist()
        
        logger.info(f"✅ Generated embeddings for {len(request.texts)} texts")
        
        return EmbeddingResponse(
            embeddings=embeddings_list,
            texts=request.texts,
            dimension=embeddings.shape[1]
        )
    except Exception as e:
        logger.error(f"❌ Error generating embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

# ──────────────────────────────────────────────────────────────────────────────
# Semantic Similarity Computation
# ──────────────────────────────────────────────────────────────────────────────

def compute_similarity(texts1: List[str], texts2: List[str]) -> float:
    """
    Compute average cosine similarity between two lists of skill texts.
    
    Strategy:
    1. Embed both lists
    2. Compute pairwise cosine similarity
    3. Return max similarity (best match between texts)
    """
    if not texts1 or not texts2:
        return 0.0
    
    embeddings1 = model.encode(texts1, convert_to_numpy=True)
    embeddings2 = model.encode(texts2, convert_to_numpy=True)
    
    # Compute cosine similarities
    similarities = util.cos_sim(embeddings1, embeddings2).cpu().numpy()
    
    # Return average of max similarities (best matches)
    avg_similarity = np.mean(np.max(similarities, axis=1))
    
    return float(avg_similarity)

@app.post("/api/similarity", response_model=SimilarityResponse)
async def compute_match_similarity(request: SimilarityRequest):
    """
    Compute bidirectional semantic similarity for skill matching.
    
    Logic:
    - Similarity 1: User A wants ↔ User B offers
    - Similarity 2: User B wants ↔ User A offers
    - Final Score: Average of both directions
    
    Example:
        POST /api/similarity
        {
            "user_wanted": ["Python", "Machine Learning"],
            "user_offered": ["React", "JavaScript"],
            "target_offered": ["Python", "Django"],
            "target_wanted": ["React", "Frontend"]
        }
    """
    try:
        # Direction 1: User A wants what User B offers
        sim1 = compute_similarity(request.user_wanted, request.target_offered)
        
        # Direction 2: User B wants what User A offers
        sim2 = compute_similarity(request.target_wanted, request.user_offered)
        
        # Final match score (0-1 range)
        final_score = (sim1 + sim2) / 2
        
        explanation = {
            "user_wants_match": sim1,
            "target_wants_match": sim2,
            "interpretation": f"User can learn {sim1*100:.1f}% of desired skills; target can learn {sim2*100:.1f}% from user"
        }
        
        logger.info(f"✅ Computed similarity: {final_score:.3f}")
        
        return SimilarityResponse(
            user_wants_target_offers=round(sim1, 4),
            target_wants_user_offers=round(sim2, 4),
            final_score=round(final_score, 4),
            explanation=explanation
        )
    except Exception as e:
        logger.error(f"❌ Error computing similarity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Similarity computation failed: {str(e)}")

# ──────────────────────────────────────────────────────────────────────────────
# Batch Recommendations
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/api/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """
    Get ranked recommendations for a user based on semantic skill matching.
    
    Strategy:
    1. Compute embeddings for user skills (once)
    2. For each candidate, compute bidirectional similarity
    3. Rank by final score (descending)
    4. Return top N with explanations
    
    Example:
        POST /api/recommendations
        {
            "user_id": "user123",
            "user_skills_wanted": ["Python", "Machine Learning"],
            "user_skills_offered": ["React", "JavaScript"],
            "candidates": [
                {
                    "user_id": "user456",
                    "skills_offered": ["Python", "TensorFlow"],
                    "skills_wanted": ["React", "Frontend"]
                },
                ...
            ]
        }
    """
    try:
        if not request.candidates:
            return RecommendationResponse(
                recommendations=[],
                total_candidates=0,
                top_n=0
            )
        
        # Embed user skills once
        user_wanted_embed = model.encode(request.user_skills_wanted, convert_to_numpy=True) if request.user_skills_wanted else None
        user_offered_embed = model.encode(request.user_skills_offered, convert_to_numpy=True) if request.user_skills_offered else None
        
        recommendations = []
        
        for candidate in request.candidates:
            try:
                # Compute bidirectional similarity
                sim1 = 0.0
                sim2 = 0.0
                
                if user_wanted_embed is not None and candidate.get('skills_offered'):
                    candidate_offered_embed = model.encode(candidate['skills_offered'], convert_to_numpy=True)
                    similarities = util.cos_sim(user_wanted_embed, candidate_offered_embed).cpu().numpy()
                    sim1 = float(np.mean(np.max(similarities, axis=1)))
                
                if user_offered_embed is not None and candidate.get('skills_wanted'):
                    candidate_wanted_embed = model.encode(candidate['skills_wanted'], convert_to_numpy=True)
                    similarities = util.cos_sim(user_offered_embed, candidate_wanted_embed).cpu().numpy()
                    sim2 = float(np.mean(np.max(similarities, axis=1)))
                
                final_score = (sim1 + sim2) / 2
                
                recommendations.append({
                    'user_id': candidate['user_id'],
                    'semantic_match_score': round(final_score, 4),
                    'user_wants_match': round(sim1, 4),
                    'target_wants_match': round(sim2, 4),
                    'matched_skills_offered': candidate.get('skills_offered', []),
                    'matched_skills_wanted': candidate.get('skills_wanted', []),
                })
            except Exception as e:
                logger.warning(f"⚠️ Error processing candidate {candidate.get('user_id')}: {str(e)}")
                continue
        
        # Sort by final score descending
        recommendations.sort(key=lambda x: x['semantic_match_score'], reverse=True)
        
        # Return top 20
        top_n = 20
        top_recommendations = recommendations[:top_n]
        
        logger.info(f"✅ Generated {len(top_recommendations)} recommendations from {len(request.candidates)} candidates")
        
        return RecommendationResponse(
            recommendations=top_recommendations,
            total_candidates=len(request.candidates),
            top_n=len(top_recommendations)
        )
    except Exception as e:
        logger.error(f"❌ Error generating recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation generation failed: {str(e)}")

# ──────────────────────────────────────────────────────────────────────────────
# Batch Embedding (optimized for bulk operations)
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/api/embeddings/batch")
async def batch_embeddings(request: EmbeddingRequest):
    """
    Optimized batch embedding endpoint for large-scale operations.
    Good for pre-computing user profile embeddings.
    """
    try:
        if not request.texts or len(request.texts) == 0:
            raise HTTPException(status_code=400, detail="texts cannot be empty")
        
        # Generate embeddings with batch processing
        embeddings = model.encode(
            request.texts,
            convert_to_numpy=True,
            batch_size=32,
            show_progress_bar=False
        )
        
        embeddings_list = embeddings.tolist()
        
        logger.info(f"✅ Batch generated embeddings for {len(request.texts)} texts")
        
        return {
            "success": True,
            "embeddings": embeddings_list,
            "dimension": embeddings.shape[1],
            "count": len(embeddings_list)
        }
    except Exception as e:
        logger.error(f"❌ Error in batch embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
