# Deployment Guide - Apache Guacamole Custom Web Interface

## Prerequisites

1. Docker and Docker Compose installed
2. guacamole-common-js library files (place in `public/guacamole-common-js/`)
3. JWT authentication configured on Guacamole server
4. Network access to target remote desktop systems

## Quick Start

### 1. Download Guacamole Common JS Library

Download the guacamole-common-js files from the official Apache Guacamole releases:

```bash
mkdir -p public/guacamole-common-js
cd public/guacamole-common-js

wget https://downloads.apache.org/guacamole/1.6.0/binary/guacamole-common-js-1.6.0.tar.gz
tar -xzf guacamole-common-js-1.6.0.tar.gz --strip-components=1
rm guacamole-common-js-1.6.0.tar.gz
```

The directory should contain:
- `guacamole-common.min.js`
- `guacamole-common.js`
- Additional SDK files

### 2. Configure Environment Variables

Create a `.env.local` file for development:

```bash
VITE_GUACAMOLE_WS_URL=ws://localhost:8080/guacamole/websocket-tunnel
VITE_DEBUG=true
```

For production, configure in Docker or environment:

```bash
VITE_GUACAMOLE_WS_URL=wss://your-guacamole-server.com/guacamole/websocket-tunnel
VITE_DEBUG=false
```

### 3. Development Mode

```bash
npm install
npm run dev
```

Access at: `http://localhost:5173/?token=YOUR_JWT_TOKEN`

### 4. Production Build

```bash
npm run build
npm run preview
```

### 5. Docker Deployment

#### Single Container (Web Interface Only)

```bash
docker build -t guacamole-web-interface .

docker run -d \
  --name guacamole-web \
  -p 80:80 \
  -e VITE_GUACAMOLE_WS_URL=ws://guacamole-server:8080/guacamole/websocket-tunnel \
  guacamole-web-interface
```

#### Full Stack with Docker Compose

```bash
docker-compose up -d
```

This starts:
- `guacd` on port 4822
- `guacamole` on port 8080
- `web-interface` on port 80

Access at: `http://localhost/?token=YOUR_JWT_TOKEN`

## JWT Token Configuration

### Token Format

The JWT token must contain connection parameters in the payload:

```json
{
  "sub": "user-id",
  "exp": 1234567890,
  "connection": {
    "protocol": "rdp",
    "hostname": "192.168.1.100",
    "port": 3389,
    "username": "administrator",
    "password": "secure-password",
    "security": "nla",
    "ignore-cert": true,
    "resize-method": "display-update"
  }
}
```

### Token Usage

Pass the token via URL parameter:

```
http://your-domain.com/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Or via Authorization header (for API integrations):

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://your-domain.com/
```

## Guacamole Server Configuration

### Enable JWT Authentication

1. Download JWT extension:

```bash
wget https://downloads.apache.org/guacamole/1.6.0/binary/guacamole-auth-jwt-1.6.0.jar
```

2. Place in Guacamole extensions directory:

```bash
cp guacamole-auth-jwt-1.6.0.jar /etc/guacamole/extensions/
```

3. Configure `guacamole.properties`:

```properties
auth-provider: com.guacamole.auth.jwt.JWTAuthenticationProvider
jwt-auth-provider: com.guacamole.auth.jwt.JWTAuthenticationProvider
jwt-secret-key: YOUR_SECRET_KEY_HERE
jwt-auth-header: Authorization
```

4. Restart Guacamole:

```bash
docker-compose restart guacamole
```

## Production Deployment

### Using Kubernetes

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: guacamole-web-interface
spec:
  replicas: 3
  selector:
    matchLabels:
      app: guacamole-web
  template:
    metadata:
      labels:
        app: guacamole-web
    spec:
      containers:
      - name: web-interface
        image: your-registry/guacamole-web-interface:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_GUACAMOLE_WS_URL
          value: "wss://guacamole.yourdomain.com/guacamole/websocket-tunnel"
---
apiVersion: v1
kind: Service
metadata:
  name: guacamole-web-service
spec:
  selector:
    app: guacamole-web
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

Deploy:

```bash
kubectl apply -f k8s-deployment.yaml
```

### Using Nginx Reverse Proxy

