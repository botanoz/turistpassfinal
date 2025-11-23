import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center">
        
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-8xl md:text-9xl font-bold text-primary/20 select-none">
            404
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Page Not Found
          </h1>
          <p className="text-muted-foreground">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. 
            The page might have been moved or doesn&apos;t exist.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button asChild className="flex-1">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/places">
              <Search className="h-4 w-4 mr-2" />
              Browse Places
            </Link>
          </Button>
        </div>

        {/* Back Link */}
        <div className="mt-6">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back to home page
          </Link>
        </div>
      </div>
    </div>
  );
}