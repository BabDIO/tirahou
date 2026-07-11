import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFilesAdded: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxSize?: number; // en bytes
  multiple?: boolean;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  preview?: boolean;
  files?: File[];
  onRemove?: (index: number) => void;
}

export function FileDropzone({
  onFilesAdded,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB par défaut
  multiple = true,
  maxFiles,
  disabled = false,
  className,
  preview = true,
  files = [],
  onRemove
}: FileDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAdded(acceptedFiles);
  }, [onFilesAdded]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections
  } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    maxFiles,
    disabled
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
          isDragActive && !isDragReject && "border-blue-500 bg-blue-50 dark:bg-blue-950",
          isDragReject && "border-red-500 bg-red-50 dark:bg-red-950",
          !isDragActive && "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <input {...getInputProps()} disabled={disabled} />
        
        <UploadCloud className={cn(
          "w-12 h-12 mx-auto mb-4 transition-colors",
          isDragActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
        )} />
        
        {isDragActive ? (
          <p className="text-blue-600 dark:text-blue-400 font-medium">
            Déposez les fichiers ici...
          </p>
        ) : (
          <div>
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
              Glissez-déposez des fichiers ici, ou cliquez pour sélectionner
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {accept && Object.keys(accept).length > 0
                ? `Formats acceptés: ${Object.keys(accept).join(', ')}`
                : 'Tous les formats acceptés'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Taille maximale: {formatFileSize(maxSize)}
              {maxFiles && ` | Maximum ${maxFiles} fichier${maxFiles > 1 ? 's' : ''}`}
            </p>
          </div>
        )}
      </div>

      {/* Erreurs de validation */}
      {fileRejections.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Fichiers rejetés:
          </p>
          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
            {fileRejections.map(({ file, errors }) => (
              <li key={file.name}>
                <span className="font-medium">{file.name}</span>:{' '}
                {errors.map(e => e.message).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Prévisualisation des fichiers */}
      {preview && files.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Fichiers sélectionnés ({files.length}) :
          </p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="ml-2 p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
