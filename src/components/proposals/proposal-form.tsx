'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { fetchBrands, fetchModels, fetchYears, fetchVehicleDetails, fetchYearsByFipeCode, fetchVehicleDetailsByFipeCode, fetchBrandModelAndYearByFipeCode, testFipeConnection, Brand, Model, Year, VehicleDetails } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Terminal } from 'lucide-react';

// Função auxiliar para validação de RG
const validateRG = (rg: string): boolean => {
  if (!rg || rg.trim() === '') return true; // Campo opcional

  const rgLimpo = rg.replace(/\D/g, '');

  // Verifica comprimento básico
  if (rgLimpo.length < 5 || rgLimpo.length > 14) return false;

  // Verifica se não são todos dígitos iguais
  if (/^(\d)\1+$/.test(rgLimpo)) return false;

  // Validações específicas por estado
  switch (rgLimpo.length) {
    case 8: // Alguns estados como RJ
      return true; // Aceita formato básico

    case 9: // São Paulo (SP) - XX.XXX.XXX-X
      return validateRGSaoPaulo(rgLimpo);

    case 10: // Minas Gerais (MG) - XX.XXX.XXX-XX
      return validateRGMinasGerais(rgLimpo);

    case 11: // Rio de Janeiro (RJ) - XX.XXX.XXX-XX
      return true; // Aceita formato básico

    default:
      return true; // Para outros formatos, aceita se passou nas validações básicas
  }
};

// Validação específica para RG de São Paulo
const validateRGSaoPaulo = (rg: string): boolean => {
  const digitos = rg.substring(0, 8);
  const digitoVerificador = parseInt(rg.substring(8, 9));

  let soma = 0;
  for (let i = 0; i < 8; i++) {
    soma += parseInt(digitos.charAt(i)) * (2 + i);
  }

  const resto = soma % 11;
  const digitoCalculado = resto < 2 ? 0 : 11 - resto;

  return digitoCalculado === digitoVerificador;
};

// Validação específica para RG de Minas Gerais
const validateRGMinasGerais = (rg: string): boolean => {
  const digitos = rg.substring(0, 8);
  const digitosVerificadores = rg.substring(8, 10);

  let soma = 0;
  for (let i = 0; i < 8; i++) {
    soma += parseInt(digitos.charAt(i)) * (i + 1);
  }

  const primeiroDigito = soma % 11;
  const segundoDigito = (soma + primeiroDigito) % 11;

  const digitosCalculados = String(primeiroDigito).padStart(1, '0') + String(segundoDigito).padStart(1, '0');

  return digitosCalculados === digitosVerificadores;
};

// Funções de validação de CPF e CNPJ
const validarCPF = (cpf: string): boolean => {
  const cpfLimpo = cpf.replace(/\D/g, '');

  if (cpfLimpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false; // CPFs com todos os dígitos iguais

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpfLimpo.charAt(10))) return false;

  return true;
};

const validarCNPJ = (cnpj: string): boolean => {
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  if (cnpjLimpo.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false; // CNPJs com todos os dígitos iguais

  let tamanho = cnpjLimpo.length - 2;
  let numeros = cnpjLimpo.substring(0, tamanho);
  let digitos = cnpjLimpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho = tamanho + 1;
  numeros = cnpjLimpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
};

const formSchema = z.object({
  // Dados do veículo - OBRIGATÓRIOS
  proposalType: z.string({ required_error: "Selecione o tipo de proposta." }).min(1, "Selecione o tipo de proposta."),
  isFinanced: z.boolean().optional(),
  veiculoLeilao: z.boolean().optional(),
  estrangeiro: z.boolean().optional(),
  possuiCnh: z.boolean().optional(),
  vehicleCondition: z.enum(["new", "used"], { required_error: "Selecione a condição." }),
  plate: z.string().optional(), // Será validado condicionalmente no superRefine
  fipeCode: z.string().optional(), // Código FIPE para busca reversa
  vehicleType: z.string({ required_error: "Selecione o tipo de veículo." }).min(1, "Selecione o tipo de veículo."),
  brand: z.string({ required_error: "A marca é obrigatória." }).min(1, "A marca é obrigatória."),
  brandName: z.string().optional(),
  model: z.string({ required_error: "O modelo é obrigatório." }).min(1, "O modelo é obrigatório."),
  modelName: z.string().optional(),

  modelYear: z.string({ required_error: "O ano do modelo é obrigatório." }).min(1, "O ano do modelo é obrigatório."),
  manufactureYear: z.coerce.number({ required_error: "O ano de fabricação é obrigatório." }).min(1900, "Selecione o ano de fabricação."),

  fuel: z.string({ required_error: "Selecione o combustível." }).min(1, "Selecione o combustível."),
  transmission: z.string({ required_error: "Selecione a transmissão." }).min(1, "Selecione a transmissão."),
  color: z.string({ required_error: "A cor é obrigatória." }).min(2, "Mínimo 2 caracteres."),
    value: z.coerce.number({ required_error: "O valor é obrigatório." }).positive("O valor deve ser positivo."),
    valorFinanciar: z.string({ required_error: "O valor a financiar é obrigatório." }).min(1, "Informe o valor a financiar."),
    licensingLocation: z.string({ required_error: "Selecione o estado (UF)." }).min(1, "Selecione o estado (UF)."),
    status: z.enum(['Digitando', 'Em Análise', 'Aprovada', 'Recusada', 'Efetivada', 'Devolvida', 'Reanalise'], { required_error: "Selecione o status da proposta." }),  // Dados pessoais - Pessoa Física (campos específicos + comuns)
  cpfPF: z.string().optional().refine((value) => {
    if (!value) return true; // Se vazio, deixa a validação condicional cuidar
    const raw = value.replace(/\D/g, '');
    if (raw.length !== 11) return false;
    if (/^(\d)\1+$/.test(raw)) return false;
    let sum = 0;
    let rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(raw.substring(i-1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(raw.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(raw.substring(i-1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest === 10) || (rest === 11)) rest = 0;
    if (rest !== parseInt(raw.substring(10, 11))) return false;
    return true;
  }, { message: 'CPF inválido.' }),
  emailPF: z.string().optional().refine((value) => {
    if (!value) return true; // Se vazio, não valida formato
    return z.string().email().safeParse(value).success;
  }, { message: 'E-mail inválido.' }),
  telefonePessoalPF: z.string().optional(),
  telefoneReferenciaPF: z.string().optional(),
  cepPF: z.string().optional(),
  enderecoPF: z.string().optional(),
  numeroPF: z.string().optional(),
  referenciaPF: z.string().optional(),
  observacoesPF: z.string().optional().refine((value) => {
    if (!value) return true; // Campo opcional
    return value.length <= 1000;
  }, { message: 'Observações devem ter no máximo 1000 caracteres.' }),

  comentariosPF: z.string().optional().refine((value) => {
    if (!value) return true; // Campo opcional
    return value.length <= 1000;
  }, { message: 'Comentários devem ter no máximo 1000 caracteres.' }),

  // Dados pessoais - Pessoa Física (serão validados condicionalmente)
  nome: z.string().optional(),
  dataNascimento: z.string().optional(),
  sexo: z.string().optional(),
  nomeMae: z.string().optional(),
  nomePai: z.string().optional(),
  rg: z.string().optional().refine((value) => {
    if (!value) return true; // Se vazio, deixa a validação condicional cuidar
    return validateRG(value);
  }, {
    message: 'RG inválido. Verifique o formato e dígitos verificadores.'
  }),
  dataEmissaoRg: z.string().optional(),
  orgaoExpedidor: z.string().optional(),
  naturalidade: z.string().optional(),
  estadoCivil: z.string().optional(),

  // Dados profissionais - Pessoa Física
  empresa: z.string().optional(),
  cargo: z.string().optional(),
  naturezaOcupacao: z.string().optional(),

  // Dados pessoais - Pessoa Jurídica (campos específicos + comuns)
  cnpjPJ: z.string().optional().refine((value) => {
    if (!value) return true; // Se vazio, deixa a validação condicional cuidar
    const raw = value.replace(/\D/g, '');
    if (raw.length !== 14) return false;
    if (/^(\d)\1+$/.test(raw)) return false;
    let length = raw.length - 2;
    let numbers = raw.substring(0, length);
    let digits = raw.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;
    length = length + 1;
    numbers = raw.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(1))) return false;
    return true;
  }, { message: 'CNPJ inválido.' }),
  emailPJ: z.string().optional().refine((value) => {
    if (!value) return true; // Se vazio, não valida formato
    return z.string().email().safeParse(value).success;
  }, { message: 'E-mail inválido.' }),
  telefonePessoalPJ: z.string().optional(),
  telefoneReferenciaPJ: z.string().optional(),
  cepPJ: z.string().optional(),
  enderecoPJ: z.string().optional(),
  numeroPJ: z.string().optional(),
  referenciaPJ: z.string().optional(),
  observacoesPJ: z.string().optional().refine((value) => {
    if (!value) return true; // Campo opcional
    return value.length <= 1000;
  }, { message: 'Observações devem ter no máximo 1000 caracteres.' }),

  comentariosPJ: z.string().optional().refine((value) => {
    if (!value) return true; // Campo opcional
    return value.length <= 1000;
  }, { message: 'Comentários devem ter no máximo 1000 caracteres.' }),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),

  // Análise Bancária - Aprovação/Recusa por banco
  bancoBv: z.boolean().optional(),
  bancoSantander: z.boolean().optional(),
  bancoPan: z.boolean().optional(),
  bancoBradesco: z.boolean().optional(),
  bancoC6: z.boolean().optional(),
  bancoItau: z.boolean().optional(),
  bancoCash: z.boolean().optional(),
  bancoKunna: z.boolean().optional(),
  bancoViaCerta: z.boolean().optional(),
  bancoOmni: z.boolean().optional(),
  bancoDaycoval: z.boolean().optional(),
  bancoSim: z.boolean().optional(),
  bancoCreditas: z.boolean().optional(),
  bancoCrefaz: z.boolean().optional(),
  bancoSimpala: z.boolean().optional(),

  // Campo para controlar tipo de pessoa
  tipoPessoa: z.enum(['fisica', 'juridica']).default('fisica'),
}).superRefine((data, ctx) => {
    // Validações adicionais dos dados do veículo
    if (!data.proposalType || data.proposalType.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['proposalType'],
            message: 'Selecione o tipo de proposta.',
        });
    }

    if (!data.vehicleType || data.vehicleType.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['vehicleType'],
            message: 'Selecione o tipo de veículo.',
        });
    }

    if (data.isFinanced === undefined || data.isFinanced === null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['isFinanced'],
            message: 'Selecione se o veículo é financiado.',
        });
    }

    if (!data.vehicleCondition) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['vehicleCondition'],
            message: 'Selecione a condição do veículo.',
        });
    }

    if (!data.value || data.value <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['value'],
            message: 'O valor é obrigatório.',
        });
    }

    if (!data.status) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['status'],
            message: 'Selecione o status da proposta.',
        });
    }

    if (!data.brand || data.brand.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['brand'],
            message: 'A marca é obrigatória.',
        });
    }

    if (!data.model || data.model.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['model'],
            message: 'O modelo é obrigatório.',
        });
    }

    if (!data.modelYear || data.modelYear.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['modelYear'],
            message: 'O ano do modelo é obrigatório.',
        });
    }

    if (!data.manufactureYear || data.manufactureYear === 0 || data.manufactureYear < 1900) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['manufactureYear'],
            message: 'O ano de fabricação é obrigatório.',
        });
    }

    if (!data.fuel || data.fuel.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['fuel'],
            message: 'Selecione o combustível.',
        });
    }

    if (!data.transmission || data.transmission.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['transmission'],
            message: 'Selecione a transmissão.',
        });
    }

    if (!data.color || data.color.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['color'],
            message: 'A cor é obrigatória.',
        });
    }

    if (!data.value || data.value <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['value'],
            message: 'O valor é obrigatório.',
        });
    }

    if (!data.valorFinanciar || data.valorFinanciar.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['valorFinanciar'],
            message: 'O valor a financiar é obrigatório.',
        });
    }

    if (!data.licensingLocation || data.licensingLocation.trim() === '') {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['licensingLocation'],
            message: 'Selecione o estado.',
        });
    }

    // Validação da placa para veículos usados
    if (data.vehicleCondition === 'used' && (!data.plate || data.plate.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['plate'],
            message: 'A placa é obrigatória para veículos usados.',
        });
    }

    // Validações de campos comuns removidas - serão feitas condicionalmente na validação manual

    // Validações condicionais baseadas no tipo de pessoa
    if (data.tipoPessoa === 'fisica') {
        // Campos comuns obrigatórios para Pessoa Física
        if (!data.cpfPF || data.cpfPF.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cpfPF'],
                message: 'CPF é obrigatório.',
            });
        }
        if (!data.emailPF || data.emailPF.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['emailPF'],
                message: 'E-mail é obrigatório.',
            });
        }
        if (!data.telefonePessoalPF || data.telefonePessoalPF.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['telefonePessoalPF'],
                message: 'Telefone pessoal é obrigatório.',
            });
        }
        if (!data.telefoneReferenciaPF || data.telefoneReferenciaPF.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['telefoneReferenciaPF'],
                message: 'Telefone de referência é obrigatório.',
            });
        }
        if (!data.cepPF || data.cepPF.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cepPF'],
                message: 'CEP é obrigatório.',
            });
        }
        if (!data.enderecoPF || data.enderecoPF.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['enderecoPF'],
                message: 'Endereço é obrigatório.',
            });
        }

        // Campos específicos de Pessoa Física
        if (!data.nome || data.nome.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['nome'],
                message: 'Nome completo é obrigatório.',
            });
        }
        if (!data.dataNascimento || data.dataNascimento.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['dataNascimento'],
                message: 'Data de nascimento é obrigatória.',
            });
        }
        if (!data.sexo || data.sexo.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['sexo'],
                message: 'Sexo é obrigatório.',
            });
        }
        if (!data.rg || data.rg.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['rg'],
                message: 'RG é obrigatório.',
            });
        }
        if (!data.dataEmissaoRg || data.dataEmissaoRg.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['dataEmissaoRg'],
                message: 'Data de emissão do RG é obrigatória.',
            });
        }
        if (!data.orgaoExpedidor || data.orgaoExpedidor.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['orgaoExpedidor'],
                message: 'Órgão expedidor é obrigatório.',
            });
        }
        if (!data.naturalidade || data.naturalidade.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['naturalidade'],
                message: 'Naturalidade é obrigatória.',
            });
        }
        if (!data.estadoCivil || data.estadoCivil.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['estadoCivil'],
                message: 'Estado civil é obrigatório.',
            });
        }

        // Campos de Pessoa Jurídica NÃO são obrigatórios quando é Pessoa Física
        // (eles ficam opcionais e podem estar vazios)

    } else if (data.tipoPessoa === 'juridica') {
        // Campos comuns obrigatórios para Pessoa Jurídica
        if (!data.cnpjPJ || data.cnpjPJ.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cnpjPJ'],
                message: 'CNPJ é obrigatório.',
            });
        }
        if (!data.emailPJ || data.emailPJ.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['emailPJ'],
                message: 'E-mail é obrigatório.',
            });
        }
        if (!data.telefonePessoalPJ || data.telefonePessoalPJ.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['telefonePessoalPJ'],
                message: 'Telefone comercial é obrigatório.',
            });
        }
        if (!data.telefoneReferenciaPJ || data.telefoneReferenciaPJ.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['telefoneReferenciaPJ'],
                message: 'Telefone de referência é obrigatório.',
            });
        }
        if (!data.cepPJ || data.cepPJ.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['cepPJ'],
                message: 'CEP é obrigatório.',
            });
        }
        if (!data.enderecoPJ || data.enderecoPJ.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['enderecoPJ'],
                message: 'Endereço é obrigatório.',
            });
        }

        // Campos específicos de Pessoa Jurídica
        if (!data.razaoSocial || data.razaoSocial.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['razaoSocial'],
                message: 'Razão social é obrigatória.',
            });
        }
        if (!data.nomeFantasia || data.nomeFantasia.trim() === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['nomeFantasia'],
                message: 'Nome fantasia é obrigatório.',
            });
        }

        // Campos de Pessoa Física NÃO são obrigatórios quando é Pessoa Jurídica
        // (eles ficam opcionais e podem estar vazios)
    }
});

