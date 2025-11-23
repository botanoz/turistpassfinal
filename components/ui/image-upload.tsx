"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Link2, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  bucket: 'logos' | 'banners' | 'avatars' | 'business-images';
  folder?: string;
  className?: string;
  accept?: string;
  maxSize?: number; // in MB
  previewHeight?: string;
  uploadEndpoint?: string; // default to admin upload; override for business
}

export function ImageUpload({
  label,
  value = "",
  onChange,
  bucket,
  folder,
  className = "",
  accept = "image/jpeg,image/png,image/webp",
  maxSize = 5,
  previewHeight = "200px",
  uploadEndpoint = '/api/admin/upload'
}: ImageUploadProps) {
  const [uploadType, setUploadType] = useState<'url' | 'file'>(value && value.startsWith('http') ? 'url' : 'file');
  const [urlInput, setUrlInput] = useState(value || "");
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(value || "");

  const handleUrlChange = (url: string) => {
    setUrlInput(url);
    setPreviewUrl(url);
    onChange(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSize) {
      toast.error(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    if (!accept.split(',').some(type => file.type.match(type.replace('*', '.*')))) {
      toast.error('Invalid file type');
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      if (folder) formData.append('folder', folder);

      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setPreviewUrl(data.url);
      onChange(data.url);
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleRemove = () => {
    setPreviewUrl("");
    setUrlInput("");
    onChange("");
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Label>{label}</Label>

      <RadioGroup
        value={uploadType}
        onValueChange={(val: any) => {
          setUploadType(val);
          if (val === 'url') {
            // Reset to URL mode
            setPreviewUrl(urlInput);
          } else {
            // Reset to file mode
            if (!previewUrl || previewUrl === urlInput) {
              setPreviewUrl("");
            }
          }
        }}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="url" id={`${label}-url`} />
          <Label htmlFor={`${label}-url`} className="cursor-pointer font-normal">Use URL</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="file" id={`${label}-file`} />
          <Label htmlFor={`${label}-file`} className="cursor-pointer font-normal">Upload File</Label>
        </div>
      </RadioGroup>

      {uploadType === 'url' ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="pl-10"
              />
            </div>
            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Paste image URL from any public source or CDN
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <label className="flex-1">
              <div className={`
                flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg
                cursor-pointer transition-colors
                ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-accent'}
              `}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm">Click to upload or drag and drop</span>
                  </>
                )}
              </div>
              <input
                type="file"
                accept={accept}
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
            {previewUrl && !isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {accept.split(',').map(t => t.split('/')[1]).join(', ').toUpperCase()} up to {maxSize}MB
          </p>
        </div>
      )}

      {/* Preview */}
      {previewUrl && !isUploading && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Preview</Label>
          <div
            className="relative border rounded-lg overflow-hidden bg-muted flex items-center justify-center"
            style={{ height: previewHeight }}
          >
            <img
              src={previewUrl}
              alt={label}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'flex flex-col items-center gap-2 text-muted-foreground';
                  errorDiv.innerHTML = `
                    <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="text-sm">Failed to load image</p>
                  `;
                  parent.appendChild(errorDiv);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
