# Apache Guacamole Custom Web Interface - Architecture Documentation

## Project Overview

This project implements a production-ready custom web interface for Apache Guacamole remote desktop connections with Red Hat branding. The solution addresses common issues with Guacamole implementations including copy/paste functionality, stuck keys, mouse cursor synchronization, and dynamic resolution handling.

## Architecture Components

### 1. Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Browser                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          React Application (Red Hat Theme)            │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │     GuacamoleClient Component                   │  │   │
│  │  │  - JWT Token Management                         │  │   │
│  │  │  - Connection Lifecycle                         │  │   │
│  │  │  - Event Handling                               │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │     guacamole-common-js SDK Integration        │  │   │
│  │  │  - Guacamole.Client                            │  │   │
│  │  │  - Guacamole.WebSocketTunnel                   │  │   │
│  │  │  - Guacamole.Display                           │  │   │
│  │  │  - Guacamole.Mouse/Keyboard                    │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │     Enhanced Features Layer                     │  │   │
│  │  │  - Dynamic Resolution Manager                   │  │   │
│  │  │  - Copy/Paste Handler                          │  │   │
│  │  │  - Keyboard State Manager                      │  │   │
│  │  │  - Mouse Cursor Synchronizer                   │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket (JWT in header)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Guacamole Server Infrastructure                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Guacamole Client (guacamole-1.6.0)           │   │
│  │  - JWT Token Validation                              │   │
│  │  - Session Management                                │   │
│  │  - WebSocket Endpoint                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            │ Guacamole Protocol              │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              guacd (Guacamole Daemon)                │   │
│  │  - RDP/VNC/SSH Protocol Handlers                     │   │
│  │  - Remote Desktop Connection                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2. Container Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Docker Network                             │
│                                                               │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │  Web Interface      │  │  Guacamole Server   │           │
│  │  Container          │  │  Container          │           │
│  │  - Nginx            │  │  - Tomcat           │           │
│  │  - Static Assets    │  │  - guacamole-1.6.0  │           │
│  │  - JWT Proxy        │  │  - JWT Extensions   │           │
│  │  Port: 80/443       │  │  Port: 8080         │           │
│  └─────────────────────┘  └─────────────────────┘           │
│           │                         │                         │
│           └────────────┬────────────┘                         │
│                        │                                      │
│                        ▼                                      │
│           ┌─────────────────────┐                            │
│           │  guacd Container    │                            │
│           │  - guacd daemon     │                            │
│           │  Port: 4822         │                            │
│           └─────────────────────┘                            │
└──────────────────────────────────────────────────────────────┘
```

## Critical Issue Solutions

### 1. Copy/Paste Functionality

**Problem:** Clipboard synchronization between browser and remote desktop fails intermittently.

**Solution:**
- Implement bidirectional clipboard monitoring
- Use Clipboard API with fallback to execCommand
- Handle both text and formatted content
- Automatic clipboard sync on focus events
- Debounced clipboard monitoring to prevent race conditions

**Implementation Details:**
```javascript
// Enhanced clipboard handler with automatic sync
class ClipboardManager {
  - Monitor local clipboard changes
  - Send clipboard updates via Guacamole stream
  - Receive remote clipboard updates
  - Handle permissions and browser compatibility
  - Implement retry logic for failed transfers
}
```

### 2. Stuck Keys Problem

**Problem:** Modifier keys (Ctrl, Alt, Shift) remain pressed after focus loss or Alt+Tab.

**Solution:**
- Track all pressed keys in a state map
- Release all keys on blur/visibility change
- Implement key state reconciliation
- Send explicit key release events
- Monitor document visibility API

**Implementation Details:**
```javascript
// Keyboard state manager
class KeyboardStateManager {
  - Track pressed keys in Set
  - Listen to visibilitychange events
  - Release all keys on window blur
  - Prevent stuck modifiers
  - Handle browser focus changes
}
```

### 3. Mouse Cursor Synchronization

**Problem:** Local cursor doesn't match remote cursor position, causing click misalignment.

**Solution:**
- Hide local cursor when remote cursor is shown
- Use relative mouse mode when supported
- Implement cursor position prediction
- Handle cursor image updates from server
- Synchronize on connection parameter changes

**Implementation Details:**
```javascript
// Mouse cursor synchronizer
class MouseCursorManager {
  - Hide local cursor via CSS
  - Display remote cursor from server
  - Handle cursor hotspot positioning
  - Implement cursor image caching
  - Smooth cursor transitions
}
```

### 4. Dynamic Resolution Changes

**Problem:** Resolution changes leave dead space or require page refresh.

**Solution:**
- Monitor browser window resize events (debounced)
- Calculate optimal resolution based on viewport
- Send size update via Guacamole "size" instruction
- Handle aspect ratio preservation
- Implement smooth framebuffer transitions
- No manual controls needed - fully automatic

**Implementation Details:**
```javascript
// Dynamic resolution manager
class ResolutionManager {
  - Monitor window.onresize with 250ms debounce
  - Calculate DPI-aware dimensions
  - Send size instruction to Guacamole
  - Handle connection parameter updates
  - Smooth transition between sizes
  - Maintain aspect ratio
}
```

### 5. Framebuffer Refresh Optimization

**Problem:** Slow or incomplete screen updates causing visual artifacts.

**Solution:**
- Implement layer caching for static content
- Use requestAnimationFrame for smooth rendering
- Handle partial updates efficiently
- Optimize WebSocket message processing
- Implement frame dropping under load

### 6. Automatic Display Resize

**Problem:** Manual controls are cumbersome and users forget to resize.

**Solution:**
- Fully automatic resize on window change
- No buttons or manual controls needed
- Intelligent debouncing (250ms)
- Maintains optimal resolution continuously
- Works seamlessly across connection lifecycle

## JWT Authentication Flow

```
1. User accesses application with JWT token in URL/header
   ↓
