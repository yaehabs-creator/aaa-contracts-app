'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  loading: boolean;
  error: string | null;
  status: string;
  onRetry?: () => void;
}

export default function LoadingState({ loading, error, status, onRetry }: LoadingStateProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="mt-2">
                <div className="font-medium mb-2">Error Loading Graph</div>
                <p className="text-sm">{error}</p>
                {onRetry && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onRetry}
                    className="mt-3"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">Loading Graph Data</h3>
                <p className="text-sm text-muted-foreground mb-4">{status}</p>
                <Progress value={33} className="w-full" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}