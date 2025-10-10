'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@crav/ui';

export default function CampaignsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = '00000000-0000-0000-0000-000000000001';
  const wsId = params.wsId as string;

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const { data: campaigns, isLoading, refetch } = trpc.campaignsSupabase.list.useQuery({ orgId });
  const createMutation = trpc.campaignsSupabase.create.useMutation();

  const handleCreate = async () => {
    if (!title.trim() || !subject.trim()) {
      alert('Please enter both title and subject');
      return;
    }

    setCreating(true);
    try {
      const newCampaign = await createMutation.mutateAsync({
        orgId,
        title: title.trim(),
        brief: { subject: subject.trim() },
      });

      refetch();
      setTitle('');
      setSubject('');
      setShowCreate(false);
      router.push(`/workspaces/${wsId}/campaigns/${newCampaign.id}`);
    } catch (error: any) {
      alert(`Failed to create campaign: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'sent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'sending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Campaigns</h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Schedule and track email campaigns
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'Create Campaign'}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Campaign Title"
              placeholder="Enter campaign title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Email Subject"
              placeholder="Enter email subject line"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Button onClick={handleCreate} loading={creating}>
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      {!campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              No campaigns yet. Create your first campaign to get started.
            </p>
            <Button onClick={() => setShowCreate(true)}>Create Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: any) => (
            <Card
              key={campaign.id}
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => router.push(`/workspaces/${wsId}/campaigns/${campaign.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{campaign.title}</CardTitle>
                    {campaign.brief?.subject && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                        {campaign.brief.subject}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      campaign.status
                    )}`}
                  >
                    {campaign.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                  <p>Created: {new Date(campaign.created_at).toLocaleString()}</p>
                  {campaign.schedule_at && (
                    <p>Scheduled: {new Date(campaign.schedule_at).toLocaleString()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
