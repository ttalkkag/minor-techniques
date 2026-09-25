export interface GrassOptions {
    camera: number;
    culling: boolean;
    lod: boolean;
    instancing: boolean;
    padding: number;
    wind: number;
    safeBounds: boolean;
    synchronized: boolean;
    shadows: boolean;
    reuseMain: boolean;
}
export interface GrassPlant {
    id: number;
    x: number;
    z: number;
    phase: number;
}
export const plants: GrassPlant[] = Array.from({ length: 1000 }, (_, id) => ({
    id,
    x: ((id % 50) - 24.5) * 0.5,
    z: Math.floor(id / 50) + 0.5,
    phase: (id * 2.3999632297) % (Math.PI * 2),
}));
export const defaults: GrassOptions = {
    camera: 0,
    culling: false,
    lod: false,
    instancing: false,
    padding: 0.35,
    wind: 0.65,
    safeBounds: false,
    synchronized: false,
    shadows: true,
    reuseMain: false,
};
export function sway(plant: GrassPlant, time: number, options: GrassOptions, heightRatio = 1) {
    return heightRatio * options.wind * Math.sin(time + (options.synchronized ? 0 : plant.phase));
}
export function plantState(plant: GrassPlant, time: number, options: GrassOptions) {
    const half = 0.09 / (1 - options.padding);
    const displacement = sway(plant, time, options);
    const left = options.camera - 5,
        right = options.camera + 5;
    const extent = half + (options.safeBounds ? options.wind : 0);
    const submitted = !options.culling || (plant.x + extent >= left && plant.x - extent <= right);
    const actualLeft = plant.x + Math.min(0, displacement) - half;
    const actualRight = plant.x + Math.max(0, displacement) + half;
    const visible = actualRight >= left && actualLeft <= right;
    const low = options.lod && plant.z >= 5;
    const shadowNeeded = plant.x + 1.6 + half >= left && plant.x + 1.6 - half <= right;
    const shadowSubmitted = options.shadows && shadowNeeded && (!options.reuseMain || submitted);
    const clippedWidth = Math.max(0, Math.min(actualRight, right) - Math.max(actualLeft, left));
    return {
        submitted,
        visible,
        low,
        displacement,
        half,
        shadowNeeded,
        shadowSubmitted,
        triangles: low ? 2 : 8,
        fragments: Math.round(clippedWidth * 100 * 45 * (low ? 1 : 4)),
    };
}
export function grassMetrics(options: GrassOptions, time: number) {
    const states = plants.map((plant) => plantState(plant, time, options));
    const submitted = states.filter((p) => p.submitted);
    const near = submitted.filter((p) => !p.low).length,
        far = submitted.length - near;
    return {
        states,
        submitted: submitted.length,
        near,
        far,
        triangles: near * 8 + far * 2,
        commands: options.instancing ? Number(near > 0) + Number(far > 0) : submitted.length,
        fragments: submitted.reduce((sum, p) => sum + p.fragments, 0),
        missing: states.filter((p) => p.visible && !p.submitted).length,
        shadowCount: states.filter((p) => p.shadowSubmitted).length,
        shadowTriangles: states.filter((p) => p.shadowSubmitted).length * 2,
        lostShadows: options.shadows ? states.filter((p) => p.shadowNeeded && !p.shadowSubmitted).length : 0,
    };
}
