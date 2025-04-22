import { Suspense } from 'react';
import InboxClientContent from '@/components/dashboard/inbox-client-content';

// This is now a Server Component
export default function InboxPage() {
  return (
    <Suspense fallback={<div className="p-4"><p>Loading conversations...</p></div>}> 
      <InboxClientContent />
    </Suspense>
  );
} 