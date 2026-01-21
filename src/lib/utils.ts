import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// FIPE API UTILS

export interface Brand {
  nome: string;
  codigo: string;
}

export interface Model {
  nome: string;
  codigo: number;
}

interface ModelResponse {
  modelos: Model[];
}

export interface Year {
  nome: string;
  codigo: string;
}

export interface VehicleDetails {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  TipoVeiculo: number;
  SiglaCombustivel: string;
}

// Configuração da API FIPE v2 com suporte a token
const FIPE_API_BASE_URL = 'https://fipe.parallelum.com.br/api/v2';

// Token FIPE carregado do Vercel (funcionando!)
const FIPE_TOKEN = process.env.NEXT_PUBLIC_FIPE_TOKEN || null;

// Debug simplificado - Token do Vercel funcionando
if (FIPE_TOKEN) {
  console.log('🔑 FIPE Token carregado do Vercel com sucesso');
}

// Função para adicionar delay entre requisições (evitar erro 429)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Função para fazer requisições com retry automático e autenticação
const fetchWithRetry = async (url: string, maxRetries: number = 3): Promise<Response> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Delay otimizado baseado no token
      let delayTime = 0;
      if (attempt > 1) {
        // Com token: delays menores (200ms, 500ms)
        // Sem token: delays maiores (1s, 2s)
        delayTime = FIPE_TOKEN
          ? Math.pow(2, attempt - 2) * 200  // 200ms, 400ms
          : Math.pow(2, attempt - 1) * 500; // 500ms, 1000ms
        await delay(delayTime);
      }

      // Configurar headers com token se disponível
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (FIPE_TOKEN) {
        headers['X-Subscription-Token'] = FIPE_TOKEN;
        // Log reduzido - só em caso de erro
      } else {
        // Log reduzido - só em caso de erro
      }

      if (attempt > 1) console.log(`🔄 Tentativa ${attempt}/${maxRetries} para: ${url}`);
      const response = await fetch(url, { headers });

      if (response.ok) {
        if (attempt > 1) console.log(`✅ Sucesso na tentativa ${attempt}`);
        return response;
      }

      if (response.status === 429) {
        const message = FIPE_TOKEN
          ? `Rate limit atingido mesmo com token na tentativa ${attempt}`
          : `Rate limit (sem token) na tentativa ${attempt}`;
        console.warn(`⚠️ ${message}. Aguardando...`);

        if (attempt === maxRetries) {
          const errorMsg = FIPE_TOKEN
            ? 'API FIPE: Limite de requisições atingido mesmo com token. Tente novamente em alguns minutos.'
            : 'API FIPE: Limite gratuito atingido. Configure um token para mais requisições ou aguarde.';
          throw new Error(errorMsg);
        }
        continue;
      }

      // Erro 400 - Bad Request (parâmetros inválidos, código FIPE incorreto, etc.)
      if (response.status === 400) {
        // Não fazer retry para erros 400 (são erros de dados, não de conexão)
        const errorBody = await response.text().catch(() => '');
        console.warn(`⚠️ Erro 400 (Bad Request): ${url}`, errorBody);
        throw new Error(`Código FIPE ou parâmetros inválidos. Verifique os dados informados.`);
      }

      // Outros erros HTTP
      throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);

    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`❌ Erro na tentativa ${attempt}:`, error);
    }
  }

  throw new Error('Falha após todas as tentativas');
};

export const testFipeConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testando conectividade com API FIPE v2...');

    // Log do token (agora funcionando via Vercel)
    if (FIPE_TOKEN) {
      console.log(`🔑 FIPE Token ativo (Vercel) - ${FIPE_TOKEN.length} chars`);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (FIPE_TOKEN) {
      headers['X-Subscription-Token'] = FIPE_TOKEN;
      console.log('🔑 Testando com token de autenticação...');
    } else {
      console.log('⚠️ Testando sem token (limite gratuito)...');
    }

    const response = await fetch(`${FIPE_API_BASE_URL}/cars/brands`, { headers });
    console.log('📡 Status do teste:', response.status);

    if (response.ok) {
      const data = await response.json();
      const tokenStatus = FIPE_TOKEN ? 'com token (1000 req/dia)' : 'sem token (500 req/dia)';
      console.log(`✅ API FIPE v2 funcionando ${tokenStatus}! Marcas encontradas:`, data?.length || 0);
      return true;
    } else if (response.status === 429) {
      const message = FIPE_TOKEN
        ? 'Limite atingido mesmo com token'
        : 'Limite gratuito atingido - configure um token';
      console.warn(`⚠️ API FIPE: ${message} (429).`);
      return false;
    } else {
      console.error('❌ API FIPE não está respondendo corretamente. Status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro de conectividade com API FIPE:', error);
    return false;
  }
};

