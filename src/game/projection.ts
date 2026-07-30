// Shared equirectangular projection so the engine's city coordinates align
// pixel-for-pixel with the d3-geo world-atlas map rendered in <WorldMap />.
//
// x = tx + s * lng * π/180
// y = ty - s * lat * π/180
//
// With scale = 1000/(2π) and translate = [500, 250] this maps the full
// -180..180 / -90..90 range onto a 1000x500 viewBox.

export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 500;
export const PROJECTION_SCALE = MAP_WIDTH / (2 * Math.PI);
export const PROJECTION_TRANSLATE: [number, number] = [MAP_WIDTH / 2, MAP_HEIGHT / 2];

export function project(lat: number, lng: number): { x: number; y: number } {
  const [tx, ty] = PROJECTION_TRANSLATE;
  const rad = Math.PI / 180;
  return {
    x: tx + PROJECTION_SCALE * lng * rad,
    y: ty - PROJECTION_SCALE * lat * rad,
  };
}