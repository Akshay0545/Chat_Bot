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

## 🏗️ Project Structure

```
ai-chat-app/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── AuthProvider.jsx     # Authentication context
│   │   ├── ChatArea.jsx         # Main chat interface
│   │   ├── Header.jsx           # Top navigation
│   │   ├── NotificationPanel.jsx # Notifications
│   │   ├── ProtectedRoute.jsx   # Route protection
│   │   └── Sidebar.jsx          # Chat sidebar
│   ├── pages/                   # Page components
│   │   ├── Dashboard.jsx        # Main dashboard
│   │   ├── SignIn.jsx          # Login page
│   │   └── SignUp.jsx          # Registration page
│   ├── store/                   # Redux store
│   │   ├── authSlice.js         # Authentication state
│   │   ├── chatSlice.js         # Chat state
│   │   ├── uiSlice.js           # UI state
│   │   └── store.js             # Store configuration
│   ├── services/                # API services
│   │   └── api.js               # API client
│   ├── App.jsx                  # Main app component
│   ├── main.jsx                 # App entry point
│   └── index.css                # Global styles
├── backend/                     # Backend source code
│   ├── models/                  # Database models
│   │   ├── User.js              # User model
│   │   ├── Conversation.js      # Conversation model
│   │   ├── Message.js           # Message model
│   │   └── Notification.js      # Notification model
│   ├── routes/                  # API routes
│   │   ├── auth.js              # Authentication routes
│   │   ├── chat.js              # Chat routes
│   │   └── user.js              # User routes
│   ├── middleware/              # Custom middleware
│   │   ├── auth.js              # Authentication middleware
│   │   └── validation.js        # Input validation
│   ├── server.js                # Main server file
│   └── package.json             # Backend dependencies
├── package.json                 # Frontend dependencies
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
└── README.md                    # This file
```

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

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network access

2. **CORS Errors**
   - Check CORS configuration in `backend/server.js`
   - Ensure frontend URL is whitelisted

3. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Clear localStorage and try again

4. **Build Errors**
   - Run `npm run full:install` to install all dependencies
   - Check Node.js version (v16+ required)
   - Clear node_modules and reinstall

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support or questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Happy Coding! 🚀**
