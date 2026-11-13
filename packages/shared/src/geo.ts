export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Área de check-in: polígono que cobre o prédio e o estacionamento externo.
 * ATENÇÃO: coordenadas aproximadas, só para o protótipo. A CONFIRMAR em campo e com o shopping.
 * Em produção a área vem do banco (tabela `mall_area`), e não deste arquivo.
 */
export const MALL_AREA_APPROX: readonly LatLng[] = [
  { lat: -10.1742, lng: -48.3352 },
  { lat: -10.1742, lng: -48.3312 },
  { lat: -10.1778, lng: -48.3312 },
  { lat: -10.1778, lng: -48.3352 },
];

/** Precisão máxima aceita do GPS, em metros. Acima disso, o app oferece o QR da entrada. */
export const MAX_GPS_ACCURACY_M = 150;

/** Ponto dentro de polígono (ray casting). */
export function pointInPolygon(point: LatLng, polygon: readonly LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i] as LatLng;
    const b = polygon[j] as LatLng;
    const crosses =
      a.lat > point.lat !== b.lat > point.lat &&
      point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Distância em metros entre dois pontos (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function polygonCenter(polygon: readonly LatLng[]): LatLng {
  const sum = polygon.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), {
    lat: 0,
    lng: 0,
  });
  return { lat: sum.lat / polygon.length, lng: sum.lng / polygon.length };
}

/**
 * Horário de funcionamento das lojas (site oficial do shopping):
 * segunda a sábado, 10h às 22h; domingo, 14h às 20h. Horário de Palmas.
 */
export function isMallOpen(date: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Araguaina',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  if (weekday === 'Sun') return hour >= 14 && hour < 20;
  return hour >= 10 && hour < 22;
}
