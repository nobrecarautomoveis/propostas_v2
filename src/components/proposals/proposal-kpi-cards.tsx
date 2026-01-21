'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  DollarSign,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface Proposal {
  status: string;
  valorFinanciar?: string | null;
  [key: string]: any;
}

interface ProposalKPICardsProps {
  proposals: Proposal[];
  userRole?: 'ADMIN' | 'USER';
}

// Função auxiliar para converter valor string para número
const parseValorFinanciar = (valor: string | null | undefined): number => {
  if (!valor) return 0;
  
  // Remove formatação de moeda brasileira
  const cleanValue = valor
    .replace(/\s/g, '') // Remove espaços
    .replace(/R\$/g, '') // Remove R$
    .replace(/\./g, '') // Remove pontos de milhar
    .replace(/,/g, '.'); // Substitui vírgula por ponto
  
  const num = parseFloat(cleanValue);
  return isNaN(num) ? 0 : num;
};

// Função para formatar valor em Real
const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export function ProposalKPICards({ proposals, userRole }: ProposalKPICardsProps) {
  const metrics = useMemo(() => {
    const total = proposals.length;
    const emAnalise = proposals.filter(p => p.status === 'Em Análise').length;
    const aprovadas = proposals.filter(p => p.status === 'Aprovada').length;
    const recusadas = proposals.filter(p => p.status === 'Recusada').length;
    const efetivadas = proposals.filter(p => p.status === 'Efetivada').length;
    const devolvidas = proposals.filter(p => p.status === 'Devolvida').length;
    const reanalise = proposals.filter(p => p.status === 'Reanalise').length;
    
    // Calcular valor total efetivado
    const valorTotalEfetivado = proposals
      .filter(p => p.status === 'Efetivada')
      .reduce((sum, p) => sum + parseValorFinanciar(p.valorFinanciar), 0);
    
    return {
      total,
      emAnalise,
      aprovadas,
      recusadas,
      efetivadas,
      devolvidas,
      reanalise,
      valorTotalEfetivado
    };
  }, [proposals]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      {/* Linha 1 */}
      {/* Total de Propostas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Propostas</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {userRole === 'ADMIN' ? 'Todas as propostas' : 'Suas propostas'}
          </p>
        </CardContent>
      </Card>

      {/* Em Análise */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">{metrics.emAnalise}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.total > 0 
              ? `${((metrics.emAnalise / metrics.total) * 100).toFixed(0)}% do total`
              : '0% do total'
            }
          </p>
        </CardContent>
      </Card>

      {/* Aprovadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
          <CheckCircle className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-500">{metrics.aprovadas}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.total > 0 
              ? `${((metrics.aprovadas / metrics.total) * 100).toFixed(0)}% do total`
              : '0% do total'
            }
          </p>
        </CardContent>
      </Card>

      {/* Recusadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recusadas</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{metrics.recusadas}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.total > 0 
              ? `${((metrics.recusadas / metrics.total) * 100).toFixed(0)}% do total`
              : '0% do total'
            }
          </p>
        </CardContent>
      </Card>

      {/* Linha 2 */}
      {/* Devolvidas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Devolvidas</CardTitle>
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-500">{metrics.devolvidas}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.total > 0 
              ? `${((metrics.devolvidas / metrics.total) * 100).toFixed(0)}% do total`
              : '0% do total'
            }
          </p>
        </CardContent>
      </Card>

      {/* Reanálise */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Reanálise</CardTitle>
          <RotateCcw className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-500">{metrics.reanalise}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.total > 0 
              ? `${((metrics.reanalise / metrics.total) * 100).toFixed(0)}% do total`
              : '0% do total'
            }
          </p>
        </CardContent>
      </Card>

      {/* Efetivadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Efetivadas</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{metrics.efetivadas}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.total > 0 
              ? `${((metrics.efetivadas / metrics.total) * 100).toFixed(0)}% do total`
              : '0% do total'
            }
          </p>
        </CardContent>
      </Card>

      {/* Valor Total Efetivado */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-800">Valor Efetivado</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(metrics.valorTotalEfetivado)}
          </div>
          <p className="text-xs text-green-600 mt-1">
            {metrics.efetivadas} {metrics.efetivadas === 1 ? 'proposta' : 'propostas'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
