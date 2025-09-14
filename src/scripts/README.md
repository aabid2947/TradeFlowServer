# 🧹 Backend Reset Scripts

This directory contains scripts to completely clear and reset the backend for fresh testing.

## 📋 Available Scripts

### 1. Quick Clear (Recommended)
```bash
npm run quick-clear
```
- **Fastest option** ⚡
- Clears all MongoDB collections
- No index recreation (avoids conflicts)
- Perfect for regular testing

### 2. Basic Database Clear
```bash
npm run clear-db
# OR
npm run reset
```
- Clears all MongoDB collections
- Recreates indexes (may have conflicts)
- Keeps files and logs intact

### 3. Complete Backend Reset
```bash
npm run complete-reset
# OR
npm run fresh-start
```
- Clears all MongoDB collections
- Deletes uploaded files
- Removes log files
- Clears temporary files
- Completely fresh start

## 🎯 Which Script to Use?

### 🚀 **Quick Clear** (`npm run quick-clear`)
**BEST FOR:** Regular testing, fast iterations
- ✅ Super fast (2-3 seconds)
- ✅ Clears all data
- ✅ No conflicts
- ❌ Doesn't clear files

### 🔧 **Basic Clear** (`npm run clear-db`)
**BEST FOR:** When you need fresh indexes
- ✅ Recreates database structure
- ✅ Clears all data
- ⚠️  May have index conflicts
- ❌ Doesn't clear files

### 🧹 **Complete Reset** (`npm run complete-reset`)
**BEST FOR:** Full testing cycle, before releases
- ✅ Everything cleared
- ✅ Completely fresh start
- ✅ Clears files and logs
- ❌ Slower (10-15 seconds)

## 🔍 What Each Script Does

### `quickClear.js` ⚡
✅ **Database:**
- Deletes all documents from all collections
- Maintains existing structure

❌ **Does NOT:**
- Recreate indexes (prevents conflicts)
- Clear files or logs

### `clearDatabase.js` 🔧
✅ **Database:**
- Deletes all documents from all collections
- Drops and recreates indexes

❌ **Does NOT clear:**
- Uploaded files
- Log files
- Temporary files

### `completeReset.js` 🧹
✅ **Database:**
- Deletes all documents from all collections

✅ **Files:**
- Clears `uploads/` directory
- Removes all `.log` files from `logs/`
- Clears `temp/` directory

## 🚨 Warning

⚠️ **THESE SCRIPTS WILL DELETE ALL DATA!**
- All user accounts will be lost
- All trades, listings, and messages will be deleted
- All uploaded files will be removed (complete reset only)
- This action cannot be undone

## 📱 Frontend Clearing

For the frontend, use the script in `/P2PClient/src/scripts/clearFrontend.js`:

1. Open browser console
2. Copy and paste the script content
3. Press Enter
4. Reload the page

## 🔄 Recommended Testing Workflow

### For Regular Testing:
```bash
# Quick and easy
npm run quick-clear
```

### For Complete Fresh Start:
1. **Stop the server** (Ctrl+C)
2. **Clear backend:**
   ```bash
   npm run complete-reset
   ```
3. **Clear frontend:** Run the frontend script in browser console
4. **Restart server:**
   ```bash
   npm run dev
   ```
5. **Refresh frontend:** F5 or reload page

## ✅ Success Output

When scripts run successfully, you'll see:

**Quick Clear:**
```
⚡ Quick Database Clear Started...
✅ Connected to MongoDB
📋 Found 7 collections
🎉 Cleared 45 documents from 7 collections
   📄 users: 9 documents
   📄 trades: 3 documents
   📄 listings: 3 documents
✅ Database cleared successfully!
🚀 Ready for fresh testing
```

**Complete Reset:**
```
🎊 COMPLETE BACKEND RESET FINISHED!
✅ Database: All collections cleared
✅ Files: Uploads directory cleared
✅ Logs: Log files removed
✅ Temp: Temporary files cleared
🚀 Backend is now completely fresh and ready for testing!
```

## 🛠️ Troubleshooting

### "Connection failed"
- Check if MongoDB is running
- Verify MONGODB_URI in .env file

### "Permission denied"
- Check file permissions
- Run as administrator if needed

### "Module not found"
- Ensure all dependencies are installed: `npm install`

## � Pro Tips

- Use `quick-clear` for 99% of your testing needs
- Only use `complete-reset` when you need to clear files too
- Frontend script can be bookmarked for quick access
- Scripts are safe to run multiple times