import { type CheckInInput, MALL_AREA_APPROX, polygonCenter } from '@cde/shared';
import { getDemo } from '../demo/demoStore';

export type GeoFailure = 'denied' | 'unavailable' | 'timeout';

export class GeoError extends Error {
  readonly kind: GeoFailure;
  constructor(kind: GeoFailure) {
    super(kind);
    this.name = 'GeoError';
    this.kind = kind;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lê a localização uma vez, só com o app aberto. Nada é guardado: o resultado vai direto
 * para o check-in, que devolve só "dentro" ou "fora".
 * No modo demonstração, o painel pode simular "no shopping", "fora", "GPS impreciso" ou "sem permissão".
 */
export async function getPosition(demoActive: boolean): Promise<CheckInInput> {
  const demo = getDemo();
  if (demoActive && demo.location !== 'real') {
    await wait(900);
    const center = polygonCenter(MALL_AREA_APPROX);
    switch (demo.location) {
      case 'inside':
        return { lat: center.lat + 0.0004, lng: center.lng - 0.0003, accuracy: 18 };
      case 'outside':
        // cerca de 2,4 km ao sul do shopping
        return { lat: center.lat - 0.0215, lng: center.lng + 0.002, accuracy: 22 };
      case 'imprecise':
        return { lat: center.lat, lng: center.lng, accuracy: 640 };
      default:
        throw new GeoError('denied');
    }
  }
  if (typeof navigator === 'undefined' || !navigator.geolocation) throw new GeoError('unavailable');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) =>
        reject(
          new GeoError(
            err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable',
          ),
        ),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  });
}

/** Pede a permissão de localização (tela de explicação do onboarding). */
export async function requestLocationPermission(demoActive: boolean): Promise<boolean> {
  try {
    await getPosition(demoActive);
    return true;
  } catch (error) {
    return !(error instanceof GeoError && error.kind === 'denied');
  }
}
