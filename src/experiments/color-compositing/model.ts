export type RGB = [number, number, number];
export type Pixel = { rgb: RGB; alpha: number };
export const decode = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
export const encode = (v: number): number => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
export function over(
    source: RGB,
    sourceAlpha: number,
    background: RGB,
    backgroundAlpha: number,
    premultiplied = false,
    factorAlpha = true,
    separateAlpha = true,
): Pixel {
    const stored = source.map((c) => c * (premultiplied ? sourceAlpha : 1));
    const factor = factorAlpha ? sourceAlpha : 1;
    return {
        rgb: stored.map((c, i) => c * factor + background[i] * backgroundAlpha * (1 - sourceAlpha)) as RGB,
        alpha: sourceAlpha * (separateAlpha ? 1 : factor) + backgroundAlpha * (1 - sourceAlpha),
    };
}
export function straight(pixel: Pixel): RGB {
    return pixel.alpha > 0 ? (pixel.rgb.map((c) => c / pixel.alpha) as RGB) : [0, 0, 0];
}
export function operation(source: RGB, alpha: number, background: RGB, mode: 'add' | 'multiply'): RGB {
    return source.map((c, i) =>
        mode === 'add' ? c * alpha + background[i] : background[i] * (1 - alpha + c * alpha),
    ) as RGB;
}
export function display(pixel: Pixel, checker: RGB, linear: boolean): RGB {
    return pixel.rgb.map((c, i) => {
        const value = Math.max(0, Math.min(1, c + checker[i] * (1 - pixel.alpha)));
        return linear ? encode(value) : value;
    }) as RGB;
}
