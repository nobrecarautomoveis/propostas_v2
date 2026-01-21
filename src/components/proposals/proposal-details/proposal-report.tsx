/**
 * Container 1: Relatório de Conferência da Proposta
 * 
 * Exibe todos os dados da proposta organizados em seções
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProposalMutations } from '@/hooks/use-proposals';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { 
  FileText, 
  Car, 
  User, 
  Building2, 
  DollarSign, 
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import type { ProposalCamelCase } from '@/lib/supabase/types';

interface ProposalReportProps {
  proposal: ProposalCamelCase & { createdBy?: { name: string; email: string } };
}

// Função auxiliar para formatar CPF
const formatCPF = (cpf: string | null | undefined): string => {
  if (!cpf) return '-';
  const numbers = cpf.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Função auxiliar para formatar CNPJ
const formatCNPJ = (cnpj: string | null | undefined): string => {
  if (!cnpj) return '-';
  const numbers = cnpj.replace(/\D/g, '');
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// Função auxiliar para formatar telefone
const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '-';
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

// Função auxiliar para formatar valor monetário
const formatCurrency = (value: number | null | undefined): string => {
  if (!value) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Função auxiliar para formatar ano
const formatYear = (year: string | number | null | undefined): string => {
  if (!year) return '-';
  const yearStr = String(year);
  // Se contém "-", pegar apenas a primeira parte (ex: "2018-5" -> "2018")
  if (yearStr.includes('-')) {
    return yearStr.split('-')[0];
  }
  return yearStr;
};

// Função auxiliar para formatar data no padrão dd/mm/yyyy
const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  
  // Se já está no formato dd/mm/yyyy, retorna como está
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    return date;
  }
  
  // Se está no formato yyyy-mm-dd (ISO), converte diretamente sem timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }
  
  // Para outros formatos (timestamp com hora), usa date-fns
  try {
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      return format(dateObj, 'dd/MM/yyyy');
    }
  } catch (e) {
    // Se falhar, retorna o valor original
  }
  
  return date;
};

// Função auxiliar para campo de dados
const DataField = ({ label, value }: { label: string; value: string | number | boolean | null | undefined }) => {
  let displayValue: string;

  if (value === null || value === undefined || value === '') {
    displayValue = '-';
  } else if (typeof value === 'boolean') {
    displayValue = value ? 'Sim' : 'Não';
  } else {
    displayValue = String(value);
  }

  return (
    <div className="flex flex-col space-y-1">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-sm font-medium">{displayValue}</span>
    </div>
  );
};

export function ProposalReport({ proposal }: ProposalReportProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { updateProposal, updateBankAnalysis } = useProposalMutations();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updatingBank, setUpdatingBank] = useState<string | null>(null);

  const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
    "Em Análise": "secondary",
    "Aprovada": "default",
    "Recusada": "destructive",
    "Digitando": "outline" as any,
    "Efetivada": "default" as any,
    "Devolvida": "default" as any,
    "Reanalise": "default" as any,
  };

  const getStatusClassName = (status: string) => {
    if (status === 'Em Análise') return 'bg-orange-500 hover:bg-orange-600 text-white';
    if (status === 'Aprovada') return 'bg-blue-500 hover:bg-blue-600 text-white';
    if (status === 'Efetivada') return 'bg-green-600 hover:bg-green-700 text-white';
    if (status === 'Recusada') return 'text-white';
    if (status === 'Devolvida') return 'bg-yellow-500 hover:bg-yellow-600 text-white';
    if (status === 'Reanalise') return 'bg-purple-500 hover:bg-purple-600 text-white';
    return '';
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentUser?.id || !proposal.id) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingStatus(true);

    try {
      await updateProposal(proposal.id, { status: newStatus });
      
      toast({
        title: "Status Atualizado",
        description: `O status foi alterado para "${newStatus}".`
      });

      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleBankToggle = async (bankKey: string, currentValue: boolean | null | undefined) => {
    if (!currentUser?.id || !proposal.id) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a análise bancária.",
        variant: "destructive"
      });
      return;
    }

    setUpdatingBank(bankKey);

    try {
      const newValue = !currentValue;
      
      await updateBankAnalysis(proposal.id, currentUser.id, {
        [bankKey]: newValue
      });
      
      toast({
        title: "Análise Atualizada",
        description: `Banco ${newValue ? 'ativado' : 'desativado'} com sucesso.`
      });

      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar banco:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o banco.",
        variant: "destructive"
      });
    } finally {
      setUpdatingBank(null);
    }
  };

  // Mapear nomes de bancos
  const banks = [
    { key: 'bancoBv', label: 'BV' },
    { key: 'bancoSantander', label: 'Santander' },
    { key: 'bancoPan', label: 'PAN' },
    { key: 'bancoBradesco', label: 'Bradesco' },
    { key: 'bancoC6', label: 'C6' },
    { key: 'bancoItau', label: 'Itaú' },
    { key: 'bancoCash', label: 'Cash' },
    { key: 'bancoKunna', label: 'Kunna' },
    { key: 'bancoViaCerta', label: 'ViaCerta' },
    { key: 'bancoOmni', label: 'Omni' },
    { key: 'bancoDaycoval', label: 'Daycoval' },
    { key: 'bancoSim', label: 'Sim' },
    { key: 'bancoCreditas', label: 'Creditas' },
    { key: 'bancoCrefaz', label: 'Crefaz' },
    { key: 'bancoSimpala', label: 'Simpala' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Informações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['info', 'veiculo', 'cliente', 'financeiro', 'bancos']} className="space-y-2">
          
          {/* Informações Gerais */}
          <AccordionItem value="info" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-semibold">Informações Gerais</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <DataField label="Número da Proposta" value={proposal.proposalNumber} />
                <DataField 
                  label="Data de Criação" 
                  value={formatDate(proposal.dateAdded)} 
                />
                <DataField label="Vendedor" value={proposal.createdBy?.name} />
                <div className="flex flex-col space-y-1">
                  <span className="text-xs text-muted-foreground font-medium">Status</span>
                  <div className="flex items-center gap-2">
                    {isUpdatingStatus ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Atualizando...</span>
                      </div>
                    ) : (
                      <Select 
                        value={proposal.status} 
                        onValueChange={handleStatusChange}
                        disabled={isUpdatingStatus}
                      >
                        <SelectTrigger className="w-fit h-7 text-sm">
                          <SelectValue>
                            <Badge 
                              variant={statusVariant[proposal.status] || 'outline'} 
                              className={`cursor-pointer ${getStatusClassName(proposal.status)}`}
                            >
                              {proposal.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Digitando">
                            <Badge variant="outline">Digitando</Badge>
                          </SelectItem>
                          <SelectItem value="Em Análise">
                            <Badge variant="secondary" className="bg-orange-500 hover:bg-orange-600 text-white">Em Análise</Badge>
                          </SelectItem>
                          <SelectItem value="Aprovada">
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">Aprovada</Badge>
                          </SelectItem>
                          <SelectItem value="Recusada">
                            <Badge variant="destructive" className="text-white">Recusada</Badge>
                          </SelectItem>
                          <SelectItem value="Devolvida">
                            <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-white">Devolvida</Badge>
                          </SelectItem>
                          <SelectItem value="Reanalise">
                            <Badge variant="default" className="bg-purple-500 hover:bg-purple-600 text-white">Reanálise</Badge>
                          </SelectItem>
                          <SelectItem value="Efetivada">
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">Efetivada</Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <DataField 
                  label="Tipo de Proposta" 
                  value={proposal.proposalType === 'financing' ? 'Financiamento' : 'Refinanciamento'} 
                />
                <DataField label="Tipo de Pessoa" value={proposal.tipoPessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Dados do Veículo */}
          <AccordionItem value="veiculo" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                <span className="font-semibold">Dados do Veículo</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <DataField label="Marca" value={proposal.brandName || proposal.brand} />
                <DataField label="Modelo" value={proposal.modelName || proposal.model} />
                <DataField label="Ano Modelo" value={formatYear(proposal.modelYear)} />
                <DataField label="Ano Fabricação" value={formatYear(proposal.manufactureYear)} />
                <DataField label="Placa" value={proposal.plate} />
                <DataField label="Código FIPE" value={proposal.fipeCode} />
                <DataField 
                  label="Condição" 
                  value={proposal.vehicleCondition === 'new' ? 'Novo' : 'Usado'} 
                />
                <DataField 
                  label="Combustível" 
                  value={proposal.fuel === 'flex' ? 'Flex' : proposal.fuel === 'gasoline' ? 'Gasolina' : proposal.fuel === 'diesel' ? 'Diesel' : proposal.fuel === 'electric' ? 'Elétrico' : proposal.fuel === 'hybrid' ? 'Híbrido' : proposal.fuel} 
                />
                <DataField 
                  label="Transmissão" 
                  value={proposal.transmission === 'automatic' ? 'Automática' : proposal.transmission === 'manual' ? 'Manual' : proposal.transmission === 'cvt' ? 'CVT' : proposal.transmission} 
                />
                <DataField label="Cor" value={proposal.color} />
                <DataField label="Possui CNH?" value={proposal.possuiCnh} />
                <DataField label="Com Financiamento Ativo?" value={proposal.isFinanced} />
                <DataField label="Veículo de Leilão?" value={proposal.veiculoLeilao} />
                <DataField label="Estrangeiro?" value={proposal.estrangeiro} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Dados do Cliente */}
          <AccordionItem value="cliente" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                {proposal.tipoPessoa === 'fisica' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                <span className="font-semibold">
                  {proposal.tipoPessoa === 'fisica' ? 'Dados do Cliente (PF)' : 'Dados da Empresa (PJ)'}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              {proposal.tipoPessoa === 'fisica' ? (
                <div className="grid grid-cols-2 gap-4">
                  <DataField label="Nome Completo" value={proposal.nome} />
                  <DataField label="CPF" value={formatCPF(proposal.cpfPF)} />
                  <DataField label="Data de Nascimento" value={formatDate(proposal.dataNascimento)} />
                  <DataField label="Sexo" value={proposal.sexo} />
                  <DataField label="RG" value={proposal.rg} />
                  <DataField label="Data Emissão RG" value={formatDate(proposal.dataEmissaoRg)} />
                  <DataField label="Órgão Expedidor" value={proposal.orgaoExpedidor} />
                  <DataField label="Naturalidade" value={proposal.naturalidade} />
                  <DataField label="Estado Civil" value={proposal.estadoCivil} />
                  <DataField label="Nome da Mãe" value={proposal.nomeMae} />
                  <DataField label="Nome do Pai" value={proposal.nomePai} />
                  <DataField label="Email" value={proposal.emailPF} />
                  <DataField label="Telefone Principal" value={formatPhone(proposal.telefonePessoalPF)} />
                  <DataField label="Telefone Referência" value={formatPhone(proposal.telefoneReferenciaPF)} />
                  <DataField label="CEP" value={proposal.cepPF} />
                  <div className="col-span-2">
                    <DataField label="Endereço" value={proposal.enderecoPF} />
                  </div>
                  <DataField label="Número" value={proposal.numeroPF} />
                  <DataField label="Referência" value={proposal.referenciaPF} />
                  <DataField label="Empresa" value={proposal.empresa} />
                  <DataField label="Cargo" value={proposal.cargo} />
                  <DataField label="Natureza da Ocupação" value={proposal.naturezaOcupacao} />
                  {proposal.observacoesPF && (
                    <div className="col-span-2">
                      <DataField label="Observações" value={proposal.observacoesPF} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <DataField label="Razão Social" value={proposal.razaoSocial} />
                  <DataField label="Nome Fantasia" value={proposal.nomeFantasia} />
                  <DataField label="CNPJ" value={formatCNPJ(proposal.cnpjPJ)} />
                  <DataField label="Email" value={proposal.emailPJ} />
                  <DataField label="Telefone Comercial" value={formatPhone(proposal.telefonePessoalPJ)} />
                  <DataField label="Telefone Referência" value={formatPhone(proposal.telefoneReferenciaPJ)} />
                  <DataField label="CEP" value={proposal.cepPJ} />
                  <div className="col-span-2">
                    <DataField label="Endereço" value={proposal.enderecoPJ} />
                  </div>
                  <DataField label="Número" value={proposal.numeroPJ} />
                  <DataField label="Referência" value={proposal.referenciaPJ} />
                  {proposal.observacoesPJ && (
                    <div className="col-span-2">
                      <DataField label="Observações" value={proposal.observacoesPJ} />
                    </div>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Informações Financeiras */}
          <AccordionItem value="financeiro" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold">Informações Financeiras</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <DataField label="Valor do Veículo" value={formatCurrency(proposal.value)} />
                <DataField label="Valor a Financiar" value={proposal.valorFinanciar} />
                <DataField label="Estado (UF)" value={proposal.licensingLocation} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Análise Bancária */}
          <AccordionItem value="bancos" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="font-semibold">Análise Bancária</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {banks.map(bank => {
                  const status = (proposal as any)[bank.key];
                  const isActive = status === true;
                  const isLoading = updatingBank === bank.key;
                  
                  return (
                    <Button
                      key={bank.key}
                      variant="outline"
                      className={`flex items-center justify-between p-3 h-auto transition-all ${
                        isActive 
                          ? 'bg-green-50 border-green-500 hover:bg-green-100' 
                          : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                      } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                      onClick={() => handleBankToggle(bank.key, status)}
                      disabled={isLoading || updatingBank !== null}
                    >
                      <span className={`text-sm font-medium ${isActive ? 'text-green-700' : 'text-gray-600'}`}>
                        {bank.label}
                      </span>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </CardContent>
    </Card>
  );
}
