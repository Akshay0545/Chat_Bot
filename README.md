# AI Chat Application - Complete MERN Stack

A full-stack AI chat application built with React, Node.js, Express, MongoDB, and Socket.io. Features real-time messaging, user authentication, credits system, and a modern UI.

## 🚀 Features

### Frontend (React + Vite)
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Authentication**: Sign up, sign in, and protected routes
- **Real-time Chat**: Live messaging with AI responses
- **State Management**: Redux Toolkit for global state
- **Credits System**: Token-based usage tracking
- **Notifications**: Real-time notification panel
- **Responsive Design**: Works on desktop and mobile

### Backend (Node.js + Express)
- **RESTful API**: Complete CRUD operations
- **Authentication**: JWT-based auth with refresh tokens
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io for live updates
- **Security**: Rate limiting, input validation, CORS
- **Error Handling**: Comprehensive error management

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-chat-app
```

2. **Install all dependencies**
```bash
npm run full:install
```

3. **Set up environment variables**
Create a `.env` file in the `backend` directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ai-chat
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Start MongoDB**
Make sure MongoDB is running on your system.

5. **Start both frontend and backend**
```bash
npm run full:dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend dev server on `http://localhost:3000`

### Alternative: Start separately

**Backend only:**
```bash
npm run backend
```

**Frontend only:**
```bash
npm run dev
```



## 🔔 Notifications & Real-time Updates

### Socket.io Integration
The application uses Socket.io for real-time communication between frontend and backend.

### When Notifications Are Sent

#### User-Specific Notifications (Targeted)
- **New Conversation Created**: When a user creates a new conversation
- **AI Response Ready**: When AI finishes processing a message
- **Low Credits Warning**: When user has 1248 credits remaining
- **Urgent Low Credits**: When user has 1245 credits remaining (marked as urgent)

#### Global Notifications (Broadcast)
-  The infrastructure supports global broadcasts

### Notification Types
- **info**: General information (new conversation)
- **success**: Successful operations (AI response ready)
- **warning**: Warnings (low credits)
- **error**: Errors (urgent low credits)

### Socket Events
- `notification`: Real-time notification delivery
- `new-message`: Message broadcasting in conversations
- `join-conversation`: User joining conversation rooms

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile

### Chat
- `GET /api/chat/conversations` - Get user conversations
- `POST /api/chat/conversations` - Create new conversation
- `GET /api/chat/conversations/:id/messages` - Get conversation messages
- `POST /api/chat/conversations/:id/messages` - Send message
- `DELETE /api/chat/conversations/:id` - Delete conversation

### User
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/notifications` - Get user notifications
- `PUT /api/user/notifications/:id/read` - Mark notification as read
- `PUT /api/user/notifications/read-all` - Mark all notifications as read
- `DELETE /api/user/notifications/:id` - Delete notification
- `GET /api/user/stats` - Get user statistics

## 🎨 UI Components

### Dashboard
- **Header**: User info, credits counter, notifications
- **Sidebar**: Conversation list, new chat button
- **Chat Area**: Message display, input field, suggested prompts
- **Notification Panel**: Real-time notifications

### Authentication
- **Sign In**: Email/password login
- **Sign Up**: Username, email, password registration
- **Protected Routes**: Automatic redirect for unauthenticated users

## 🔒 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS protection
- Helmet for security headers
- Protected API routes

## 🚀 Deployment

### Frontend (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Set environment variables for API URL

### Backend (Railway/Heroku/DigitalOcean)
1. Set up MongoDB database (MongoDB Atlas recommended)
2. Configure environment variables
3. Deploy the backend code
4. Update frontend API URL to point to deployed backend

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-chat
JWT_SECRET=your-production-jwt-secret
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## 🤖 AI Integration

The application is designed to integrate with AI services:

- **OpenAI GPT**: Set `OPENAI_API_KEY` in environment variables
- **Anthropic Claude**: Set `ANTHROPIC_API_KEY` in environment variables
- **Custom AI Service**: Modify the `generateAIResponse` function in `backend/routes/chat.js`

Currently, the app uses mock responses. To enable real AI:

1. Add your API keys to the backend `.env` file
2. Update the `generateAIResponse` function in `backend/routes/chat.js`
3. Implement proper error handling for AI service failures

## 🧪 Testing

### Manual Testing
1. Register a new user
2. Sign in with credentials
3. Create a new conversation
4. Send messages and verify AI responses
5. Check credits deduction
6. Test notifications
7. Verify real-time updates

### API Testing
Use tools like Postman or curl to test API endpoints:

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 📝 Development

### Adding New Features
1. Create new API endpoints in `backend/routes/`
2. Add corresponding Redux actions in `src/store/`
3. Update UI components as needed
4. Test thoroughly

### Code Style
- Use ESLint for code formatting
- Follow React best practices
- Use TypeScript for type safety (optional)
- Write meaningful commit messages

## 📄 License

This project is licensed under the MIT License.

---

**Happy Coding! 🚀**
