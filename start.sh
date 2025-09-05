#!/bin/bash

# DaveMind - One-Shot Startup Script
# RAG Chat System created by Ridham Dave
# This script handles complete setup and launch of the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        print_warning "Killing existing processes on port $port"
        echo $pids | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|302\|401"; then
            print_success "$service_name is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within 60 seconds"
    return 1
}

print_status "🚀 Starting DaveMind Setup..."

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 14+ and try again."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    print_error "Node.js version 14+ is required. Current version: $(node --version)"
    exit 1
fi

print_success "Node.js $(node --version) and npm $(npm --version) are available"

# Check for .env file
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Please create one based on env.example"
    if [ -f "env.example" ]; then
        print_status "Copying env.example to .env..."
        cp env.example .env
        print_warning "Please edit .env file with your actual configuration values before continuing."
        print_status "Required variables: GEMINI_API_KEY, MONGODB_URI, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, SESSION_SECRET"
        read -p "Press Enter after you've configured your .env file..."
    else
        print_error "env.example file not found. Cannot create .env file."
        exit 1
    fi
fi

# Check MongoDB connection
print_status "Checking MongoDB connection..."
if command_exists mongosh; then
    MONGODB_URI=$(grep MONGODB_URI .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -z "$MONGODB_URI" ]; then
        MONGODB_URI="mongodb://localhost:27017/rag-system"
    fi
    
    # Try to connect to MongoDB
    if ! mongosh "$MONGODB_URI" --eval "db.runCommand('ping')" >/dev/null 2>&1; then
        print_warning "Cannot connect to MongoDB at $MONGODB_URI"
        print_status "Attempting to start local MongoDB..."
        
        if command_exists brew; then
            brew services start mongodb-community >/dev/null 2>&1 || true
        elif command_exists systemctl; then
            sudo systemctl start mongodb >/dev/null 2>&1 || true
        fi
        
        sleep 3
        
        if ! mongosh "$MONGODB_URI" --eval "db.runCommand('ping')" >/dev/null 2>&1; then
            print_error "MongoDB is not running. Please start MongoDB and try again."
            print_status "Installation commands:"
            print_status "  macOS: brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community"
            print_status "  Ubuntu: sudo apt update && sudo apt install mongodb && sudo systemctl start mongodb"
            exit 1
        fi
    fi
    print_success "MongoDB connection successful"
elif command_exists mongo; then
    print_warning "Using legacy mongo client. Consider upgrading to mongosh."
else
    print_warning "MongoDB client not found. Assuming MongoDB is running..."
fi

# Kill existing processes on required ports
print_status "Checking and freeing up required ports..."
kill_port 3000
kill_port 5001

# Install dependencies
print_status "Installing backend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
else
    print_success "Backend dependencies already installed"
fi

print_status "Installing frontend dependencies..."
if [ ! -d "client/node_modules" ]; then
    cd client && npm install && cd ..
else
    print_success "Frontend dependencies already installed"
fi

# Create required directories
print_status "Creating required directories..."
mkdir -p knowledge-base vector-db
touch knowledge-base/.gitkeep vector-db/.gitkeep

# Validate environment variables
print_status "Validating environment configuration..."
source .env

if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
    print_error "GEMINI_API_KEY is not configured in .env file"
    exit 1
fi

if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your_jwt_secret_here" ]; then
    print_warning "JWT_SECRET is not configured. Generating a random one..."
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head /dev/urandom | tr -dc A-Za-z0-9 | head -c 64)
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
fi

if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "your_session_secret_here" ]; then
    print_warning "SESSION_SECRET is not configured. Generating a random one..."
    SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || head /dev/urandom | tr -dc A-Za-z0-9 | head -c 64)
    sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
fi

print_success "Environment validation complete"

# Start the backend server
print_status "Starting backend server on port ${PORT:-5001}..."
npm start &
BACKEND_PID=$!

# Wait for backend to be ready (including vector service initialization)
print_status "Waiting for vector service to initialize..."
max_attempts=60
attempt=1

while [ $attempt -le $max_attempts ]; do
    response=$(curl -s "http://localhost:${PORT:-5001}/api/vector/stats" 2>/dev/null || echo "")
    if echo "$response" | grep -q '"documentCount"'; then
        print_success "Vector service is ready!"
        break
    elif [ $attempt -eq $max_attempts ]; then
        print_error "Vector service failed to initialize within 120 seconds"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    echo -n "."
    sleep 2
    attempt=$((attempt + 1))
done

# Start the frontend development server
print_status "Starting frontend development server on port 3000..."
cd client
npm start &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
if ! wait_for_service "http://localhost:3000" "Frontend server"; then
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

print_success "🎉 DaveMind is now running!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:${PORT:-5001}"
echo ""
print_status "Setup Information:"
echo "   • Upload documents to the knowledge-base/ directory"
echo "   • Documents are automatically processed when added"
echo "   • Sign in with Google to start chatting"
echo "   • Chat history is automatically saved"
echo ""
print_warning "To stop the application, press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"

# Create a cleanup function
cleanup() {
    print_status "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    print_success "Servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Keep the script running
print_status "Press Ctrl+C to stop the application"
wait
