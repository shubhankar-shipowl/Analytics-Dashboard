# File Upload Guide

## Maximum File Size

**Current Maximum File Size: 200MB**

This can be configured via environment variable:
```env
MAX_UPLOAD_SIZE=200000000  # in bytes (200MB)
```

### Supported File Types
- `.xlsx` - Excel 2007+ format
- `.xls` - Excel 97-2003 format
- `.csv` - Comma-separated values

## Upload Configuration

### Backend Limits
- **Multer (File Upload)**: 200MB (configurable via `MAX_UPLOAD_SIZE`)
- **Body Parser**: 200MB (configurable via `MAX_BODY_SIZE`)
- **Single File Only**: Only one file can be uploaded at a time

### Increasing File Size Limit

1. **Set Environment Variable** (Recommended):
   ```bash
   # In backend/.env
   MAX_UPLOAD_SIZE=500000000  # 500MB in bytes
   MAX_BODY_SIZE=500mb        # 500MB for body parser
   ```

2. **Restart PM2**:
   ```bash
   pm2 restart dashboard
   ```

## Common Upload Issues & Solutions

### 1. "File too large" Error

**Problem**: File exceeds the maximum size limit.

**Solutions**:
- Reduce file size by splitting into multiple files
- Increase `MAX_UPLOAD_SIZE` in environment variables
- Compress the Excel file before uploading

### 2. "No file uploaded" Error

**Problem**: File was not received by the server.

**Solutions**:
- Check file size is within limit
- Verify file extension is `.xlsx`, `.xls`, or `.csv`
- Check browser console for errors
- Verify network connection is stable
- Try uploading a smaller test file first

### 3. "Invalid Excel file format" Error

**Problem**: File is corrupted or not a valid Excel file.

**Solutions**:
- Open and save the file in Excel to ensure it's valid
- Check file is not password protected
- Verify file extension matches actual file type
- Try exporting to a new Excel file

### 4. "Database error during import" Error

**Problem**: Database connection or query issue.

**Solutions**:
- Check database connection: `curl http://your-vps:5009/api/health`
- Verify database has enough space
- Check PM2 logs: `pm2 logs dashboard`
- Ensure database tables exist

### 5. Upload Times Out

**Problem**: Large files take too long to upload.

**Solutions**:
- Increase timeout in Nginx (if using):
  ```nginx
  client_max_body_size 200m;
  proxy_read_timeout 300s;
  proxy_connect_timeout 300s;
  ```
- Split large files into smaller batches
- Upload during off-peak hours

### 6. "Permission denied" Error

**Problem**: Server cannot write to upload directory.

**Solutions**:
```bash
# Check upload directory permissions
ls -la backend/uploads/

# Fix permissions
chmod 755 backend/uploads/
chown -R your-user:your-group backend/uploads/
```

## Upload Process

1. **File Validation**: 
   - File type checked (.xlsx, .xls, .csv)
   - File size checked (max 200MB)
   - File saved to `backend/uploads/`

2. **Import Processing**:
   - Excel file parsed row by row
   - Data normalized and validated
   - Inserted in batches of 5,000 rows (optimized)
   - Duplicate `order_id` values are skipped

3. **Progress Tracking**:
   - Import logged in `import_logs` table
   - Status: `success`, `failed`, or `partial`
   - Duration and row counts tracked

## Performance Tips

### For Large Files (>50MB)

1. **Split Files**: Break large files into smaller chunks (50MB each)
2. **Clear Existing Data**: Use "Clear existing data" option to avoid duplicate checks
3. **Off-Peak Upload**: Upload during low-traffic periods
4. **Monitor Progress**: Check import history endpoint for status

### Batch Size Optimization

Current batch size: **5,000 rows per batch**

This is optimized for performance. To change:
- Edit `backend/routes/import.js` line 147
- Adjust `batchSize` value (recommended: 1000-10000)

## Monitoring Uploads

### Check Import History
```bash
curl http://your-vps:5009/api/import/history
```

### View Logs
```bash
# PM2 logs
pm2 logs dashboard

# Backend logs
tail -f backend/logs/app.log
```

### Check Upload Directory
```bash
ls -lh backend/uploads/
du -sh backend/uploads/
```

## Troubleshooting Steps

1. **Check File Size**:
   ```bash
   ls -lh your-file.xlsx
   ```

2. **Test Upload with curl**:
   ```bash
   curl -X POST \
     -F "file=@your-file.xlsx" \
     -F "clearExisting=false" \
     http://your-vps:5009/api/import/excel
   ```

3. **Check Server Logs**:
   ```bash
   pm2 logs dashboard --lines 100
   ```

4. **Verify Configuration**:
   ```bash
   # Check environment variables
   pm2 env dashboard | grep MAX_UPLOAD
   ```

5. **Test Database Connection**:
   ```bash
   curl http://your-vps:5009/api/health
   ```

## Recommended File Sizes

| File Size | Expected Import Time | Recommendation |
|-----------|---------------------|----------------|
| < 10MB    | < 30 seconds         | ✅ Optimal     |
| 10-50MB   | 30-120 seconds       | ✅ Good        |
| 50-100MB  | 2-5 minutes          | ⚠️ Acceptable  |
| 100-200MB | 5-15 minutes         | ⚠️ Slow       |
| > 200MB   | Not supported        | ❌ Split file  |

## Environment Variables Reference

```env
# Maximum upload file size (in bytes)
MAX_UPLOAD_SIZE=200000000  # 200MB

# Maximum body size for requests
MAX_BODY_SIZE=200mb        # 200MB

# Database connection pool size
DB_POOL_SIZE=30
```

---

**Last Updated**: 2024
**Current Max Size**: 200MB
**Supported Formats**: .xlsx, .xls, .csv

