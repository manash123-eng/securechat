#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  SecureChat — Local Development Setup Script
# ═══════════════════════════════════════════════════════════

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║   🔐  SecureChat Setup Script     ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required. Install from https://nodejs.org${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18+ required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is required${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Create .env if missing
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚙️  Creating .env from template...${NC}"
    cp .env.example .env

    # Generate random JWT secret (64 chars)
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    # Generate random 32-char encryption key
    ENC_KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")

    # Replace placeholders
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-super-secret-jwt-key-change-this-in-production-use-64chars/$JWT_SECRET/g" .env
        sed -i '' "s/your-32-char-encryption-key-here!/$ENC_KEY/g" .env
    else
        sed -i "s/your-super-secret-jwt-key-change-this-in-production-use-64chars/$JWT_SECRET/g" .env
        sed -i "s/your-32-char-encryption-key-here!/$ENC_KEY/g" .env
    fi

    echo -e "${GREEN}✅ .env created with random secrets${NC}"
else
    echo -e "${GREEN}✅ .env already exists${NC}"
fi

# Create uploads directory
mkdir -p server/uploads
echo -e "${GREEN}✅ Uploads directory ready${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Check MongoDB
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB found${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB not found locally.${NC}"
    echo -e "   Options:"
    echo -e "   1. Install MongoDB: https://www.mongodb.com/try/download/community"
    echo -e "   2. Use MongoDB Atlas (free): https://www.mongodb.com/cloud/atlas"
    echo -e "   3. Use Docker: docker run -d -p 27017:27017 mongo:7"
    echo ""
    echo -e "   Then update MONGODB_URI in .env"
fi

echo ""
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Setup complete! Run the app with:${NC}"
echo ""
echo -e "   ${YELLOW}npm run dev${NC}   (development, auto-reload)"
echo -e "   ${YELLOW}npm start${NC}     (production)"
echo ""
echo -e "   Then open: ${CYAN}http://localhost:3000${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