export const fetchBrands = async (vehicleType: 'carros' | 'motos' | 'caminhoes'): Promise<Brand[]> => {
  try {
    // Mapear tipos para API v2
    const typeMap = { 'carros': 'cars', 'motos': 'motorcycles', 'caminhoes': 'trucks' };
    const apiType = typeMap[vehicleType];

    const response = await fetchWithRetry(`${FIPE_API_BASE_URL}/${apiType}/brands`);
    const data = await response.json();

    // Converter formato da API v2 para v1 (compatibilidade)
    return data.map((item: any) => ({
      nome: item.name,
      codigo: item.code
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar marcas:', error);
    throw new Error('Falha ao buscar as marcas. Verifique sua conexão ou tente novamente em alguns minutos.');
  }
};

export const fetchModels = async (
  vehicleType: 'carros' | 'motos' | 'caminhoes',
  brandCode: string
): Promise<Model[]> => {
  try {
    // Mapear tipos para API v2
    const typeMap = { 'carros': 'cars', 'motos': 'motorcycles', 'caminhoes': 'trucks' };
    const apiType = typeMap[vehicleType];

    const response = await fetchWithRetry(
      `${FIPE_API_BASE_URL}/${apiType}/brands/${brandCode}/models`
    );
    const data = await response.json();

    // Converter formato da API v2 para v1 (compatibilidade)
    return data.map((item: any) => ({
      nome: item.name,
      codigo: item.code
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar modelos:', error);
    throw new Error('Falha ao buscar os modelos. Verifique sua conexão ou tente novamente em alguns minutos.');
  }
};

export const fetchYears = async (
  vehicleType: 'carros' | 'motos' | 'caminhoes',
  brandCode: string,
  modelCode: string
): Promise<Year[]> => {
  try {
    // Mapear tipos para API v2
    const typeMap = { 'carros': 'cars', 'motos': 'motorcycles', 'caminhoes': 'trucks' };
    const apiType = typeMap[vehicleType];

    const response = await fetchWithRetry(
      `${FIPE_API_BASE_URL}/${apiType}/brands/${brandCode}/models/${modelCode}/years`
    );
    const data = await response.json();

    // Converter formato da API v2 para v1 (compatibilidade)
    return data.map((item: any) => ({
      nome: item.name,
      codigo: item.code
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar anos:', error);
    throw new Error('Falha ao buscar os anos. Verifique sua conexão ou tente novamente em alguns minutos.');
  }
};

export const fetchVehicleDetails = async (
  vehicleType: 'carros' | 'motos' | 'caminhoes',
  brandCode: string,
  modelCode: string,
  yearCode: string
): Promise<VehicleDetails> => {
  try {
    // Mapear tipos para API v2
    const typeMap = { 'carros': 'cars', 'motos': 'motorcycles', 'caminhoes': 'trucks' };
    const apiType = typeMap[vehicleType];

    const response = await fetchWithRetry(
      `${FIPE_API_BASE_URL}/${apiType}/brands/${brandCode}/models/${modelCode}/years/${yearCode}`
    );
    const data = await response.json();

    // Converter formato da API v2 para v1 (compatibilidade)
    return {
      Valor: data.price,
      Marca: data.brand,
      Modelo: data.model,
      AnoModelo: data.modelYear,
      Combustivel: data.fuel,
      CodigoFipe: data.codeFipe,
      MesReferencia: data.referenceMonth,
      TipoVeiculo: data.vehicleType,
      SiglaCombustivel: data.fuelAcronym
    };
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes do veículo:', error);
    throw new Error('Falha ao buscar os detalhes do veículo. Verifique sua conexão ou tente novamente em alguns minutos.');
  }
};

// Novas funções para busca por código FIPE (busca reversa)
export const fetchYearsByFipeCode = async (
  vehicleType: 'carros' | 'motos' | 'caminhoes',
  fipeCode: string
): Promise<Year[]> => {
  try {
    // Mapear tipos para API v2
    const typeMap = { 'carros': 'cars', 'motos': 'motorcycles', 'caminhoes': 'trucks' };
    const apiType = typeMap[vehicleType];

    const response = await fetchWithRetry(
      `${FIPE_API_BASE_URL}/${apiType}/${fipeCode}/years`
    );
    const data = await response.json();

    // Converter formato da API v2 para v1 (compatibilidade)
    return data.map((item: any) => ({
      nome: item.name,
      codigo: item.code
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar anos por código FIPE:', error);
    throw new Error('Código FIPE inválido ou não encontrado. Verifique o código e tente novamente.');
  }
};

export const fetchVehicleDetailsByFipeCode = async (
  vehicleType: 'carros' | 'motos' | 'caminhoes',
  fipeCode: string,
  yearCode: string
): Promise<VehicleDetails> => {
  try {
    // Mapear tipos para API v2
    const typeMap = { 'carros': 'cars', 'motos': 'motorcycles', 'caminhoes': 'trucks' };
    const apiType = typeMap[vehicleType];

    const response = await fetchWithRetry(
      `${FIPE_API_BASE_URL}/${apiType}/${fipeCode}/years/${yearCode}`
    );
    const data = await response.json();

    // Converter formato da API v2 para v1 (compatibilidade)
    return {
      Valor: data.price,
      Marca: data.brand,
      Modelo: data.model,
      AnoModelo: data.modelYear,
      Combustivel: data.fuel,
      CodigoFipe: data.codeFipe,
      MesReferencia: data.referenceMonth,
      TipoVeiculo: data.vehicleType,
      SiglaCombustivel: data.fuelAcronym
    };
  } catch (error) {
    console.error('❌ Erro ao buscar detalhes do veículo por código FIPE:', error);
    throw new Error('Falha ao buscar os detalhes do veículo. Verifique o código FIPE e o ano selecionado.');
  }
};

// Nova função para buscar marca, modelo e ano diretamente do código FIPE
export const fetchBrandModelAndYearByFipeCode = async (
  vehicleType: 'carros' | 'motos' | 'caminhoes',
  fipeCode: string
): Promise<{ brandCode: string; brandName: string; modelCode: string; modelName: string; yearCode: string; yearName: string }> => {
  try {
    // Mapear tipos para API v2
    const typeMap = { 'carros': 'cars', 'motos': 'motorcycles', 'caminhoes': 'trucks' };
    const apiType = typeMap[vehicleType];

    // Buscar todos os anos disponíveis para obter marca e modelo
    const yearsResponse = await fetchWithRetry(
      `${FIPE_API_BASE_URL}/${apiType}/${fipeCode}/years`
    );
    const yearsData = await yearsResponse.json();

    if (!yearsData || yearsData.length === 0) {
      throw new Error('Nenhum ano disponível para este código FIPE');
    }

    // Encontrar o primeiro ano que tem um número de 4 dígitos (ano real, não código especial como 32000)
    // Ordenar por nome em ordem decrescente para pegar o ano mais recente
    const sortedYears = [...yearsData].sort((a, b) => {
      const aYear = parseInt((a.name || a.nome)?.split(' ')[0] || '0');
      const bYear = parseInt((b.name || b.nome)?.split(' ')[0] || '0');
      return bYear - aYear; // Ordem decrescente
    });

    const selectedYear = sortedYears.find(y => {
      const yearNum = parseInt((y.name || y.nome)?.split(' ')[0] || '0');
      return yearNum >= 1900 && yearNum <= 2100; // Filtrar anos válidos
    }) || yearsData[0]; // Fallback para o primeiro se não encontrar

    const yearCodeToUse = selectedYear.code || selectedYear.codigo;
    const detailsResponse = await fetchWithRetry(
      `${FIPE_API_BASE_URL}/${apiType}/${fipeCode}/years/${yearCodeToUse}`
    );
    const detailsData = await detailsResponse.json();

    // Buscar todas as marcas para encontrar o código correspondente
    const brandsResponse = await fetchWithRetry(
      `${FIPE_API_BASE_URL}/${apiType}/brands`
    );
    const brandsData = await brandsResponse.json();

    // Encontrar a marca que corresponde ao nome retornado
    const matchedBrand = brandsData.find((b: any) => b.name.toLowerCase() === detailsData.brand.toLowerCase());
    const brandCode = matchedBrand?.code || detailsData.brand; // Fallback para o nome se não encontrar

    return {
      brandCode: brandCode,
      brandName: detailsData.brand,
      modelCode: fipeCode, // Usar o código FIPE como modelo code (será usado para buscar detalhes)
      modelName: detailsData.model,
      yearCode: yearCodeToUse,
      yearName: selectedYear.name || selectedYear.nome
    };
  } catch (error) {
    console.error('❌ Erro ao buscar marca, modelo e ano por código FIPE:', error);
    throw new Error('Falha ao buscar informações do veículo. Verifique o código FIPE.');
  }
};
