'use client';

import { useParams } from 'next/navigation';
import ConversationView from '@/components/dashboard/conversation-view';

export default function ThreadPage() {
  const params = useParams();
  // Extract threadId, handle potential array/undefined case if needed
  const threadId = params.threadId as string;

  // Render the reusable component, passing the threadId
  return <ConversationView threadId={threadId} />;
} 