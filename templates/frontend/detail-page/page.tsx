/**
 * Detail/Edit Page Template — React + shadcn/ui
 *
 * Replace {{Module}} and {{module}} with your module name.
 *
 * Features:
 * - Tab-based layout for organized content
 * - Form with validation (Zod + React Hook Form)
 * - Save/Cancel/Delete actions
 * - Loading and error states
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { {{module}}FormSchema, type {{Module}}FormValues } from './form-schema';

// Replace with your actual data hook
// import { use{{Module}}Detail, useUpdate{{Module}}, useDelete{{Module}} } from '../use-data';

export default function {{Module}}DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  const isNew = id === 'new';

  // Data fetching (uncomment and use your hooks)
  // const { data, isLoading, isError } = use{{Module}}Detail(isNew ? undefined : id);
  // const updateMutation = useUpdate{{Module}}();
  // const deleteMutation = useDelete{{Module}}();

  // Placeholder for demo
  const isLoading = false;
  const data = isNew ? undefined : { name: 'Example', code: 'EX-001', status: 'active' as const, description: '' };

  const form = useForm<{{Module}}FormValues>({
    resolver: zodResolver({{module}}FormSchema),
    defaultValues: data ?? {
      name: '',
      code: '',
      status: 'active',
      description: '',
    },
  });

  const onSubmit = async (values: {{Module}}FormValues) => {
    try {
      if (isNew) {
        // await createMutation.mutateAsync(values);
        console.log('Create:', values);
      } else {
        // await updateMutation.mutateAsync({ id: id!, ...values });
        console.log('Update:', values);
      }
      navigate('/{{module}}s');
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const handleDelete = async () => {
    if (!id || isNew) return;
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      // await deleteMutation.mutateAsync(id);
      navigate('/{{module}}s');
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/{{module}}s')}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold">
            {isNew ? 'Create {{Module}}' : data?.name ?? '{{Module}} Details'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-1 size-4" />
              Delete
            </Button>
          )}
          <Button size="sm" onClick={form.handleSubmit(onSubmit)}>
            <Save className="mr-1 size-4" />
            {isNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          {/* Add more tabs as needed */}
          {/* <TabsTrigger value="history">History</TabsTrigger> */}
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Code */}
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter code"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter description"
                            rows={4}
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              {!isNew && data && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">ID</span>
                    <p className="font-mono">{id}</p>
                  </div>
                  {/* Add more metadata fields as needed */}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
