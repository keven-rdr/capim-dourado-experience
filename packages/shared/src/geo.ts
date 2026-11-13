export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Área de check-in: polígono que cobre o prédio e o estacionamento externo.
 * Fonte: OpenStreetMap (way 301107764). O prédio fica entre as latitudes -10.1843 e -10.1811 e as
 * longitudes -48.3499 e -48.3475; o retângulo abaixo (cerca de 410 m por 350 m) soma uma margem
 * para os estacionamentos abertos. Os limites são A CONFIRMAR em campo e com o shopping.
 * Em produção a área vem do banco (tabela `mall_area`) ou de `MALL_AREA_JSON`, e não deste arquivo.
 */
export const MALL_AREA_APPROX: readonly LatLng[] = [
  { lat: -10.1808, lng: -48.3502 },
  { lat: -10.1808, lng: -48.347 },
  { lat: -10.1845, lng: -48.347 },
  { lat: -10.1845, lng: -48.3502 },
];

/** Centro do shopping segundo o OpenStreetMap. */
export const MALL_CENTER: LatLng = { lat: -10.1826618, lng: -48.3483973 };

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
