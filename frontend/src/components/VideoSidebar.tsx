import React, { useRef, useState } from 'react';
import { useVideoStore } from '../store/videoStore';
import { useProjectStore } from '../store/projectStore';
import { uploadVideoFiles, fetchVideoFiles, deleteVideoFile } from '../api/video';
import { formatDurationMs } from '../utils/time';

export const VideoSidebar: React.FC = () => {
  const { files, currentIndex, setCurrentIndex, setFiles, removeFile, isLoading } = useVideoStore();
  const { currentProject } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = e.target.files;
    if (!uploadFiles || uploadFiles.length === 0) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const result = await uploadVideoFiles(uploadFiles, currentProject?.id);
      if (result.total_uploaded > 0) {
        const newFiles = await fetchVideoFiles(currentProject?.id);
        setFiles(newFiles);
        setUploadMessage(`Uploaded ${result.total_uploaded} file(s)`);
      }
      if (result.total_failed > 0) {
        const names = result.failed.map((f) => (f as { filename?: string }).filename ?? 'unknown').join(', ');
        setUploadMessage((prev) => prev ? `${prev}. Failed: ${names}` : `Failed: ${names}`);
      }
      setTimeout(() => setUploadMessage(null), 3000);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadMessage('Upload failed');
      setTimeout(() => setUploadMessage(null), 3000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = async (e: React.MouseEvent, filename: string) => {
    e.stopPropagation();
    try {
      await deleteVideoFile(filename);
      removeFile(filename);
    } catch (err) {
      console.error('Failed to remove file:', err);
    }
  };

  const annotatedCount = files.filter((f) => f.is_annotated).length;

  const UploadButton = () => (
    <div className="p-2 border-b border-th-border">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".mp4,.webm,.mov"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleUploadClick}
        disabled={uploading}
        className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {uploading ? (
          <><span className="animate-spin">&#8635;</span>Uploading...</>
        ) : (
          <><span>+</span>Upload Video</>
        )}
      </button>
      {uploadMessage && (
        <p className="mt-1 text-xs text-center text-th-text-secondary">{uploadMessage}</p>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="w-48 bg-th-bg-sidebar border-r border-th-border flex flex-col">
        <UploadButton />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-th-text-secondary text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="w-48 bg-th-bg-sidebar border-r border-th-border flex flex-col">
        <UploadButton />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-th-text-secondary text-center text-sm">
            <p>No video files</p>
            <p className="mt-2 text-xs">Upload .mp4, .webm, or .mov files</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-48 bg-th-bg-sidebar border-r border-th-border flex flex-col">
      <UploadButton />
      <div className="p-2 border-b border-th-border bg-th-bg-footer">
        <h2 className="text-sm font-semibold text-th-text-primary">Video Files ({files.length})</h2>
        <p className="text-xs text-green-700 mt-0.5">
          {annotatedCount} / {files.length} annotated
        </p>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {files.map((file, index) => {
          const isSelected = index === currentIndex;
          return (
            <div
              key={file.filename}
              className={`p-2 cursor-pointer border-b border-th-border hover:bg-th-bg-hover ${
                isSelected
                  ? file.is_annotated
                    ? 'bg-green-100 border-l-4 border-l-green-500'
                    : 'bg-blue-100 border-l-4 border-l-blue-500'
                  : file.is_annotated
                  ? 'bg-green-50 border-l-2 border-l-green-400'
                  : ''
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs text-th-text-primary truncate flex-1 font-medium" title={file.filename}>
                  {file.filename}
                </p>
                <button
                  onClick={(e) => handleRemoveFile(e, file.filename)}
                  title="Remove file"
                  className="text-th-text-secondary hover:text-red-500 flex-shrink-0 text-xs leading-none"
                >
                  ×
                </button>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <p className="text-xs text-th-text-secondary">
                  {file.duration_ms > 0 ? formatDurationMs(file.duration_ms) : '—'}
                  {file.width > 0 && ` · ${file.width}×${file.height}`}
                </p>
                {file.is_annotated && (
                  <span className="ml-auto text-green-600 font-bold text-xs">✓</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
