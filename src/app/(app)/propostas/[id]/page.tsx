/**
 * Página de Detalhes da Proposta
 * Rota dinâmica: /propostas/[id]
 */

import { ProposalDetails } from '@/components/proposals/proposal-details';

export default function ProposalDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  return <ProposalDetails proposalId={params.id} />;
}
