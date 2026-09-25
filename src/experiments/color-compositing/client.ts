import { over, straight, operation, decode, encode, display } from "./model";
import type { RGB, Pixel } from "./model";
const get = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;
const canvas = get<HTMLCanvasElement>("scene"),
    ctx = canvas.getContext("2d")!;
const mode = get<HTMLSelectElement>("mode"),
    storage = get<HTMLSelectElement>("storage"),
    factor = get<HTMLSelectElement>("factor"),
    alphaFactor = get<HTMLSelectElement>("alpha-factor"),
    space = get<HTMLSelectElement>("space");
const sourceColor = get<HTMLInputElement>("source-color"),
    backgroundColor = get<HTMLInputElement>("background-color"),
    sourceAlpha = get<HTMLInputElement>("source-alpha"),
    backgroundAlpha = get<HTMLInputElement>("background-alpha"),
    brightness = get<HTMLInputElement>("brightness");
const menu = get<HTMLButtonElement>("menu"),
    settings = get<HTMLElement>("settings"),
    info = get<HTMLDialogElement>("info");
const tile = document.createElement("canvas"),
    tileCtx = tile.getContext("2d")!;
const menuBackground = document.querySelectorAll<HTMLElement>(
    "main > :not(nav):not(#settings):not(dialog), nav > :not(#menu)",
);
function syncMenu() {
    const modal = !settings.hidden;
    menuBackground.forEach((element) => {
        element.inert = modal;
    });
    if (modal) {
        settings.setAttribute("role", "dialog");
        settings.setAttribute("aria-modal", "true");
        if (!info.open && !settings.contains(document.activeElement))
            get("close-menu").focus();
    } else {
        settings.setAttribute("role", "complementary");
        settings.removeAttribute("aria-modal");
    }
}
function menuOpen(open: boolean, focus = true) {
    settings.hidden = !open;
    menu.setAttribute("aria-expanded", String(open));
    menu.setAttribute("aria-label", open ? "설정 메뉴 닫기" : "설정 메뉴 열기");
    syncMenu();
    if (focus) (open ? get("close-menu") : menu).focus();
}
menu.addEventListener("click", () => menuOpen(Boolean(settings.hidden)));
get("close-menu").addEventListener("click", () => menuOpen(false));
get("explain").addEventListener("click", () => info.showModal());
get("close-info").addEventListener("click", () => info.close());
document.addEventListener("keydown", (event) => {
    if (info.open || settings.hidden) return;
    if (event.key === "Escape") {
        event.preventDefault();
        menuOpen(false);
    } else if (event.key === "Tab") {
        const controls = Array.from(
            settings.querySelectorAll<HTMLElement>(
                "button, input, select, a[href], [tabindex]",
            ),
        ).filter(
            (control) =>
                !control.matches(":disabled") &&
                control.tabIndex >= 0 &&
                control.getClientRects().length,
        );
        const first = controls[0]!,
            last = controls[controls.length - 1]!;
        if (
            event.shiftKey &&
            (document.activeElement === first ||
                !settings.contains(document.activeElement))
        ) {
            event.preventDefault();
            last.focus();
        } else if (
            !event.shiftKey &&
            (document.activeElement === last ||
                !settings.contains(document.activeElement))
        ) {
            event.preventDefault();
            first.focus();
        }
    }
});
function color(hex: string, linear: boolean): RGB {
    return [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return linear ? decode(c) : c;
    }) as RGB;
}
function formatted(rgb: RGB): string {
    return `(${rgb.map((c) => c.toFixed(3)).join(", ")})`;
}
function draw() {
    const rect = canvas.getBoundingClientRect(),
        w = rect.width,
        h = rect.height,
        dpr = Math.min(devicePixelRatio, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mobile = w < 610,
        pw = mobile ? w : w / 2,
        ph = mobile ? h / 2 : h;
    const linear = space.value === "linear",
        isOver = mode.value === "over";
    const cs = color(sourceColor.value, linear),
        cb = color(backgroundColor.value, linear),
        as = Number(sourceAlpha.value),
        ab = Number(backgroundAlpha.value);
    const premult = storage.value === "premult",
        usesAlpha = factor.value === "alpha",
        separate = alphaFactor.value === "separate";
    const titles = isOver
        ? ["선택한 처리", "표현에 맞춘 처리"]
        : [
              "어두운 배경 · 0.08",
              `밝기 ${Number(brightness.value).toFixed(2)} 배경`,
          ];
    get("over-controls").hidden = !isOver;
    get("backdrop-controls").hidden = isOver;
    get("source-alpha-value").textContent = as.toFixed(2);
    get("background-alpha-value").textContent = ab.toFixed(2);
    get("brightness-value").textContent = Number(brightness.value).toFixed(2);
    const results: Pixel[] = [];
    [0, 1].forEach((index) => {
        const ox = mobile ? 0 : pw * index,
            oy = mobile ? ph * index : 0;
        ctx.textAlign = "center";
        ctx.fillStyle = index === 0 ? "#a24b22" : "#086c66";
        ctx.font = "600 16px sans-serif";
        ctx.fillText(titles[index], ox + pw / 2, oy + 29);
        const dw = pw - 26,
            dh = ph - 60,
            dx = ox + 13,
            dy = oy + 44;
        const tw = Math.min(480, Math.round(dw)),
            th = Math.round((tw * dh) / dw);
        tile.width = tw;
        tile.height = th;
        const image = tileCtx.createImageData(tw, th);
        const base = index === 0 ? 0.08 : Number(brightness.value),
            baseWork = linear ? decode(base) : base,
            back: RGB = [baseWork, baseWork, baseWork];
        for (let y = 0; y < th; y++)
            for (let x = 0; x < tw; x++) {
                const u = x / tw,
                    v = y / th;
                const sourceDistance = Math.hypot(
                    (u - 0.44) * (tw / th),
                    v - 0.49,
                );
                const backgroundDistance = Math.hypot(
                    (u - 0.58) * (tw / th),
                    v - 0.52,
                );
                const sa =
                    as *
                    Math.min(1, Math.max(0, (0.39 - sourceDistance) / 0.11));
                const ba =
                    ab *
                    Math.min(
                        1,
                        Math.max(0, (0.39 - backgroundDistance) / 0.055),
                    );
                let shown: RGB;
                if (isOver) {
                    const pixel =
                        index === 0
                            ? over(cs, sa, cb, ba, premult, usesAlpha, separate)
                            : over(cs, sa, cb, ba, premult, !premult, true);
                    const grey =
                        (Math.floor(x / 17) + Math.floor(y / 17)) % 2 === 0
                            ? 0.91
                            : 0.82;
                    const workGrey = linear ? decode(grey) : grey;
                    shown = display(
                        pixel,
                        [workGrey, workGrey, workGrey],
                        linear,
                    );
                } else {
                    const raw = operation(
                        cs,
                        sa,
                        back,
                        mode.value as "add" | "multiply",
                    );
                    shown = raw.map((c) => {
                        const clipped = Math.max(0, Math.min(1, c));
                        return linear ? encode(clipped) : clipped;
                    }) as RGB;
                }
                const offset = (y * tw + x) * 4;
                image.data[offset] = shown[0] * 255;
                image.data[offset + 1] = shown[1] * 255;
                image.data[offset + 2] = shown[2] * 255;
                image.data[offset + 3] = 255;
            }
        tileCtx.putImageData(image, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(dx, dy, dw, dh, 18);
        ctx.clip();
        ctx.drawImage(tile, dx, dy, dw, dh);
        ctx.restore();
        ctx.strokeStyle = "#c5d2d4";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(dx, dy, dw, dh, 18);
        ctx.stroke();
        results.push(
            isOver
                ? index === 0
                    ? over(cs, as, cb, ab, premult, usesAlpha, separate)
                    : over(cs, as, cb, ab, premult, !premult, true)
                : {
                      rgb: operation(
                          cs,
                          as,
                          back,
                          mode.value as "add" | "multiply",
                      ),
                      alpha: 1,
                  },
        );
    });
    for (let i = 0; i < 2; i++) {
        get(i === 0 ? "left-title" : "right-title").textContent = titles[i];
        const p = results[i];
        get(i === 0 ? "left-result" : "right-result").textContent = isOver
            ? `저장 co = ${formatted(p.rgb)}\n출력 α = ${p.alpha.toFixed(3)} · 복원 Co = ${formatted(straight(p))}`
            : `계산 RGB = ${formatted(p.rgb)}\n1 초과 채널 = ${p.rgb.filter((c) => c > 1).length}개 · 화면은 0–1로 제한`;
    }
    const error =
        results[0].rgb.reduce(
            (sum, c, i) => sum + Math.abs(c - results[1].rgb[i]),
            0,
        ) + Math.abs(results[0].alpha - results[1].alpha);
    if (isOver) {
        get("intro").textContent =
            "이미 곱한 알파를 또 곱하면, 투명한 부분부터 어두워집니다.";
        get("summary").textContent =
            `${linear ? "선형 광량" : "sRGB 인코딩 값"}에서 계산 · ${error < 1e-8 ? "두 처리 결과가 같습니다." : `겹친 픽셀의 RGB·α 차이 합 ${error.toFixed(3)}.`} 현재 전경 저장 값 ${formatted(cs.map((c) => c * (premult ? as : 1)) as RGB)}. 체크무늬는 투명도를 보여 주는 별도 배경입니다.`;
    } else {
        get("intro").textContent =
            mode.value === "add"
                ? "더 밝게 만들 수 있어도, 밝은 배경과 충분한 모양 대비가 생긴다고 보장할 수는 없습니다."
                : "배경과 곱한 채널은 어두워집니다. 실제 그림자 광선을 계산한 결과는 아닙니다.";
        const backdrop = Number(brightness.value),
            rgb = results[1].rgb.map((c) =>
                linear ? encode(Math.min(c, 1)) : Math.min(c, 1),
            );
        const difference =
            rgb.reduce((sum, c) => sum + Math.abs(c - backdrop), 0) / 3;
        get("summary").textContent =
            `${mode.value === "add" ? "Cb + Csα" : "Cb × (1−α+Csα)"} · ${linear ? "선형 광량" : "sRGB 값"} 계산 · 오른쪽 중심과 배경의 평균 채널 차이 ${difference.toFixed(3)}. 값이 작을수록 같은 밝기로 보입니다.`;
    }
}
[
    mode,
    storage,
    factor,
    alphaFactor,
    space,
    sourceColor,
    backgroundColor,
    sourceAlpha,
    backgroundAlpha,
    brightness,
].forEach((control) => control.addEventListener("input", draw));
[mode, storage, factor, alphaFactor, space].forEach((control) =>
    control.addEventListener("change", draw),
);
get("match").addEventListener("click", () => {
    factor.value = storage.value === "premult" ? "one" : "alpha";
    alphaFactor.value = "separate";
    draw();
});
get("swap").addEventListener("click", () => {
    [sourceColor.value, backgroundColor.value] = [
        backgroundColor.value,
        sourceColor.value,
    ];
    [sourceAlpha.value, backgroundAlpha.value] = [
        backgroundAlpha.value,
        sourceAlpha.value,
    ];
    draw();
});
get("example").addEventListener("click", () => {
    sourceColor.value = "#ff0000";
    backgroundColor.value = "#0000ff";
    sourceAlpha.value = "0.4";
    backgroundAlpha.value = "0.25";
    storage.value = "straight";
    factor.value = "alpha";
    alphaFactor.value = "separate";
    space.value = "srgb";
    draw();
});
get("reset").addEventListener("click", () => {
    mode.value = "over";
    storage.value = "premult";
    factor.value = "alpha";
    alphaFactor.value = "separate";
    space.value = "srgb";
    sourceColor.value = "#ed7046";
    backgroundColor.value = "#188b88";
    sourceAlpha.value = "0.45";
    backgroundAlpha.value = "0.65";
    brightness.value = "0.95";
    draw();
});
const observer = new ResizeObserver(draw);
observer.observe(canvas);
window.addEventListener("pagehide", (event) => {
    if (!event.persisted) observer.disconnect();
});
window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        observer.observe(canvas);
        syncMenu();
        draw();
    }
});
draw();
