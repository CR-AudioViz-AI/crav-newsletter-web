'use client';

import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery({
    workspaceId: 'default',
  });

  if (isLoading) {
    return <div className="p-8">Loading campaigns...</div>;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <Link
            href="/campaigns/new"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Campaign
          </Link>
        </div>

        {!campaigns || campaigns.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 mb-4">No campaigns yet</p>
            <Link
              href="/campaigns/new"
              className="text-blue-600 hover:underline"
            >
              Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">
                      {campaign.name}
                    </h2>
                    {campaign.subject && (
                      <p className="text-gray-600 dark:text-gray-300 mb-2">
                        {campaign.subject}
                      </p>
                    )}
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Status: {campaign.status}</span>
                      <span>
                        Created: {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      campaign.status === 'SENT'
                        ? 'bg-green-100 text-green-800'
                        : campaign.status === 'DRAFT'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
