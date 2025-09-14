import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import all models
import User from '../models/User.js';
import Trade from '../models/Trade.js';
import Listing from '../models/Listing.js';

const clearEverything = async () => {
  try {
    console.log('🚀 Starting COMPLETE backend reset...');
    console.log('⚠️  WARNING: This will delete ALL data, files, and logs!');
    console.log('📅 Started at:', new Date().toISOString());
    console.log('─'.repeat(60));
    
    // 1. Connect to MongoDB and clear database
    console.log('\n📚 STEP 1: Clearing Database...');
    console.log('🔌 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
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
    const totalDeleted = results.reduce((sum, result) => sum + result.deleted, 0);
    console.log(`🎉 Database cleared: ${totalDeleted} documents deleted`);
    
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    
    // 2. Clear uploaded files
    console.log('\n📁 STEP 2: Clearing uploaded files...');
    const uploadsPath = path.join(__dirname, '../../uploads');
    
    try {
      const uploadsExists = await fs.access(uploadsPath).then(() => true).catch(() => false);
      if (uploadsExists) {
        const files = await fs.readdir(uploadsPath);
        console.log(`📂 Found ${files.length} files in uploads directory`);
        
        for (const file of files) {
          if (file !== '.gitkeep') { // Keep .gitkeep if it exists
            await fs.unlink(path.join(uploadsPath, file));
            console.log(`   🗑️  Deleted: ${file}`);
          }
        }
        console.log('✅ Uploads directory cleared');
      } else {
        console.log('📂 No uploads directory found (creating...)');
        await fs.mkdir(uploadsPath, { recursive: true });
        console.log('✅ Created fresh uploads directory');
      }
    } catch (error) {
      console.log(`⚠️  Could not clear uploads: ${error.message}`);
    }
    
    // 3. Clear logs
    console.log('\n📜 STEP 3: Clearing logs...');
    const logsPath = path.join(__dirname, '../../logs');
    
    try {
      const logsExists = await fs.access(logsPath).then(() => true).catch(() => false);
      if (logsExists) {
        const logFiles = await fs.readdir(logsPath);
        console.log(`📜 Found ${logFiles.length} log files`);
        
        for (const logFile of logFiles) {
          if (logFile.endsWith('.log')) {
            await fs.unlink(path.join(logsPath, logFile));
            console.log(`   🗑️  Deleted log: ${logFile}`);
          }
        }
        console.log('✅ Logs cleared');
      } else {
        console.log('📜 No logs directory found');
      }
    } catch (error) {
      console.log(`⚠️  Could not clear logs: ${error.message}`);
    }
    
    // 4. Clear any temporary files
    console.log('\n🗂️  STEP 4: Clearing temporary files...');
    const tempPath = path.join(__dirname, '../../temp');
    
    try {
      const tempExists = await fs.access(tempPath).then(() => true).catch(() => false);
      if (tempExists) {
        const tempFiles = await fs.readdir(tempPath);
        console.log(`🗂️  Found ${tempFiles.length} temporary files`);
        
        for (const tempFile of tempFiles) {
          await fs.unlink(path.join(tempPath, tempFile));
          console.log(`   🗑️  Deleted temp: ${tempFile}`);
        }
        console.log('✅ Temporary files cleared');
      } else {
        console.log('🗂️  No temp directory found');
      }
    } catch (error) {
      console.log(`⚠️  Could not clear temp files: ${error.message}`);
    }
    
    // 5. Summary
    console.log('\n' + '═'.repeat(60));
    console.log('🎊 COMPLETE BACKEND RESET FINISHED!');
    console.log('─'.repeat(60));
    console.log('✅ Database: All collections cleared');
    console.log('✅ Files: Uploads directory cleared');
    console.log('✅ Logs: Log files removed');
    console.log('✅ Temp: Temporary files cleared');
    console.log('─'.repeat(60));
    console.log('🚀 Backend is now completely fresh and ready for testing!');
    console.log('💡 You can now start the server with: npm run dev');
    console.log('📅 Completed at:', new Date().toISOString());
    console.log('═'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error during complete reset:', error);
    process.exit(1);
  } finally {
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

// Run the complete reset
clearEverything();