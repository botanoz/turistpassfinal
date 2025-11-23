import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Plan Your Visit - TuristPass',
  description: 'Plan Your Visit feature is under development. Check back soon!',
};

export default function PlanYourVisitPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center">
        
        {/* Back to Home */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-primary hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl p-6 md:p-8 shadow-lg border">
          
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Calendar className="h-8 w-8 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold mb-3">
            Plan Your Visit
          </h1>

          {/* Status Badge */}
          <div className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full text-sm font-medium mb-4">
            🚧 Under Development
          </div>

          {/* Message */}
          <p className="text-muted-foreground mb-6">
            This feature is currently under development. Please check back soon!
          </p>

          {/* Back Button */}
          <Link href="/">
            <button className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Go Back
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}