#!/bin/bash

# Analytics Dashboard - PM2 Start Script
# This script starts the application using PM2 with proper configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  Analytics Dashboard - PM2 Startup${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Function to check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed!"
        echo ""
        print_info "Installing PM2 globally..."
        npm install -g pm2
        if [ $? -eq 0 ]; then
            print_success "PM2 installed successfully!"
        else
            print_error "Failed to install PM2. Please install manually:"
            echo "  npm install -g pm2"
            exit 1
        fi
    else
        print_success "PM2 is installed ($(pm2 --version))"
    fi
}

# Function to check if dependencies are installed
check_dependencies() {
    print_info "Checking dependencies..."
    
    if [ ! -d "node_modules" ]; then
        print_warning "Frontend dependencies not found. Installing..."
        npm install
        if [ $? -eq 0 ]; then
            print_success "Frontend dependencies installed!"
        else
            print_error "Failed to install frontend dependencies"
            exit 1
        fi
    else
        print_success "Frontend dependencies found"
    fi
    
    if [ ! -d "backend/node_modules" ]; then
        print_warning "Backend dependencies not found. Installing..."
        cd backend && npm install && cd ..
        if [ $? -eq 0 ]; then
            print_success "Backend dependencies installed!"
        else
            print_error "Failed to install backend dependencies"
            exit 1
        fi
    else
        print_success "Backend dependencies found"
    fi
}

# Function to create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p backend/logs
    mkdir -p backend/uploads
    
    print_success "Directories created"
}

# Function to check if process is already running
check_running() {
    if pm2 list | grep -q "dashboard"; then
        print_warning "Dashboard is already running!"
        echo ""
        print_info "Current status:"
        pm2 status dashboard
        echo ""
        read -p "Do you want to restart it? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Restarting dashboard..."
            pm2 restart dashboard --update-env
            pm2 save
            print_success "Dashboard restarted!"
            show_status
            exit 0
        else
            print_info "Keeping existing process running"
            show_status
            exit 0
        fi
    fi
}

# Function to start the application
start_app() {
    local env_mode=${1:-development}
    
    print_info "Starting Analytics Dashboard in $env_mode mode..."
    
    # Create directories
    create_directories
    
    # Check dependencies
    check_dependencies
    
    # Check if already running
    check_running
    
    # Start with PM2
    if [ "$env_mode" = "production" ]; then
        print_info "Starting in production mode..."
        pm2 start ecosystem.config.js --only dashboard --env production
    else
        print_info "Starting in development mode..."
        pm2 start ecosystem.config.js --only dashboard
    fi
    
    # Save PM2 process list
    pm2 save
    
    print_success "Application started successfully!"
    echo ""
}

# Function to get server IP
get_server_ip() {
    local networkInterfaces=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
    if [ -z "$networkInterfaces" ]; then
        networkInterfaces=$(hostname -I | awk '{print $1}')
    fi
    if [ -z "$networkInterfaces" ]; then
        networkInterfaces="localhost"
    fi
    echo "$networkInterfaces"
}

# Function to show status
show_status() {
    local serverIP=$(get_server_ip)
    
    echo ""
    print_info "Application Status:"
    echo ""
    pm2 status dashboard
    echo ""
    
    if pm2 list | grep -q "dashboard.*online"; then
        print_success "Application is running!"
        echo ""
        print_info "═══════════════════════════════════════════════════════════"
        print_info "📍 DIRECT ACCESS URLs (Without Nginx):"
        print_info "═══════════════════════════════════════════════════════════"
        echo "  Backend API:    http://localhost:5009/api"
        echo "  Backend API:    http://${serverIP}:5009/api"
        echo "  Frontend:       http://localhost:3006"
        echo "  Frontend:       http://${serverIP}:3006"
        echo "  API Docs:       http://localhost:5009/api-docs"
        echo "  Health Check:   http://localhost:5009/api/health"
        echo ""
        print_info "🌐 IF USING NGINX:"
        print_info "═══════════════════════════════════════════════════════════"
        echo "  Frontend:       https://your-domain.com (or http://your-domain.com)"
        echo "  Backend API:    https://your-domain.com/api"
        echo "  API Docs:       https://your-domain.com/api-docs"
        echo "  Health Check:   https://your-domain.com/api/health"
        echo ""
        print_warning "💡 Replace 'your-domain.com' with your actual domain or IP"
        echo ""
        print_info "═══════════════════════════════════════════════════════════"
        print_info "🔧 Useful Commands:"
        print_info "═══════════════════════════════════════════════════════════"
        echo "  View logs:      pm2 logs dashboard"
        echo "  Monitor:        pm2 monit"
        echo "  Stop:           pm2 stop dashboard"
        echo "  Restart:        pm2 restart dashboard"
        echo "  Show ports:     ./show-ports.sh"
    else
        print_warning "Application status is not 'online'"
        echo ""
        print_info "Check logs with: pm2 logs dashboard"
    fi
}

# Main execution
main() {
    print_header
    
    # Check PM2 installation
    check_pm2
    echo ""
    
    # Get environment mode from argument or default to development
    ENV_MODE=${1:-development}
    
    if [ "$ENV_MODE" != "development" ] && [ "$ENV_MODE" != "prod" ] && [ "$ENV_MODE" != "production" ]; then
        print_error "Invalid environment mode: $ENV_MODE"
        echo ""
        echo "Usage: ./start.sh [development|production]"
        echo ""
        exit 1
    fi
    
    # Normalize environment mode
    if [ "$ENV_MODE" = "prod" ]; then
        ENV_MODE="production"
    fi
    
    # Start the application
    start_app "$ENV_MODE"
    
    # Wait a moment for processes to start
    sleep 3
    
    # Show status
    show_status
    
    echo ""
    print_success "Setup complete! Your Analytics Dashboard is running."
    echo ""
}

# Run main function
main "$@"

