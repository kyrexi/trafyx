#!/bin/bash

# Script to set up automatic SSL certificate renewal for trafyx.kyrexi.tech
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔧 Setting up automatic SSL certificate renewal..."
echo "📁 Project directory: $PROJECT_DIR"

# Make the renewal script executable
chmod +x "$PROJECT_DIR/renew-ssl.sh"

# Create cron job entry
CRON_JOB="0 2 * * * cd $PROJECT_DIR && ./renew-ssl.sh >> $PROJECT_DIR/ssl-renewal.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "renew-ssl.sh"; then
    echo "⚠️  Cron job already exists. Removing old entry..."
    crontab -l 2>/dev/null | grep -v "renew-ssl.sh" | crontab -
fi

# Add new cron job
echo "📅 Adding cron job for daily certificate renewal check at 2 AM..."
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Verify cron job was added
echo "✅ Cron job added successfully!"
echo "📋 Current crontab:"
crontab -l | grep "renew-ssl.sh"

echo ""
echo "🎯 Summary:"
echo "   - Certificate renewal will be checked daily at 2:00 AM"
echo "   - Certificates will auto-renew when they have < 30 days left"
echo "   - Nginx will automatically restart after renewal"
echo "   - All renewal activity is logged to: $PROJECT_DIR/ssl-renewal.log"
echo ""
echo "🧪 To test the renewal script manually:"
echo "   cd $PROJECT_DIR && ./renew-ssl.sh"
echo ""
echo "📊 To view renewal logs:"
echo "   tail -f $PROJECT_DIR/ssl-renewal.log"
echo ""
echo "📅 To view/edit cron jobs:"
echo "   crontab -l  # view"
echo "   crontab -e  # edit"