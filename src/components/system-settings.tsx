'use client';

import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SettingsListManagerProps {
  title: string;
  description: string;
  items: string[];
  onAddItem: (item: string) => void;
  onDeleteItem: (item: string) => void;
  isLoading?: boolean;
  docPath: string;
}

const SettingsListManager = React.memo(function SettingsListManager({ title, description, items, onAddItem, onDeleteItem, isLoading, docPath }: SettingsListManagerProps) {
  const [newItem, setNewItem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
        onAddItem(newItem.trim());
        toast({ title: 'Success (Mock)', description: `${newItem.trim()} added.` });
        setNewItem('');
        setIsSubmitting(false);
    }, 500);
  };

  const handleDeleteItem = async (item: string) => {
    onDeleteItem(item);
    toast({ title: 'Success (Mock)', description: `${item} removed.` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            placeholder={`New ${docPath}...`}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <Button onClick={handleAddItem} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="sr-only">Add</span>
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : (
            items.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">{item}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the "{item}" item.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteItem(item)} className="bg-destructive hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default function SystemSettings({ regions, setRegions }: { regions: string[], setRegions: (regions: string[]) => void }) {
  
  const addRegion = (region: string) => {
      setRegions([...regions, region]);
  };

  const deleteRegion = (regionToDelete: string) => {
      setRegions(regions.filter(region => region !== regionToDelete));
  };
  
  return (
    <div className="grid gap-4 md:grid-cols-1 max-w-md">
      <SettingsListManager
        title="Manage Regions"
        description="Add or remove regions available for user assignment."
        docPath="regions"
        items={regions}
        onAddItem={addRegion}
        onDeleteItem={deleteRegion}
      />
    </div>
  );
}
