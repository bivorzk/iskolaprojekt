# End-to-End Encryption (E2EE) Chat System

## Overview

This implementation provides a secure End-to-End Encryption chat system for the SnapTray application. Messages are encrypted on the client side and can only be decrypted by the intended recipients. The server cannot read the message content.

## Security Features

### 🔐 Hybrid Encryption
- **RSA-OAEP 2048-bit** for key exchange
- **AES-GCM 256-bit** for message encryption
- **Client-side key generation** using Web Crypto API
- **Perfect Forward Secrecy** through unique symmetric keys per message

### 🛡️ Privacy Protection
- Messages encrypted before transmission
- Server stores only encrypted ciphertext
- Private keys never leave the client device
- Public key infrastructure for secure key exchange

## Architecture

### Client Side (`/public/js/e2ee-crypto.js`)
- **Key Generation**: Creates RSA key pairs using Web Crypto API
- **Encryption**: Hybrid encryption (RSA + AES) for optimal security and performance
- **Key Storage**: Secure local storage of private keys
- **Decryption**: Client-side message decryption

### Server Side (`/src/services/chat-service.js`)
- **Message Storage**: Encrypted message persistence
- **Key Management**: Public key distribution
- **Authentication**: Session-based user verification
- **API Endpoints**: RESTful chat operations

### Database Models
- **User Model**: Extended with encryption fields
- **Message Model**: Stores encrypted content and metadata

## API Endpoints

### E2EE Setup
```javascript
POST /chat/setup-e2ee
{
  "publicKey": "base64-encoded-public-key",
  "keyAlgorithm": "RSA-OAEP"
}
```

### Send Encrypted Message
```javascript
POST /chat/send-message
{
  "recipientId": "user-id",
  "encryptedContent": "base64-encrypted-message",
  "encryptionMetadata": {
    "senderEncryptedKey": "base64-encrypted-symmetric-key",
    "recipientEncryptedKey": "base64-encrypted-symmetric-key",
    "iv": "base64-initialization-vector",
    "algorithm": "AES-GCM"
  }
}
```

### Retrieve Messages
```javascript
GET /chat/messages/:otherUserId
```

### Get Public Key
```javascript
GET /chat/public-key/:userId
```

## Usage

### 1. Access the Chat Interface
Navigate to `/chat` in your browser after logging in.

### 2. Enable E2EE
On first visit, click "Enable End-to-End Encryption" to generate your key pair.

### 3. Start Conversations
- Click "+ Start New Chat"
- Search for users who have E2EE enabled
- Begin secure messaging

### 4. Message Encryption Flow
1. User types message
2. System generates unique AES key
3. Message encrypted with AES key
4. AES key encrypted with both users' RSA public keys
5. Encrypted package sent to server
6. Recipient decrypts using their private key

## Security Considerations

### ✅ What's Protected
- Message content is fully encrypted end-to-end
- Only sender and recipient can decrypt messages
- Perfect forward secrecy with unique keys per message
- Authentication prevents message forgery

### ⚠️ Current Limitations
- Private keys stored in localStorage (not ideal for production)
- No key rotation mechanism
- Single device per user (keys don't sync)
- No message verification signatures

### 🔧 Production Recommendations
- Implement secure key storage (Web Authentication API, HSMs)
- Add key rotation and device management
- Implement multi-device key synchronization
- Add message authentication codes (MACs)
- Consider using Signal Protocol for advanced features

## Technical Details

### Encryption Process
1. **Key Generation**: RSA-OAEP 2048-bit key pair generated client-side
2. **Message Encryption**: 
   - Generate random AES-GCM 256-bit key
   - Encrypt message with AES key + random IV
   - Encrypt AES key with recipient's RSA public key
   - Encrypt AES key with sender's RSA public key (for message history)
3. **Transmission**: Send encrypted message + encrypted keys + IV to server
4. **Storage**: Server stores encrypted data without ability to decrypt

### Decryption Process
1. **Retrieval**: Client fetches encrypted message from server
2. **Key Decryption**: Decrypt AES key using user's RSA private key
3. **Message Decryption**: Decrypt message using AES key + stored IV
4. **Display**: Show decrypted message in chat interface

## Files Structure

```
├── src/
│   ├── models/
│   │   ├── User.js              # Extended with encryption fields
│   │   └── Message.js           # E2EE message model
│   ├── services/
│   │   └── chat-service.js      # Chat API endpoints
│   └── main.js                  # Route integration
├── public/
│   ├── js/
│   │   └── e2ee-crypto.js       # Client-side crypto utilities
│   └── chat/
│       └── index.html           # Chat interface
```

## Testing the Implementation

1. **Setup**: Ensure MongoDB is running and users are registered
2. **Access**: Navigate to `http://localhost:3000/chat`
3. **Enable E2EE**: Click setup button to generate keys
4. **Test Chat**: Search for other E2EE-enabled users and send messages
5. **Verify**: Check browser developer tools to see encrypted data in network requests

## Dependencies

- **express-validator**: Input validation
- **mongoose**: Database modeling
- **express**: Web framework
- **react**: Frontend UI (loaded via CDN)
- **Web Crypto API**: Browser-native cryptography

## Browser Compatibility

- Chrome/Chromium 37+
- Firefox 34+
- Safari 7+
- Edge 12+
- Modern browsers with Web Crypto API support

---

**Note**: This implementation provides a solid foundation for E2EE messaging but should be reviewed and enhanced for production use, especially regarding key management and device synchronization.