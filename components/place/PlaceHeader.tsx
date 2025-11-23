// components/place/PlaceHeader.tsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PlaceHeaderProps {
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  district: string;
  shortDescription: string;
}

export default function PlaceHeader({
  name,
  category,
  rating,
  reviewCount,
  district,
  shortDescription
}: PlaceHeaderProps) {
  return (
    <>
      {/* Back Button */}
      <div className="py-6">
        <Link 
          href="/places" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Places
        </Link>
      </div>

      {/* Title & Info */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-3xl font-bold">{name}</h1>
          <Badge variant="secondary">{category}</Badge>
        </div>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount} reviews)</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{district}</span>
          </div>
        </div>

        <p className="text-muted-foreground">{shortDescription}</p>
      </div>
    </>
  );
}