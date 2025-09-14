import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const quickClear = async () => {
  try {
    console.log('⚡ Quick Database Clear Started...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections`);
    
    // Clear all collections in parallel
    const clearPromises = collections.map(async (collection) => {
      const result = await mongoose.connection.db.collection(collection.name).deleteMany({});
      return { collection: collection.name, deleted: result.deletedCount };
    });
    
    const results = await Promise.all(clearPromises);
    const totalDeleted = results.reduce((sum, result) => sum + result.deleted, 0);
    
    console.log(`🎉 Cleared ${totalDeleted} documents from ${collections.length} collections`);
    
    // Summary
    results.forEach(result => {
      if (result.deleted > 0) {
        console.log(`   📄 ${result.collection}: ${result.deleted} documents`);
      }
    });
    
    console.log('\n✅ Database cleared successfully!');
    console.log('🚀 Ready for fresh testing');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

quickClear();