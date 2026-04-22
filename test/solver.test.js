"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  state,
  parseHints,
  buildEmptyGrid,
  generateLinePossibilities,
  analyzeLine,
  backtrackingSolve,
  isSolved,
  CELL_UNKNOWN,
  CELL_FILLED,
  CELL_EMPTY,
} = require("../app.js");

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Set up the global state and return a fresh empty grid.
 * The solver functions read state.rows/cols/rowHints/colHints internally.
 */
function setupPuzzle(rowText, colText) {
  const rows = rowText.trim().split(/\n+/).length;
  const cols = colText.trim().split(/\n+/).length;

  state.rows = rows;
  state.cols = cols;
  state.rowHints = parseHints(rowText, rows);
  state.colHints = parseHints(colText, cols);
  state.grid = buildEmptyGrid(rows, cols);
  state.suggestions = [];

  return state.grid;
}

/**
 * Verify that every row/column of `grid` matches the supplied hints.
 * Returns { ok: true } or { ok: false, reason: string }.
 */
function verifySolution(grid, rowHints, colHints) {
  const rows = grid.length;
  const cols = grid[0].length;

  function lineToBlocks(line) {
    const blocks = [];
    let count = 0;
    for (const cell of line) {
      if (cell === CELL_FILLED) {
        count++;
      } else if (count > 0) {
        blocks.push(count);
        count = 0;
      }
    }
    if (count > 0) blocks.push(count);
    return blocks;
  }

  for (let r = 0; r < rows; r++) {
    const got = lineToBlocks(grid[r]);
    const want = rowHints[r].length ? rowHints[r] : [];
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      return { ok: false, reason: `Linha ${r + 1}: esperado [${want}], obtido [${got}]` };
    }
  }

  for (let c = 0; c < cols; c++) {
    const col = grid.map((row) => row[c]);
    const got = lineToBlocks(col);
    const want = colHints[c].length ? colHints[c] : [];
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      return { ok: false, reason: `Coluna ${c + 1}: esperado [${want}], obtido [${got}]` };
    }
  }

  return { ok: true };
}

// ─── generateLinePossibilities ───────────────────────────────────────────────

describe("generateLinePossibilities", () => {
  it("linha vazia (dica [])", () => {
    const known = [CELL_UNKNOWN, CELL_UNKNOWN, CELL_UNKNOWN];
    const result = generateLinePossibilities(3, [], known);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], [CELL_EMPTY, CELL_EMPTY, CELL_EMPTY]);
  });

  it("bloco único que preenche tudo", () => {
    const known = Array(4).fill(CELL_UNKNOWN);
    const result = generateLinePossibilities(4, [4], known);
    assert.equal(result.length, 1);
    assert.deepEqual(result[0], [CELL_FILLED, CELL_FILLED, CELL_FILLED, CELL_FILLED]);
  });

  it("bloco de 1 em linha de 3 → 3 posições", () => {
    const known = Array(3).fill(CELL_UNKNOWN);
    const result = generateLinePossibilities(3, [1], known);
    assert.equal(result.length, 3);
  });

  it("respeita célula já preenchida", () => {
    const known = [CELL_UNKNOWN, CELL_FILLED, CELL_UNKNOWN];
    const result = generateLinePossibilities(3, [1], known);
    assert.ok(result.length > 0);
    assert.ok(result.every((p) => p[1] === CELL_FILLED));
  });

  it("respeita célula já marcada como vazia", () => {
    const known = [CELL_EMPTY, CELL_UNKNOWN, CELL_UNKNOWN];
    const result = generateLinePossibilities(3, [2], known);
    assert.ok(result.every((p) => p[0] === CELL_EMPTY));
    assert.ok(result.every((p) => p[1] === CELL_FILLED && p[2] === CELL_FILLED));
  });

  it("sem possibilidades quando não cabe", () => {
    const known = Array(2).fill(CELL_UNKNOWN);
    const result = generateLinePossibilities(2, [3], known);
    assert.equal(result.length, 0);
  });
});

// ─── analyzeLine ─────────────────────────────────────────────────────────────

describe("analyzeLine", () => {
  it("linha que preenche tudo é forçada em todas as células", () => {
    const known = Array(5).fill(CELL_UNKNOWN);
    const { forced, valid } = analyzeLine(5, [5], known);
    assert.equal(valid, true);
    assert.equal(forced.length, 5);
    assert.ok(forced.every((f) => f.value === CELL_FILLED));
  });

  it("bloco de 3 em linha de 5 → células 2 e 3 (índices 1-3) forçadas", () => {
    const known = Array(5).fill(CELL_UNKNOWN);
    const { forced } = analyzeLine(5, [3], known);
    const forcedFilled = forced.filter((f) => f.value === CELL_FILLED);
    // O bloco pode começar em 0,1,2 — sobreposição é índices 2 (0-indexed)
    assert.ok(forcedFilled.some((f) => f.index === 2));
  });

  it("retorna valid:false quando impossível", () => {
    const known = [CELL_EMPTY, CELL_EMPTY, CELL_EMPTY];
    const { valid } = analyzeLine(3, [4], known);
    assert.equal(valid, false);
  });

  it("célula já marcada não aparece em forced", () => {
    const known = [CELL_FILLED, CELL_UNKNOWN, CELL_UNKNOWN, CELL_UNKNOWN, CELL_UNKNOWN];
    const { forced } = analyzeLine(5, [5], known);
    assert.ok(forced.every((f) => f.index !== 0));
  });
});

