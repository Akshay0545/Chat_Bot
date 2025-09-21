const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat');
    console.log('✅ Connected to MongoDB');
    
    // Get the users collection directly
    const usersCollection = mongoose.connection.db.collection('users');
    
    console.log('🔍 Checking user documents...');
    
    const users = await usersCollection.find({}).toArray();
    console.log(`📊 Found ${users.length} users:`);
    
    users.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`  ID: ${user._id}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Has email field: ${user.email !== undefined}`);
      console.log(`  Has preferences: ${user.preferences !== undefined}`);
      if (user.preferences) {
        console.log(`  Has notifications: ${user.preferences.notifications !== undefined}`);
        if (user.preferences.notifications) {
          console.log(`  Has email in notifications: ${user.preferences.notifications.email !== undefined}`);
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

checkUsers();
