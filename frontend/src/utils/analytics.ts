/**
 * DataConform - Utilitário Ultraleve de Atribuição e Eventos de Funil (Zero-Bloat, LGPD Compliant)
 * 
 * Regras:
 * - Não coleta dados pessoais sensíveis ou conteúdo de arquivos.
 * - Suporta First-Touch (via localStorage) e Last-Touch (via sessionStorage).
 * - Trata de forma resiliente cenários em que o storage está bloqueado/desabilitado.
 */

export type FunnelEventName =
  | 'landing_view'
  | 'sandbox_started'
  | 'sandbox_file_uploaded'
  | 'sandbox_completed'
  | 'signup_started'
  | 'signup_completed'
  | 'first_validation_completed'
  | 'quota_exceeded'
  | 'checkout_started'
  | 'subscription_paid';

export interface AttributionData {
  path: string;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  erp?: string;
  timestamp: string;
}

export interface AttributionPayload {
  firstTouch: AttributionData | null;
  lastTouch: AttributionData | null;
  activeErp?: string;
}

export interface TrackedEvent {
  name: FunnelEventName;
  properties?: Record<string, string | number | boolean | undefined>;
  timestamp: string;
}

const FIRST_TOUCH_KEY = 'dc_first_touch';
const LAST_TOUCH_KEY = 'dc_last_touch';
const EVENTS_BUFFER_KEY = 'dc_events_buffer';
const MAX_EVENTS_BUFFER = 50;

function safeGetStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Modo anônimo restritivo ou cota excedida: silenciar para não quebrar o app
  }
}

/**
 * Inicializa a captura de parâmetros de URL e Referrer da sessão atual.
 */
export function initAttributionTracker(): AttributionPayload {
  if (typeof window === 'undefined') {
    return { firstTouch: null, lastTouch: null };
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source') || undefined;
    const utmMedium = params.get('utm_medium') || undefined;
    const utmCampaign = params.get('utm_campaign') || undefined;
    const utmContent = params.get('utm_content') || undefined;
    const erpParam = params.get('erp') || undefined;
    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    const path = window.location.pathname;

    const currentTouch: AttributionData = {
      path,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      erp: erpParam,
      timestamp: new Date().toISOString(),
    };

    // First Touch (mantido permanentemente até expirar ou limpar dados)
    let firstTouch: AttributionData | null = null;
    const rawFirst = safeGetStorage(localStorage, FIRST_TOUCH_KEY);
    if (!rawFirst) {
      safeSetStorage(localStorage, FIRST_TOUCH_KEY, JSON.stringify(currentTouch));
      firstTouch = currentTouch;
    } else {
      try {
        firstTouch = JSON.parse(rawFirst) as AttributionData;
      } catch {
        firstTouch = currentTouch;
      }
    }

    // Last Touch (atualizado por sessão ou na navegação)
    safeSetStorage(sessionStorage, LAST_TOUCH_KEY, JSON.stringify(currentTouch));

    return {
      firstTouch,
      lastTouch: currentTouch,
      activeErp: erpParam || firstTouch?.erp,
    };
  } catch {
    return { firstTouch: null, lastTouch: null };
  }
}

/**
 * Retorna o payload consolidado de First e Last Touch para inclusão no payload de cadastro.
 */
export function getAttributionPayload(): AttributionPayload {
  let firstTouch: AttributionData | null = null;
  let lastTouch: AttributionData | null = null;

  try {
    const rawFirst = safeGetStorage(localStorage, FIRST_TOUCH_KEY);
    if (rawFirst) {
      firstTouch = JSON.parse(rawFirst) as AttributionData;
    }
  } catch {
    firstTouch = null;
  }

  try {
    const rawLast = safeGetStorage(sessionStorage, LAST_TOUCH_KEY);
    if (rawLast) {
      lastTouch = JSON.parse(rawLast) as AttributionData;
    }
  } catch {
    lastTouch = null;
  }

  return {
    firstTouch,
    lastTouch,
    activeErp: lastTouch?.erp || firstTouch?.erp,
  };
}

/**
 * Registra eventos-chave do funil comercial com dados agregados e pseudonimizados.
 */
export function trackEvent(
  name: FunnelEventName,
  properties?: Record<string, string | number | boolean | undefined>
): void {
  const event: TrackedEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Buffer local para diagnóstico e testes de QA
    const rawBuffer = safeGetStorage(sessionStorage, EVENTS_BUFFER_KEY);
    const buffer: TrackedEvent[] = rawBuffer ? (JSON.parse(rawBuffer) as TrackedEvent[]) : [];
    buffer.push(event);
    if (buffer.length > MAX_EVENTS_BUFFER) {
      buffer.shift();
    }
    safeSetStorage(sessionStorage, EVENTS_BUFFER_KEY, JSON.stringify(buffer));

    // 2. Disparo de CustomEvent no browser para permitir listeners customizados
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('dataconform:event', { detail: event }));
    }

    // 3. Integração com dataLayer caso Google Tag Manager esteja ativo futuramente
    interface WindowWithDataLayer extends Window {
      dataLayer?: Array<Record<string, unknown>>;
    }
    const win = window as WindowWithDataLayer;
    if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push({
        event: name,
        ...properties,
      });
    }
  } catch {
    // Proteção contra falhas em ambientes restritivos
  }
}

/**
 * Recupera eventos recentes bufferizados (usado em testes e no painel de debug).
 */
export function getTrackedEvents(): TrackedEvent[] {
  try {
    const rawBuffer = safeGetStorage(sessionStorage, EVENTS_BUFFER_KEY);
    return rawBuffer ? (JSON.parse(rawBuffer) as TrackedEvent[]) : [];
  } catch {
    return [];
  }
}

/**
 * Limpa o buffer de eventos (útil para testes unitários).
 */
export function clearTrackedEvents(): void {
  try {
    sessionStorage.removeItem(EVENTS_BUFFER_KEY);
  } catch {
    // Silencioso
  }
}
