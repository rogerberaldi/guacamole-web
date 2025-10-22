  # Red Hat Remote Desktop - Custom Apache Guacamole Web Interface

A production-ready, enterprise-grade web interface for Apache Guacamole remote desktop connections with Red Hat branding. This solution addresses common Guacamole implementation challenges including copy/paste functionality, stuck keys, mouse cursor synchronization, and dynamic resolution handling.

## Features

### Core Functionality
- **JWT-Based Authentication** - Secure token-based connection establishment
- **Apache Guacamole Integration** - Built on guacamole-common-js 1.6.0 SDK
- **Multi-Protocol Support** - RDP, VNC, SSH via Guacamole backend
- **Red Hat Enterprise Branding** - Professional, production-ready UI

### Advanced Capabilities

#### 1. Enhanced Copy/Paste
- Bidirectional clipboard synchronization (local ↔ remote)
- Automatic clipboard monitoring with permission handling
- Clipboard API with execCommand fallback
- Handles both text and formatted content

#### 2. Stuck Keys Prevention
- Automatic key state management
- All keys released on window blur/visibility change
- Prevents stuck modifiers (Ctrl, Alt, Shift, Win)
- Handles Alt+Tab and focus changes gracefully

#### 3. Mouse Cursor Synchronization
- Remote cursor displayed with correct hotspot
- Local cursor hidden to prevent confusion
- Accurate click positioning
- Smooth cursor transitions

#### 4. Dynamic Resolution Management
- **Fully Automatic** - No manual controls needed
- Real-time resolution updates on window resize
- DPI-aware size calculation
- No dead space in framebuffer
- Seamless resolution changes without reconnect
- 250ms debounced updates for smooth experience

#### 5. Performance Optimizations
- Efficient WebSocket message handling
- Hardware-accelerated Canvas rendering
- Layer caching for static content
- Minimal bandwidth usage

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- guacamole-common-js library files

### Installation

#### 1. Clone and Setup
```bash
git clone <repository-url>
cd guacamole-web-interface
npm install
```

#### 2. Download Guacamole Common JS
```bash
mkdir -p public/guacamole-common-js
cd public/guacamole-common-js
wget https://downloads.apache.org/guacamole/1.6.0/binary/guacamole-common-js-1.6.0.tar.gz
tar -xzf guacamole-common-js-1.6.0.tar.gz --strip-components=1
rm guacamole-common-js-1.6.0.tar.gz
```

#### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Guacamole server URL
```

#### 4. Development Mode
```bash
npm run dev
```

Access at: `http://localhost:5173/?token=YOUR_JWT_TOKEN`

### Docker Deployment

#### Quick Deploy (Full Stack)
```bash
docker-compose up -d
```

This starts:
- guacd (Guacamole daemon) on port 4822
- guacamole (server) on port 8080
- web-interface (this app) on port 80

Access at: `http://localhost/?token=YOUR_JWT_TOKEN`

#### Production Build
```bash
docker build -t guacamole-web-interface .
docker run -d -p 80:80 guacamole-web-interface
```

## JWT Token Format

The application requires a JWT token with connection parameters:

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

Pass token via URL:
```
http://your-domain.com/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Architecture

### Component Structure
```
src/
├── components/
│   ├── GuacamoleClient.tsx      # Main client UI component
│   ├── ConnectionStatus.tsx     # Connection status indicator
│   └── ErrorBoundary.tsx        # Error handling wrapper
├── lib/
│   ├── guacamole/
│   │   ├── GuacamoleConnection.ts    # Connection manager
│   │   ├── ClipboardManager.ts       # Clipboard handling
│   │   ├── KeyboardStateManager.ts   # Keyboard fixes
│   │   ├── MouseCursorManager.ts     # Cursor synchronization
│   │   └── ResolutionManager.ts      # Dynamic resolution
│   ├── auth/
│   │   └── JWTAuthManager.ts         # JWT token management
│   └── utils/
│       └── logger.ts                 # Logging utility
└── types/
    └── guacamole.d.ts           # TypeScript definitions
