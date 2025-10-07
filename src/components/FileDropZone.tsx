import React, { useState, useRef } from 'react';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { validateFile } from '../lib/fileProcessing';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  onFileRemove?: () => void;
  error?: string | null;
  disabled?: boolean;
  compact?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFileSelect,
  selectedFile,
  onFileRemove,
  error,
  disabled = false,
  compact = false
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      // Let parent handle error
      return;
    }
    onFileSelect(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const inputId = `file-input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-3">
      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg text-center transition-colors ${
          disabled 
            ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 cursor-not-allowed opacity-50'
            : isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${compact ? 'p-4' : 'p-6'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".txt,.md,.pdf,.docx"
          className="hidden"
          id={inputId}
          disabled={disabled}
        />
        <Upload className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} mx-auto mb-2 ${
          isDragActive ? 'text-blue-500' : 'text-gray-400'
        }`} />
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium mb-1 ${
          isDragActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
        }`}>
          {isDragActive ? 'Drop file here' : 'Drag & drop a file here'}
        </p>
        <p className={`${compact ? 'text-xs' : 'text-xs'} text-gray-500 dark:text-gray-400 ${compact ? 'mb-2' : 'mb-3'}`}>
          or click to browse
        </p>
        <label
          htmlFor={inputId}
          className={`inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg cursor-pointer transition-colors ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          <Upload className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
          Choose File
        </label>
      </div>

      {/* Selected File Display */}
      {selectedFile && (
        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <File className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700 dark:text-green-300 flex-1 truncate">
            {selectedFile.name}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round(selectedFile.size / 1024)}KB
          </span>
          {onFileRemove && (
            <button
              type="button"
              onClick={onFileRemove}
              className="text-red-500 hover:text-red-700 flex-shrink-0"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File Type Info */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Supported: TXT, MD, PDF, DOCX (max 5MB)
      </p>
    </div>
  );
};