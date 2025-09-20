# 🚀 Quick Start Guide

## Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- Git

## Installation & Setup

### 1. Install Dependencies
```bash
# Install all dependencies (frontend + backend)
npm run full:install
```

### 2. Set up MongoDB
Make sure MongoDB is running on your system:
- **Local**: Start MongoDB service
- **Cloud**: Use MongoDB Atlas (recommended)

### 3. Configure Environment
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

### 4. Start the Application
```bash
# Start both frontend and backend
npm run full:dev
```

This will start:
- ✅ Backend: http://localhost:5000
- ✅ Frontend: http://localhost:3000

## 🎯 First Steps

1. **Open the app**: Go to http://localhost:3000
2. **Sign up**: Create a new account
3. **Start chatting**: Create a new conversation and send a message
4. **Check credits**: See your credit balance in the header

## 🔧 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ismaster')"

# If using local MongoDB, start the service
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Port Already in Use
```bash
# Kill process on port 5000
npx kill-port 5000

# Kill process on port 3000
npx kill-port 3000
```

### Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
npm run full:install
```

## 📱 Testing the App

### 1. Authentication
- ✅ Sign up with email/password
- ✅ Sign in with credentials
- ✅ Automatic redirect to dashboard

### 2. Chat Features
- ✅ Create new conversation
- ✅ Send messages
- ✅ Receive AI responses
- ✅ Credits deduction

### 3. UI Features
- ✅ Responsive design
- ✅ Notification panel
- ✅ User profile dropdown
- ✅ Sidebar navigation

## 🚀 Next Steps

1. **Add AI Integration**: Set up OpenAI or Anthropic API keys
2. **Customize UI**: Modify colors, fonts, and layout
3. **Add Features**: Implement file uploads, voice messages, etc.
4. **Deploy**: Use Vercel (frontend) + Railway (backend)

## 📞 Need Help?

- Check the main README.md for detailed documentation
- Review the API endpoints in backend/routes/
- Check browser console for frontend errors
- Check terminal for backend errors

---

**Happy Coding! 🎉**