// ─── Puzzles completos ────────────────────────────────────────────────────────

describe("backtrackingSolve — puzzles completos", () => {
  /**
   * 3×3 — cruz simples, solução única:
   *   ● ○ ●
   *   ● ● ●
   *   ● ○ ●
   * Linhas: [1,1] / [3] / [1,1]
   * Colunas: [3] / [1] / [3]
   */
  it("3×3 puzzle simples", () => {
    const grid = setupPuzzle("1 1\n3\n1 1", "3\n1\n3");
    const solved = backtrackingSolve(grid);
    assert.ok(solved, "O solver deveria encontrar solução");
    const check = verifySolution(solved, state.rowHints, state.colHints);
    assert.ok(check.ok, check.reason);
  });

  /**
   * 5×5 — forma de coração:
   *   ○ ● ○ ● ○
   *   ● ● ● ● ●
   *   ● ● ● ● ●
   *   ○ ● ● ● ○
   *   ○ ○ ● ○ ○
   * Linhas: [1,1] / [5] / [5] / [3] / [1]
   * Colunas: [2] / [4] / [4] / [4] / [2]
   */
  it("5×5 puzzle coração", () => {
    const rowText = "1 1\n5\n5\n3\n1";
    const colText = "2\n4\n4\n4\n2";
    const grid = setupPuzzle(rowText, colText);
    const solved = backtrackingSolve(grid);
    assert.ok(solved, "O solver deveria encontrar solução");
    const check = verifySolution(solved, state.rowHints, state.colHints);
    assert.ok(check.ok, check.reason);
  });

  /**
   * 5×5 — seta apontando para direita:
   *   ● ○ ○ ○ ○
   *   ● ● ○ ○ ○
   *   ● ● ● ● ●
   *   ● ● ○ ○ ○
   *   ● ○ ○ ○ ○
   * Linhas: [1] / [2] / [5] / [2] / [1]
   * Colunas: [5] / [3] / [1] / [1] / [1]
   */
  it("5×5 puzzle seta", () => {
    const rowText = "1\n2\n5\n2\n1";
    const colText = "5\n3\n1\n1\n1";
    const grid = setupPuzzle(rowText, colText);
    const solved = backtrackingSolve(grid);
    assert.ok(solved, "O solver deveria encontrar solução");
    const check = verifySolution(solved, state.rowHints, state.colHints);
    assert.ok(check.ok, check.reason);
  });

  /**
   * 5×5 — xadrez alternado (duas soluções válidas, basta verificar que a encontrada é correta):
   *   ○ ● ○ ● ○
   *   ● ○ ● ○ ●
   *   ○ ● ○ ● ○
   *   ● ○ ● ○ ●
   *   ○ ● ○ ● ○
   * Linhas: [1,1] / [1,1,1] / [1,1] / [1,1,1] / [1,1]
   * Colunas: [1,1] / [1,1,1] / [1,1] / [1,1,1] / [1,1]
   * (Tem solução espelhada também, apenas verificamos que a encontrada satisfaz as dicas.)
   */
  it("5×5 puzzle xadrez — valida que qualquer solução encontrada é correta", () => {
    const hints = "1 1\n1 1 1\n1 1\n1 1 1\n1 1";
    const grid = setupPuzzle(hints, hints);
    const solved = backtrackingSolve(grid);
    assert.ok(solved, "O solver deveria encontrar solução");
    const check = verifySolution(solved, state.rowHints, state.colHints);
    assert.ok(check.ok, check.reason);
  });

  /**
   * Puzzle 10×10 — bandeira simples:
   * Solução esperada: faixas horizontais alternadas
   * Linhas: [10],[10],[10],[10],[10] (linhas cheias e linhas vazias)
   * Mais precisamente: linhas 1,3,5 cheias; linhas 2,4 vazias
   * Linhas: [10] / [0] / [10] / [0] / [10] / [0] / [10] / [0] / [10] / [0]
   * Colunas: [1,1,1,1,1] × 10
   */
  it("10×10 puzzle faixas horizontais", () => {
    const rowText = "10\n0\n10\n0\n10\n0\n10\n0\n10\n0";
    const colText = Array(10).fill("1 1 1 1 1").join("\n");
    const grid = setupPuzzle(rowText, colText);
    const solved = backtrackingSolve(grid);
    assert.ok(solved, "O solver deveria encontrar solução");
    const check = verifySolution(solved, state.rowHints, state.colHints);
    assert.ok(check.ok, check.reason);
  });

  it("puzzle impossível retorna null", () => {
    // Linha 1 exige 3 preenchidos, coluna 1 exige 0 — incompatível num 3×1
    setupPuzzle("3", "0\n0\n0");
    const grid = state.grid;
    const solved = backtrackingSolve(grid);
    assert.equal(solved, null);
  });
});

// ─── isSolved ────────────────────────────────────────────────────────────────

describe("isSolved", () => {
  it("grade completamente preenchida corretamente é reconhecida como resolvida", () => {
    setupPuzzle("3", "1\n1\n1");
    state.grid = [[CELL_FILLED, CELL_FILLED, CELL_FILLED]];
    assert.equal(isSolved(state.grid), true);
  });

  it("grade vazia com múltiplas possibilidades não é resolvida", () => {
    // Dica [1] numa linha de 3 colunas → 3 arranjos possíveis, ainda não resolvido
    setupPuzzle("1", "1\n0\n0");
    assert.equal(isSolved(state.grid), false);
  });
});
