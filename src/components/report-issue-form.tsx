
'use client';

import { useEffect, useState, useRef } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createTicketAction } from '@/lib/actions';
import { Loader2, Camera, Upload, X } from 'lucide-react';

const issueTypes = ['Network', 'Hardware', 'Software', 'Account Access', 'Other'] as const;

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  issueType: z.enum(issueTypes, {
    required_error: "You need to select an issue type.",
  }),
  customIssueType: z.string().optional(),
  description: z.string().min(1, 'Description is required.'),
  anydesk: z.string().optional(),
  photo: z.string().optional(),
}).refine(data => {
    if (data.issueType === 'Other') {
        return !!data.customIssueType && data.customIssueType.length > 0;
    }
    return true;
}, {
    message: 'Please specify your issue type.',
    path: ['customIssueType'],
});

type FormData = z.infer<typeof ticketSchema>;

const initialState = {
  type: '',
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Create Ticket
    </Button>
  );
}

export default function ReportIssueForm({ children }: { children: React.ReactNode }) {
  const [state, formAction] = useActionState(createTicketAction, initialState);
  const { toast } = useToast();

  const [photoDataUri, setPhotoDataUri] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [showCustomIssueType, setShowCustomIssueType] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      anydesk: '',
      photo: '',
      customIssueType: '',
    },
  });

  const resetFormState = () => {
    form.reset();
    setPhotoDataUri(null);
    setHasCameraPermission(null);
    setShowCustomIssueType(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    if (state?.type === 'success') {
      toast({
        title: 'Success!',
        description: state.message,
      });
      resetFormState();
    } else if (state?.type === 'error') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  const handleTabChange = (value: string) => {
    if (value === 'camera' && hasCameraPermission === null) {
      getCameraPermission();
    }
  };

  const getCameraPermission = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not supported by this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  };
  
  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/png');
      setPhotoDataUri(dataUri);
      form.setValue('photo', dataUri);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setPhotoDataUri(dataUri);
        form.setValue('photo', dataUri);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const clearPhoto = () => {
      setPhotoDataUri(null);
      form.setValue('photo', '');
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const handleIssueTypeChange = (value: string) => {
    const isOther = value === 'Other';
    setShowCustomIssueType(isOther);
    form.setValue('issueType', value as typeof issueTypes[number]);
    if (!isOther) {
      form.setValue('customIssueType', '');
    }
  }

  return (
    <Dialog onOpenChange={(open) => !open && resetFormState()}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className='font-headline'>Report a New Issue</DialogTitle>
          <DialogDescription>
            Fill out the form below to submit a new IT support ticket.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
             <FormField
              control={form.control}
              name="photo"
              render={({ field }) => (
                <FormItem hidden>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Cannot connect to Wi-Fi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="issueType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Type</FormLabel>
                  <Select onValueChange={handleIssueTypeChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an issue type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {issueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {showCustomIssueType && (
                 <FormField
                    control={form.control}
                    name="customIssueType"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Custom Issue Type</FormLabel>
                            <FormControl>
                                <Input placeholder="Please specify the issue type" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
            )}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide as much detail as possible."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="anydesk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AnyDesk Address (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="123 456 789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Attach Photo (Optional)</FormLabel>
                {photoDataUri ? (
                    <div className="relative">
                        <Image src={photoDataUri} alt="Issue preview" width={400} height={300} className="rounded-md w-full h-64 object-cover" />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={clearPhoto}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="upload"><Upload className="mr-2"/>Upload</TabsTrigger>
                            <TabsTrigger value="camera"><Camera className="mr-2"/>Take a Picture</TabsTrigger>
                        </TabsList>
                        <TabsContent value="upload">
                             <Input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} />
                        </TabsContent>
                        <TabsContent value="camera">
                            <div className="flex flex-col gap-2 items-center">
                                <div className="w-full bg-muted rounded-md aspect-video flex items-center justify-center">
                                  {hasCameraPermission === false ? (
                                    <Alert variant="destructive" className="w-auto">
                                      <AlertTitle>Camera Access Required</AlertTitle>
                                      <AlertDescription>
                                        Please allow camera access.
                                      </AlertDescription>
                                    </Alert>
                                  ) : (
                                    <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline />
                                  )}
                                </div>
                                <Button onClick={handleCapture} disabled={!hasCameraPermission}>
                                    <Camera className="mr-2"/> Capture
                                </Button>
                                <canvas ref={canvasRef} style={{ display: 'none' }} />
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </FormItem>

            <DialogFooter>
               <DialogClose asChild>
                <Button variant="outline" onClick={resetFormState}>Cancel</Button>
               </DialogClose>
               <SubmitButton />
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