2. Frontend extracts and validates JWT structure
   ↓
3. JWT stored in memory (not localStorage for security)
   ↓
4. WebSocket connection initiated with JWT in header
   ↓
5. Guacamole server validates JWT signature
   ↓
6. Token payload contains connection parameters
   ↓
7. Session established with authorized connection
```

**JWT Payload Structure:**
```json
{
  "sub": "user-id",
  "exp": 1234567890,
  "connection": {
    "protocol": "rdp",
    "hostname": "target-host",
    "port": 3389,
    "username": "user",
    "password": "encrypted",
    "security": "nla",
    "ignore-cert": true,
    "resize-method": "display-update"
  }
}
```

## Red Hat Branding Implementation

### Color Scheme
- Primary: Red Hat Red (#EE0000)
- Secondary: Dark Grey (#151515)
- Accent: White (#FFFFFF)
- Background: Light Grey (#F5F5F5)

### Design Elements
- Red Hat logo in header
- Red Hat font family (Overpass/Red Hat Display)
- Consistent spacing using 8px grid
- Red Hat approved iconography
- Professional enterprise look

## File Structure

```
project/
├── public/
│   ├── guacamole-common-js/     # Guacamole SDK files
│   │   ├── guacamole-common.min.js
│   │   └── LICENSE
│   └── assets/
│       ├── redhat-logo.svg
│       └── favicon.ico
├── src/
│   ├── components/
│   │   ├── GuacamoleClient.tsx   # Main client component
│   │   ├── ConnectionStatus.tsx  # Status indicator
│   │   └── ErrorBoundary.tsx     # Error handling
│   ├── lib/
│   │   ├── guacamole/
│   │   │   ├── GuacamoleConnection.ts    # Connection manager
│   │   │   ├── ClipboardManager.ts       # Clipboard handling
│   │   │   ├── KeyboardStateManager.ts   # Keyboard fixes
│   │   │   ├── MouseCursorManager.ts     # Cursor sync
│   │   │   └── ResolutionManager.ts      # Dynamic resolution
│   │   ├── auth/
│   │   │   └── JWTAuthManager.ts         # JWT handling
│   │   └── utils/
│   │       └── logger.ts                 # Logging utility
│   ├── types/
│   │   └── guacamole.d.ts        # TypeScript definitions
│   └── App.tsx
├── Dockerfile                     # Container definition
├── nginx.conf                     # Nginx configuration
└── docker-compose.yml            # Multi-container setup
```

## Performance Optimizations

1. **WebSocket Message Processing**
   - Batch message handling
   - Efficient blob processing
   - Message queue management

2. **Rendering Optimization**
   - Use Canvas for display
   - Hardware acceleration enabled
   - Layer caching for static content
   - Partial update handling

3. **Memory Management**
   - Proper cleanup on disconnect
   - Image cache size limits
   - Event listener cleanup
   - Buffer pooling

## Security Considerations

1. **JWT Token Handling**
   - Stored in memory only (no localStorage)
   - Automatic expiration handling
   - Secure WebSocket (WSS) only in production
   - Token refresh mechanism

2. **Content Security**
   - CSP headers configured
   - XSS prevention
   - CORS properly configured
   - No sensitive data in console logs

3. **Connection Security**
   - TLS for WebSocket
   - Certificate validation
   - Secure password handling
   - Session timeout enforcement

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Required APIs:
- WebSocket
- Clipboard API (with fallback)
- ResizeObserver
- Page Visibility API

## Deployment

### Development
```bash
npm install
npm run dev
```

### Production
```bash
docker build -t guacamole-web-interface .
docker run -p 80:80 \
  -e GUACAMOLE_URL=ws://guacamole:8080/guacamole \
  guacamole-web-interface
```

### Full Stack
```bash
docker-compose up -d
```

## Monitoring and Debugging

1. **Connection Events**
   - All state changes logged
   - Error states captured
   - Performance metrics tracked

2. **Debug Mode**
   - Verbose logging available
   - Connection parameter inspection
   - Frame rate monitoring
   - Network statistics

## References

- Apache Guacamole Documentation: https://guacamole.apache.org/doc/gug/
- Guacamole Protocol Reference: https://guacamole.apache.org/doc/gug/protocol-reference.html
- guacamole-common-js API: https://guacamole.apache.org/doc/guacamole-common-js/
- Red Hat Brand Guidelines: https://www.redhat.com/en/about/brand
