const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// User schema (without email)
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  credits: {
    type: Number,
    default: 1250,
    min: [0, 'Credits cannot be negative']
  },
  plan: {
    type: String,
    enum: ['free', 'premium', 'pro'],
    default: 'free'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      push: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function migrateUsers() {
  try {
    console.log('🔄 Starting migration to remove email field...');
    
    // Update all users to remove email field from preferences.notifications
    const result = await User.updateMany(
      { 'preferences.notifications.email': { $exists: true } },
      { $unset: { 'preferences.notifications.email': 1 } }
    );
    
    console.log(`✅ Migration completed! Updated ${result.modifiedCount} users.`);
    
    // Verify the migration
    const usersWithEmail = await User.countDocuments({ 'preferences.notifications.email': { $exists: true } });
    console.log(`📊 Users still with email field: ${usersWithEmail}`);
    
    if (usersWithEmail === 0) {
      console.log('🎉 All users successfully migrated!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

migrateUsers();
