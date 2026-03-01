#!/bin/bash
# =============================================================================
# Orange Pi Zero 3 Setup Script — The Global Economy Simulation
# =============================================================================
# Run this on your Orange Pi Zero 3 (Armbian) as root:
#   chmod +x setup-orangepi.sh && sudo ./setup-orangepi.sh
#
# What this does:
#   1. Installs Docker + Docker Compose
#   2. Sets up WiFi hotspot (SSID: "GlobalEconomy", password: "classroom")
#   3. Configures captive portal (all DNS -> Orange Pi)
#   4. Enables everything to start on boot
#
# After running, students connect to WiFi "GlobalEconomy" and open any URL
# to reach the game. Admin dashboard is at http://10.0.0.1/admin
# =============================================================================

set -e

# --- Config (edit these if you want) ---
WIFI_SSID="GlobalEconomy"
WIFI_PASS="classroom"
WIFI_CHANNEL=6
AP_IP="10.0.0.1"
DHCP_RANGE_START="10.0.0.10"
DHCP_RANGE_END="10.0.0.100"
WIFI_IFACE=""  # auto-detected below

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# --- Preflight checks ---
if [ "$EUID" -ne 0 ]; then
  error "Please run as root: sudo ./setup-orangepi.sh"
fi

info "Detecting WiFi interface..."
WIFI_IFACE=$(iw dev | awk '$1=="Interface"{print $2}' | head -1)
if [ -z "$WIFI_IFACE" ]; then
  error "No WiFi interface found. Make sure your WiFi chip is working (run: ip link)"
fi
info "Found WiFi interface: $WIFI_IFACE"

# =============================================================================
# STEP 1: Install Docker
# =============================================================================
info "=== Step 1: Installing Docker ==="

if command -v docker &> /dev/null; then
  info "Docker already installed: $(docker --version)"
else
  info "Installing Docker via official script..."
  apt-get update -qq
  apt-get install -y -qq curl ca-certificates gnupg
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  info "Docker installed: $(docker --version)"
fi

# Ensure docker compose works (v2 plugin comes with the official install)
if ! docker compose version &> /dev/null; then
  warn "Docker Compose plugin not found, installing..."
  apt-get install -y -qq docker-compose-plugin
fi
info "Docker Compose: $(docker compose version)"

# =============================================================================
# STEP 2: Install hostapd + dnsmasq for WiFi hotspot
# =============================================================================
info "=== Step 2: Setting up WiFi hotspot ==="

apt-get install -y -qq hostapd dnsmasq

# Stop services while we configure
systemctl stop hostapd 2>/dev/null || true
systemctl stop dnsmasq 2>/dev/null || true

# Disable NetworkManager management of the WiFi interface
if command -v nmcli &> /dev/null; then
  info "Telling NetworkManager to ignore $WIFI_IFACE..."
  nmcli device set "$WIFI_IFACE" managed no 2>/dev/null || true

  # Create unmanaged config
  cat > /etc/NetworkManager/conf.d/unmanaged-wifi.conf <<EOF
[keyfile]
unmanaged-devices=interface-name:$WIFI_IFACE
EOF
  systemctl restart NetworkManager 2>/dev/null || true
fi

# =============================================================================
# STEP 3: Configure static IP on WiFi interface
# =============================================================================
info "=== Step 3: Configuring static IP ($AP_IP) ==="

cat > /etc/systemd/network/10-ap.network <<EOF
[Match]
Name=$WIFI_IFACE

[Network]
Address=$AP_IP/24
DHCPServer=no
EOF

# Also set IP immediately
ip addr flush dev "$WIFI_IFACE" 2>/dev/null || true
ip addr add "$AP_IP/24" dev "$WIFI_IFACE" 2>/dev/null || true
ip link set "$WIFI_IFACE" up

# =============================================================================
# STEP 4: Configure hostapd (WiFi Access Point)
# =============================================================================
info "=== Step 4: Configuring hostapd ==="

cat > /etc/hostapd/hostapd.conf <<EOF
interface=$WIFI_IFACE
driver=nl80211
ssid=$WIFI_SSID
hw_mode=g
channel=$WIFI_CHANNEL
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=$WIFI_PASS
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
EOF

# Point hostapd to our config
cat > /etc/default/hostapd <<EOF
DAEMON_CONF="/etc/hostapd/hostapd.conf"
EOF

# Unmask hostapd (Armbian sometimes masks it)
systemctl unmask hostapd 2>/dev/null || true

# =============================================================================
# STEP 5: Configure dnsmasq (DHCP + Captive Portal DNS)
# =============================================================================
info "=== Step 5: Configuring dnsmasq (DHCP + captive DNS) ==="

# Backup original config
[ -f /etc/dnsmasq.conf.orig ] || cp /etc/dnsmasq.conf /etc/dnsmasq.conf.orig

cat > /etc/dnsmasq.conf <<EOF
# Interface to listen on
interface=$WIFI_IFACE
bind-interfaces

# DHCP range
dhcp-range=$DHCP_RANGE_START,$DHCP_RANGE_END,255.255.255.0,24h

# Captive portal: resolve ALL domains to the Orange Pi
address=/#/$AP_IP

# Don't read /etc/resolv.conf — we ARE the DNS server
no-resolv
no-poll

# Speed up for mobile devices
dhcp-authoritative
dhcp-rapid-commit

# Captive portal detection — respond to connectivity check URLs
# Android
dhcp-option=114,http://$AP_IP/play

# Apple
dhcp-option=160,http://$AP_IP/play
EOF

# =============================================================================
# STEP 6: Enable IP forwarding (not strictly needed, but helps captive portal)
# =============================================================================
info "=== Step 6: Configuring iptables ==="

# Redirect any HTTP traffic on port 80 to our app (in case of hardcoded IPs)
iptables -t nat -F PREROUTING 2>/dev/null || true
iptables -t nat -A PREROUTING -i "$WIFI_IFACE" -p tcp --dport 80 -j REDIRECT --to-port 80
iptables -t nat -A PREROUTING -i "$WIFI_IFACE" -p tcp --dport 443 -j REDIRECT --to-port 80

# Save iptables rules so they persist on reboot
if command -v netfilter-persistent &> /dev/null; then
  netfilter-persistent save
else
  apt-get install -y -qq iptables-persistent
  netfilter-persistent save
fi

# =============================================================================
# STEP 7: Enable services on boot
# =============================================================================
info "=== Step 7: Enabling services ==="

systemctl enable hostapd
systemctl enable dnsmasq
systemctl enable docker

systemctl restart hostapd
systemctl restart dnsmasq

info "=== Setup Complete ==="
echo ""
echo "============================================="
echo "  WiFi SSID:     $WIFI_SSID"
echo "  WiFi Password: $WIFI_PASS"
echo "  Admin IP:      $AP_IP"
echo "============================================="
echo ""
echo "Next steps:"
echo "  1. Copy the project files to the Orange Pi"
echo "  2. cd into the project directory"
echo "  3. Run: docker compose up -d --build"
echo "  4. Wait ~2 minutes for first build"
echo "  5. Students connect to '$WIFI_SSID' WiFi"
echo "  6. Open any URL -> redirected to game"
echo "  7. Admin dashboard: http://$AP_IP/admin"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f     # view app logs"
echo "  docker compose restart app # restart app"
echo "  docker compose down        # stop everything"
echo "  docker compose up -d       # start everything"
echo ""
