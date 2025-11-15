#!/bin/bash

# Show Port Information Script
# Displays all port information for the Analytics Dashboard

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get server IP
get_server_ip() {
    if command -v ip &> /dev/null; then
        local ip=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -1)
        if [ -n "$ip" ]; then
            echo "$ip"
            return
        fi
    fi
    
    if command -v hostname &> /dev/null; then
        local ip=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ -n "$ip" ]; then
            echo "$ip"
            return
        fi
    fi
    
    # Fallback to checking network interfaces
    if [ -f /proc/net/route ]; then
        local ip=$(ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K[0-9.]+')
        if [ -n "$ip" ]; then
            echo "$ip"
            return
        fi
    fi
    
    echo "localhost"
}

# Check if port is in use
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        lsof -i :$port &> /dev/null
        return $?
    elif command -v netstat &> /dev/null; then
        netstat -tuln | grep -q ":$port "
        return $?
    elif command -v ss &> /dev/null; then
        ss -tuln | grep -q ":$port "
        return $?
    fi
    return 1
}

# Check if PM2 is running
check_pm2() {
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "dashboard"; then
            return 0
        fi
    fi
    return 1
}

# Get Nginx status
check_nginx() {
    if command -v nginx &> /dev/null; then
        if systemctl is-active --quiet nginx 2>/dev/null || pgrep nginx > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Main
clear
serverIP=$(get_server_ip)

echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Analytics Dashboard - Port Information${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check PM2 status
if check_pm2; then
    echo -e "${GREEN}✓${NC} PM2 Dashboard process: ${GREEN}RUNNING${NC}"
    pm2_status=$(pm2 jlist | grep -o '"name":"dashboard"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$pm2_status" ]; then
        echo -e "  Status: ${GREEN}$pm2_status${NC}"
    fi
else
    echo -e "${YELLOW}⚠${NC} PM2 Dashboard process: ${YELLOW}NOT RUNNING${NC}"
fi
echo ""

# Check Nginx status
if check_nginx; then
    echo -e "${GREEN}✓${NC} Nginx: ${GREEN}RUNNING${NC}"
    echo -e "${BLUE}ℹ${NC}  Access via Nginx (ports 80/443)"
else
    echo -e "${YELLOW}⚠${NC} Nginx: ${YELLOW}NOT RUNNING${NC}"
    echo -e "${BLUE}ℹ${NC}  Access directly via application ports"
fi
echo ""

# Port information
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  PORT INFORMATION${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Backend Port (5009)
backend_port=5009
if check_port $backend_port; then
    echo -e "${GREEN}✓${NC} Backend Port ${backend_port}: ${GREEN}IN USE${NC}"
else
    echo -e "${YELLOW}⚠${NC} Backend Port ${backend_port}: ${YELLOW}NOT IN USE${NC}"
fi

echo ""
echo -e "${BLUE}📍 Backend Access URLs:${NC}"
echo "   Local:    http://localhost:${backend_port}/api"
echo "   Network:  http://${serverIP}:${backend_port}/api"
echo "   Health:   http://localhost:${backend_port}/api/health"
echo "   Swagger:  http://localhost:${backend_port}/api-docs"
echo ""

# Frontend Port (3006)
frontend_port=3006
if check_port $frontend_port; then
    echo -e "${GREEN}✓${NC} Frontend Port ${frontend_port}: ${GREEN}IN USE${NC}"
else
    echo -e "${YELLOW}⚠${NC} Frontend Port ${frontend_port}: ${YELLOW}NOT IN USE${NC}"
fi

echo ""
echo -e "${BLUE}📍 Frontend Access URLs:${NC}"
echo "   Local:    http://localhost:${frontend_port}"
echo "   Network:  http://${serverIP}:${frontend_port}"
echo ""

# Nginx information
if check_nginx; then
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  NGINX ACCESS (Recommended for Production)${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Try to get domain from nginx config
    nginx_domain="your-domain.com"
    if [ -f /etc/nginx/sites-available/analytics-dashboard ]; then
        domain=$(grep -oP 'server_name\s+\K[^;]+' /etc/nginx/sites-available/analytics-dashboard 2>/dev/null | head -1 | tr -d ' ')
        if [ -n "$domain" ] && [ "$domain" != "your-domain.com" ]; then
            nginx_domain="$domain"
        fi
    fi
    
    echo -e "${BLUE}📍 Nginx URLs:${NC}"
    echo "   Frontend:       https://${nginx_domain} (or http://${nginx_domain})"
    echo "   Backend API:    https://${nginx_domain}/api"
    echo "   API Docs:       https://${nginx_domain}/api-docs"
    echo "   Health Check:   https://${nginx_domain}/api/health"
    echo ""
    echo -e "${YELLOW}💡${NC} Replace '${nginx_domain}' with your actual domain if different"
    echo ""
fi

# Quick commands
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  QUICK COMMANDS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Start app:        ./start.sh"
echo "  PM2 status:       pm2 status"
echo "  PM2 logs:         pm2 logs dashboard"
echo "  Check ports:      ./show-ports.sh"
echo "  Nginx status:     sudo systemctl status nginx"
echo ""

