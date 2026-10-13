import { requireSupabase } from './supabaseClient';

export type ChangeProposalRow = {
  id: string;
  trip_id: string;
  title: string;
  source: 'chat' | 'family_document' | 'manual_admin';
  status: 'draft' | 'approved' | 'rejected' | 'applied';
  score: number | null;
  recommendation: string;
  summary: string;
  impact: unknown;
  reasoning: unknown;
  operations: unknown[];
  created_by: string | null;
  created_at: string;
};

export type CreateChangeProposalInput = {
  tripId: string;
  title: string;
  summary: string;
  score: number;
  recommendation: string;
  impact: unknown;
  reasoning: unknown;
  operations: unknown[];
};

export async function listChangeProposals(tripId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('change_proposals')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ChangeProposalRow[];
}

export async function createChangeProposal(input: CreateChangeProposalInput) {
  const supabase = requireSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('change_proposals')
    .insert({
      trip_id: input.tripId,
      title: input.title,
      source: 'chat',
      status: 'draft',
      score: input.score,
      recommendation: input.recommendation,
      summary: input.summary,
      impact: input.impact,
      reasoning: input.reasoning,
      operations: input.operations,
      created_by: userData.user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChangeProposalRow;
}
