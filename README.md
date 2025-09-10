# P2P Server - Secure Backend API

A secure and scalable P2P server built with Node.js, Express, MongoDB, and JWT authentication.

## Features

- 🔐 **JWT Authentication** with refresh tokens
- 👥 **User Roles** (Buyer/Seller)
- 🛡️ **Security** with rate limiting, CORS, helmet, and input sanitization
- 🗄️ **MongoDB** with Mongoose ODM
- ✅ **Input Validation** with express-validator
- 🔑 **Password Security** with bcrypt
- 📊 **Token System** for user transactions
- 🚀 **Scalable Architecture** with MVC pattern

## Project Structure

```
P2PServer/
├── server.js                 # Main server file
├── .env                      # Environment variables
├── package.json              # Dependencies and scripts
├── src/
│   ├── config/
│   │   └── database.js       # Database configuration
│   ├── controllers/
│   │   └── userController.js # User-related logic
│   ├── middleware/
│   │   ├── auth.js          # Authentication middleware
│   │   ├── errorHandler.js  # Error handling
│   │   └── notFound.js      # 404 handler
│   ├── models/
│   │   └── User.js          # User model
│   ├── routes/
│   │   └── userRoutes.js    # User routes
│   ├── services/
│   │   └── userService.js   # User business logic
│   ├── utils/
│   │   ├── helpers.js       # Utility functions
│   │   └── security.js      # Security utilities
│   └── validators/
│       └── userValidators.js # Input validation
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd P2PServer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRE=7d
   JWT_REFRESH_SECRET=your_refresh_token_secret
   JWT_REFRESH_EXPIRE=30d
   CLIENT_URL=http://localhost:3000
   BCRYPT_SALT_ROUNDS=12
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication

#### Register User
```http
POST /api/users/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "buyer",
  "businessName": "John's Store", // Required for sellers
  "phoneNumber": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

#### Login
```http
POST /api/users/login
Content-Type: application/json

{
  "identifier": "john@example.com", // email or username
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/users/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Logout
```http
POST /api/users/logout
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### User Profile

#### Get Profile
```http
GET /api/users/profile
Authorization: Bearer your_jwt_token
```

#### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "username": "newusername",
  "phoneNumber": "+1234567890",
  "businessDescription": "Updated description"
}
```

#### Change Password
```http
PUT /api/users/change-password
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!",
  "confirmPassword": "NewPass123!"
}
```

### Token Management

#### Transfer Tokens
```http
POST /api/users/transfer-tokens
Authorization: Bearer your_jwt_token
Content-Type: application/json

{
  "recipientId": "recipient_user_id",
  "amount": 100
}
```

## Security Features

### Authentication & Authorization
- JWT tokens with secure secret keys
- Refresh token rotation
- Role-based access control
- Account lockout after failed attempts

### Security Middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevents abuse
- **Input Sanitization**: Prevents injection attacks
- **Password Hashing**: bcrypt with salt rounds

### Input Validation
- Email format validation
- Password strength requirements
- Username format validation
- Business data validation for sellers

## User Roles

### Buyer
- Default role for new users
- Can purchase from sellers
- Has token balance for transactions
- Can update profile and manage account

### Seller
- Business-focused user type
- Requires business name during registration
- Can list and sell products
- Has additional business-related fields

## Database Schema

### User Model
```javascript
{
  username: String (unique, 3-30 chars, alphanumeric + underscore)
  email: String (unique, valid email format)
  password: String (hashed, min 8 chars with complexity)
  role: String (enum: 'buyer', 'seller')
  token: Number (default: 0, for transactions)
  isActive: Boolean (default: true)
  isVerified: Boolean (default: false)
  lastLogin: Date
  refreshTokens: Array
  profilePicture: String
  phoneNumber: String
  address: Object
  businessName: String (required for sellers)
  businessDescription: String
  wishlist: Array (for buyers)
  // Security fields
  loginAttempts: Number
  lockUntil: Date
  // Timestamps
  createdAt: Date
  updatedAt: Date
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRE` | JWT expiration time | 7d |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration | 30d |
| `CLIENT_URL` | Frontend URL for CORS | http://localhost:3000 |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds | 12 |

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // For validation errors
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Rate Limiting

- **Authentication endpoints**: 5 requests per 15 minutes
- **General API**: 100 requests per 15 minutes
- **Password reset**: 3 requests per hour

## Development

### Running in Development Mode
```bash
npm run dev
```

This uses nodemon for automatic server restart on file changes.

### Testing
```bash
# Run tests (when implemented)
npm test
```

### Code Quality
- Follow ES6+ standards
- Use meaningful variable names
- Add comments for complex logic
- Handle errors appropriately

## Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure proper CORS origins
4. Set up MongoDB with authentication
5. Use HTTPS in production
6. Configure reverse proxy (nginx)
7. Set up monitoring and logging

### Docker Deployment (Optional)
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the error logs

---

**Note**: This is a backend API server. You'll need to build a frontend application to interact with these endpoints.
