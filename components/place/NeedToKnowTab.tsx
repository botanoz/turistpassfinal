// components/place/NeedToKnowTab.tsx
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Info, Star } from "lucide-react";
import { PlaceAnnouncement } from "@/lib/mockData/placesData";

interface NeedToKnowTabProps {
  needToKnowInfo?: string;
  announcements?: PlaceAnnouncement[];
  openHours: Record<string, string>;
}

export default function NeedToKnowTab({ 
  needToKnowInfo, 
  announcements, 
  openHours 
}: NeedToKnowTabProps) {
  const hasAnnouncements = announcements && announcements.length > 0;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Need to Know</h2>
        
        {/* Info Text */}
        {needToKnowInfo && (
          <div className="mb-6">
            <p className="text-muted-foreground">
              {needToKnowInfo}
            </p>
          </div>
        )}
        
        {/* Announcements */}
        {hasAnnouncements && (
          <div>
            <h3 className="font-semibold text-lg mb-3">Announcements & Updates</h3>
            <div className="space-y-4">
              {announcements?.map((announcement) => {
                const bgColorClass = 
                  announcement.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                  announcement.type === 'special' ? 'bg-purple-50 dark:bg-purple-900/20' :
                  'bg-blue-50 dark:bg-blue-900/20';
                
                const iconColorClass = 
                  announcement.type === 'warning' ? 'text-amber-500' :
                  announcement.type === 'special' ? 'text-purple-500' :
                  'text-blue-500';
                
                const Icon = 
                  announcement.type === 'warning' ? AlertCircle :
                  announcement.type === 'special' ? Star :
                  Info;
                
                return (
                  <div key={announcement.id} className={`p-4 rounded-lg ${bgColorClass}`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 ${iconColorClass} mt-0.5`} />
                      <div>
                        <h4 className="font-medium text-base">{announcement.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">Posted: {new Date(announcement.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Opening Hours */}
        <div className="mt-6">
          <h3 className="font-semibold text-lg mb-3">Opening Hours</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1">
            {Object.entries(openHours).map(([day, hours]) => (
              <div key={day} className="flex justify-between">
                <span className="text-sm font-medium">{day}:</span>
                <span className="text-sm text-muted-foreground">{hours}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}