export type ProposalFormData = z.infer<typeof formSchema>;

type ProposalFormProps = {
  onSubmit: (data: ProposalFormData) => Promise<void>;
  initialData?: ProposalFormData;
};

const brazilianStates = [
  { value: 'AC', label: 'Acre' }, { value: 'AL', label: 'Alagoas' }, { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' }, { value: 'BA', label: 'Bahia' }, { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' }, { value: 'ES', label: 'Espírito Santo' }, { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' }, { value: 'MT', label: 'Mato Grosso' }, { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' }, { value: 'PA', label: 'Pará' }, { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' }, { value: 'PE', label: 'Pernambuco' }, { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' }, { value: 'RN', label: 'Rio Grande do Norte' }, { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' }, { value: 'RR', label: 'Roraima' }, { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' }, { value: 'SE', label: 'Sergipe' }, { value: 'TO', label: 'Tocantins' }
];

export function ProposalForm({ onSubmit, initialData }: ProposalFormProps) {
  const [tabValue, setTabValue] = useState<'veiculo' | 'pessoais' | 'bancaria'>('veiculo');
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currencyValue, setCurrencyValue] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState<'fisica' | 'juridica'>('fisica');
  const [isLoadingCepPF, setIsLoadingCepPF] = useState(false);
  const [isLoadingCepPJ, setIsLoadingCepPJ] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  const [showTypeChangeWarning, setShowTypeChangeWarning] = useState(false);
  const [pendingTypeChange, setPendingTypeChange] = useState<'fisica' | 'juridica' | null>(null);

  // FIPE API States
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [fipeDetails, setFipeDetails] = useState<VehicleDetails | null>(null);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isUsingFipeCode, setIsUsingFipeCode] = useState(false); // Rastrear se estamos usando código FIPE
  const [isLoadingFipe, setIsLoadingFipe] = useState(false);
  const [yearCodeFipe, setYearCodeFipe] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [fipeApiError, setFipeApiError] = useState<string | null>(null);

  // Estados para busca por código FIPE (busca reversa)
  const [isLoadingFipeCode, setIsLoadingFipeCode] = useState(false);
  const [yearsByFipeCode, setYearsByFipeCode] = useState<Year[]>([]);
  const [fipeCodeError, setFipeCodeError] = useState<string | null>(null);

  // Estados para armazenar dados FIPE originais (para reset ao fechar)
  const [originalFipeData, setOriginalFipeData] = useState<{
    brands: Brand[];
    models: Model[];
    years: Year[];
    brandName: string | null;
    modelName: string | null;
    yearCodeFipe: string | null;
  } | null>(null);

  // Estado para controlar quando usuário está editando campos FIPE ativamente
  const [isEditingFipe, setIsEditingFipe] = useState(false);

  // Estado para rastrear se estamos usando cascata (brand/model/year) ou FIPE code
  const [isUsingCascade, setIsUsingCascade] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: initialData ? {
      // Dados do veículo - com valores padrão para evitar uncontrolled input
      proposalType: initialData.proposalType || '',
      isFinanced: initialData.isFinanced ?? false,
      veiculoLeilao: initialData.veiculoLeilao ?? false,
      estrangeiro: initialData.estrangeiro ?? false,
      possuiCnh: initialData.possuiCnh ?? false,
      vehicleCondition: (initialData.vehicleCondition || 'used') as 'new' | 'used',
      plate: initialData.plate || '',
      fipeCode: initialData.fipeCode || '',
      vehicleType: initialData.vehicleType || '',
      brand: initialData.brand || '',
      brandName: initialData.brandName || '',
      model: initialData.model || '',
      modelName: initialData.modelName || '',

      modelYear: initialData.modelYear || '',
      manufactureYear: initialData.manufactureYear || undefined,

      fuel: initialData.fuel || '',
      transmission: initialData.transmission || '',
      color: initialData.color || '',
      value: initialData.value || undefined,
      valorFinanciar: initialData.valorFinanciar || '',
      licensingLocation: initialData.licensingLocation || '',
      status: (initialData.status || 'Digitando') as 'Digitando' | 'Em Análise' | 'Aprovada' | 'Recusada' | 'Efetivada' | 'Devolvida' | 'Reanalise',



      // Dados pessoais - Pessoa Física (novos campos separados)
      cpfPF: initialData.cpfPF || '',
      emailPF: initialData.emailPF || '',
      telefonePessoalPF: initialData.telefonePessoalPF || '',
      telefoneReferenciaPF: initialData.telefoneReferenciaPF || '',
      cepPF: initialData.cepPF || '',
      enderecoPF: initialData.enderecoPF || '',
      numeroPF: initialData.numeroPF || '',
      referenciaPF: initialData.referenciaPF || '',
      observacoesPF: initialData.observacoesPF || '',
      comentariosPF: initialData.comentariosPF || '',

      // Dados pessoais - Pessoa Jurídica (novos campos separados)
      cnpjPJ: initialData.cnpjPJ || '',
      emailPJ: initialData.emailPJ || '',
      telefonePessoalPJ: initialData.telefonePessoalPJ || '',
      telefoneReferenciaPJ: initialData.telefoneReferenciaPJ || '',
      cepPJ: initialData.cepPJ || '',
      enderecoPJ: initialData.enderecoPJ || '',
      numeroPJ: initialData.numeroPJ || '',
      referenciaPJ: initialData.referenciaPJ || '',
      observacoesPJ: initialData.observacoesPJ || '',
      comentariosPJ: initialData.comentariosPJ || '',

      // Dados pessoais - Pessoa Física
      nome: initialData.nome || '',
      dataNascimento: initialData.dataNascimento || '',
      sexo: initialData.sexo || '',
      nomeMae: initialData.nomeMae || '',
      nomePai: initialData.nomePai || '',
      rg: initialData.rg || '',
      dataEmissaoRg: initialData.dataEmissaoRg || '',
      orgaoExpedidor: initialData.orgaoExpedidor || '',
      naturalidade: initialData.naturalidade || '',
      estadoCivil: initialData.estadoCivil || '',
      possuiCnh: initialData.possuiCnh ?? false,

      // Dados profissionais - Pessoa Física
      empresa: initialData.empresa || '',
      cargo: initialData.cargo || '',
      naturezaOcupacao: initialData.naturezaOcupacao || '',

      // Dados pessoais - Pessoa Jurídica
      razaoSocial: initialData.razaoSocial || '',
      nomeFantasia: initialData.nomeFantasia || '',

      // Análise Bancária
      bancoBv: initialData.bancoBv ?? false,
      bancoSantander: initialData.bancoSantander ?? false,
      bancoPan: initialData.bancoPan ?? false,
      bancoBradesco: initialData.bancoBradesco ?? false,
      bancoC6: initialData.bancoC6 ?? false,
      bancoItau: initialData.bancoItau ?? false,
      bancoCash: initialData.bancoCash ?? false,
      bancoKunna: initialData.bancoKunna ?? false,
      bancoViaCerta: initialData.bancoViaCerta ?? false,
      bancoOmni: initialData.bancoOmni ?? false,
      bancoDaycoval: initialData.bancoDaycoval ?? false,
      bancoSim: initialData.bancoSim ?? false,
      bancoCreditas: initialData.bancoCreditas ?? false,
      bancoCrefaz: initialData.bancoCrefaz ?? false,
      bancoSimpala: initialData.bancoSimpala ?? false,

      // Tipo de pessoa
      tipoPessoa: initialData.tipoPessoa || 'fisica',
    } : {
      // Valores padrão para novo formulário
      proposalType: '',
      isFinanced: false,
      veiculoLeilao: false,
      estrangeiro: false,
      possuiCnh: false,
      vehicleCondition: 'used' as const,
      plate: '',
      fipeCode: '',
      vehicleType: '',
      brand: '',
      brandName: '',
      model: '',
      modelName: '',

      modelYear: '',
      manufactureYear: undefined,

      fuel: '',
      transmission: '',
      color: '',
      value: undefined,
      valorFinanciar: '',
      licensingLocation: '',
      status: 'Digitando' as const,
      cpfPF: '',
      emailPF: '',
      telefonePessoalPF: '',
      telefoneReferenciaPF: '',
      cepPF: '',
      enderecoPF: '',
      numeroPF: '',
      referenciaPF: '',
      observacoesPF: '',
      comentariosPF: '',
      cnpjPJ: '',
      emailPJ: '',
      telefonePessoalPJ: '',
      telefoneReferenciaPJ: '',
      cepPJ: '',
      enderecoPJ: '',
      numeroPJ: '',
      referenciaPJ: '',
      observacoesPJ: '',
      comentariosPJ: '',
      nome: '',
      dataNascimento: '',
      sexo: '',
      nomeMae: '',
      nomePai: '',
      rg: '',
      dataEmissaoRg: '',
      orgaoExpedidor: '',
      naturalidade: '',
      estadoCivil: '',
      possuiCnh: false,
      empresa: '',
      cargo: '',
      naturezaOcupacao: '',
      razaoSocial: '',
      nomeFantasia: '',
      bancoBv: false,
      bancoSantander: false,
      bancoPan: false,
      bancoBradesco: false,
      bancoC6: false,
      bancoItau: false,
      bancoCash: false,
      bancoKunna: false,
      bancoViaCerta: false,
      bancoOmni: false,
      bancoDaycoval: false,
      bancoSim: false,
      bancoCreditas: false,
      bancoCrefaz: false,
      bancoSimpala: false,
      tipoPessoa: 'fisica',
    },
  });



  // Função melhorada para formatar telefone (funciona com backspace)
  const formatPhone = (value: string) => {
    if (!value) return '';

    // Remove todos os caracteres não numéricos
    const raw = value.replace(/\D/g, '');

    // Se não há números, retorna string vazia
    if (raw.length === 0) return '';

    // Limita a 11 dígitos
    const limited = raw.substring(0, 11);

    // Aplica a máscara baseada no comprimento
    if (limited.length <= 2) {
      return `(${limited}`;
    } else if (limited.length <= 3) {
      return `(${limited.substring(0, 2)}) ${limited.substring(2)}`;
    } else if (limited.length <= 7) {
      return `(${limited.substring(0, 2)}) ${limited.substring(2, 3)} ${limited.substring(3)}`;
    } else {
      return `(${limited.substring(0, 2)}) ${limited.substring(2, 3)} ${limited.substring(3, 7)}-${limited.substring(7)}`;
    }
  };



  const formatCurrency = (value: number) => {
     return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  // Função para verificar se há erros de validação visíveis
  const hasValidationErrors = () => {
    const errors = form.formState.errors;
    return Object.keys(errors).length > 0;
  };

  // Função para resetar dados FIPE aos valores originais (ao fechar sem salvar)
  const resetFipeToOriginal = () => {
    if (originalFipeData && originalData) {
      // Resetar estados FIPE
      setBrands(originalFipeData.brands);
      setModels(originalFipeData.models);
      setYears(originalFipeData.years);
      setBrandName(originalFipeData.brandName);
      setModelName(originalFipeData.modelName);
      setYearCodeFipe(originalFipeData.yearCodeFipe);

      // Resetar valores do formulário para os originais
      form.setValue('brand', originalData.brand || '');
      form.setValue('model', originalData.model || '');
      form.setValue('modelYear', originalData.modelYear || '');
      form.setValue('brandName', originalData.brandName || '');
      form.setValue('modelName', originalData.modelName || '');
    }
  };

  // Função para recarregar lista completa de marcas (ao clicar no campo)
  const reloadBrandsForEditing = async () => {
    const currentVehicleType = form.getValues('vehicleType');
    if (currentVehicleType && (currentVehicleType === 'car' || currentVehicleType === 'motorcycle' || currentVehicleType === 'truck' || currentVehicleType === 'bus')) {
      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
      try {
        setIsEditingFipe(true); // Ativar modo edição
        setIsLoadingBrands(true);
        const fipeType = vehicleTypeMap[currentVehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
        const brandsData = await fetchBrands(fipeType);
        setBrands(brandsData);
        setFipeApiError(null);
      } catch (error) {
        setFipeApiError('Erro ao carregar marcas');
      } finally {
        setIsLoadingBrands(false);
      }
    }
  };

  // Função para preparar edição em modo cascata (limpa campos FIPE e carrega marcas)
  const switchToCascadeMode = async () => {
    // Guardar valores atuais para exibição
    const currentBrandName = brandName;
    const currentModelName = modelName;

    // Ativar modo edição e desativar modo FIPE
    setIsEditingFipe(true);
    setIsUsingFipeCode(false);

    // Limpar campos que dependem do código FIPE (serão preenchidos via cascata)
    form.setValue('brand', '');
    form.setValue('model', '');
    form.setValue('modelYear', '');
    form.setValue('fipeCode', '');
    lastFipeCodeRef.current = '';

    // Limpar listas
    setModels([]);
    setYears([]);
    setYearsByFipeCode([]);

    // Carregar marcas
    const currentVehicleType = form.getValues('vehicleType');
    if (currentVehicleType && (currentVehicleType === 'car' || currentVehicleType === 'motorcycle' || currentVehicleType === 'truck' || currentVehicleType === 'bus')) {
      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
      try {
        setIsLoadingBrands(true);
        const fipeType = vehicleTypeMap[currentVehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
        const brandsData = await fetchBrands(fipeType);
        setBrands(brandsData);
        setFipeApiError(null);

        // Tentar encontrar a marca pelo nome e pré-selecionar
        if (currentBrandName) {
          const matchingBrand = brandsData.find(b => b.nome.toLowerCase() === currentBrandName.toLowerCase());
          if (matchingBrand) {
            form.setValue('brand', matchingBrand.codigo);
            // Carregar modelos dessa marca
            try {
              setIsLoadingModels(true);
              const modelsData = await fetchModels(fipeType, matchingBrand.codigo);
              setModels(modelsData);

              // Tentar encontrar o modelo pelo nome e pré-selecionar
              if (currentModelName) {
                const matchingModel = modelsData.find(m => m.nome.toLowerCase() === currentModelName.toLowerCase());
                if (matchingModel) {
                  form.setValue('model', String(matchingModel.codigo));
                }
              }
            } catch (error) {
              console.error('Erro ao carregar modelos:', error);
            } finally {
              setIsLoadingModels(false);
            }
          }
        }
      } catch (error) {
        setFipeApiError('Erro ao carregar marcas');
      } finally {
        setIsLoadingBrands(false);
      }
    }
  };

  // Função para recarregar lista completa de modelos (ao clicar no campo)
  const reloadModelsForEditing = async () => {
    const currentVehicleType = form.getValues('vehicleType');
    const currentBrandCode = form.getValues('brand');

    if (currentVehicleType && currentBrandCode && (currentVehicleType === 'car' || currentVehicleType === 'motorcycle' || currentVehicleType === 'truck' || currentVehicleType === 'bus')) {
      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
      try {
        setIsEditingFipe(true); // Ativar modo edição
        setIsLoadingModels(true);
        const fipeType = vehicleTypeMap[currentVehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
        const modelsData = await fetchModels(fipeType, currentBrandCode);
        setModels(modelsData);
        setFipeApiError(null);
      } catch (error) {
        setFipeApiError('Erro ao carregar modelos');
      } finally {
        setIsLoadingModels(false);
      }
    }
  };

  // Função para recarregar lista completa de anos (ao clicar no campo)
  const reloadYearsForEditing = async () => {
    const currentVehicleType = form.getValues('vehicleType');
    const currentBrandCode = form.getValues('brand');
    const currentModelCode = form.getValues('model');

    if (currentVehicleType && currentBrandCode && currentModelCode && (currentVehicleType === 'car' || currentVehicleType === 'motorcycle' || currentVehicleType === 'truck' || currentVehicleType === 'bus')) {
      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
      try {
        setIsEditingFipe(true); // Ativar modo edição
        setIsLoadingYears(true);
        const fipeType = vehicleTypeMap[currentVehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
        const yearsData = await fetchYears(fipeType, currentBrandCode, currentModelCode);
        setYears(yearsData);
        setFipeApiError(null);
      } catch (error) {
        setFipeApiError('Erro ao carregar anos');
      } finally {
        setIsLoadingYears(false);
      }
    }
  };

  // Função para confirmar mudança de tipo de pessoa
  const confirmTypeChange = () => {
    if (!pendingTypeChange) return;

    const previousValue = form.getValues('tipoPessoa');
    form.setValue('tipoPessoa', pendingTypeChange);
    setTipoPessoa(pendingTypeChange);

    // Limpar erros de validação
    form.clearErrors();

    // LÓGICA INTELIGENTE: Limpar apenas campos do tipo anterior
    if (previousValue === 'fisica') {
      // Estava em PF, mudando para PJ: limpar apenas campos de PF
      form.setValue('cpfPF', '');
      form.setValue('emailPF', '');
      form.setValue('telefonePessoalPF', '');
      form.setValue('telefoneReferenciaPF', '');
      form.setValue('cepPF', '');
      form.setValue('enderecoPF', '');
              form.setValue('observacoesPF', '');
              form.setValue('comentariosPF', '');
              form.setValue('nome', '');
              form.setValue('dataNascimento', '');
              form.setValue('sexo', '');
              form.setValue('nomeMae', '');
              form.setValue('nomePai', '');
              form.setValue('rg', '');
              form.setValue('dataEmissaoRg', '');
              form.setValue('orgaoExpedidor', '');
              form.setValue('naturalidade', '');
              form.setValue('estadoCivil', '');
    } else if (previousValue === 'juridica') {
      // Estava em PJ, mudando para PF: limpar apenas campos de PJ
      form.setValue('cnpjPJ', '');
      form.setValue('emailPJ', '');
      form.setValue('telefonePessoalPJ', '');
      form.setValue('telefoneReferenciaPJ', '');
      form.setValue('cepPJ', '');
      form.setValue('enderecoPJ', '');
      form.setValue('observacoesPJ', '');
      form.setValue('razaoSocial', '');
      form.setValue('nomeFantasia', '');
    }



    setShowTypeChangeWarning(false);
    setPendingTypeChange(null);
  };

  // Função para cancelar mudança de tipo de pessoa
  const cancelTypeChange = () => {
    setShowTypeChangeWarning(false);
    setPendingTypeChange(null);
  };

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
      // Armazenar os dados originais para restauração posterior
      setOriginalData(initialData);

      if (initialData.value) {
        setCurrencyValue(formatCurrency(initialData.value));
      }
      setBrandName(initialData.brandName || null);
      setModelName(initialData.modelName || null);

      // Definir o tipo de pessoa baseado nos dados iniciais
      if (initialData.tipoPessoa) {
        setTipoPessoa(initialData.tipoPessoa as 'fisica' | 'juridica');


      }

      // O CEP será carregado automaticamente pelo form.reset(initialData)

      // Definir yearCodeFipe se temos modelYear nos dados iniciais
      if (initialData.modelYear) {
        setYearCodeFipe(initialData.modelYear);
        // Inicializar lastModelYearRef para evitar re-busca FIPE que sobrescreve o valor salvo
        lastModelYearRef.current = initialData.modelYear;
      }

      // Inicializar lastFipeCodeRef com o código FIPE existente para evitar re-busca
      if (initialData.fipeCode) {
        lastFipeCodeRef.current = initialData.fipeCode;
        setIsUsingFipeCode(true);

        // Carregar anos via código FIPE para exibição no Select
        const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
        const fipeType = vehicleTypeMap[initialData.vehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';

        if (fipeType) {
          // Carregar anos pelo código FIPE
          fetchYearsByFipeCode(fipeType, initialData.fipeCode)
            .then(yearsData => {
              setYears(yearsData);
              setYearsByFipeCode(yearsData);
              console.log('✅ Anos carregados via código FIPE:', yearsData.length);
            })
            .catch(err => {
              console.error('❌ Erro ao carregar anos via código FIPE:', err);
            });
        }

        // Definir modelName e outros campos a partir dos dados salvos
        if (initialData.modelName) {
          setModelName(initialData.modelName);
        }
        if (initialData.brandName) {
          setBrandName(initialData.brandName);
        }
      }

      // Carregar dados da API FIPE se necessário e armazenar como originais
      // Mas NÃO carregar se estamos usando código FIPE (pois os dados já foram carregados acima)
      if (initialData.vehicleType && initialData.brand && !initialData.fipeCode) {
        const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
        if (vehicleTypeMap[initialData.vehicleType as keyof typeof vehicleTypeMap]) {

          const loadInitialFipeData = async () => {
            try {
              // Carregar marcas
              const fipeType = vehicleTypeMap[initialData.vehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
              const brandsData = await fetchBrands(fipeType);
              setBrands(brandsData);
              const selectedBrand = brandsData.find(b => b.codigo === initialData.brand);
              if (selectedBrand) {
                setBrandName(selectedBrand.nome);
              }

              let modelsData: Model[] = [];
              let yearsData: Year[] = [];

              // Carregar modelos se temos a marca
              if (initialData.model) {
                modelsData = await fetchModels(fipeType, initialData.brand);
                setModels(modelsData);
                const selectedModel = modelsData.find(m => String(m.codigo) === initialData.model);
                if (selectedModel) {
                  setModelName(selectedModel.nome);
                }

                // Carregar anos se temos modelo
                yearsData = await fetchYears(fipeType, initialData.brand, initialData.model);
                setYears(yearsData);
              }

              // Armazenar dados FIPE originais para reset posterior
              setOriginalFipeData({
                brands: brandsData,
                models: modelsData,
                years: yearsData,
                brandName: selectedBrand?.nome || null,
                modelName: modelsData.find(m => String(m.codigo) === initialData.model)?.nome || null,
                yearCodeFipe: initialData.modelYear || null
              });

            } catch (error) {
              console.error('Erro ao carregar dados FIPE iniciais:', error);
            }
          };

          loadInitialFipeData();
        }
      } else if (initialData.vehicleType && initialData.fipeCode) {
        // Se estamos usando código FIPE, apenas carregar as marcas para o Select
        const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
        if (vehicleTypeMap[initialData.vehicleType as keyof typeof vehicleTypeMap]) {
          const loadBrandsForFipeCode = async () => {
            try {
              const fipeType = vehicleTypeMap[initialData.vehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
              const brandsData = await fetchBrands(fipeType);
              setBrands(brandsData);
            } catch (error) {
              console.error('Erro ao carregar marcas para código FIPE:', error);
            }
          };
          loadBrandsForFipeCode();
        }
      }
    }
  }, [initialData, form]);

  const vehicleType = form.watch('vehicleType');
  const brandCode = form.watch('brand');
  const modelCode = form.watch('model');
  const yearCode = form.watch('modelYear'); // Changed from manufactureYear

  // Teste de conectividade com API FIPE v2
  useEffect(() => {
    testFipeConnection();
  }, []);



  // Referência para saber se é a primeira renderização (carregamento inicial)
  const isInitialLoadRef = useRef(true);
  const previousModelYearRef = useRef<string | null>(null);

  // Limpar ano de fabricação APENAS quando o usuário muda o ano do modelo manualmente
  useEffect(() => {
    const modelYear = form.watch('modelYear');

    // Na primeira renderização ou se não mudou, não fazer nada
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      previousModelYearRef.current = modelYear;
      return;
    }

    // Se o ano do modelo mudou (usuário alterou), limpar o ano de fabricação
    if (modelYear && previousModelYearRef.current !== modelYear) {
      form.setValue('manufactureYear', 0 as any);
      previousModelYearRef.current = modelYear;
    }
  }, [form.watch('modelYear'), form]);

  // Fetch Brands
  useEffect(() => {
    // NÃO executar se usuário está editando campos FIPE ativamente
    if (isEditingFipe) return;

    if (vehicleType && (vehicleType === 'car' || vehicleType === 'motorcycle' || vehicleType === 'truck' || vehicleType === 'bus')) {
      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
      const fipeType = vehicleTypeMap[vehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
      setIsLoadingBrands(true);
      fetchBrands(fipeType)
        .then(data => {
          setBrands(data);
          setFipeApiError(null); // Limpar erro se sucesso
        })
        .catch(err => {
          console.error('❌ Erro ao buscar marcas:', err);
          setFipeApiError(err.message || 'Erro ao conectar com a API FIPE');
          toast({
            title: 'Erro FIPE',
            description: `Não foi possível buscar as marcas. ${err.message || 'Erro desconhecido'}`,
            variant: 'destructive'
          });
        })
        .finally(() => setIsLoadingBrands(false));
      
      // Só limpar os campos se não estivermos editando uma proposta existente
      if (!initialData) {
        form.setValue('brand', '');
        form.setValue('model', '');

        setModels([]);
        setYears([]);
        setFipeDetails(null);
      }
    }
  }, [vehicleType, isEditingFipe, toast]);

  // Fetch Models
  useEffect(() => {
    // Se estamos editando uma proposta com código FIPE E o usuário NÃO ativou modo cascata, não buscar
    // Isso evita chamadas desnecessárias à API quando abrimos a edição
    // Porém, se o código FIPE foi limpo (ex: usuário mudou tipo de veículo), permitir busca
    const currentFipeCode = form.getValues('fipeCode');
    if (initialData?.fipeCode && !isEditingFipe && currentFipeCode) return;

    // Verificar se o brandCode parece ser um código FIPE (contém hífen) - não é válido para buscar modelos
    if (brandCode && brandCode.includes('-')) return;

    if (brandCode && vehicleType && (vehicleType === 'car' || vehicleType === 'motorcycle' || vehicleType === 'truck' || vehicleType === 'bus')) {
      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
      const fipeType = vehicleTypeMap[vehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
      setIsLoadingModels(true);

      // Se o usuário está selecionando via cascata, resetar isUsingFipeCode e limpar código FIPE
      if (!isAutoFilledRef.current && !isFillingFromFipeCodeRef.current) {
        setIsUsingFipeCode(false);
        // Limpar código FIPE quando marca é alterada manualmente
        form.setValue('fipeCode', '');
        lastFipeCodeRef.current = '';
      }

      fetchModels(fipeType, brandCode)
        .then(data => {
          setModels(data)
          if (initialData?.model && !isEditingFipe) {
            const selectedModel = data.find(m => String(m.codigo) === initialData.model);
            if (selectedModel) {
              setModelName(selectedModel.nome);
            }
          }
        })
        .catch(err => toast({ title: 'Erro FIPE', description: 'Não foi possível buscar os modelos.', variant: 'destructive' }))
        .finally(() => setIsLoadingModels(false));
    } else {
      // Só limpar se não estivermos editando
      if (!initialData) {
        setModels([]);
        setModelName(null);
      }
    }
  }, [brandCode, vehicleType, isEditingFipe, toast]);

  // Fetch Years
  useEffect(() => {
    // Não buscar anos se:
    // 1. Estamos preenchendo via código FIPE (isFillingFromFipeCodeRef)
    // 2. O modelCode parece ser um código FIPE (contém hífen como "009105-7")
    // 3. isUsingFipeCode está true E não estamos em modo edição cascata
    const modelCodeIsFipeCode = modelCode && modelCode.includes('-');
    const brandCodeIsFipeCode = brandCode && brandCode.includes('-');

    // Permitir busca se estamos em modo edição cascata (isEditingFipe = true)
    const shouldBlockByFipeMode = isUsingFipeCode && !isEditingFipe;

    if (modelCode && brandCode && vehicleType &&
        (vehicleType === 'car' || vehicleType === 'motorcycle' || vehicleType === 'truck' || vehicleType === 'bus') &&
        !isFillingFromFipeCodeRef.current &&
        !modelCodeIsFipeCode &&
        !brandCodeIsFipeCode &&
        !shouldBlockByFipeMode) {
      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
      const fipeType = vehicleTypeMap[vehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
      setIsLoadingYears(true);
      fetchYears(fipeType, brandCode, modelCode)
        .then(data => {
          setYears(data);
          // Limpar modelYear quando modelo muda via cascata (exceto na inicialização)
          if (isEditingFipe) {
            form.setValue('modelYear', '');
          }
        })
        .catch(err => {
          console.error('❌ Erro ao buscar anos:', err);
          toast({
            title: 'Erro FIPE',
            description: `Não foi possível buscar os anos. ${err.message || 'Erro desconhecido'}`,
            variant: 'destructive'
          });
        })
        .finally(() => setIsLoadingYears(false));

      // Só limpar fipeDetails se não estivermos editando
      if (!initialData) {
        setFipeDetails(null);
      }
    }
  }, [modelCode, brandCode, vehicleType, toast, isUsingFipeCode, isEditingFipe]);

  // Fetch FIPE Details (apenas quando usando cascata, não quando usando FIPE code)
  useEffect(() => {
    // Verificar se o modelCode parece ser um código FIPE (contém hífen)
    const modelCodeIsFipeCode = modelCode && modelCode.includes('-');

    console.log('🔍 Fetch FIPE Details - yearCodeFipe:', yearCodeFipe, 'modelCode:', modelCode, 'brandCode:', brandCode, 'isUsingFipeCode:', isUsingFipeCode, 'modelCodeIsFipeCode:', modelCodeIsFipeCode);

    // Só buscar detalhes se estamos usando cascata (não FIPE code) e não estamos preenchendo via FIPE code
    if (yearCodeFipe && modelCode && brandCode && vehicleType &&
        (vehicleType === 'car' || vehicleType === 'motorcycle' || vehicleType === 'truck' || vehicleType === 'bus') &&
        !isUsingFipeCode &&
        !isFillingFromFipeCodeRef.current &&
        !modelCodeIsFipeCode) {
      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' };
      const fipeType = vehicleTypeMap[vehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';
      setIsLoadingFipe(true);
      setIsUsingCascade(true); // Marcar que estamos usando cascata

      console.log('📝 Buscando detalhes via cascata - brandCode:', brandCode, 'modelCode:', modelCode, 'yearCodeFipe:', yearCodeFipe, 'isAutoFilledRef:', isAutoFilledRef.current, 'isFillingFromFipeCodeRef:', isFillingFromFipeCodeRef.current);

      fetchVehicleDetails(fipeType, brandCode, modelCode, yearCodeFipe)
        .then(data => {
          console.log('✅ Detalhes obtidos via cascata:', data);
          setFipeDetails(data);
          // Sincronizar código FIPE quando detalhes são carregados (cascata → código)
          if (data.CodigoFipe) {
            console.log('📝 Setando fipeCode:', data.CodigoFipe);
            fipeCodeSetByCascadeRef.current = true; // Marcar que foi setado pela cascata
            form.setValue('fipeCode', data.CodigoFipe);
          }
          // Preencher automaticamente o valor do veículo com o valor FIPE
          // Sempre preencher quando:
          // 1. Não há initialData (nova proposta)
          // 2. Está em modo edição FIPE (isEditingFipe)
          // 3. O código FIPE original foi limpo (usuário mudou tipo de veículo ou está selecionando novo veículo)
          // 4. O valor atual é 0 (campo foi limpo)
          const currentValue = form.getValues('value');
          const originalFipeCodeWasCleared = initialData?.fipeCode && !form.getValues('fipeCode');
          const shouldFillValue = !initialData || isEditingFipe || originalFipeCodeWasCleared || !initialData?.fipeCode || currentValue === 0;

          if (data.Valor && shouldFillValue) {
            const numericValue = parseFloat(data.Valor.replace(/[R$\s.]/g, '').replace(',', '.'));
            if (!isNaN(numericValue)) {
              form.setValue('value', numericValue);
              setCurrencyValue(data.Valor);
            }
          }
        })
        .catch(err => {
          console.error('❌ Erro ao buscar detalhes do veículo via cascata:', err);
          // Não mostrar erro se for 400 (pode ser que o modelo não exista nesse ano)
          if (err.message && !err.message.includes('400')) {
            toast({ title: 'Erro FIPE', description: 'Não foi possível buscar os detalhes do veículo.', variant: 'destructive' });
          }
        })
        .finally(() => {
          setIsLoadingFipe(false);
          setIsUsingCascade(false);
        });
    }
  }, [yearCodeFipe, modelCode, brandCode, vehicleType, toast, form, isUsingFipeCode]);

  // Rastrear último código FIPE processado para evitar loop infinito
  const lastFipeCodeRef = useRef<string>('');

  // Flag para rastrear se o fipeCode foi setado pela cascata (não deve disparar preenchimento automático)
  const fipeCodeSetByCascadeRef = useRef<boolean>(false);

  // Rastrear último tipo de veículo para detectar mudanças
  const lastVehicleTypeRef = useRef<string>('');

  // Flag para rastrear se estamos editando uma proposta existente
  const isEditingExistingProposalRef = useRef<boolean>(!!initialData);

  // Limpar código FIPE quando tipo de veículo muda (apenas mudanças manuais, não na inicialização)
  // NOTA: Este useEffect é um backup do onChange do Select - a lógica principal está no onChange
  // para garantir que a busca de marcas aconteça ANTES de qualquer limpeza
  useEffect(() => {
    // Se é a primeira renderização, apenas atualizar a referência sem limpar
    if (!lastVehicleTypeRef.current && vehicleType) {
      lastVehicleTypeRef.current = vehicleType;
      return;
    }

    // Se o tipo de veículo mudou, apenas atualizar a referência
    // A limpeza já foi feita no onChange do Select
    if (vehicleType && vehicleType !== lastVehicleTypeRef.current) {
      console.log('🔄 useEffect: Tipo de veículo alterado para', vehicleType);
      lastVehicleTypeRef.current = vehicleType;
    }
  }, [vehicleType]);

  // Rastrear último modelo para detectar mudanças
  const lastModelCodeRef = useRef<string>('');
  // Flag para indicar se estamos na inicialização (primeiras renderizações)
  const isInitializingRef = useRef<boolean>(true);

  // Limpar código FIPE quando modelo muda (via cascata) - apenas mudanças manuais
  useEffect(() => {
    // Se estamos carregando dados iniciais, não limpar nada
    if (isInitializingRef.current) {
      if (modelCode) {
        lastModelCodeRef.current = modelCode;
      }
      return;
    }

    // Se é a primeira renderização, apenas atualizar a referência sem limpar
    if (!lastModelCodeRef.current && modelCode) {
      lastModelCodeRef.current = modelCode;
      return;
    }

    // Se o modelo mudou (manualmente pelo usuário) - apenas em modo cascata ativo
    if (modelCode && modelCode !== lastModelCodeRef.current && !isAutoFilledRef.current && isEditingFipe) {
      lastModelCodeRef.current = modelCode;
      form.setValue('fipeCode', '');
      lastFipeCodeRef.current = '';
      setIsUsingFipeCode(false);
    }
  }, [modelCode, form, isEditingFipe]);

  // Marcar fim da inicialização após um delay
  useEffect(() => {
    if (initialData) {
      const timer = setTimeout(() => {
        isInitializingRef.current = false;
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      isInitializingRef.current = false;
    }
  }, [initialData]);

  // Buscar anos por código FIPE (código → cascata)
  useEffect(() => {
    const fipeCode = form.getValues('fipeCode');
    const vehicleType = form.getValues('vehicleType');

    // Não executar se o fipeCode foi setado pela cascata
    if (fipeCodeSetByCascadeRef.current) {
      console.log('⏭️ Pulando preenchimento automático - fipeCode foi setado pela cascata');
      fipeCodeSetByCascadeRef.current = false; // Resetar flag
      return;
    }

    // Se o código FIPE foi apagado, limpar campos de cascata
    if (!fipeCode || !fipeCode.trim()) {
      if (lastFipeCodeRef.current) {
        console.log('🗑️ Código FIPE apagado - limpando campos de cascata');
        lastFipeCodeRef.current = '';
        fipeCodeSetByCascadeRef.current = false; // Resetar flag de cascata
        isAutoFilledRef.current = false; // Resetar flag de auto-preenchimento
        isFillingFromFipeCodeRef.current = false; // Resetar flag de preenchimento via FIPE
        form.setValue('brand', '');
        form.setValue('model', '');
        form.setValue('modelYear', '');
        form.setValue('brandName', '');
        form.setValue('modelName', '');
        setBrandName(null);
        setModelName(null);
        setModels([]);
        setYears([]);
        setYearsByFipeCode([]);
        setYearCodeFipe(null);
        setFipeDetails(null);
        setIsUsingFipeCode(false);
      }
      return;
    }

    // Só executar se o código FIPE mudou e tem o comprimento correto (8 caracteres com hífen)
    // Formato correto: XXXXXX-X (ex: 005340-6)
    // NÃO executar se estamos editando uma proposta existente e o código FIPE não mudou
    if (fipeCode && fipeCode.trim() && fipeCode.length === 8 && fipeCode !== lastFipeCodeRef.current && vehicleType) {
      lastFipeCodeRef.current = fipeCode;

      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' } as const;
      const mappedType = vehicleTypeMap[vehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';

      if (mappedType) {
        setIsLoadingFipeCode(true);
        setFipeCodeError(null);

        // Limpar TODOS os campos do veículo quando um novo código FIPE é inserido
        // Isso evita que o sistema tente usar dados antigos com o novo código
        form.setValue('modelYear', '');
        form.setValue('brand', '');
        form.setValue('brandName', '');
        form.setValue('model', '');
        form.setValue('modelName', '');
        form.setValue('manufactureYear', 0 as any);
        setYearCodeFipe(null);
        setBrandName(null);
        setModelName(null);
        setYears([]);
        setYearsByFipeCode([]);
        setFipeDetails(null);
        lastModelYearRef.current = '';

        // Buscar anos
        fetchYearsByFipeCode(mappedType, fipeCode)
          .then(data => {
            setYearsByFipeCode(data);
          })
          .catch(err => {
            setFipeCodeError(err.message || 'Código FIPE inválido');
            setYearsByFipeCode([]);
          });

        // Buscar marca, modelo e ano automaticamente
        fetchBrandModelAndYearByFipeCode(mappedType, fipeCode)
          .then(data => {
            isAutoFilledRef.current = true; // Marcar que o ano foi preenchido automaticamente
            isFillingFromFipeCodeRef.current = true; // Marcar que estamos preenchendo via código FIPE
            setIsUsingFipeCode(true); // Marcar que estamos usando código FIPE
            form.setValue('brand', data.brandCode);
            form.setValue('brandName', data.brandName);
            setBrandName(data.brandName); // Atualizar state também
            form.setValue('model', data.modelCode);
            form.setValue('modelName', data.modelName);
            setModelName(data.modelName); // Atualizar state também
            form.setValue('modelYear', data.yearCode);

            // Carregar anos para que o Select possa exibir o valor
            fetchYearsByFipeCode(mappedType, fipeCode)
              .then(yearsData => {
                setYears(yearsData);
              })
              .catch(err => {
                console.error('❌ Erro ao carregar anos:', err);
              });

            // Buscar detalhes do veículo incluindo o valor FIPE
            fetchVehicleDetailsByFipeCode(mappedType, fipeCode, data.yearCode)
              .then(details => {
                console.log('✅ Detalhes FIPE obtidos (auto-preenchimento):', details);
                setFipeDetails(details);
                // Preencher automaticamente o valor do veículo (sempre quando busca por código FIPE, pois o usuário está alterando ativamente)
                if (details.Valor) {
                  const numericValue = parseFloat(details.Valor.replace(/[R$\s.]/g, '').replace(',', '.'));
                  if (!isNaN(numericValue)) {
                    form.setValue('value', numericValue);
                    setCurrencyValue(details.Valor);
                  }
                }
              })
              .catch(err => {
                console.error('❌ Erro ao buscar detalhes do veículo:', err);
              });

            // Resetar as flags após um pequeno delay
            setTimeout(() => {
              isAutoFilledRef.current = false;
              isFillingFromFipeCodeRef.current = false;
            }, 100);
          })
          .catch(err => {
            console.error('❌ Erro ao buscar marca, modelo e ano por código FIPE:', err);
            setFipeCodeError(err.message || 'Código FIPE inválido');
          })
          .finally(() => setIsLoadingFipeCode(false));
      }
    } else if (!fipeCode || !fipeCode.trim()) {
      lastFipeCodeRef.current = '';
      lastModelYearRef.current = '';
      setYearsByFipeCode([]);
      setFipeCodeError(null);
    }
  }, [form.watch('fipeCode'), form.watch('vehicleType')]);

  // Rastrear último ano processado para evitar loop infinito
  const lastModelYearRef = useRef<string>('');
  const isAutoFilledRef = useRef<boolean>(false);
  const isFillingFromFipeCodeRef = useRef<boolean>(false);

  // Resetar isUsingFipeCode quando tipo de veículo muda (apenas se NÃO estamos editando uma proposta com código FIPE)
  useEffect(() => {
    // Não resetar se estamos editando e já temos código FIPE
    if (initialData?.fipeCode) {
      return;
    }
    setIsUsingFipeCode(false);
  }, [vehicleType, initialData?.fipeCode]);

  // Buscar detalhes quando ano é selecionado via código FIPE (apenas se selecionado manualmente)
  useEffect(() => {
    const fipeCode = form.getValues('fipeCode');
    const modelYear = form.getValues('modelYear');
    const vehicleType = form.getValues('vehicleType');

    console.log('🔍 Fetch Details by FIPE Code - fipeCode:', fipeCode, 'modelYear:', modelYear, 'yearsByFipeCode.length:', yearsByFipeCode.length, 'isAutoFilledRef:', isAutoFilledRef.current, 'lastModelYearRef:', lastModelYearRef.current);

    // Só executar se veio de busca por código FIPE (yearsByFipeCode não está vazio) e o ano mudou
    // E se o ano foi selecionado manualmente (não preenchido automaticamente)
    // E se o código FIPE tem o comprimento correto (8 caracteres com hífen)
    if (fipeCode && fipeCode.trim() && fipeCode.length === 8 && modelYear && modelYear !== lastModelYearRef.current && vehicleType && yearsByFipeCode.length > 0 && !isAutoFilledRef.current) {
      lastModelYearRef.current = modelYear;

      const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' } as const;
      const mappedType = vehicleTypeMap[vehicleType as keyof typeof vehicleTypeMap] as 'carros' | 'motos' | 'caminhoes';

      if (mappedType) {
        setIsLoadingFipe(true);

        fetchVehicleDetailsByFipeCode(mappedType, fipeCode, modelYear)
          .then(data => {
            setFipeDetails(data);
            // Preencher campos da cascata com os dados retornados
            form.setValue('brand', data.CodigoFipe || ''); // Usar código como identificador
            form.setValue('brandName', data.Marca);
            form.setValue('model', data.CodigoFipe || '');
            form.setValue('modelName', data.Modelo);
            // Preencher automaticamente o valor do veículo com o valor FIPE (sempre quando busca por código FIPE, pois o usuário está alterando ativamente)
            if (data.Valor) {
              const numericValue = parseFloat(data.Valor.replace(/[R$\s.]/g, '').replace(',', '.'));
              if (!isNaN(numericValue)) {
                form.setValue('value', numericValue);
                setCurrencyValue(data.Valor);
              }
            }
          })
          .catch(err => {
            console.error('❌ Erro ao buscar detalhes por código FIPE:', err);
            setFipeCodeError(err.message || 'Erro ao buscar detalhes do veículo');
            toast({ title: 'Erro FIPE', description: err.message, variant: 'destructive' });
          })
          .finally(() => setIsLoadingFipe(false));
      }
    }
  }, [form.watch('fipeCode'), form.watch('modelYear'), form.watch('vehicleType'), yearsByFipeCode, toast]);

  const generateYearOptions = () => {
    const currentYear = 2026;
    const years = [];
    for (let year = currentYear; year >= 1980; year--) {
      years.push({ value: year, label: String(year) });
    }
    return years;
  };

  // Nova função para gerar opções de ano de fabricação baseadas no ano do modelo
  const generateManufactureYearOptions = () => {
    const modelYear = form.watch('modelYear');
    if (!modelYear) return [];

    const modelYearNum = parseInt(modelYear);
    if (isNaN(modelYearNum)) return [];

    return [
      { value: modelYearNum - 1, label: String(modelYearNum - 1) }, // Ano do modelo - 1
      { value: modelYearNum, label: String(modelYearNum) }          // Mesmo ano do modelo
    ];
  };


  const handleSubmitWithValidation = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔵 handleSubmitWithValidation chamado');
    console.log('📋 Valores do formulário:', form.getValues());

    // Validação básica dos campos obrigatórios
    let hasErrors = false;
    let formatErrors = false;
    const missingFields: string[] = [];

    // Validar campos básicos do veículo
    const requiredFields = [
      { field: 'proposalType', message: 'Selecione o tipo de proposta.' },
      { field: 'vehicleType', message: 'Selecione o tipo de veículo.' },
      { field: 'isFinanced', message: 'Selecione se o veículo é financiado.' },
      { field: 'vehicleCondition', message: 'Selecione a condição do veículo.' },
      { field: 'brand', message: 'A marca é obrigatória.' },
      { field: 'model', message: 'O modelo é obrigatório.' },
      { field: 'modelYear', message: 'O ano do modelo é obrigatório.' },
      { field: 'fuel', message: 'Selecione o combustível.' },
      { field: 'transmission', message: 'Selecione a transmissão.' },
      { field: 'color', message: 'A cor é obrigatória.' },
      { field: 'value', message: 'O valor é obrigatório.' },
      { field: 'valorFinanciar', message: 'O valor a financiar é obrigatório.' },
      { field: 'licensingLocation', message: 'Selecione o estado (UF).' },
      { field: 'status', message: 'O status é obrigatório.' }
    ];

    // Verificar campos obrigatórios
    requiredFields.forEach(({ field, message }) => {
      const value = form.getValues(field as any);
      // Tratamento especial para booleanos (isFinanced pode ser false e ser válido)
      if (field === 'isFinanced') {
        if (typeof value !== 'boolean') {
          form.setError(field as any, { type: 'manual', message });
          hasErrors = true;
          missingFields.push(field);
        }
      } else if (value === undefined || value === null || value === '' || (typeof value === 'number' && value <= 0)) {
        form.setError(field as any, { type: 'manual', message });
        hasErrors = true;
        missingFields.push(field);
      }
    });

    // Validar placa para veículos usados
    const vehicleCondition = form.getValues('vehicleCondition');
    const plate = form.getValues('plate');
    if (vehicleCondition === 'used' && (!plate || plate.trim() === '')) {
      form.setError('plate', { type: 'manual', message: 'A placa é obrigatória para veículos usados.' });
      hasErrors = true;
    }

    // Validar campos de pessoa baseado no tipo
    const tipoPessoa = form.getValues('tipoPessoa');
    if (tipoPessoa === 'fisica') {
      const camposPF = [
        { field: 'cpfPF', message: 'CPF é obrigatório.' },
        { field: 'emailPF', message: 'E-mail é obrigatório.' },
        { field: 'telefonePessoalPF', message: 'Telefone pessoal é obrigatório.' },
        { field: 'telefoneReferenciaPF', message: 'Telefone de referência é obrigatório.' },
        { field: 'cepPF', message: 'CEP é obrigatório.' },
        { field: 'enderecoPF', message: 'Endereço é obrigatório.' },
        { field: 'nome', message: 'Nome completo é obrigatório.' },
        { field: 'dataNascimento', message: 'Data de nascimento é obrigatória.' },
        { field: 'sexo', message: 'Sexo é obrigatório.' },
        { field: 'nomeMae', message: 'Nome da mãe é obrigatório.' },
        { field: 'nomePai', message: 'Nome do pai é obrigatório.' },
        { field: 'rg', message: 'RG é obrigatório.' },
        { field: 'dataEmissaoRg', message: 'Data de emissão do RG é obrigatória.' },
        { field: 'orgaoExpedidor', message: 'Órgão expedidor é obrigatório.' },
        { field: 'naturalidade', message: 'Naturalidade é obrigatória.' },
        { field: 'estadoCivil', message: 'Estado civil é obrigatório.' },
        { field: 'naturezaOcupacao', message: 'Natureza da ocupação é obrigatória.' },
        { field: 'cargo', message: 'Cargo é obrigatório.' }
      ];

      camposPF.forEach(({ field, message }) => {
        const value = form.getValues(field as any);
        if (value === undefined || value === null || value === '') {
          form.setError(field as any, { type: 'manual', message });
          hasErrors = true;
          missingFields.push(field);
        }
      });

      // Verificar formato do CPF preenchido
      const cpfPF = form.getValues('cpfPF');
      if (cpfPF && cpfPF.trim() !== '') {
        const raw = cpfPF.replace(/\D/g, '');
        if (raw.length !== 11 || /^(\d)\1+$/.test(raw)) {
          form.setError('cpfPF', { type: 'manual', message: 'CPF inválido. Verifique o formato.' });
          formatErrors = true;
        } else {
          // Validar dígitos verificadores
          let sum = 0;
          let rest;
          for (let i = 1; i <= 9; i++) sum += parseInt(raw.substring(i-1, i)) * (11 - i);
          rest = (sum * 10) % 11;
          if ((rest === 10) || (rest === 11)) rest = 0;
          if (rest !== parseInt(raw.substring(9, 10))) {
            form.setError('cpfPF', { type: 'manual', message: 'CPF inválido. Dígitos verificadores incorretos.' });
            formatErrors = true;
          }
          sum = 0;
          for (let i = 1; i <= 10; i++) sum += parseInt(raw.substring(i-1, i)) * (12 - i);
          rest = (sum * 10) % 11;
          if ((rest === 10) || (rest === 11)) rest = 0;
          if (rest !== parseInt(raw.substring(10, 11))) {
            form.setError('cpfPF', { type: 'manual', message: 'CPF inválido. Dígitos verificadores incorretos.' });
            formatErrors = true;
          }
        }
      }

      // Verificar formato do RG preenchido
      const rg = form.getValues('rg');
      if (rg && rg.trim() !== '' && !validateRG(rg)) {
        form.setError('rg', { type: 'manual', message: 'RG inválido. Verifique o formato.' });
        formatErrors = true;
      }

      // Verificar formato do e-mail preenchido
      const emailPF = form.getValues('emailPF');
      if (emailPF && emailPF.trim() !== '' && !z.string().email().safeParse(emailPF).success) {
        form.setError('emailPF', { type: 'manual', message: 'E-mail inválido. Formato incorreto.' });
        formatErrors = true;
      }

    } else if (tipoPessoa === 'juridica') {
      const camposPJ = [
        { field: 'cnpjPJ', message: 'CNPJ é obrigatório.' },
        { field: 'emailPJ', message: 'E-mail é obrigatório.' },
        { field: 'telefonePessoalPJ', message: 'Telefone comercial é obrigatório.' },
        { field: 'telefoneReferenciaPJ', message: 'Telefone de referência é obrigatório.' },
        { field: 'cepPJ', message: 'CEP é obrigatório.' },
        { field: 'enderecoPJ', message: 'Endereço é obrigatório.' },
        { field: 'razaoSocial', message: 'Razão social é obrigatória.' },
        { field: 'nomeFantasia', message: 'Nome fantasia é obrigatório.' }
      ];

      camposPJ.forEach(({ field, message }) => {
        const value = form.getValues(field as any);
        if (value === undefined || value === null || value === '') {
          form.setError(field as any, { type: 'manual', message });
          hasErrors = true;
          missingFields.push(field);
        }
      });

      // Verificar formato do CNPJ preenchido
      const cnpjPJ = form.getValues('cnpjPJ');
      if (cnpjPJ && cnpjPJ.trim() !== '') {
        const raw = cnpjPJ.replace(/\D/g, '');
        
        // Verificação do tamanho
        if (raw.length !== 14) {
          form.setError('cnpjPJ', { type: 'manual', message: 'CNPJ inválido. Verifique o formato.' });
          formatErrors = true;
        } 
        // Verificação de dígitos repetidos
        else if (/^(\d)\1+$/.test(raw)) {
          form.setError('cnpjPJ', { type: 'manual', message: 'CNPJ inválido. Dígitos não podem ser todos iguais.' });
          formatErrors = true;
        } 
        // Verificação dos dígitos verificadores
        else {
          let length = raw.length - 2;
          let numbers = raw.substring(0, length);
          let digits = raw.substring(length);
          let sum = 0;
          let pos = length - 7;
          
          for (let i = length; i >= 1; i--) {
            sum += parseInt(numbers.charAt(length - i)) * pos--;
            if (pos < 2) pos = 9;
          }
          
          let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
          if (result !== parseInt(digits.charAt(0))) {
            form.setError('cnpjPJ', { type: 'manual', message: 'CNPJ inválido. Dígitos verificadores incorretos.' });
            formatErrors = true;
          } else {
            length = length + 1;
            numbers = raw.substring(0, length);
            sum = 0;
            pos = length - 7;
            
            for (let i = length; i >= 1; i--) {
              sum += parseInt(numbers.charAt(length - i)) * pos--;
              if (pos < 2) pos = 9;
            }
            
            result = sum % 11 < 2 ? 0 : 11 - sum % 11;
            if (result !== parseInt(digits.charAt(1))) {
              form.setError('cnpjPJ', { type: 'manual', message: 'CNPJ inválido. Dígitos verificadores incorretos.' });
              formatErrors = true;
            }
          }
        }
      }

      // Verificar formato do e-mail preenchido
      const emailPJ = form.getValues('emailPJ');
      if (emailPJ && emailPJ.trim() !== '' && !z.string().email().safeParse(emailPJ).success) {
        form.setError('emailPJ', { type: 'manual', message: 'E-mail inválido. Formato incorreto.' });
        formatErrors = true;
      }
    }

    if (formatErrors) {
      toast({
        title: "Campos com formato inválido",
        description: "Por favor, corrija os campos destacados com formato incorreto.",
        variant: "destructive"
      });
      return;
    }

    if (hasErrors) {
      console.log('❌ Campos faltantes:', missingFields);
      toast({
        title: "Campos obrigatórios",
        description: `Campos faltantes: ${missingFields.slice(0, 5).join(', ')}${missingFields.length > 5 ? '...' : ''}`,
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Validação passou, chamando handleFormSubmit');
    // Se passou na validação, executar o submit normal
    form.handleSubmit(handleFormSubmit)();
  };

  async function handleFormSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // Garantir que modelName e brandName sejam capturados corretamente
      const selectedModel = models.find(m => String(m.codigo) === values.model);
      const selectedBrand = brands.find(b => b.codigo === values.brand);

      const submissionValues: ProposalFormData = {
        ...values,
        brandName: selectedBrand?.nome || brandName || '',
        modelName: selectedModel?.nome || modelName || '',
      };

      console.log('💰 Valor do veículo sendo salvo:', submissionValues.value);
      console.log('📋 Dados completos do submit:', submissionValues);

      // Aguarda a conclusão da operação
      await onSubmit(submissionValues);

    } catch (error) {
      console.error('❌ Error in form submission:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar a proposta.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setCurrencyValue('');
      form.setValue('value', 0);
      return;
    }

    const numericValue = parseFloat(rawValue) / 100;
    form.setValue('value', numericValue, { shouldValidate: true });

    const formattedValue = formatCurrency(numericValue);
    setCurrencyValue(formattedValue);
  };


  return (
    <>
    <div className="w-full">
      <Tabs value={tabValue} onValueChange={(value) => setTabValue(value as 'veiculo' | 'pessoais' | 'bancaria')} className="w-full">
        <TabsList className="mb-6 w-full grid grid-cols-1 sm:grid-cols-3 h-auto sm:h-10">
          <TabsTrigger value="veiculo" className="text-xs sm:text-sm">Dados do Veículo</TabsTrigger>
          <TabsTrigger value="pessoais" className="text-xs sm:text-sm">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="bancaria" className="text-xs sm:text-sm">Análise Bancária</TabsTrigger>
        </TabsList>
      <TabsContent value="veiculo" className="px-0">
        {/* Alerta de campos obrigatórios não preenchidos */}
        {Object.keys(form.formState.errors).length > 0 && (
          <Alert variant="destructive" className="mb-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Campos obrigatórios não preenchidos</AlertTitle>
            <AlertDescription>
              <div className="mt-2">
                <p className="mb-2">Por favor, preencha os seguintes campos:</p>
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field} className="text-sm">
                      <strong>{field}:</strong> {error?.message || 'Campo obrigatório'}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de erro da API FIPE */}
        {fipeApiError && (
          <Alert variant="destructive" className="mb-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Problema com API FIPE</AlertTitle>
            <AlertDescription>
              {fipeApiError}. Você pode continuar preenchendo manualmente os dados do veículo.
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de erro do código FIPE */}
        {fipeCodeError && (
          <Alert variant="destructive" className="mb-6">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erro ao buscar por Código FIPE</AlertTitle>
            <AlertDescription>
              {fipeCodeError}. Verifique o código e tente novamente ou use a busca por cascata.
            </AlertDescription>
          </Alert>
        )}

        {/* Formulário original completo de Dados do Veículo */}
        <Form {...form}>
          <form onSubmit={handleSubmitWithValidation} className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
              <FormField control={form.control} name="proposalType" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Tipo de Proposta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="financing">Financiamento</SelectItem><SelectItem value="refinancing">Refinanciamento</SelectItem></SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}/>
               <FormField control={form.control} name="isFinanced" render={({ field }) => (
                <FormItem>
                    <FormLabel className="font-medium">Veículo c/ financiamento ativo?</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value === undefined ? '' : field.value ? 'true' : 'false'}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="false">Não</SelectItem>
                            <SelectItem value="true">Sim</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="possuiCnh" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Possui CNH?</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value === undefined ? '' : field.value ? 'true' : 'false'}>
                      <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="false">Não</SelectItem>
                          <SelectItem value="true">Sim</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="veiculoLeilao" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Veículo de Leilão?</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value === undefined ? '' : field.value ? 'true' : 'false'}>
                      <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="false">Não</SelectItem>
                          <SelectItem value="true">Sim</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="estrangeiro" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Estrangeiro?</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === 'true')} value={field.value === undefined ? '' : field.value ? 'true' : 'false'}>
                      <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="false">Não</SelectItem>
                          <SelectItem value="true">Sim</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="licensingLocation" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Estado (UF)</FormLabel>
                       <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o estado..." /></SelectTrigger></FormControl>
                           <SelectContent>
                            {brazilianStates.map(state => (
                              <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
                            ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={form.control} name="vehicleCondition" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Condição do Veículo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="new">Novo</SelectItem>
                              <SelectItem value="used">Usado</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={form.control} name="plate" render={({ field }) => (<FormItem><FormLabel className="font-medium">Placa</FormLabel><FormControl><Input placeholder="ABC-1234" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="vehicleType" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Tipo de Veículo</FormLabel>
                      <Select
                          onValueChange={(value) => {
                            field.onChange(value);

                            // Limpar todos os campos FIPE dependentes quando tipo muda
                            form.setValue('brand', '');
                            form.setValue('model', '');
                            form.setValue('modelYear', '');
                            form.setValue('brandName', '');
                            form.setValue('modelName', '');
                            form.setValue('fipeCode', '');
                            form.setValue('value', 0);

                            // Limpar estados FIPE
                            setBrands([]);
                            setModels([]);
                            setYears([]);
                            setYearsByFipeCode([]);
                            setBrandName(null);
                            setModelName(null);
                            setYearCodeFipe(null);
                            setFipeDetails(null);
                            setFipeCodeError(null);
                            setCurrencyValue('');

                            // Resetar flags
                            setIsUsingFipeCode(false);
                            setIsEditingFipe(false);
                            setIsUsingCascade(false);
                            isAutoFilledRef.current = false;
                            isFillingFromFipeCodeRef.current = false;
                            fipeCodeSetByCascadeRef.current = false;
                            lastFipeCodeRef.current = '';
                            lastModelYearRef.current = '';
                            lastModelCodeRef.current = '';
                            lastVehicleTypeRef.current = value;

                            // Carregar marcas para o novo tipo de veículo
                            const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' } as const;
                            const fipeType = vehicleTypeMap[value as keyof typeof vehicleTypeMap];
                            if (fipeType) {
                              setIsLoadingBrands(true);
                              fetchBrands(fipeType)
                                .then(data => setBrands(data))
                                .catch(err => console.error('Erro ao carregar marcas:', err))
                                .finally(() => setIsLoadingBrands(false));
                            }
                          }}
                          value={field.value}
                      >
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                              <SelectItem value="car">Carro</SelectItem>
                              <SelectItem value="motorcycle">Moto</SelectItem>
                              <SelectItem value="bus">Ônibus</SelectItem>
                              <SelectItem value="truck">Caminhão</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={form.control} name="fipeCode" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Código FIPE</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 005340-6"
                      {...field}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        field.onChange(e);

                        // Quando o usuário apaga o código FIPE, resetar todos os campos relacionados
                        if (!newValue || newValue.trim() === '') {
                          console.log('🗑️ Código FIPE apagado - resetando campos relacionados');
                          // Resetar campos do formulário
                          form.setValue('brand', '');
                          form.setValue('brandName', '');
                          form.setValue('model', '');
                          form.setValue('modelName', '');
                          form.setValue('modelYear', '');
                          form.setValue('value', 0);

                          // Resetar estados locais
                          setModels([]);
                          setYears([]);
                          setYearsByFipeCode([]);
                          setYearCodeFipe(null);
                          setBrandName(null);
                          setModelName(null);
                          setFipeDetails(null);
                          setFipeCodeError(null);
                          setCurrencyValue('R$ 0,00');

                          // Resetar flags
                          setIsUsingFipeCode(false);
                          setIsEditingFipe(false);
                          isAutoFilledRef.current = false;
                          isFillingFromFipeCodeRef.current = false;
                          fipeCodeSetByCascadeRef.current = false;
                          lastFipeCodeRef.current = '';
                          lastModelYearRef.current = '';

                          // Recarregar marcas para o tipo de veículo atual
                          const currentVehicleType = form.getValues('vehicleType');
                          if (currentVehicleType) {
                            const vehicleTypeMap = { car: 'carros', motorcycle: 'motos', truck: 'caminhoes', bus: 'caminhoes' } as const;
                            const fipeType = vehicleTypeMap[currentVehicleType as keyof typeof vehicleTypeMap];
                            if (fipeType) {
                              setIsLoadingBrands(true);
                              fetchBrands(fipeType)
                                .then(data => setBrands(data))
                                .catch(err => console.error('Erro ao recarregar marcas:', err))
                                .finally(() => setIsLoadingBrands(false));
                            }
                          }
                        } else {
                          // Quando o usuário altera o código FIPE, resetar flags e limpar erro
                          isAutoFilledRef.current = false;
                          isFillingFromFipeCodeRef.current = false;
                          setFipeCodeError(null); // Limpar erro ao começar a digitar novo código
                          lastFipeCodeRef.current = ''; // Permitir nova busca
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Marca</FormLabel>
                      {isUsingFipeCode && !isEditingFipe ? (
                        // Mostrar como texto quando usando código FIPE (com botão para editar)
                        <div
                          className="flex items-center justify-between h-10 px-3 py-2 border border-input bg-background rounded-md cursor-pointer"
                          onClick={() => switchToCascadeMode()}
                        >
                          <span className="text-sm">{brandName || 'Carregando...'}</span>
                        </div>
                      ) : (
                        // Mostrar como Select quando usando cascata tradicional
                        <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              const selectedBrand = brands.find(b => b.codigo === value);
                              setBrandName(selectedBrand ? selectedBrand.nome : null);

                              // Limpar campos dependentes quando marca muda (mas não se estamos preenchendo via código FIPE)
                              if (!isFillingFromFipeCodeRef.current) {
                                form.setValue('model', '');
                                form.setValue('modelYear', '');
                                setModels([]);
                                setYears([]);
                                setModelName(null);
                                setYearCodeFipe(null);
                              }

                              // Resetar flags para indicar que estamos usando cascata agora
                              isAutoFilledRef.current = false;
                              isFillingFromFipeCodeRef.current = false;
                              setIsUsingFipeCode(false);
                              // Manter isEditingFipe = true para permitir cascata completa
                            }}
                            value={field.value}
                            disabled={isLoadingBrands || brands.length === 0}
                            onOpenChange={(open) => {
                              // Ao abrir o select, recarregar lista completa se necessário
                              if (open && initialData && brands.length <= 1) {
                                reloadBrandsForEditing();
                              }
                            }}
                        >
                            <FormControl><SelectTrigger>
                                {isLoadingBrands && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <SelectValue placeholder="Selecione a marca..." />
                            </SelectTrigger></FormControl>
                            <SelectContent>
                                {brands.map(brand => <SelectItem key={brand.codigo} value={brand.codigo}>{brand.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={form.control} name="model" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Modelo</FormLabel>
                      {isUsingFipeCode && !isEditingFipe ? (
                        // Mostrar como texto quando usando código FIPE (com botão para editar)
                        <div
                          className="flex items-center justify-between h-10 px-3 py-2 border border-input bg-background rounded-md cursor-pointer"
                          onClick={() => switchToCascadeMode()}
                        >
                          <span className="text-sm">{modelName || 'Carregando...'}</span>
                        </div>
                      ) : (
                        // Mostrar como Select quando usando cascata tradicional
                        <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              const selectedModel = models.find(m => String(m.codigo) === value);
                              setModelName(selectedModel ? selectedModel.nome : null);

                              // Limpar campos dependentes quando modelo muda
                              form.setValue('modelYear', '');
                              setYears([]);
                              setYearCodeFipe(null);
                              setYearsByFipeCode([]);

                              // Resetar flags para indicar que estamos usando cascata agora
                              isAutoFilledRef.current = false;
                              isFillingFromFipeCodeRef.current = false;
                              setIsUsingFipeCode(false);
                              // Manter isEditingFipe = true para permitir cascata completa
                            }}
                            value={field.value}
                            disabled={isLoadingModels || models.length === 0}
                            onOpenChange={(open) => {
                              // Ao abrir o select, recarregar lista completa se necessário
                              if (open && initialData && models.length <= 1) {
                                reloadModelsForEditing();
                              }
                            }}
                        >
                            <FormControl><SelectTrigger>
                                {isLoadingModels && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <SelectValue placeholder="Selecione o modelo..." />
                            </SelectTrigger></FormControl>
                            <SelectContent>
                                {models.map(model => <SelectItem key={model.codigo} value={String(model.codigo)}>{model.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                  </FormItem>
              )}/>
              {/* Movido: Ano Modelo logo após Modelo */}
              <FormField control={form.control} name="modelYear" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Ano Modelo</FormLabel>
                      {isUsingFipeCode && !isEditingFipe ? (
                        // Mostrar como texto quando usando código FIPE (com botão para editar)
                        <div
                          className="flex items-center justify-between h-10 px-3 py-2 border border-input bg-background rounded-md cursor-pointer"
                          onClick={() => switchToCascadeMode()}
                        >
                          <span className="text-sm">{years.find(y => y.codigo === field.value)?.nome || field.value || 'Carregando...'}</span>
                        </div>
                      ) : (
                        // Mostrar como Select quando usando cascata tradicional
                        <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              setYearCodeFipe(value);

                              // Resetar flags para indicar que estamos usando cascata agora
                              isAutoFilledRef.current = false;
                              isFillingFromFipeCodeRef.current = false;
                              setIsUsingFipeCode(false);
                              // Manter isEditingFipe = true para permitir cascata completa
                            }}
                            value={field.value || ""}
                            disabled={isLoadingYears || isLoadingFipeCode || (years.length === 0 && yearsByFipeCode.length === 0)}
                            onOpenChange={(open) => {
                              // Ao abrir o select, recarregar lista completa se necessário
                              if (open && initialData && years.length <= 1 && yearsByFipeCode.length === 0) {
                                reloadYearsForEditing();
                              }
                            }}
                        >
                            <FormControl><SelectTrigger>
                                {(isLoadingYears || isLoadingFipeCode) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <SelectValue placeholder="Selecione o ano..." />
                            </SelectTrigger></FormControl>
                            <SelectContent position="popper">
                                {/* Mostrar anos da cascata ou do código FIPE */}
                                {(yearsByFipeCode.length > 0 ? yearsByFipeCode : years).map(year => (
                                  <SelectItem key={year?.codigo} value={year?.codigo}>{year?.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={form.control} name="manufactureYear" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Ano Fabricação</FormLabel>
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value ? String(field.value) : ''}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o ano..." /></SelectTrigger></FormControl>
                          <SelectContent>
                              {generateManufactureYearOptions().map(year => <SelectItem key={year.value} value={String(year.value)}>{year.label}</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}/>

              <FormField control={form.control} name="fuel" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Combustível</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="flex">Flex</SelectItem><SelectItem value="gasoline">Gasolina</SelectItem><SelectItem value="diesel">Diesel</SelectItem><SelectItem value="electric">Elétrico</SelectItem><SelectItem value="hybrid">Híbrido</SelectItem></SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}/>
               <FormField control={form.control} name="transmission" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Transmissão</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                          <SelectContent>
                              <SelectItem value="automatic">Automática</SelectItem>
                              <SelectItem value="manual">Manual</SelectItem>
                              <SelectItem value="cvt">CVT</SelectItem>
                              <SelectItem value="automated">Automatizada</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={form.control} name="color" render={({ field }) => (<FormItem><FormLabel className="font-medium">Cor</FormLabel><FormControl><Input placeholder="Ex: Preto" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="value" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Valor do Veículo</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={currencyValue}
                      onChange={handleCurrencyChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              {/* Novo campo: Valor a Financiar */}
              <FormField control={form.control} name="valorFinanciar" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Valor a Financiar</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="R$ 0,00"
                      value={field.value || ''}
                      onChange={e => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        if (!rawValue) {
                          field.onChange('');
                          return;
                        }
                        const numericValue = parseFloat(rawValue) / 100;
                        const formattedValue = new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(numericValue);
                        field.onChange(formattedValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
              {/* Status da Proposta */}
              <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                      <FormLabel className="font-medium">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Digitando">Digitando</SelectItem>
                            <SelectItem value="Em Análise">Em Análise</SelectItem>
                            <SelectItem value="Aprovada">Aprovada</SelectItem>
                            <SelectItem value="Recusada">Recusada</SelectItem>
                            <SelectItem value="Devolvida">Devolvida</SelectItem>
                            <SelectItem value="Reanalise">Reanálise</SelectItem>
                            <SelectItem value="Efetivada">Efetivada</SelectItem>
                          </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
              )}/>
            </div>
            {/* O botão de submit foi removido desta aba, agora está apenas em Dados Pessoais */}
        <div className="flex flex-col sm:flex-row justify-end mt-8 gap-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent border border-gray-300 text-gray-700 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all duration-200 px-6 py-2"
            onClick={() => setTabValue('pessoais')}
          >
            <span>Avançar</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7 7 7-7-7-7"/></svg>
          </Button>
        </div>
          </form>
        </Form>
      </TabsContent>
      <TabsContent value="pessoais" className="px-0">
        {/* Formulário de Dados Pessoais com alternância Pessoa Física/Jurídica */}
        <Form {...form}>
          <form onSubmit={handleSubmitWithValidation} className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
            {/* Seletor tipo de pessoa */}
            <FormField control={form.control} name="tipoPessoa" render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel className="font-medium">Tipo de Pessoa</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(value) => {
                      const previousValue = field.value;

                      // Se estamos editando uma proposta e mudando o tipo, mostrar aviso
                      if (originalData && previousValue !== value && previousValue && originalData.tipoPessoa !== value) {
                        setPendingTypeChange(value as 'fisica' | 'juridica');
                        setShowTypeChangeWarning(true);
                        return; // Não aplicar a mudança ainda
                      }

                      // Se há erros de validação visíveis e estamos mudando o tipo, mostrar aviso
                      if (hasValidationErrors() && previousValue !== value && previousValue) {
                        setPendingTypeChange(value as 'fisica' | 'juridica');
                        setShowTypeChangeWarning(true);
                        return; // Não aplicar a mudança ainda
                      }

                      // Aplicar mudança normalmente
                      field.onChange(value);
                      setTipoPessoa(value as 'fisica' | 'juridica');

                      // Só processar mudanças se realmente houve alteração
                      if (previousValue !== value && previousValue) {

                        if (originalData && originalData.tipoPessoa === value) {
                          // Se estamos voltando para o tipo original, restaurar os dados originais
                          if (value === 'fisica') {
                            // Restaurar dados de pessoa física (apenas campos novos)
                            form.setValue('cpfPF', originalData.cpfPF || '');
                            form.setValue('emailPF', originalData.emailPF || '');
                            form.setValue('telefonePessoalPF', originalData.telefonePessoalPF || '');
                            form.setValue('telefoneReferenciaPF', originalData.telefoneReferenciaPF || '');
                            form.setValue('cepPF', originalData.cepPF || '');
                            form.setValue('enderecoPF', originalData.enderecoPF || '');
                            form.setValue('observacoesPF', originalData.observacoesPF || '');
                            form.setValue('comentariosPF', originalData.comentariosPF || '');
                            form.setValue('nome', originalData.nome || '');
                            form.setValue('dataNascimento', originalData.dataNascimento || '');
                            form.setValue('sexo', originalData.sexo || '');
                            form.setValue('nomeMae', originalData.nomeMae || '');
                            form.setValue('nomePai', originalData.nomePai || '');
                            form.setValue('rg', originalData.rg || '');
                            form.setValue('dataEmissaoRg', originalData.dataEmissaoRg || '');
                            form.setValue('orgaoExpedidor', originalData.orgaoExpedidor || '');
                            form.setValue('naturalidade', originalData.naturalidade || '');
                            form.setValue('estadoCivil', originalData.estadoCivil || '');
                            form.setValue('possuiCnh', originalData.possuiCnh || false);

                            // Limpar campos de pessoa jurídica
                            form.setValue('cnpjPJ', '');
                            form.setValue('emailPJ', '');
                            form.setValue('telefonePessoalPJ', '');
                            form.setValue('telefoneReferenciaPJ', '');
                            form.setValue('cepPJ', '');
                            form.setValue('enderecoPJ', '');
                            form.setValue('razaoSocial', '');
                            form.setValue('nomeFantasia', '');
                          } else if (value === 'juridica') {
                            // Restaurar dados de pessoa jurídica (apenas campos novos)
                            form.setValue('cnpjPJ', originalData.cnpjPJ || '');
                            form.setValue('emailPJ', originalData.emailPJ || '');
                            form.setValue('telefonePessoalPJ', originalData.telefonePessoalPJ || '');
                            form.setValue('telefoneReferenciaPJ', originalData.telefoneReferenciaPJ || '');
                            form.setValue('cepPJ', originalData.cepPJ || '');
                            form.setValue('enderecoPJ', originalData.enderecoPJ || '');
                            form.setValue('observacoesPJ', originalData.observacoesPJ || '');
                            form.setValue('comentariosPJ', originalData.comentariosPJ || '');
                            form.setValue('razaoSocial', originalData.razaoSocial || '');
                            form.setValue('nomeFantasia', originalData.nomeFantasia || '');

                            // Limpar campos de pessoa física
                            form.setValue('cpfPF', '');
                            form.setValue('emailPF', '');
                            form.setValue('telefonePessoalPF', '');
                            form.setValue('telefoneReferenciaPF', '');
                            form.setValue('cepPF', '');
                            form.setValue('enderecoPF', '');
                            form.setValue('observacoesPF', '');
                            form.setValue('nome', '');
                            form.setValue('dataNascimento', '');
                            form.setValue('sexo', '');
                            form.setValue('nomeMae', '');
                            form.setValue('nomePai', '');
                            form.setValue('rg', '');
                            form.setValue('dataEmissaoRg', '');
                            form.setValue('orgaoExpedidor', '');
                            form.setValue('naturalidade', '');
                            form.setValue('estadoCivil', '');
                          }
                        } else {
                          // LÓGICA INTELIGENTE: Limpar apenas campos do tipo que NÃO está sendo usado
                          const currentType = form.getValues('tipoPessoa');
                          const targetType = value; // valor para o qual estamos mudando

                          if (targetType === 'fisica') {
                            // Mudando para PF: limpar apenas campos de PJ, manter PF
                            form.setValue('cnpjPJ', '');
                            form.setValue('emailPJ', '');
                            form.setValue('telefonePessoalPJ', '');
                            form.setValue('telefoneReferenciaPJ', '');
                            form.setValue('cepPJ', '');
                            form.setValue('enderecoPJ', '');
              form.setValue('observacoesPJ', '');
              form.setValue('comentariosPJ', '');
              form.setValue('razaoSocial', '');
              form.setValue('nomeFantasia', '');                          } else if (targetType === 'juridica') {
                            // Mudando para PJ: limpar apenas campos de PF, manter PJ
                            form.setValue('cpfPF', '');
                            form.setValue('emailPF', '');
                            form.setValue('telefonePessoalPF', '');
                            form.setValue('telefoneReferenciaPF', '');
                            form.setValue('cepPF', '');
                            form.setValue('enderecoPF', '');
                            form.setValue('nome', '');
                            form.setValue('dataNascimento', '');
                            form.setValue('sexo', '');
                            form.setValue('nomeMae', '');
                            form.setValue('nomePai', '');
                            form.setValue('rg', '');
                            form.setValue('dataEmissaoRg', '');
                            form.setValue('orgaoExpedidor', '');
                            form.setValue('naturalidade', '');
                            form.setValue('estadoCivil', '');
                          }



                          // Limpar erros do formulário
                          form.clearErrors();
                        }
                      }
                    }}
                    className="flex space-x-6"
                  >
                    <FormItem className="flex items-center space-x-2">
                      <FormControl><RadioGroupItem value="fisica" /></FormControl>
                      <FormLabel className="font-normal">Pessoa Física</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2">
                      <FormControl><RadioGroupItem value="juridica" /></FormControl>
                      <FormLabel className="font-normal">Pessoa Jurídica</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
              {/* Campos Pessoa Física */}
              {tipoPessoa === 'fisica' && <>
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="dataNascimento" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="sexo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="nomeMae" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Mãe</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome da mãe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="nomePai" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Pai</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do pai" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </>}
              {/* Campos Pessoa Jurídica */}
              {tipoPessoa === 'juridica' && <>
                <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Razão Social</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite a razão social" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome fantasia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                {/* CNPJ logo após Nome Fantasia */}
                <FormField control={form.control} name="cnpjPJ" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">CNPJ</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o CNPJ"
                        value={field.value || ''}
                        onChange={e => {
                          let value = e.target.value;
                          // Permite apagar normalmente
                          const raw = value.replace(/\D/g, '');
                          let masked = '';
                          if (raw.length > 0) masked += raw.substring(0,2);
                          if (raw.length >= 2) masked += '.' + raw.substring(2,5);
                          if (raw.length >= 5) masked += '.' + raw.substring(5,8);
                          if (raw.length >= 8) masked += '/' + raw.substring(8,12);
                          if (raw.length >= 12) masked += '-' + raw.substring(12,14);
                          // Se o usuário está apagando, não força a máscara
                          if (value.length < (field.value?.length || 0)) {
                            field.onChange(value);
                          } else {
                            field.onChange(masked);
                          }
                        }}
                        maxLength={18}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="emailPJ" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o e-mail" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                {/* Telefones para pessoa jurídica */}
                <FormField control={form.control} name="telefonePessoalPJ" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Telefone Comercial</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 0 0000-0000"
                        value={field.value || ''}
                        onChange={e => {
                          const formatted = formatPhone(e.target.value);
                          field.onChange(formatted);
                        }}
                        maxLength={16}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="telefoneReferenciaPJ" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone de Referência</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 0 0000-0000"
                        value={field.value || ''}
                        onChange={e => {
                          const formatted = formatPhone(e.target.value);
                          field.onChange(formatted);
                        }}
                        maxLength={16}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                {/* CEP - Pessoa Jurídica */}
                <FormField control={form.control} name="cepPJ" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">CEP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o CEP"
                        maxLength={9}
                        value={field.value || ''}
                        onChange={async (e) => {
                          const cep = e.target.value.replace(/\D/g, '');
                          let maskedCep = cep;
                          if (cep.length > 5) maskedCep = cep.substring(0,5) + '-' + cep.substring(5,8);
                          form.setValue('cepPJ', maskedCep);

                          if (cep.length === 8) {
                            setIsLoadingCepPJ(true);
                            try {
                              const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                              const data = await response.json();
                              if (!data.erro) {
                                const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                                form.setValue('enderecoPJ', enderecoCompleto);
                              } else {
                                form.setValue('enderecoPJ', '');
                                toast({ title: 'CEP não encontrado', description: 'Verifique o número do CEP.', variant: 'destructive' });
                              }
                            } catch {
                              toast({ title: 'Erro ao buscar CEP', description: 'Não foi possível consultar o CEP.', variant: 'destructive' });
                            }
                            setIsLoadingCepPJ(false);
                          }
                        }}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                {/* Endereço Completo - Pessoa Jurídica */}
                <FormField control={form.control} name="enderecoPJ" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">Endereço Completo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Endereço completo"
                        value={field.value || ''}
                        onChange={field.onChange}
                        disabled={isLoadingCepPJ}
                      />
                    </FormControl>
                    {isLoadingCepPJ && <span className="text-xs text-muted-foreground">Buscando endereço...</span>}
                    <FormMessage />
                  </FormItem>
                )}/>

                {/* Número - Pessoa Jurídica */}
                <FormField control={form.control} name="numeroPJ" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o número" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>

                {/* Referência - Pessoa Jurídica */}
                <FormField control={form.control} name="referenciaPJ" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referência</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite a referência" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>


                {/* Campo de Observações em largura total - Pessoa Jurídica */}
                <FormField control={form.control} name="observacoesPJ" render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione observações específicas desta proposta..."
                        value={field.value || ''}
                        onChange={field.onChange}
                        rows={3}
                        maxLength={1000}
                        className="resize-y w-full min-h-[150px]"
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground text-right">
                      {(field.value || '').length}/1000 caracteres
                    </div>
                    <FormMessage />
                  </FormItem>
                )}/>
              </>}
              {/* Campos comuns */}
              {tipoPessoa === 'fisica' && (
                <FormField control={form.control} name="emailPF" render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o e-mail" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}/>
              )}

              {/* Telefones apenas para pessoa física */}
              {tipoPessoa === 'fisica' && <>
                <FormField control={form.control} name="telefonePessoalPF" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone Pessoal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 0 0000-0000"
                        value={field.value || ''}
                        onChange={e => {
                          const formatted = formatPhone(e.target.value);
                          field.onChange(formatted);
                        }}
                        maxLength={16}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="telefoneReferenciaPF" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone de Referência</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 0 0000-0000"
                        value={field.value || ''}
                        onChange={e => {
                          const formatted = formatPhone(e.target.value);
                          field.onChange(formatted);
                        }}
                        maxLength={16}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </>}

              {/* RG e campos relacionados apenas para física */}
              {tipoPessoa === 'fisica' && <>
                <FormField control={form.control} name="rg" render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o rg"
                        value={field.value || ''}
                        onChange={e => {
                          let value = e.target.value;
                          const raw = value.replace(/\D/g, '');
                          let masked = '';

                          // Aplica máscara flexível baseada no comprimento
                          if (raw.length > 0) {
                            masked += raw.substring(0, Math.min(2, raw.length));
                          }
                          if (raw.length >= 3) {
                            masked += '.' + raw.substring(2, Math.min(5, raw.length));
                          }
                          if (raw.length >= 6) {
                            masked += '.' + raw.substring(5, Math.min(8, raw.length));
                          }
                          if (raw.length >= 9) {
                            // Para RGs com 1 dígito verificador (SP) ou 2 dígitos (MG, etc)
                            const digitosVerificadores = raw.substring(8);
                            masked += '-' + digitosVerificadores;
                          }

                          // Se o usuário está apagando, não força a máscara
                          if (value.length < (field.value?.length || 0)) {
                            field.onChange(value);
                          } else {
                            field.onChange(masked);
                          }
                        }}
                        maxLength={15} // Aumentado para acomodar formatos maiores
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="dataEmissaoRg" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Emissão RG</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="orgaoExpedidor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Órgão Expedidor</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: SSP/SC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </>}
              {/* CPF/CNPJ sempre visível, máscara dinâmica */}
              {tipoPessoa === 'fisica' && (
                <FormField control={form.control} name="cpfPF" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium">CPF</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o cpf"
                        value={field.value || ''}
                        onChange={e => {
                          let value = e.target.value;
                          // Permite apagar normalmente
                          const raw = value.replace(/\D/g, '');
                          let masked = '';
                          if (raw.length > 0) masked += raw.substring(0,3);
                          if (raw.length >= 3) masked += '.' + raw.substring(3,6);
                          if (raw.length >= 6) masked += '.' + raw.substring(6,9);
                          if (raw.length >= 9) masked += '-' + raw.substring(9,11);
                          // Se o usuário está apagando, não força a máscara
                          if (value.length < (field.value?.length || 0)) {
                            field.onChange(value);
                          } else {
                            field.onChange(masked);
                          }
                        }}
                        maxLength={14}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              )}

              {tipoPessoa === 'fisica' && (
                <FormField control={form.control} name="naturalidade" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naturalidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tijucas - SC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
              )}/>
              )}
              {tipoPessoa === 'fisica' && (
                <>
                <FormField control={form.control} name="estadoCivil" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado Civil</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                            <SelectItem value="casado">Casado(a)</SelectItem>
                            <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                            <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                )}/>
                    {/* CEP - Pessoa Física */}
                    <FormField control={form.control} name="cepPF" render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Digite o CEP"
                            maxLength={9}
                            value={field.value || ''}
                            onChange={async (e) => {
                              const cep = e.target.value.replace(/\D/g, '');
                              let maskedCep = cep;
                              if (cep.length > 5) maskedCep = cep.substring(0,5) + '-' + cep.substring(5,8);
                              form.setValue('cepPF', maskedCep);

                              if (cep.length === 8) {
                                setIsLoadingCepPF(true);
                                try {
                                  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                                  const data = await response.json();
                                  if (!data.erro) {
                                    // Monta endereço completo
                                    const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                                    form.setValue('enderecoPF', enderecoCompleto);
                                  } else {
                                    form.setValue('enderecoPF', '');
                                    toast({ title: 'CEP não encontrado', description: 'Verifique o número do CEP.', variant: 'destructive' });
                                  }
                                } catch {
                                  toast({ title: 'Erro ao buscar CEP', description: 'Não foi possível consultar o CEP.', variant: 'destructive' });
                                }
                                setIsLoadingCepPF(false);
                              }
                            }}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>

                    {/* Endereço Completo - Pessoa Física */}
                    <FormField control={form.control} name="enderecoPF" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço Completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Endereço completo"
                            value={field.value || ''}
                            onChange={field.onChange}
                            disabled={isLoadingCepPF}
                          />
                        </FormControl>
                        {isLoadingCepPF && <span className="text-xs text-muted-foreground">Buscando endereço...</span>}
                        <FormMessage />
                      </FormItem>
                    )}/>

                    {/* Número - Pessoa Física */}
                    <FormField control={form.control} name="numeroPF" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o número" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>

                    {/* Referência - Pessoa Física */}
                    <FormField control={form.control} name="referenciaPF" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referência</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite a referência" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>

                    {/* Dados Profissionais - Pessoa Física */}
                    <div className="col-span-full">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 mt-4 sm:mt-6 border-b pb-2">
                        Dados Profissionais
                      </h3>
                    </div>

                    <FormField control={form.control} name="empresa" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o nome da empresa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>

                    <FormField control={form.control} name="naturezaOcupacao" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Natureza da Ocupação</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="assalariado">Assalariado</SelectItem>
                              <SelectItem value="autonomo">Autônomo</SelectItem>
                              <SelectItem value="empresario">Empresário</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>

                    <FormField control={form.control} name="cargo" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium">Cargo</FormLabel>
                        <FormControl>
                          <Input placeholder="Digite o cargo/função" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}/>

                    {/* Campo de Observações em largura total - Pessoa Física */}
                    <FormField control={form.control} name="observacoesPF" render={({ field }) => (
                      <FormItem className="col-span-full">
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Adicione observações específicas desta proposta..."
                            value={field.value || ''}
                            onChange={field.onChange}
                            rows={3}
                            maxLength={1000}
                            className="resize-y w-full min-h-[150px]"
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground text-right">
                          {(field.value || '').length}/1000 caracteres
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}/>
                </>
              )}

            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-8 gap-3">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent border border-gray-300 text-gray-700 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all duration-200 px-6 py-2"
                onClick={() => setTabValue('veiculo')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m7-7-7 7 7 7"/></svg>
                <span>Voltar</span>
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent border border-gray-300 text-gray-700 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all duration-200 px-6 py-2"
                onClick={() => setTabValue('bancaria')}
              >
                <span>Avançar</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-7 7 7-7-7-7"/></svg>
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="bancaria" className="px-0">
        {/* Formulário para Análise Bancária */}
        <Form {...form}>
          <form onSubmit={handleSubmitWithValidation} className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              <div className="space-y-4 lg:space-y-6">
                <h3 className="text-lg font-medium">Bancos Tradicionais</h3>
                
                <FormField control={form.control} name="bancoBv" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>BV</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="BV"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoSantander" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Santander</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Santander"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoPan" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Pan</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Pan"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoBradesco" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Bradesco</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Bradesco"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoC6" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>C6</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="C6"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoItau" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Itaú</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Itaú"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
              </div>
              
              <div className="space-y-4 lg:space-y-6">
                <h3 className="text-lg font-medium">Bancos Digitais e Financeiras</h3>
                
                <FormField control={form.control} name="bancoCash" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Cash</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Cash"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoKunna" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Kunna</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Kunna"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoViaCerta" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Via Certa</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Via Certa"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoOmni" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Omni</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Omni"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoDaycoval" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Daycoval</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Daycoval"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoSim" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Sim</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Sim"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="bancoCreditas" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Creditas</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Creditas"
                      />
                    </FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="bancoCrefaz" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Crefaz</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Crefaz"
                      />
                    </FormControl>
                  </FormItem>
                )}/>

                <FormField control={form.control} name="bancoSimpala" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Simpala</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                        aria-label="Simpala"
                      />
                    </FormControl>
                  </FormItem>
                )}/>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between mt-8 gap-3">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent border border-gray-300 text-gray-700 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all duration-200 px-6 py-2"
                onClick={() => setTabValue('pessoais')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m7-7-7 7 7 7"/></svg>
                <span>Voltar</span>
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent border border-gray-300 text-gray-700 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all duration-200 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-700 px-6 py-2"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'Atualizar Proposta' : 'Enviar Proposta'}
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>
    </Tabs>

    {/* Modal de confirmação para mudança de tipo de pessoa */}
    <AlertDialog open={showTypeChangeWarning} onOpenChange={setShowTypeChangeWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Mudança de Tipo de Pessoa</AlertDialogTitle>
          <AlertDialogDescription>
            Você está alterando o tipo de pessoa de{' '}
            <strong>{form.getValues('tipoPessoa') === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</strong>{' '}
            para{' '}
            <strong>{pendingTypeChange === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-3">
            <strong>⚠️ Atenção:</strong> Esta ação irá:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3">
            <li>Limpar todos os dados pessoais preenchidos</li>
            <li>Limpar todas as mensagens de erro de validação</li>
            <li>Alterar permanentemente o tipo da proposta</li>
            <li>Requerer o preenchimento de novos dados específicos do tipo selecionado</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Deseja continuar com esta alteração?
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={cancelTypeChange}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmTypeChange}>
            Sim, Alterar Tipo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
    </>
  );
  }
