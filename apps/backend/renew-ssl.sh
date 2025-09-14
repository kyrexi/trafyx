#!/bin/bash

# SSL Certificate Renewal Script for trafyx.kyrexi.tech
# This script should be placed in your project directory

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
# Repo root (two levels up from apps/backend)
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"

# Log file for renewal attempts
LOG_FILE="$SCRIPT_DIR/ssl-renewal.log"

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo "$1"
}

log "Starting SSL certificate renewal check..."

# Check if certificates need renewal (certbot only renews if < 30 days left)
log "Using compose file: $COMPOSE_FILE"
RENEWAL_OUTPUT=$(docker compose -f "$COMPOSE_FILE" run --rm certbot renew --dry-run 2>&1)
RENEWAL_EXIT_CODE=$?

if [ $RENEWAL_EXIT_CODE -eq 0 ]; then
    log "Certificate renewal check passed. Attempting actual renewal..."
    
    # Perform actual renewal
    ACTUAL_RENEWAL=$(docker compose -f "$COMPOSE_FILE" run --rm certbot renew --quiet 2>&1)
    ACTUAL_EXIT_CODE=$?
    
    if [ $ACTUAL_EXIT_CODE -eq 0 ]; then
        log "Certificate renewal successful. Restarting nginx..."
        
        # Restart nginx to load new certificates
    docker compose -f "$COMPOSE_FILE" restart nginx
        NGINX_RESTART_CODE=$?
        
        if [ $NGINX_RESTART_CODE -eq 0 ]; then
            log "Nginx restarted successfully. Certificate renewal completed."
            
            # Test HTTPS to make sure everything is working
            if curl -f -s https://trafyx.kyrexi.tech/ > /dev/null; then
                log "HTTPS test successful. All systems operational."
            else
                log "WARNING: HTTPS test failed after renewal. Manual intervention may be required."
            fi
        else
            log "ERROR: Failed to restart nginx after certificate renewal."
            exit 1
        fi
    else
        log "ERROR: Certificate renewal failed. Output: $ACTUAL_RENEWAL"
        exit 1
    fi
else
    log "Certificate renewal not needed or dry-run failed. Output: $RENEWAL_OUTPUT"
fi

log "SSL renewal check completed."

# Clean up old log entries (keep last 100 lines)
tail -n 100 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"