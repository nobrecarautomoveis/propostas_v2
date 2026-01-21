'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProposalForm, ProposalFormData } from './proposal-form';
import { ProposalKPICards } from './proposal-kpi-cards';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useProposals, useProposalMutations } from '@/hooks/use-proposals';
import { useUsers } from '@/hooks/use-users';
import type { ProposalWithUser } from '@/lib/supabase';

type Proposal = ProposalFormData & {
  id: string;
  proposalNumber: string;
  dateAdded: string;
  salespersonId?: string;
  brandName?: string | null;
  modelName?: string | null;
  vehicleType?: string;
  proposalType?: string;
  tipoPessoa?: string | null;
  razaoSocial?: string | null;
  modelYear?: string | null;
  valorFinanciar?: string | null;
  // Aliases para compatibilidade
  _id?: string;
  totalValue?: number;
  createdBy?: { id: string; name: string; email: string } | null;
};

// Mapeamento de status para variantes de badge
const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "Em Análise": "secondary",
  "Aprovada": "default",
  "Recusada": "destructive",
  "Efetivada": "default",
  "Devolvida": "default",
  "Reanalise": "default"
};

export function ProposalList() {
    const router = useRouter();
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
    const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);

    const [refreshKey, setRefreshKey] = useState(0);

    // Consulta as propostas do backend (só quando autenticado)
    const { proposals: rawProposals, refetch: refetchProposals } = useProposals({
      userId: currentUser?.id
    });

    // Propostas já vêm convertidas em camelCase do serviço
    const proposals = rawProposals?.map(p => ({
      ...p,
      _id: p.id,
      // Aliases para compatibilidade com código legado
      totalValue: (p as any).value,
    }));

    // Função para forçar atualização
    const forceRefresh = () => {
      setRefreshKey(prev => prev + 1);
      refetchProposals();
    };

    // Log simples para monitoramento (opcional)
    React.useEffect(() => {
      if (proposals) {
        console.log(`📊 Propostas carregadas: ${proposals.length}`);
      }
    }, [proposals]);

    // Buscar usuários
    const { users: rawUsers } = useUsers({ requesterId: currentUser?.id });

    // Mapear usuários para formato compatível
    const users = rawUsers?.map(u => ({
      ...u,
      _id: u.id,
    })) || (currentUser ? [
      { _id: currentUser.id, id: currentUser.id, name: currentUser.name, email: currentUser.email, role: currentUser.role }
    ] : []);

    // Mutations para criar, atualizar e excluir propostas
    const {
      createProposal: createProposalMutation,
      updateProposal: updateProposalMutation,
      updateBankAnalysis: updateBankAnalysisMutation,
      deleteProposal: deleteProposalMutation
    } = useProposalMutations();

    const handleFormSubmit = async (data: ProposalFormData) => {
        try {
            // Validação do usuário atual
            if (!currentUser?.id) {
                toast({
                    title: "Erro de Autenticação",
                    description: "Usuário não encontrado. Faça login novamente.",
                    variant: "destructive"
                });
                return;
            }

            console.log("🔍 Criando proposta com userId:", currentUser.id);

            if (editingProposal) {
                // Atualiza proposta existente
                const proposalId = editingProposal.id || editingProposal._id;
                console.log("🔍 Editando proposta com dados:", {
                    proposalId,
                    empresa: data.empresa,
                    cargo: data.cargo,
                    naturezaOcupacao: data.naturezaOcupacao,
                    allData: data
                });

                // Extrair campos de análise bancária
                const {
                  bancoBv,
                  bancoSantander,
                  bancoPan,
                  bancoBradesco,
                  bancoC6,
                  bancoItau,
                  bancoCash,
                  bancoKunna,
                  bancoViaCerta,
                  bancoOmni,
                  bancoDaycoval,
                  bancoSim,
                  bancoCreditas,
                  ...restData
                } = data;

                // Atualizar dados gerais
                await updateProposalMutation(proposalId!, restData);

                // Se houver dados bancários, atualize-os separadamente
                const bankData = {
                  bancoBv,
                  bancoSantander,
                  bancoPan,
                  bancoBradesco,
                  bancoC6,
                  bancoItau,
                  bancoCash,
                  bancoKunna,
                  bancoViaCerta,
                  bancoOmni,
                  bancoDaycoval,
                  bancoSim,
                  bancoCreditas,
                };

                // Verificar se tem algum campo de banco definido
                const hasBankData = Object.values(bankData).some(value => value !== undefined);

                if (hasBankData) {
                  await updateBankAnalysisMutation(proposalId!, currentUser.id, bankData);
                }

                toast({
                    title: "Proposta Atualizada",
                    description: "A proposta foi atualizada com sucesso."
                });

                // Forçar atualização da lista
                console.log("🔄 Forçando atualização da lista...");
                forceRefresh();
            } else {
                // Extrair campos de análise bancária para novas propostas
                const {
                  bancoBv,
                  bancoSantander,
                  bancoPan,
                  bancoBradesco,
                  bancoC6,
                  bancoItau,
                  bancoCash,
                  bancoKunna,
                  bancoViaCerta,
                  bancoOmni,
                  bancoDaycoval,
                  bancoSim,
                  bancoCreditas,
                  bancoCrefaz,
                  bancoSimpala,
                  ...restData
                } = data;

                // Cria nova proposta
                const result = await createProposalMutation({
                    ...restData as any,
                    userId: currentUser.id
                });

                // Se houver dados bancários, atualize-os separadamente
                const bankData = {
                  bancoBv,
                  bancoSantander,
                  bancoPan,
                  bancoBradesco,
                  bancoC6,
                  bancoItau,
                  bancoCash,
                  bancoKunna,
                  bancoViaCerta,
                  bancoOmni,
                  bancoDaycoval,
                  bancoSim,
                  bancoCreditas,
                  bancoCrefaz,
                  bancoSimpala,
                };

                // Verificar se tem algum campo de banco definido
                const hasBankData = Object.values(bankData).some(value => value !== undefined);

                if (hasBankData && result?.proposalId) {
                  await updateBankAnalysisMutation(result.proposalId, currentUser.id, bankData);
                }

                toast({
                    title: "Proposta Criada",
                    description: "A proposta foi criada com sucesso."
                });

                // Forçar atualização da lista
                forceRefresh();
            }

            setIsDialogOpen(false);
            setEditingProposal(null);

            console.log("✅ Dialog fechado, proposta editada com sucesso");
        } catch (error: any) {
            console.error('❌ Erro ao salvar proposta:', error);

            // Tratamento específico de erros
            let errorMessage = "Ocorreu um erro ao processar a proposta.";

            if (error.message?.includes("Server Error")) {
                errorMessage = "Erro no servidor. Verifique se todos os campos estão preenchidos corretamente.";
                console.log("🔍 Possível causa: userId inválido ou campos obrigatórios faltando");
            } else if (error.message?.includes("validation")) {
                errorMessage = "Dados inválidos. Verifique os campos obrigatórios.";
            } else if (error.message?.includes("user")) {
                errorMessage = "Erro de usuário. Faça login novamente.";
            }

            toast({
                title: "Erro",
                description: errorMessage,
                variant: "destructive"
            });
        }
    };

    const handleEditClick = (proposal: any) => {
        setEditingProposal(proposal);
        setIsDialogOpen(true);
    }

    // Função para converter Proposal para ProposalFormData
    const convertProposalToFormData = (proposal: Proposal): ProposalFormData => {
        const { _id, proposalNumber, dateAdded, salespersonId, ...formData } = proposal as any;

        console.log("🔍 Convertendo proposta para edição:", {
            fipeCode: formData.fipeCode,
            brand: formData.brand,
            model: formData.model,
            brandName: formData.brandName,
            modelName: formData.modelName,
            modelYear: formData.modelYear,
            proposalId: _id
        });
        return {
            ...formData,
            // Garantir que campos opcionais tenham valores padrão adequados
            plate: formData.plate || '',
            bodywork: formData.bodywork || '',
            version: formData.version || '',
            state: formData.state || '',
            valorFinanciar: formData.valorFinanciar || '',

            // Campos FIPE - preservar valores
            fipeCode: formData.fipeCode || '',
            brand: formData.brand || '',
            model: formData.model || '',
            brandName: formData.brandName || '',
            modelName: formData.modelName || '',
            modelYear: formData.modelYear || '',

            // Dados pessoais - garantir valores padrão
            cpfCnpj: formData.cpfCnpj || '',
            email: formData.email || '',
            telefonePessoal: formData.telefonePessoal || '',
            telefoneReferencia: formData.telefoneReferencia || '',
            endereco: formData.endereco || '',

            // Pessoa física
            nome: formData.nome || '',
            dataNascimento: formData.dataNascimento || '',
            sexo: formData.sexo || '',
            nomeMae: formData.nomeMae || '',
            nomePai: formData.nomePai || '',
            rg: formData.rg || '',
            dataEmissaoRg: formData.dataEmissaoRg || '',
            orgaoExpedidor: formData.orgaoExpedidor || '',
            naturalidade: formData.naturalidade || '',
            estadoCivil: formData.estadoCivil || '',
            possuiCnh: formData.possuiCnh || false,

            // Dados profissionais - Pessoa Física
            empresa: formData.empresa || '',
            cargo: formData.cargo || '',
            naturezaOcupacao: formData.naturezaOcupacao || '',

            // Pessoa jurídica
            razaoSocial: formData.razaoSocial || '',
            nomeFantasia: formData.nomeFantasia || '',

            // Tipo de pessoa
            tipoPessoa: formData.tipoPessoa || 'fisica',
        } as ProposalFormData;
    }
    
    const handleNewClick = () => {
        setEditingProposal(null);
        setIsDialogOpen(true);
    }
    
    const handleDeleteClick = (proposal: any) => {
        setProposalToDelete(proposal);
    };

    const handleDeleteConfirm = async () => {
        if (proposalToDelete && currentUser) {
            try {
                const proposalId = proposalToDelete.id || proposalToDelete._id;
                await deleteProposalMutation(proposalId!, currentUser.id);

                toast({
                    title: "Proposta Excluída",
                    description: `A proposta ${proposalToDelete.proposalNumber} foi removida com sucesso.`,
                    variant: 'destructive'
                });

                setProposalToDelete(null);
                forceRefresh();
            } catch (error) {
                toast({
                    title: "Erro",
                    description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir a proposta.",
                    variant: "destructive"
                });
            }
        }
    };

    // Gera lista de meses para o seletor
    const getMonthOptions = () => {
        const months = [
            { value: 'all', label: 'Todos os meses' },
            { value: '01', label: 'Janeiro' },
            { value: '02', label: 'Fevereiro' },
            { value: '03', label: 'Março' },
            { value: '04', label: 'Abril' },
            { value: '05', label: 'Maio' },
            { value: '06', label: 'Junho' },
            { value: '07', label: 'Julho' },
            { value: '08', label: 'Agosto' },
            { value: '09', label: 'Setembro' },
            { value: '10', label: 'Outubro' },
            { value: '11', label: 'Novembro' },
            { value: '12', label: 'Dezembro' }
        ];
        return months;
    };

    // Gera lista de anos para o seletor (ano atual + ano anterior)
    const getYearOptions = () => {
        const currentYear = new Date().getFullYear();
        const years = [
            { value: 'all', label: 'Todos os anos' },
            { value: currentYear.toString(), label: currentYear.toString() },
            { value: (currentYear - 1).toString(), label: (currentYear - 1).toString() }
        ];
        return years;
    };

    // Filtra as propostas com base na pesquisa, mês e usuário selecionados
    const filteredProposals = proposals?.filter(p => {
        const searchTerm = search.toLowerCase();
        const brandMatch = (p.brandName && p.brandName.toLowerCase().includes(searchTerm)) ||
                         (p.brand && p.brand.toLowerCase().includes(searchTerm));
        const modelMatch = (p.modelName && p.modelName.toLowerCase().includes(searchTerm)) ||
                         (p.model && p.model.toLowerCase().includes(searchTerm));
        const proposalNumberMatch = p.proposalNumber.toLowerCase().includes(searchTerm);
        
        // Busca por nome do cliente (Pessoa Física ou Jurídica)
        const clientNameMatch = (p.tipoPessoa === 'fisica' && p.nome && p.nome.toLowerCase().includes(searchTerm)) ||
                               (p.tipoPessoa === 'juridica' && p.razaoSocial && p.razaoSocial.toLowerCase().includes(searchTerm));

        const searchMatch = brandMatch || modelMatch || proposalNumberMatch || clientNameMatch;

        // Filtro por mês
        let monthMatch = true;
        if (selectedMonth !== 'all') {
            const proposalDate = new Date(p.dateAdded);
            const proposalMonth = format(proposalDate, 'MM');
            monthMatch = proposalMonth === selectedMonth;
        }

        // Filtro por ano
        let yearMatch = true;
        if (selectedYear !== 'all') {
            const proposalDate = new Date(p.dateAdded);
            const proposalYear = proposalDate.getFullYear().toString();
            yearMatch = proposalYear === selectedYear;
        }

        // Filtro por usuário
        let userMatch = true;
        if (selectedUser !== 'all') {
            userMatch = p.createdBy?.id === selectedUser;
        }

        return searchMatch && monthMatch && yearMatch && userMatch;
    }) || [];

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { setIsDialogOpen(isOpen); if (!isOpen) setEditingProposal(null); }}>
        <AlertDialog open={!!proposalToDelete} onOpenChange={(isOpen) => !isOpen && setProposalToDelete(null)}>
            {/* KPI Cards */}
            <ProposalKPICards 
              proposals={filteredProposals} 
              userRole={currentUser?.role}
            />

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <CardTitle className="mb-1">Propostas</CardTitle>
                        <CardDescription>
                          Gerencie suas propostas de financiamento e refinanciamento.
                        </CardDescription>
                    </div>
                    <Button onClick={handleNewClick}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nova Proposta
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <Input
                        placeholder="Buscar por marca, modelo, nome ou nº da proposta..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full sm:w-[300px]"
                      />
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                          <SelectValue placeholder="Selecionar ano" />
                        </SelectTrigger>
                        <SelectContent>
                          {getYearOptions().map((year) => (
                            <SelectItem key={year.value} value={year.value}>
                              {year.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder="Selecionar mês" />
                        </SelectTrigger>
                        <SelectContent>
                          {getMonthOptions().map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentUser?.role === 'ADMIN' && (
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                          <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Todos os usuários" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os usuários</SelectItem>
                            {users?.map((user) => (
                              <SelectItem key={user._id} value={user._id}>
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-medium text-primary">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  {user.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                  </div>
                </div>
                <div className="rounded-md border w-full overflow-x-auto md:overflow-x-visible">
                  <Table className="w-full">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[50px] font-semibold py-3 px-2 text-center text-xs">Nº</TableHead>
                        <TableHead className="w-[55px] font-semibold py-3 px-2 text-center text-xs">Data</TableHead>
                        <TableHead className="w-[100px] hidden xl:table-cell font-semibold py-3 px-2 text-center text-xs">Criado por</TableHead>
                        <TableHead className="w-[65px] font-semibold py-3 px-2 text-center text-xs">Tipo</TableHead>
                        <TableHead className="flex-1 min-w-[120px] font-semibold py-3 px-2 text-center text-xs">Nome</TableHead>
                        <TableHead className="flex-1 min-w-[130px] font-semibold py-3 px-2 text-center text-xs">Marca/Modelo</TableHead>
                        <TableHead className="w-[45px] hidden lg:table-cell font-semibold py-3 px-2 text-center text-xs">Ano</TableHead>
                        <TableHead className="w-[75px] hidden lg:table-cell font-semibold py-3 px-2 text-center text-xs">Valor</TableHead>
                        <TableHead className="w-[65px] font-semibold py-3 px-2 text-center text-xs">Status</TableHead>
                        <TableHead className="w-[45px] py-3 px-2 text-center"><span className="sr-only">Ações</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProposals.length > 0 ? (
                            filteredProposals.map((proposal) => (
                                <TableRow 
                                    key={proposal._id} 
                                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/propostas/${proposal.id}`)}
                                >
                                    <TableCell className="font-medium text-xs py-2 px-2 text-center">
                                        {proposal.proposalNumber.replace('PROP-', '')}
                                    </TableCell>
                                    <TableCell className="text-xs py-2 px-2 text-center">{format(new Date(proposal.dateAdded), 'dd/MM')}</TableCell>
                                    <TableCell className="hidden xl:table-cell py-2 px-2">
                                        <div className="flex items-center gap-1">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-medium text-primary">
                                                    {proposal.createdBy?.name ? proposal.createdBy.name.charAt(0).toUpperCase() : '?'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-medium truncate">
                                                    {proposal.createdBy?.name || 'Não encontrado'}
                                                </span>
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {proposal.createdBy?.email || ''}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs py-2 px-2 text-center">
                                        <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                                            {proposal.proposalType === 'financing' ? 'Financ.' : 'Refinanc.'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-2 px-2 text-center">
                                        <div className="font-medium text-xs truncate">
                                            {proposal.tipoPessoa === 'fisica'
                                                ? (proposal.nome || 'Não informado')
                                                : (proposal.razaoSocial || 'Não informado')
                                            }
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 px-2 text-center">
                                        <div className="space-y-0.5">
                                            <div className="font-medium text-xs truncate">{proposal.brandName || proposal.brand}</div>
                                            <div className="text-xs text-muted-foreground truncate">{proposal.modelName || proposal.model}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-xs py-2 px-2 text-center">
                                        {typeof proposal.modelYear === 'string' && proposal.modelYear.includes('-') ? proposal.modelYear.split('-')[0] : proposal.modelYear}
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-xs py-2 px-2 font-medium text-center">
                                        <div className="truncate">
                                            {proposal.valorFinanciar || 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 px-2 text-center">
                                        <div className="truncate">
                                            <Badge 
                                              variant={statusVariant[proposal.status] || 'outline'} 
                                              className={`text-xs ${
                                                proposal.status === 'Em Análise' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 
                                                proposal.status === 'Aprovada' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 
                                                proposal.status === 'Efetivada' ? 'bg-green-600 hover:bg-green-700 text-white' : 
                                                proposal.status === 'Recusada' ? 'text-white' :
                                                proposal.status === 'Devolvida' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                                                proposal.status === 'Reanalise' ? 'bg-purple-500 hover:bg-purple-600 text-white' :
                                                ''
                                              }`}
                                            >
                                                {proposal.status}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-2 px-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditClick(proposal);
                                                }}>Editar</DropdownMenuItem>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem 
                                                        className="text-destructive focus:bg-destructive/90 focus:text-destructive-foreground"
                                                        onSelect={(e) => e.preventDefault()}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(proposal);
                                                        }}
                                                    >
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    Nenhuma proposta encontrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente a proposta
                    <span className="font-bold"> {proposalToDelete?.id}</span>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{editingProposal ? 'Editar Proposta' : 'Nova Proposta'}</DialogTitle>
                <DialogDescription>{editingProposal ? 'Atualize os dados da proposta abaixo.' : 'Preencha os campos abaixo para criar uma nova proposta.'}</DialogDescription>
            </DialogHeader>
            <ProposalForm
                onSubmit={handleFormSubmit}
                initialData={editingProposal ? convertProposalToFormData(editingProposal) : undefined}
            />
        </DialogContent>
      </Dialog>
    </>
  );
}