```nginx
upstream guacamole {
    server guacamole:8080;
}

server {
    listen 443 ssl http2;
    server_name remote.yourdomain.com;

    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://web-interface:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /guacamole/ {
        proxy_pass http://guacamole/guacamole/;
        proxy_buffering off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Monitoring and Logging

### Enable Debug Logging

Set environment variable:

```bash
VITE_DEBUG=true
```

### View Container Logs

```bash
docker-compose logs -f web-interface
docker-compose logs -f guacamole
docker-compose logs -f guacd
```

### Health Checks

Web interface health endpoint:

```bash
curl http://localhost/health
```

Expected response: `healthy`

## Troubleshooting

### Issue: "Cannot find Guacamole object"

**Solution:** Ensure guacamole-common-js is properly loaded:

1. Check `public/guacamole-common-js/guacamole-common.min.js` exists
2. Verify `public/index.html` includes the script tag
3. Check browser console for 404 errors

### Issue: "WebSocket connection failed"

**Solution:**

1. Verify Guacamole server is running: `curl http://localhost:8080/guacamole/`
2. Check WebSocket URL in environment variables
3. Verify JWT token is valid and not expired
4. Check CORS settings on Guacamole server

### Issue: "Copy/paste not working"

**Solution:**

1. Grant clipboard permissions in browser
2. Check browser console for permission errors
3. Verify ClipboardManager is initialized (debug logs)

### Issue: "Stuck keys after Alt+Tab"

**Solution:** This is automatically handled by KeyboardStateManager. If issues persist:

1. Check browser console for KeyboardStateManager logs
2. Verify window focus events are firing
3. Enable debug mode to see key press/release tracking

### Issue: "Resolution not updating automatically"

**Solution:**

1. Verify ResolutionManager is started (check logs)
2. Check browser supports ResizeObserver API
3. Verify `resize-method: display-update` in JWT token
4. Check that remote desktop protocol supports dynamic resize (RDP with RemoteFX)

## Performance Tuning

### Connection Parameters

Optimize RDP connection in JWT token:

```json
{
  "connection": {
    "protocol": "rdp",
    "resize-method": "display-update",
    "enable-wallpaper": false,
    "enable-theming": false,
    "enable-font-smoothing": true,
    "enable-full-window-drag": false,
    "enable-desktop-composition": false,
    "enable-menu-animations": false,
    "disable-bitmap-caching": false,
    "disable-offscreen-caching": false,
    "disable-glyph-caching": false
  }
}
```

### Nginx Configuration

Increase buffer sizes for better WebSocket performance:

```nginx
proxy_buffer_size 16k;
proxy_buffers 8 16k;
proxy_busy_buffers_size 32k;
```

## Security Best Practices

1. Always use HTTPS/WSS in production
2. Implement JWT token expiration (recommended: 1 hour)
3. Use strong JWT secret keys (256-bit minimum)
4. Enable Content Security Policy headers
5. Regularly update Guacamole and dependencies
6. Use firewall rules to restrict guacd access
7. Enable audit logging on Guacamole server
8. Implement rate limiting on token generation

## Backup and Recovery

### Backup Important Data

```bash
docker-compose exec guacamole tar -czf /tmp/guacamole-config.tar.gz /etc/guacamole
docker cp guacamole:/tmp/guacamole-config.tar.gz ./backup/
```

### Restore Configuration

```bash
docker cp ./backup/guacamole-config.tar.gz guacamole:/tmp/
docker-compose exec guacamole tar -xzf /tmp/guacamole-config.tar.gz -C /
docker-compose restart guacamole
```

## Scaling

### Horizontal Scaling

1. Deploy multiple web-interface containers
2. Use load balancer (nginx, HAProxy, or cloud LB)
3. Enable session affinity for WebSocket connections
4. Scale guacd instances for more concurrent connections

### Vertical Scaling

Increase container resources:

```yaml
services:
  web-interface:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Support and Documentation

- Apache Guacamole Manual: https://guacamole.apache.org/doc/gug/
- API Reference: https://guacamole.apache.org/doc/guacamole-common-js/
- Issue Tracker: https://issues.apache.org/jira/projects/GUACAMOLE
- Community: https://guacamole.apache.org/support/
