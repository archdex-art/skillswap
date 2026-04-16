#!/bin/bash

# SkillSwap NLP Setup Script
# Automates the setup of the semantic matching system

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║   SkillSwap NLP System Setup                   ║"
echo "║   Production-Grade Semantic Matching            ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✅  $1${NC}"; }
error() { echo -e "${RED}❌  $1${NC}"; exit 1; }
info() { echo -e "${BLUE}ℹ️   $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️   $1${NC}"; }

# Check prerequisites
echo ""
echo "Checking prerequisites..."
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    error "Python 3 is not installed. Please install Python 3.9+ first."
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
success "Python $PYTHON_VERSION found"

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed. Please install Node.js 16+ first."
fi
NODE_VERSION=$(node --version)
success "Node.js $NODE_VERSION found"

# Check MongoDB
if ! command -v mongod &> /dev/null; then
    warn "MongoDB not found. Make sure it's running separately."
    info "MongoDB should be accessible at: mongodb://localhost:27017/skillswap"
else
    success "MongoDB found"
fi

echo ""
echo "─────────────────────────────────────────────────"
echo ""

# Setup NLP Service
echo "Setting up NLP Microservice..."
echo ""

if [ ! -d "nlp-service/venv" ]; then
    info "Creating Python virtual environment..."
    cd nlp-service
    python3 -m venv venv
    source venv/bin/activate
    success "Virtual environment created"
    
    info "Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt > /dev/null 2>&1
    success "Dependencies installed"
    
    cd ..
else
    success "Virtual environment already exists"
    source nlp-service/venv/bin/activate
fi

echo ""
echo "─────────────────────────────────────────────────"
echo ""

# Setup Backend
echo "Setting up Node.js Backend..."
echo ""

cd server

if [ ! -d "node_modules" ]; then
    info "Installing Node.js dependencies..."
    npm install > /dev/null 2>&1
    success "Dependencies installed"
else
    success "Node.js dependencies already installed"
fi

# Check for .env
if [ ! -f ".env" ]; then
    info "Creating .env file..."
    cat > .env << 'EOF'
PORT=5050
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/skillswap
JWT_SECRET=dev_secret_change_in_production
CLIENT_URL=http://localhost:5173
NLP_SERVICE_URL=http://localhost:8000
EOF
    success ".env created"
else
    success ".env already exists"
fi

cd ..

echo ""
echo "─────────────────────────────────────────────────"
echo ""

# Setup Frontend
echo "Setting up Frontend..."
echo ""

cd client

if [ ! -d "node_modules" ]; then
    info "Installing frontend dependencies..."
    npm install > /dev/null 2>&1
    success "Dependencies installed"
else
    success "Frontend dependencies already installed"
fi

cd ..

echo ""
echo "─────────────────────────────────────────────────"
echo ""

# Summary
echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   Setup Complete! 🎉                           ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "Next steps to start the system:"
echo ""
echo "Terminal 1 - Start NLP Service:"
echo "  ${BLUE}cd nlp-service${NC}"
echo "  ${BLUE}source venv/bin/activate${NC}"
echo "  ${BLUE}python main.py${NC}"
echo ""
echo "Terminal 2 - Start Backend:"
echo "  ${BLUE}cd server${NC}"
echo "  ${BLUE}npm run dev${NC}"
echo ""
echo "Terminal 3 - Start Frontend (optional):"
echo "  ${BLUE}cd client${NC}"
echo "  ${BLUE}npm run dev${NC}"
echo ""
echo "─────────────────────────────────────────────────"
echo ""
echo "Verify services are running:"
echo ""
echo "  ${BLUE}curl http://localhost:8000/health${NC}   (NLP Service)"
echo "  ${BLUE}curl http://localhost:5050/health${NC}   (Backend - if endpoint exists)"
echo "  ${BLUE}http://localhost:5173${NC}               (Frontend)"
echo ""
echo "─────────────────────────────────────────────────"
echo ""
echo "After services are running, populate embeddings:"
echo ""
echo "  ${BLUE}cd server${NC}"
echo "  ${BLUE}node scripts/migrate-add-embeddings.js${NC}"
echo ""
echo "For detailed documentation, see:"
echo "  • NLP_INTEGRATION_GUIDE.md"
echo "  • IMPLEMENTATION_SUMMARY.md"
echo "  • nlp-service/README.md"
echo ""
