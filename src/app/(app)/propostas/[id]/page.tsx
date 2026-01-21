/**
 * Página de Detalhes da Proposta
 * Rota dinâmica: /propostas/[id]
 */

import { ProposalDetails } from '@/components/proposals/proposal-details';

export default async function ProposalDetailsPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await params as { id: string };
  return <ProposalDetails proposalId={resolvedParams.id} />;
}
