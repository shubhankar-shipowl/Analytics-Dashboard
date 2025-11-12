import React, { useState } from 'react';
import { uploadExcelFile, deleteAllOrders } from '../utils/dataService';
import './FileUpload.css';

const FileUpload = ({ onUploadSuccess, onUploadError, backendConnected = false }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Please select a valid Excel file (.xlsx, .xls, or .csv)');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Always pass false for clearExisting - use Delete All Data button instead
      const result = await uploadExcelFile(file, false);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        const message = `✅ File uploaded successfully!\n\n` +
          `Total Rows: ${result.data.totalRows}\nInserted: ${result.data.inserted}\nErrors: ${result.data.errors}\n\n` +
          `🔄 Refreshing dashboard...`;
        alert(message);
        
        // Call success callback after alert to refresh dashboard
        if (onUploadSuccess) {
          await onUploadSuccess(result);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (onUploadError) {
        onUploadError(error);
      }
      alert(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const event = {
        target: {
          files: [file],
          value: ''
        }
      };
      handleFileSelect(event);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm(
      '⚠️ WARNING: This will PERMANENTLY DELETE ALL orders from the database!\n\n' +
      'This action cannot be undone.\n\n' +
      'Are you absolutely sure you want to delete all data?'
    );
    
    if (!confirmed) {
      return;
    }
    
    // Double confirmation
    const doubleConfirmed = window.confirm(
      '⚠️ FINAL WARNING!\n\n' +
      'You are about to delete ALL orders from the database.\n\n' +
      'This will remove all data permanently.\n\n' +
      'Type "DELETE" in the next prompt to confirm.'
    );
    
    if (!doubleConfirmed) {
      return;
    }
    
    setDeleting(true);
    
    try {
      const result = await deleteAllOrders();
      
      if (result.success) {
        alert(`✅ ${result.message}\n\n🔄 Refreshing dashboard...`);
        
        // Refresh dashboard after deletion
        if (onUploadSuccess) {
          await onUploadSuccess({ success: true, data: { deleted: result.deleted } });
        }
      } else {
        throw new Error(result.error || 'Failed to delete orders');
      }
    } catch (error) {
      console.error('Delete error:', error);
      if (onUploadError) {
        onUploadError(error);
      }
      alert(`❌ Failed to delete orders: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="file-upload-container">
      <h3>📤 Upload Excel File</h3>
      {!backendConnected && (
        <div className="backend-warning">
          <p>⚠️ Backend not connected. Upload will work when backend is running.</p>
        </div>
      )}
      <div 
        className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="upload-controls">
          <label className="file-input-label">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={uploading || !backendConnected}
              className="file-input"
            />
            <span className="file-input-button">
              {uploading ? '⏳ Uploading...' : '📁 Choose File'}
            </span>
          </label>
          
          <p className="drag-hint">or drag and drop your file here</p>
          
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={deleting || uploading || !backendConnected}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (deleting || uploading || !backendConnected) ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              width: '100%',
              opacity: (deleting || uploading || !backendConnected) ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!deleting && !uploading && backendConnected) {
                e.target.style.backgroundColor = '#b91c1c';
              }
            }}
            onMouseLeave={(e) => {
              if (!deleting && !uploading && backendConnected) {
                e.target.style.backgroundColor = '#dc2626';
              }
            }}
          >
            {deleting ? '⏳ Deleting...' : '🗑️ Delete All Data'}
          </button>
        </div>
      </div>

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="progress-text">{progress}%</p>
        </div>
      )}

      <div className="upload-info">
        <p className="upload-hint">
          📋 Supported formats: .xlsx, .xls, .csv
        </p>
        <p className="upload-hint">
          📏 Maximum file size: 50MB
        </p>
        {backendConnected && (
          <p className="upload-hint success">
            ✅ Backend connected - Ready to upload
          </p>
        )}
      </div>
    </div>
  );
};

export default FileUpload;

