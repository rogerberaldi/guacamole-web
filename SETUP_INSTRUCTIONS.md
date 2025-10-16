# Setup Instructions - Quick Start Guide

## Step-by-Step Setup

### Step 1: Download Guacamole Common JS SDK

The application requires the guacamole-common-js library to function. This is NOT included in the repository and must be downloaded separately.

```bash
mkdir -p public/guacamole-common-js
cd public/guacamole-common-js

wget https://downloads.apache.org/guacamole/1.6.0/binary/guacamole-common-js-1.6.0.tar.gz
tar -xzf guacamole-common-js-1.6.0.tar.gz --strip-components=1
rm guacamole-common-js-1.6.0.tar.gz

cd ../..
```

**Required files in `public/guacamole-common-js/`:**
- `guacamole-common.min.js` (main library)
- `guacamole-common.js` (unminified version)
- `LICENSE` (Apache 2.0)

### Step 2: Install Node Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your Guacamole server URL:

```bash
VITE_GUACAMOLE_WS_URL=ws://localhost:8080/guacamole/websocket-tunnel
VITE_DEBUG=true
```

For production, use WSS (secure WebSocket):

```bash
VITE_GUACAMOLE_WS_URL=wss://guacamole.yourdomain.com/guacamole/websocket-tunnel
VITE_DEBUG=false
```

### Step 4: Start Development Server

```bash
npm run dev
```

The application will be available at: `http://localhost:5173`

### Step 5: Generate JWT Token

The application requires a JWT token with connection parameters. Here's an example Node.js script to generate one:

**generate-token.js:**
```javascript
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your-secret-key-here';

const payload = {
  sub: 'user-123',
  exp: Math.floor(Date.now() / 1000) + (60 * 60),
  connection: {
    protocol: 'rdp',
    hostname: '192.168.1.100',
    port: 3389,
    username: 'administrator',
    password: 'password',
    security: 'nla',
    'ignore-cert': true,
    'resize-method': 'display-update'
  }
};

const token = jwt.sign(payload, SECRET_KEY);
console.log('Token:', token);
console.log('\nAccess URL:');
console.log(`http://localhost:5173/?token=${token}`);
```

Run:
```bash
npm install jsonwebtoken
node generate-token.js
```

### Step 6: Test the Connection

1. Copy the generated URL from Step 5
2. Paste into your browser
3. You should see:
   - "Connecting..." message
   - Connection status change to "Connected"
   - Remote desktop display

## Guacamole Server Setup

If you don't have a Guacamole server running, use Docker Compose:

### Step 1: Start Guacamole Backend

```bash
docker-compose up -d guacd guacamole
```

This starts:
- guacd (proxy daemon) on port 4822
- guacamole (server) on port 8080

### Step 2: Configure JWT Authentication

Create `guacamole-config` directory:

```bash
mkdir -p guacamole-config
```

Create `guacamole-config/guacamole.properties`:

```properties
guacd-hostname: guacd
guacd-port: 4822

auth-provider: com.guacamole.auth.jwt.JWTAuthenticationProvider
jwt-auth-provider: com.guacamole.auth.jwt.JWTAuthenticationProvider
jwt-secret-key: your-secret-key-here
jwt-auth-header: Authorization
```

### Step 3: Download JWT Extension

```bash
cd guacamole-config
mkdir extensions
cd extensions

wget https://downloads.apache.org/guacamole/1.6.0/binary/guacamole-auth-jwt-1.6.0.jar

cd ../..
```

### Step 4: Restart Guacamole

```bash
docker-compose restart guacamole
```

### Step 5: Verify Guacamole is Running

```bash
curl http://localhost:8080/guacamole/
```

You should see HTML response (not an error).

## Full Stack Deployment

To run everything together:

```bash
docker-compose up -d
```

This starts:
1. **guacd** - Guacamole proxy daemon
2. **guacamole** - Guacamole server with JWT auth
3. **web-interface** - This custom UI

Access at: `http://localhost/?token=YOUR_JWT_TOKEN`

## Verification Checklist

- [ ] `public/guacamole-common-js/guacamole-common.min.js` exists
- [ ] `.env` file configured with correct WebSocket URL
- [ ] Guacamole server running (test with curl)
- [ ] JWT extension installed on Guacamole server
- [ ] JWT secret key matches in both token generator and guacamole.properties
- [ ] Target remote desktop is accessible from Guacamole server
- [ ] Browser console shows no errors about missing Guacamole object

## Common Issues

### "Cannot find Guacamole object"

**Problem:** guacamole-common-js not loaded

**Solution:**
1. Verify files exist in `public/guacamole-common-js/`
2. Check browser console for 404 errors
3. Ensure `index.html` includes script tag for Guacamole

### "WebSocket connection failed"

**Problem:** Cannot reach Guacamole server

**Solution:**
1. Check Guacamole is running: `docker ps | grep guacamole`
2. Verify WebSocket URL in `.env`
3. Test connectivity: `wscat -c ws://localhost:8080/guacamole/websocket-tunnel`
4. Check CORS headers if using different domain

### "Invalid or expired JWT token"

**Problem:** Token validation failed

**Solution:**
1. Verify token is not expired (check `exp` claim)
2. Ensure secret key matches in token and guacamole.properties
3. Check token structure (should be 3 parts separated by dots)
4. Test token at https://jwt.io

### "Connection refused to target host"

**Problem:** Guacamole cannot reach remote desktop

**Solution:**
1. Verify hostname/IP in JWT token is correct
2. Check port is correct (3389 for RDP, 5900 for VNC, 22 for SSH)
3. Ensure firewall allows connections
4. Test from Guacamole container: `docker exec guacamole ping <target-host>`

## Next Steps

After successful setup:

1. Review **[ARCHITECTURE.md](./ARCHITECTURE.md)** for system design
2. Read **[IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md)** for technical details
3. Check **[DEPLOYMENT.md](./DEPLOYMENT.md)** for production deployment
4. Test all features:
   - Copy/paste between local and remote
   - Window resize (resolution updates)
   - Alt+Tab (no stuck keys)
   - Mouse cursor (only remote cursor visible)
   - Disconnect/reconnect

## Support

If you encounter issues:

1. Enable debug mode: `VITE_DEBUG=true`
2. Check browser console for detailed logs
3. Review Guacamole server logs: `docker-compose logs guacamole`
4. Check guacd logs: `docker-compose logs guacd`
5. Refer to troubleshooting sections in documentation

## Additional Resources

- [Apache Guacamole Manual](https://guacamole.apache.org/doc/gug/)
- [JWT Authentication Guide](https://guacamole.apache.org/doc/gug/jwt-auth.html)
- [guacamole-common-js API](https://guacamole.apache.org/doc/guacamole-common-js/)
- [Guacamole Protocol Reference](https://guacamole.apache.org/doc/gug/protocol-reference.html)
