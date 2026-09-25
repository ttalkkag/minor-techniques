export interface Guard {
    write: boolean;
    execute: boolean;
    opcode: boolean;
    budget: number;
}
export interface Machine {
    memory: number[];
    pc: number;
    steps: number;
    position: number;
    scene: boolean;
    halted: boolean;
    status: string;
    trace: string[];
}
export const guards: Guard = { write: false, execute: false, opcode: true, budget: 12 };
export const commands = ['정지', '점수 +1', '오른쪽 이동', '장면 전환', '제자리 반복'];
export function createMachine(): Machine {
    return {
        memory: [1, 2, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0],
        pc: 0,
        steps: 0,
        position: 0,
        scene: false,
        halted: false,
        status: '입력은 숫자로 기록됩니다. 실행 위치를 별도로 옮겨 보세요.',
        trace: [],
    };
}
function message(s: Machine, text: string): Machine {
    return { ...s, status: text, trace: [text, ...s.trace].slice(0, 6) };
}
export function writeInput(s: Machine, address: number, value: number, g: Guard): Machine {
    if (
        !Number.isInteger(address) ||
        address < 0 ||
        address >= 16 ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > 255
    )
        return message(s, '16칸 / 0–255 범위 밖 입력 거부');
    if (g.write && address < 8) return message(s, `쓰기 거부: ${address}번은 명령 영역`);
    const memory = [...s.memory];
    memory[address] = value;
    return message({ ...s, memory }, `${address}번에 숫자 ${value} 기록 · 실행은 아직 하지 않음`);
}
export function movePc(s: Machine, target: number, g: Guard): Machine {
    if (!Number.isInteger(target) || target < 0 || target >= 16)
        return message(s, '분기 거부: 메모리 범위 밖');
    if (g.execute && target >= 8) return message(s, '분기 거부: 8–15번 데이터 영역은 실행 불가');
    return message({ ...s, pc: target, halted: false }, `PC → ${target} · 다음 한 단계에서 이 칸을 읽음`);
}
export function step(s: Machine, g: Guard): Machine {
    if (s.halted) return s;
    if (s.steps >= g.budget) return message({ ...s, halted: true }, `실행량 한도 ${g.budget}단계로 중단`);
    if (s.pc < 0 || s.pc >= 16 || (g.execute && s.pc >= 8))
        return message({ ...s, halted: true }, '실행 거부: 허용 명령 영역 밖');
    const code = s.memory[s.pc]!;
    if (g.opcode && code > 4)
        return message({ ...s, halted: true }, `명령 거부: ${code}은 허용 집합 0–4에 없음`);
    let next = { ...s, memory: [...s.memory], pc: s.pc + 1, steps: s.steps + 1 };
    if (code === 0) next.halted = true;
    if (code === 1) next.memory[8] = (next.memory[8]! + 1) % 256;
    if (code === 2) next.position = (s.position + 1) % 6;
    if (code === 3) next.scene = !s.scene;
    if (code === 4) next.pc = s.pc;
    return message(
        next,
        `${s.pc}번 값 ${code} → ${commands[code] ?? '미정의 값 건너뜀'}${s.pc >= 8 ? ' (데이터를 명령으로 해석)' : ''}`,
    );
}
export function run(s: Machine, g: Guard) {
    let result = s;
    for (let i = 0; i < 65 && !result.halted; i++) result = step(result, g);
    return result;
}
