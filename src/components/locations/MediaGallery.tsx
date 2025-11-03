import React, { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface MediaItem {
  googleUrl: string;
}

interface Props {
  paginatedMedia: MediaItem[];
}

const MediaGallery: React.FC<Props> = ({ paginatedMedia }) => {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (url: string) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(url);
      return newSet;
    });
  };

  const handleImageError = (url: string) => {
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(url);
      return newSet;
    });
    setImageErrors((prev) => new Set(prev).add(url));
  };

  return (
    <>
      {paginatedMedia.length > 0 ? (
        paginatedMedia.map((item, index) => {
          const isLoading = loadingImages.has(item.googleUrl);
          const hasError = imageErrors.has(item.googleUrl);

          return (
            <div key={index} className="w-full h-48 flex items-center justify-center bg-gray-50 relative">
              {isLoading && <Skeleton className="absolute inset-0 w-full h-full" />}
              
              {hasError ? (
                <div className="text-red-500 text-sm">Image failed to load</div>
              ) : (
                <img
                  src={item.googleUrl}
                  alt={`Media ${index}`}
                  className="object-cover w-full h-full"
                  onLoad={() => handleImageLoad(item.googleUrl)}
                  onError={() => handleImageError(item.googleUrl)}
                  onLoadStart={() =>
                    setLoadingImages((prev) => new Set(prev).add(item.googleUrl))
                  }
                />
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center py-10">
          <h2 className="text-lg font-semibold">No media found</h2>
          <p className="text-gray-500">
            This location doesn&apos;t have any photos available
          </p>
        </div>
      )}
    </>
  );
};

export default MediaGallery;
