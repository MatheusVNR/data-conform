import { describe, it, expect, beforeEach } from 'vitest';
import {
  initAttributionTracker,
  getAttributionPayload,
  trackEvent,
  getTrackedEvents,
  clearTrackedEvents,
} from './analytics';

describe('analytics & attribution tracker', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearTrackedEvents();
  });

  it('captures initial attribution and sets first_touch in localStorage', () => {
    const payload = initAttributionTracker();
    expect(payload.firstTouch).toBeDefined();
    expect(payload.lastTouch).toBeDefined();

    const storedFirst = localStorage.getItem('dc_first_touch');
    expect(storedFirst).not.toBeNull();
  });

  it('preserves first_touch across subsequent visits while updating last_touch', () => {
    const originalFirst = {
      path: '/layout-importacao-protheus-sa1-clientes/',
      referrer: 'https://google.com',
      utmSource: 'google_seo',
      timestamp: '2026-10-31T10:00:00.000Z',
    };
    localStorage.setItem('dc_first_touch', JSON.stringify(originalFirst));

    const payload = getAttributionPayload();
    expect(payload.firstTouch?.utmSource).toBe('google_seo');
    expect(payload.firstTouch?.path).toBe('/layout-importacao-protheus-sa1-clientes/');
  });

  it('tracks funnel events and retrieves them from buffer', () => {
    trackEvent('landing_view', { path: '/' });
    trackEvent('sandbox_started', { scenarioId: 'omie-clientes' });
    trackEvent('signup_started', { triggerSource: 'sandbox_header' });

    const events = getTrackedEvents();
    expect(events.length).toBe(3);
    expect(events[0].name).toBe('landing_view');
    expect(events[1].name).toBe('sandbox_started');
    expect(events[1].properties?.scenarioId).toBe('omie-clientes');
    expect(events[2].name).toBe('signup_started');
  });

  it('dispatches CustomEvent on window when tracking events', () => {
    let capturedDetail: unknown = null;
    const listener = (event: Event) => {
      capturedDetail = (event as CustomEvent).detail;
    };
    window.addEventListener('dataconform:event', listener);

    trackEvent('quota_exceeded', { currentPlan: 'Starter', requestedRows: 800 });

    expect(capturedDetail).not.toBeNull();
    const detail = capturedDetail as { name: string; properties: { currentPlan: string } };
    expect(detail.name).toBe('quota_exceeded');
    expect(detail.properties.currentPlan).toBe('Starter');

    window.removeEventListener('dataconform:event', listener);
  });
});
