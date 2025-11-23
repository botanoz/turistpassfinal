// components/place/OfferTab.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock } from "lucide-react";
import Image from "next/image";
import { PlaceActivity, PlaceMenu, PlaceImage } from "@/lib/mockData/placesData";

interface OfferTabProps {
  offerDescription?: string;
  activities?: PlaceActivity[];
  amenities: string[];
  menu?: PlaceMenu[];
  menuImage?: PlaceImage;
}

export default function OfferTab({ 
  offerDescription, 
  activities, 
  amenities, 
  menu, 
  menuImage 
}: OfferTabProps) {
  const hasActivities = activities && activities.length > 0;
  const hasMenu = menu && menu.length > 0;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">What We Offer</h2>
        
        {/* Offer Description */}
        {offerDescription && (
          <div className="mb-6">
            <p className="text-muted-foreground leading-relaxed">
              {offerDescription}
            </p>
          </div>
        )}

        {/* Activities */}
        {hasActivities && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Special Activities & Services</h3>
            <div className="space-y-4">
              {activities?.map((activity) => (
                <div key={activity.id} className="border rounded-lg p-4">
                  <h4 className="font-medium text-base">{activity.title}</h4>
                  <p className="text-muted-foreground mt-1">{activity.description}</p>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {activity.availability && (
                      <span className="text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {activity.availability}
                      </span>
                    )}
                    
                    {activity.price && (
                      <span className="text-sm font-medium text-primary">
                        {activity.price}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3">Amenities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
              {amenities.map((amenity, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu Section if Applicable */}
        {hasMenu && (
          <div>
            <h3 className="font-semibold text-lg mb-3">Menu</h3>
            
            {/* Menu Images */}
            {menuImage && (
              <div className="mb-6">
                <h4 className="font-medium text-base mb-2">Menu Photos</h4>
                <div className="relative h-64 md:h-80 rounded-lg overflow-hidden">
                  <Image
                    src={menuImage.url}
                    alt="Menu"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 66vw"
                  />
                </div>
              </div>
            )}
            
            {/* Menu Items */}
            <div className="space-y-3">
              {menu?.map((item) => (
                <div key={item.id} className="flex justify-between items-start p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                    {item.category && (
                      <Badge variant="outline" className="mt-2">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  <span className="font-semibold text-primary ml-4">
                    {item.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}