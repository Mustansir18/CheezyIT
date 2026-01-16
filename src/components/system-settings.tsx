
'use client';

import { useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
  docPath: string;
}

function SettingsListManager({ title, description, docPath }: SettingsListManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newItem, setNewItem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const settingsRef = useMemoFirebase(() => doc(firestore, 'system_settings', docPath), [firestore, docPath]);
  const { data: settingsData, isLoading } = useDoc<{ list: string[] }>(settingsRef);

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    setIsSubmitting(true);
    try {
      await updateDoc(settingsRef, {
        list: arrayUnion(newItem.trim()),
      });
      toast({ title: 'Success', description: `${newItem.trim()} added.` });
      setNewItem('');
    } catch (error) {
      console.error(`Error adding ${docPath}:`, error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not add item.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: string) => {
    try {
      await updateDoc(settingsRef, {
        list: arrayRemove(item),
      });
      toast({ title: 'Success', description: `${item} removed.` });
    } catch (error) {
      console.error(`Error removing ${docPath}:`, error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not remove item.` });
    }
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
            settingsData?.list?.map((item) => (
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
}

export default function SystemSettings() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SettingsListManager
        title="Manage Regions"
        description="Add or remove regions available for user assignment."
        docPath="regions"
      />
      <SettingsListManager
        title="Manage Roles"
        description="Add or remove user roles. Note: Permissions are hardcoded in security rules."
        docPath="roles"
      />
    </div>
  );
}

