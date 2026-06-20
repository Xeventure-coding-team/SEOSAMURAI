"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImageIcon, X } from "lucide-react";

interface CoverUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
}

export function CoverUpload({ value, onChange }: CoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    onChange(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
  };

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative w-full h-48 rounded-md overflow-hidden border">
          <Image src={preview} alt="Cover" fill className="object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/40 transition-colors"
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Click to upload cover image</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}