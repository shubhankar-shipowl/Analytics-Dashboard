import React, { useState } from 'react';
import { uploadExcelFile } from '../utils/dataService';
import './FileUpload.css';

const FileUpload = ({ onUploadSuccess, onUploadError, backendConnected = false }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clearExisting, setClearExisting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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

    // Confirm if clearing existing data
    if (clearExisting) {
      const confirmed = window.confirm(
        '⚠️ WARNING: This will DELETE ALL existing data from the database!\n\n' +
        'Are you sure you want to clear all existing orders before importing?\n\n' +
        'This action cannot be undone.'
      );
      if (!confirmed) {
        // Reset file input
        event.target.value = '';
        return;
      }
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

      const result = await uploadExcelFile(file, clearExisting);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (result.success) {
        let message = `✅ File uploaded successfully!\n\n`;
        if (clearExisting) {
          message += `⚠️ All existing data was deleted before import.\n\n`;
        }
        message += `Total Rows: ${result.data.totalRows}\nInserted: ${result.data.inserted}\nErrors: ${result.data.errors}\n\n`;
        message += `🔄 Refreshing dashboard...`;
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
          
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => {
                if (e.target.checked) {
                  const confirmed = window.confirm(
                    '⚠️ WARNING: Checking this option will DELETE ALL existing data from the database when you upload the file!\n\n' +
                    'This action cannot be undone. Are you sure?'
                  );
                  if (confirmed) {
                    setClearExisting(true);
                  }
                } else {
                  setClearExisting(false);
                }
              }}
              disabled={uploading || !backendConnected}
            />
            <span style={{ color: clearExisting ? '#dc2626' : 'inherit', fontWeight: clearExisting ? '600' : 'normal' }}>
              🗑️ Clear existing data before import
              {clearExisting && <span style={{ fontSize: '0.8rem', marginLeft: '5px' }}>(⚠️ All data will be deleted!)</span>}
            </span>
          </label>
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