```

### Manager Responsibilities

- **GuacamoleConnection**: Connection lifecycle, client initialization
- **ClipboardManager**: Bidirectional clipboard sync
- **KeyboardStateManager**: Prevents stuck keys, tracks key state
- **MouseCursorManager**: Displays remote cursor, hides local cursor
- **ResolutionManager**: Automatic resolution updates on window resize
- **JWTAuthManager**: Token parsing, validation, WebSocket URL building

## Configuration

### Environment Variables

**Development (.env):**
```bash
VITE_GUACAMOLE_WS_URL=ws://localhost:8080/guacamole/websocket-tunnel
VITE_DEBUG=true
```

**Production:**
```bash
VITE_GUACAMOLE_WS_URL=wss://guacamole.yourdomain.com/guacamole/websocket-tunnel
VITE_DEBUG=false
```

### Guacamole Server Configuration

Enable JWT authentication on Guacamole server:

**guacamole.properties:**
```properties
auth-provider: com.guacamole.auth.jwt.JWTAuthenticationProvider
jwt-secret-key: YOUR_SECRET_KEY_HERE
jwt-auth-header: Authorization
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Required APIs:
- WebSocket
- Canvas
- ResizeObserver
- Clipboard API (with fallback)
- Page Visibility API

## Performance

- **Latency**: 30-150ms (typical)
- **Bandwidth**: 100KB/s - 5MB/s (varies with usage)
- **CPU Usage**: ~5-15% (browser, one core)
- **Memory**: ~100-300MB (browser)

## Troubleshooting

### WebSocket Connection Failed
```bash
# Check Guacamole server is running
curl http://localhost:8080/guacamole/

# Verify JWT token is valid
# Check token expiration in payload

# Test WebSocket endpoint
wscat -c ws://localhost:8080/guacamole/websocket-tunnel
```

### Copy/Paste Not Working
1. Grant clipboard permissions in browser
2. Check browser console for permission errors
3. Verify ClipboardManager is initialized (debug logs)

### Resolution Not Updating
1. Verify `resize-method: display-update` in JWT token
2. Check remote desktop supports dynamic resize (RDP RemoteFX)
3. Enable debug mode to see resize events

### Stuck Keys After Alt+Tab
This is automatically handled. If issues persist:
1. Check KeyboardStateManager logs
2. Verify window blur events firing
3. Test with different browsers

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guide and operations
- **[IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md)** - Technical deep dive

## Development

### Build Commands
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Lint code
npm run typecheck    # TypeScript type checking
```

### Debug Mode
```bash
VITE_DEBUG=true npm run dev
```

Debug logs appear in browser console with prefixes:
- `[GUAC-DEBUG]` - Detailed debugging info
- `[GUAC-INFO]` - General information
- `[GUAC-WARN]` - Warnings
- `[GUAC-ERROR]` - Errors

## Security

- JWT tokens stored in memory only (not localStorage)
- Token removed from URL after extraction
- HTTPS/WSS enforced in production
- Content Security Policy headers configured
- XSS prevention via React escaping
- No sensitive data in console logs (production mode)

## Contributing

### Code Structure Guidelines
1. One responsibility per file/class
2. TypeScript for type safety
3. Comprehensive error handling
4. Detailed logging for debugging
5. Clean separation of concerns

### Testing Checklist
- [ ] Copy/paste works bidirectionally
- [ ] No stuck keys after Alt+Tab
- [ ] Single cursor visible (remote)
- [ ] Resolution updates on window resize
- [ ] No dead space in display
- [ ] Clean disconnect/reconnect
- [ ] Error handling works correctly

## License

This project integrates with Apache Guacamole (Apache 2.0 License).

## Credits

- Built on Apache Guacamole
- Designed for Red Hat Enterprise environments
- Uses guacamole-common-js SDK 1.6.0

## Support

For issues and questions:
1. Check [TROUBLESHOOTING](./DEPLOYMENT.md#troubleshooting) section
2. Review browser console logs (debug mode)
3. Verify Guacamole server configuration
4. Check Apache Guacamole documentation

## Version

**1.0.0** - Production Release

## References

- [Apache Guacamole](https://guacamole.apache.org/)
- [Guacamole Manual](https://guacamole.apache.org/doc/gug/)
- [guacamole-common-js API](https://guacamole.apache.org/doc/guacamole-common-js/)
- [Red Hat Brand Guidelines](https://www.redhat.com/en/about/brand)
