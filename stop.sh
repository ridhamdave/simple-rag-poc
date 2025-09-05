#!/bin/bash

# DaveMind - Stop Script
# RAG Chat System created by Ridham Dave
# This script stops all running instances of the application

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        print_status "Stopping $service_name (port $port)..."
        echo $pids | xargs kill -TERM 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        local remaining_pids=$(lsof -ti :$port 2>/dev/null || true)
        if [ ! -z "$remaining_pids" ]; then
            print_warning "Force killing $service_name..."
            echo $remaining_pids | xargs kill -9 2>/dev/null || true
        fi
        print_success "$service_name stopped"
    else
        print_status "$service_name is not running on port $port"
    fi
}

print_status "🛑 Stopping DaveMind..."

# Stop frontend (React dev server)
kill_port 3000 "Frontend server"

# Stop backend (Node.js server)
kill_port 5001 "Backend server"

# Also kill any node processes that might be related to our app
print_status "Cleaning up any remaining node processes..."
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "server/index.js" 2>/dev/null || true

print_success "🎉 DaveMind stopped successfully!"
