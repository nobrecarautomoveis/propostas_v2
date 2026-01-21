/**
 * Componente Principal - Detalhes da Proposta
 * 
 * Layout:
 * - Desktop: 2 colunas lado a lado
 * - Mobile: Scroll vertical com tudo junto
 */

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ProposalReport } from './proposal-report';
import { ProposalTimeline } from './proposal-timeline';
import { useProposals } from '@/hooks/use-proposals';
import { useAuth } from '@/hooks/use-auth';

interface ProposalDetailsProps {
  proposalId: string;
}

export function ProposalDetails({ proposalId }: ProposalDetailsProps) {
  const router = useRouter();
  const { currentUser } = useAuth();
  
  // Buscar dados da proposta
  const { proposals, isLoading } = useProposals({ userId: currentUser?.id });
  const proposal = proposals?.find(p => p.id === proposalId);

  // Mostrar loading enquanto carrega ou enquanto não encontrou a proposta
  if (isLoading || (!proposal && proposals === undefined)) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Só mostra "não encontrada" depois de carregar e realmente não existir
  if (!proposal && proposals) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão Voltar */}
      <div className="-mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 -ml-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Proposta - {proposal.proposalNumber.replace(/^PROP-/, '')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {proposal.tipoPessoa === 'fisica' ? proposal.nome : proposal.razaoSocial} - {proposal.brandName} {proposal.modelName} {proposal.modelYear && typeof proposal.modelYear === 'string' && proposal.modelYear.includes('-') ? proposal.modelYear.split('-')[0] : proposal.modelYear}
        </p>
      </div>

      {/* Layout Responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Container 1: Relatório */}
        <div className="order-1">
          <ProposalReport proposal={proposal} />
        </div>

        {/* Container 2: Timeline */}
        <div className="order-2">
          <ProposalTimeline proposalId={proposalId} />
        </div>
      </div>
    </div>
  );
}
