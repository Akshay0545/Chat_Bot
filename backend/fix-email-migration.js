const mongoose = require('mongoose');
require('dotenv').config();

async function fixEmailMigration() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat');
    console.log('✅ Connected to MongoDB');
    
    // Get the users collection directly
    const usersCollection = mongoose.connection.db.collection('users');
    
    console.log('🔄 Starting migration to remove email field from notifications...');
    
    // Update all users to remove email field from preferences.notifications
    const result = await usersCollection.updateMany(
      { 'preferences.notifications.email': { $exists: true } },
      { $unset: { 'preferences.notifications.email': 1 } }
    );
    
    console.log(`✅ Migration completed! Updated ${result.modifiedCount} users.`);
    
    // Verify the migration
    const usersWithEmail = await usersCollection.countDocuments({ 'preferences.notifications.email': { $exists: true } });
    console.log(`📊 Users still with email field: ${usersWithEmail}`);
    
    if (usersWithEmail === 0) {
      console.log('🎉 All users successfully migrated!');
    }
    
    // Show updated users
    const users = await usersCollection.find({}).toArray();
    console.log('\n📋 Updated users:');
    users.forEach((user, index) => {
      console.log(`User ${index + 1}: ${user.username}`);
      console.log(`  Notifications:`, user.preferences?.notifications);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

fixEmailMigration();
