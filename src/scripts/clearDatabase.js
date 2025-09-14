import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import all models
import User from '../models/User.js';
import Trade from '../models/Trade.js';
import Listing from '../models/Listing.js';

const clearDatabase = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('🗑️  Starting database cleanup...');
    
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections:`, collections.map(c => c.name));
    
    // Clear all collections
    const clearPromises = collections.map(async (collection) => {
      const collectionName = collection.name;
      console.log(`🧹 Clearing collection: ${collectionName}`);
      const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
      console.log(`   ✅ Deleted ${result.deletedCount} documents from ${collectionName}`);
      return { collection: collectionName, deleted: result.deletedCount };
    });
    
    const results = await Promise.all(clearPromises);
    
    // Summary
    console.log('\n📊 Cleanup Summary:');
    results.forEach(result => {
      console.log(`   ${result.collection}: ${result.deleted} documents deleted`);
    });
    
    const totalDeleted = results.reduce((sum, result) => sum + result.deleted, 0);
    console.log(`\n🎉 Total documents deleted: ${totalDeleted}`);
    
    // Drop indexes (optional - recreates them fresh)
    console.log('\n🔄 Dropping and recreating indexes...');
    for (const collection of collections) {
      try {
        await mongoose.connection.db.collection(collection.name).dropIndexes();
        console.log(`   ✅ Dropped indexes for ${collection.name}`);
      } catch (error) {
        if (error.codeName !== 'NamespaceNotFound') {
          console.log(`   ⚠️  Could not drop indexes for ${collection.name}: ${error.message}`);
        }
      }
    }
    
    // Recreate indexes by ensuring models
    console.log('\n🏗️  Recreating model indexes...');
    try {
      await User.init();
      await Trade.init();
      await Listing.init();
      console.log('   ✅ Model indexes recreated');
    } catch (error) {
      console.log('   ⚠️  Index recreation warning:', error.message);
      console.log('   💡 This is normal - indexes will be created automatically');
    }
    
    console.log('\n🎊 Database completely cleared and reset!');
    console.log('💾 All collections are now empty and ready for fresh testing');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Run the cleanup
console.log('🚀 Starting complete database cleanup...');
console.log('⚠️  WARNING: This will delete ALL data in the database!');
console.log('📅 Started at:', new Date().toISOString());
console.log('─'.repeat(50));

clearDatabase();