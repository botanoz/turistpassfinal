// components/place/PlaceGallery.tsx
import React, { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Heart, Share2 } from "lucide-react";
import { PlaceImage } from "@/lib/mockData/placesData";

interface PlaceGalleryProps {
  images: PlaceImage[];
  altText: string;
}

export default function PlaceGallery({ images, altText }: PlaceGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // Fotoğraf navigasyonu
  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  return (
    <div className="relative mb-8">
      <div className="relative h-[300px] sm:h-[400px] md:h-[500px] rounded-xl overflow-hidden">
        <Image
          src={images[currentImageIndex]?.url || images[0]?.url}
          alt={images[currentImageIndex]?.alt || altText}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw"
          priority
        />
        
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-2 text-white hover:bg-black/70"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-2 text-white hover:bg-black/70"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`bg-black/50 rounded-full p-2 transition-colors ${
              isLiked ? 'text-red-500' : 'text-white hover:bg-black/70'
            }`}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button 
            className="bg-black/50 rounded-full p-2 text-white hover:bg-black/70"
            aria-label="Share"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentImageIndex(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                index === currentImageIndex ? 'border-primary' : 'border-transparent'
              }`}
              aria-label={`View ${image.alt}`}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}