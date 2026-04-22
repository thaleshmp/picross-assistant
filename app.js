// filepath: app.js
const CELL_UNKNOWN = 0;
const CELL_FILLED = 1;
const CELL_EMPTY = -1;

// Delegates to window.t (set by i18n.js in the browser).
// Uses const so it doesn't overwrite window.t as a function declaration would.
// Falls back to returning the key so Node.js tests work without i18n.js.
const t = (typeof window !== "undefined" && typeof window.t === "function")
  ? (key, ...args) => window.t(key, ...args)
  : (key) => key;

let state = {
  rows: 15,
  cols: 20,
  rowHints: [],
  colHints: [],
  grid: [],
  suggestions: []
};

const $ = (id) => document.getElementById(id);

function parseHints(text, expectedCount) {
  const lines = text.trim().split(/\n+/).map(x => x.trim());
  if (lines.length !== expectedCount) {
    throw new Error(t("parse_wrong_count", expectedCount, lines.length));
  }
  return lines.map((line, idx) => {
    if (!line || line === "0") return [];
    const nums = line.split(/[\s,]+/).map(Number);
    if (nums.some(n => !Number.isInteger(n) || n <= 0)) {
      throw new Error(t("parse_invalid_hint", idx + 1, line));
    }
    return nums;
  });
}

function buildEmptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(CELL_UNKNOWN));
}

function maxHintDepth(hints) {
  return Math.max(1, ...hints.map(h => h.length));
}

function setStatus(text) {
  $("status").textContent = text;
}

function clearSuggestions() {
  state.suggestions = [];
  renderBoard();
}

function toggleCell(r, c, mode) {
  clearSuggestions();
  const current = state.grid[r][c];
  if (mode === "fill") {
    state.grid[r][c] = current === CELL_FILLED ? CELL_UNKNOWN : CELL_FILLED;
  } else if (mode === "cross") {
    state.grid[r][c] = current === CELL_EMPTY ? CELL_UNKNOWN : CELL_EMPTY;
  }
  renderBoard();
}

function getColumn(c) {
  return state.grid.map(row => row[c]);
}

function setColumn(c, values) {
  for (let r = 0; r < state.rows; r++) {
    state.grid[r][c] = values[r];
  }
}

// Get block spans from a possibility array
function getBlockSpans(possibility) {
  const spans = [];
  let i = 0;
  while (i < possibility.length) {
    if (possibility[i] === CELL_FILLED) {
      let start = i;
      while (i < possibility.length && possibility[i] === CELL_FILLED) i++;
      spans.push({ start, end: i - 1 });
    } else {
      i++;
    }
  }
  return spans;
}

// Get which hint blocks can reach a given position in a line
// Returns: { blocks: [{ value: number, index: number }], forced: value, emptyReason: string|null }
function getLineBlockInfo(length, hints, known, pos) {
  if (hints.length === 0) return { blocks: [], forced: null, emptyReason: t("explain_empty_clue") };

  const possibilities = generateLinePossibilities(length, hints, known);
  if (possibilities.length === 0) return { blocks: [], forced: null, emptyReason: null };

  // Find which blocks can reach this position
  const validBlocks = [];
  for (let bi = 0; bi < hints.length; bi++) {
    const canReach = possibilities.some(p => {
      const spans = getBlockSpans(p);
      return spans[bi] && spans[bi].start <= pos && pos <= spans[bi].end;
    });
    if (canReach) {
      const ordinal = t("ordinal", bi + 1);
      validBlocks.push({ value: hints[bi], index: bi + 1, ordinal });
    }
  }

  const emptyReason = validBlocks.length === 0
    ? explainForcedEmpty(pos, possibilities, hints, length)
    : null;

  // Check if forced (100% same value in all possibilities)
  const first = possibilities[0][pos];
  const allSame = possibilities.every(p => p[pos] === first);
  const forced = (allSame && known[pos] !== first) ? first : null;

  return { blocks: validBlocks, forced, emptyReason };
}

// Get block info for a cell (row + column)
function getCellBlockInfo(r, c) {
  const rowInfo = getLineBlockInfo(state.cols, state.rowHints[r], state.grid[r], c);
  const colInfo = getLineBlockInfo(state.rows, state.colHints[c], getColumn(c), r);
  return { row: rowInfo, col: colInfo };
}

function renderBoard() {
  const boardHost = $("boardHost");
  const rowDepth = maxHintDepth(state.rowHints);
  const colDepth = maxHintDepth(state.colHints);

  const board = document.createElement("div");
  board.className = "board";
  board.style.gridTemplateColumns = `repeat(${rowDepth + state.cols}, 30px)`;
  board.style.gridTemplateRows = `repeat(${colDepth + state.rows}, 30px)`;

  for (let rr = 0; rr < colDepth; rr++) {
    for (let cc = 0; cc < rowDepth; cc++) {
      const corner = document.createElement("div");
      corner.className = "corner";
      board.appendChild(corner);
    }
    for (let c = 0; c < state.cols; c++) {
      const hintCell = document.createElement("div");
      hintCell.className = "hint-cell";
      const hint = state.colHints[c];
      const offset = colDepth - hint.length;
      hintCell.textContent = rr >= offset ? hint[rr - offset] : "";
      if ((c + 1) % 5 === 0) hintCell.classList.add("thick-right");
      if (rr === colDepth - 1) hintCell.classList.add("thick-bottom");
      board.appendChild(hintCell);
    }
  }

  for (let r = 0; r < state.rows; r++) {
    for (let cc = 0; cc < rowDepth; cc++) {
      const hintCell = document.createElement("div");
      hintCell.className = "hint-cell";
      const hint = state.rowHints[r];
      const offset = rowDepth - hint.length;
      hintCell.textContent = cc >= offset ? hint[cc - offset] : "";
      if (cc === rowDepth - 1) hintCell.classList.add("thick-right");
      if ((r + 1) % 5 === 0) hintCell.classList.add("thick-bottom");
      board.appendChild(hintCell);
    }

    for (let c = 0; c < state.cols; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      const v = state.grid[r][c];
      if (v === CELL_FILLED) cell.classList.add("filled");
      if (v === CELL_EMPTY) cell.classList.add("cross");

      // Add hover tooltip with block info
      if (state.suggestions.length > 0) {
        let tooltipEl = null;
        
        cell.addEventListener("mouseenter", () => {
          const info = getCellBlockInfo(r, c);
          let html = "";
          
          if (info.row.blocks.length) {
            const forced = info.row.forced === CELL_FILLED ? " ✓" : (info.row.forced === CELL_EMPTY ? " ✕" : "");
            const blockStr = info.row.blocks
              .map(b => `<span class="tt-row">${b.value} (${b.ordinal})</span>`)
              .join(", ");
            html += `<div class="tt-line">${t("tt_row_label")}: ${blockStr}${forced}</div>`;
          } else if (info.row.emptyReason) {
            html += `<div class="tt-line">${t("tt_row_label")}: <span class="tt-empty">${info.row.emptyReason}</span></div>`;
          }
          if (info.col.blocks.length) {
            const forced = info.col.forced === CELL_FILLED ? " ✓" : (info.col.forced === CELL_EMPTY ? " ✕" : "");
            const blockStr = info.col.blocks
              .map(b => `<span class="tt-col">${b.value} (${b.ordinal})</span>`)
              .join(", ");
            html += `<div class="tt-line">${t("tt_col_label")}: ${blockStr}${forced}</div>`;
          } else if (info.col.emptyReason) {
            html += `<div class="tt-line">${t("tt_col_label")}: <span class="tt-empty">${info.col.emptyReason}</span></div>`;
          }
          
          if (html) {
            tooltipEl = document.createElement("div");
            tooltipEl.className = "cell-tooltip";
            tooltipEl.innerHTML = html;
            cell.appendChild(tooltipEl);
          }
        });
        cell.addEventListener("mouseleave", () => {
          if (tooltipEl) {
            tooltipEl.remove();
            tooltipEl = null;
          }
        });
      }

      const suggestion = state.suggestions.find(s => s.r === r && s.c === c);
      if (suggestion) {
        cell.classList.add(suggestion.type === CELL_FILLED ? "suggest-fill" : "suggest-cross");
        if (suggestion.applied) {
          cell.classList.remove("suggest-fill", "suggest-cross");
          cell.classList.add(suggestion.type === CELL_FILLED ? "solved-fill" : "solved-cross");
        }
      }

      if ((c + 1) % 5 === 0) cell.classList.add("thick-right");
      if ((r + 1) % 5 === 0) cell.classList.add("thick-bottom");

      cell.addEventListener("click", () => toggleCell(r, c, "fill"));
      cell.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        toggleCell(r, c, "cross");
      });
      board.appendChild(cell);
    }
  }

  boardHost.innerHTML = "";
  boardHost.appendChild(board);
}

function generateLinePossibilities(length, clues, known) {
  const results = [];
  const line = Array(length).fill(CELL_EMPTY);

  function canPlace(start, blockSize) {
    for (let i = 0; i < blockSize; i++) {
      const idx = start + i;
      if (idx >= length) return false;
      if (known[idx] === CELL_EMPTY) return false;
    }
    if (start > 0 && line[start - 1] === CELL_FILLED) return false;
    if (start + blockSize < length && known[start + blockSize] === CELL_FILLED) return false;
    return true;
  }

  function matchesKnown(candidate) {
    for (let i = 0; i < length; i++) {
      if (known[i] !== CELL_UNKNOWN && known[i] !== candidate[i]) return false;
    }
    return true;
  }

  function rec(clueIndex, pos, current) {
    if (clueIndex === clues.length) {
      const candidate = current.slice();
      for (let i = pos; i < length; i++) candidate[i] = CELL_EMPTY;
      if (matchesKnown(candidate)) results.push(candidate);
      return;
    }

    const remaining = clues.slice(clueIndex);
    const remainingMin = remaining.reduce((a, b) => a + b, 0) + (remaining.length - 1);

    for (let start = pos; start <= length - remainingMin; start++) {
      const candidate = current.slice();

      let invalid = false;
      for (let i = pos; i < start; i++) {
        candidate[i] = CELL_EMPTY;
        if (known[i] === CELL_FILLED) {
          invalid = true;
          break;
        }
      }
      if (invalid) continue;

      const block = clues[clueIndex];
      for (let i = 0; i < block; i++) {
        if (known[start + i] === CELL_EMPTY) {
          invalid = true;
          break;
        }
        candidate[start + i] = CELL_FILLED;
      }
      if (invalid) continue;

      const nextPos = start + block;
      if (clueIndex < clues.length - 1) {
        if (nextPos >= length || known[nextPos] === CELL_FILLED) continue;
        candidate[nextPos] = CELL_EMPTY;
        rec(clueIndex + 1, nextPos + 1, candidate);
      } else {
        rec(clueIndex + 1, nextPos, candidate);
      }
    }
  }

  if (clues.length === 0) {
    const candidate = Array(length).fill(CELL_EMPTY);
    return matchesKnown(candidate) ? [candidate] : [];
  }

  rec(0, 0, line);
  return results;
}

function analyzeLine(length, clues, known) {
  const possibilities = generateLinePossibilities(length, clues, known);
  if (possibilities.length === 0) {
    return { valid: false, possibilities: [], forced: [] };
  }
  const forced = [];
  for (let i = 0; i < length; i++) {
    const first = possibilities[0][i];
    const allSame = possibilities.every(p => p[i] === first);
    if (allSame && known[i] !== first) {
      forced.push({ index: i, value: first });
    }
  }
  return { valid: true, possibilities, forced };
}

// For a FILLED forced cell: find which clue block covers it in every possibility,
// and compute the earliest/latest start positions of that block across all possibilities.
function explainForcedCell(cellIndex, possibilities, clues) {
  if (possibilities.length === 0) return null;

  const blockCounts = clues.length;

  function getBlockSpans(possibility) {
    const spans = [];
    let i = 0;
    while (i < possibility.length) {
      if (possibility[i] === CELL_FILLED) {
        let start = i;
        while (i < possibility.length && possibility[i] === CELL_FILLED) i++;
        spans.push({ start, end: i - 1, size: i - start });
      } else {
        i++;
      }
    }
    return spans;
  }

  const blockIndexInPoss = possibilities.map(p => {
    const spans = getBlockSpans(p);
    for (let bi = 0; bi < spans.length; bi++) {
      if (spans[bi].start <= cellIndex && cellIndex <= spans[bi].end) return bi;
    }
    return -1;
  });

  const allSameBlock = blockIndexInPoss.every(bi => bi === blockIndexInPoss[0]) && blockIndexInPoss[0] !== -1;

  if (allSameBlock) {
    const bi = blockIndexInPoss[0];
    const blockSize = clues[bi];
    const starts = possibilities.map(p => getBlockSpans(p)[bi].start);
    const earliest = Math.min(...starts) + 1;
    const latest = Math.max(...starts) + 1;
    const overlapStart = Math.max(...starts) + 1;
    const overlapEnd = Math.min(...starts) + blockSize;

    if (earliest === latest) {
      return t("explain_single_block", blockSize, bi + 1, earliest);
    } else {
      return t("explain_overlap", blockSize, bi + 1, earliest, latest, overlapStart, overlapEnd);
    }
  }

  return t("explain_all_arrangements", possibilities.length);
}

function explainForcedEmpty(cellIndex, possibilities, clues, lineLength) {
  if (clues.length === 0) return t("explain_empty_clue");

  const allEmpty = possibilities.every(p => p[cellIndex] === CELL_EMPTY);
  if (!allEmpty) return null;

  function getBlockSpans(possibility) {
    const spans = [];
    let i = 0;
    while (i < possibility.length) {
      if (possibility[i] === CELL_FILLED) {
        let start = i;
        while (i < possibility.length && possibility[i] === CELL_FILLED) i++;
        spans.push({ start, end: i - 1 });
      } else { i++; }
    }
    return spans;
  }

  let maxReachFromLeft = -1;
  let minReachFromRight = lineLength;
  for (const p of possibilities) {
    const spans = getBlockSpans(p);
    for (const s of spans) {
      if (s.end < cellIndex) maxReachFromLeft = Math.max(maxReachFromLeft, s.end);
      if (s.start > cellIndex) minReachFromRight = Math.min(minReachFromRight, s.start);
    }
  }

  if (maxReachFromLeft >= 0 && minReachFromRight < lineLength) {
    return t("explain_gap", maxReachFromLeft + 2, minReachFromRight);
  } else if (maxReachFromLeft < 0) {
    return t("explain_before_first", possibilities.length);
  } else {
    return t("explain_after_last", possibilities.length);
  }
}

function buildExplanation(label, cellPos, isRow, lineIndex, clues, analysis) {
  const dicaStr = clues.length ? `[${clues.join(", ")}]` : t("clue_empty_label");
  const origem = isRow ? t("line_label", lineIndex + 1) : t("col_label", lineIndex + 1);
  const celula = isRow
    ? t("cell_ref", lineIndex + 1, cellPos + 1)
    : t("cell_ref", cellPos + 1, lineIndex + 1);
  const acao = label === CELL_FILLED ? t("action_fill") : t("action_cross");

  let motivo;
  if (label === CELL_FILLED) {
    motivo = explainForcedCell(cellPos, analysis.possibilities, clues);
  } else {
    motivo = explainForcedEmpty(cellPos, analysis.possibilities, clues, analysis.possibilities[0]?.length ?? 0);
  }

  return `${acao}  ${celula}  (${t("clue_word")} ${origem}: ${dicaStr})\n   ↳ ${motivo}`;
}

function findNextLogicalMoves() {
  const moves = [];
  const explanations = [];

  for (let r = 0; r < state.rows; r++) {
    const known = state.grid[r];
    const analysis = analyzeLine(state.cols, state.rowHints[r], known);
    if (!analysis.valid) {
      return { valid: false, moves: [], reason: t("status_impossible_row", r + 1) };
    }
    for (const item of analysis.forced) {
      moves.push({ r, c: item.index, type: item.value, source: "row", line: r });
    }
    if (analysis.forced.length > 0) {
      for (const f of analysis.forced) {
        explanations.push(buildExplanation(f.value, f.index, true, r, state.rowHints[r], analysis));
      }
    }
  }

  for (let c = 0; c < state.cols; c++) {
    const known = getColumn(c);
    const analysis = analyzeLine(state.rows, state.colHints[c], known);
    if (!analysis.valid) {
      return { valid: false, moves: [], reason: t("status_impossible_col", c + 1) };
    }
    for (const item of analysis.forced) {
      const exists = moves.find(m => m.r === item.index && m.c === c);
      if (!exists) {
        moves.push({ r: item.index, c, type: item.value, source: "col", line: c });
      }
    }
    if (analysis.forced.length > 0) {
      for (const f of analysis.forced) {
        const alreadyExplained = explanations.some(e => e.includes(t("cell_ref", f.index + 1, c + 1)));
        if (alreadyExplained) continue;
        explanations.push(buildExplanation(f.value, f.index, false, c, state.colHints[c], analysis));
      }
    }
  }

  return {
    valid: true,
    moves,
    reason: moves.length
      ? explanations.slice(0, 10).join("\n\n")
      : t("status_no_moves_suggest")
  };
}

function applyMoves(moves, markApplied = true) {
  for (const m of moves) {
    state.grid[m.r][m.c] = m.type;
  }
  state.suggestions = moves.map(m => ({ ...m, applied: markApplied }));
  renderBoard();
}

function suggestMoves() {
  const result = findNextLogicalMoves();
  if (!result.valid) {
    state.suggestions = [];
    renderBoard();
    setStatus(result.reason);
    return;
  }
  const unique = dedupeMoves(result.moves);
  state.suggestions = unique.map(m => ({ ...m, applied: false }));
  renderBoard();

  if (unique.length === 0) {
    setStatus(t("status_no_moves_backtrack"));
  } else {
    setStatus(t("status_moves_found", unique.length, result.reason));
  }
}

function solveOneStep() {
  const result = findNextLogicalMoves();
  if (!result.valid) {
    setStatus(result.reason);
    return;
  }
  const unique = dedupeMoves(result.moves);
  if (unique.length === 0) {
    setStatus(t("status_no_moves_step"));
    return;
  }
  applyMoves(unique, true);
  setStatus(t("status_applied", unique.length, result.reason));
}

function dedupeMoves(moves) {
  const map = new Map();
  for (const m of moves) {
    const key = `${m.r},${m.c}`;
    map.set(key, m);
  }
  return [...map.values()];
}

function validateBoard() {
  clearSuggestions();
  for (let r = 0; r < state.rows; r++) {
    const a = analyzeLine(state.cols, state.rowHints[r], state.grid[r]);
    if (!a.valid) {
      setStatus(t("status_invalid_row", r + 1));
      return false;
    }
  }
  for (let c = 0; c < state.cols; c++) {
    const a = analyzeLine(state.rows, state.colHints[c], getColumn(c));
    if (!a.valid) {
      setStatus(t("status_invalid_col", c + 1));
      return false;
    }
  }
  setStatus(t("status_valid"));
  return true;
}

function isSolved(grid = state.grid) {
  for (let r = 0; r < state.rows; r++) {
    const a = analyzeLine(state.cols, state.rowHints[r], grid[r]);
    if (!a.valid || a.possibilities.length !== 1) return false;
  }
  for (let c = 0; c < state.cols; c++) {
    const a = analyzeLine(state.rows, state.colHints[c], grid.map(row => row[c]));
    if (!a.valid || a.possibilities.length !== 1) return false;
  }
  return true;
}

function cloneGrid(grid) {
  return grid.map(row => row.slice());
}

function deterministicReduce(grid) {
  let changed = true;
  while (changed) {
    changed = false;

    for (let r = 0; r < state.rows; r++) {
      const analysis = analyzeLine(state.cols, state.rowHints[r], grid[r]);
      if (!analysis.valid) return null;
      for (const f of analysis.forced) {
        if (grid[r][f.index] !== f.value) {
          grid[r][f.index] = f.value;
          changed = true;
        }
      }
    }

    for (let c = 0; c < state.cols; c++) {
      const col = grid.map(row => row[c]);
      const analysis = analyzeLine(state.rows, state.colHints[c], col);
      if (!analysis.valid) return null;
      for (const f of analysis.forced) {
        if (grid[f.index][c] !== f.value) {
          grid[f.index][c] = f.value;
          changed = true;
        }
      }
    }
  }
  return grid;
}

function chooseGuessCell(grid) {
  let best = null;

  for (let r = 0; r < state.rows; r++) {
    const analysis = analyzeLine(state.cols, state.rowHints[r], grid[r]);
    if (!analysis.valid) return null;
    for (let c = 0; c < state.cols; c++) {
      if (grid[r][c] !== CELL_UNKNOWN) continue;
      let fillCount = 0;
      for (const p of analysis.possibilities) if (p[c] === CELL_FILLED) fillCount++;
      const ratio = fillCount / analysis.possibilities.length;
      const score = Math.abs(0.5 - ratio);
      if (!best || score < best.score) {
        best = { r, c, score, ratio };
      }
    }
  }

  return best;
}

function backtrackingSolve(grid) {
  grid = deterministicReduce(cloneGrid(grid));
  if (!grid) return null;
  if (isSolved(grid)) return grid;

  const guess = chooseGuessCell(grid);
  if (!guess) return null;

  for (const val of [CELL_FILLED, CELL_EMPTY]) {
    const next = cloneGrid(grid);
    next[guess.r][guess.c] = val;
    const solved = backtrackingSolve(next);
    if (solved) return solved;
  }
  return null;
}

function solveAll() {
  clearSuggestions();
  if (!validateBoard()) return;

  const solved = backtrackingSolve(state.grid);
  if (!solved) {
    setStatus(t("status_no_solution"));
    return;
  }

  const changes = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c] !== solved[r][c]) {
        changes.push({ r, c, type: solved[r][c], applied: true });
      }
    }
  }

  state.grid = solved;
  state.suggestions = changes;
  renderBoard();
  setStatus(t("status_solved", changes.length));
}

function rebuildFromInputs() {
  const rows = Number($("rows").value);
  const cols = Number($("cols").value);
  const rowHints = parseHints($("rowHints").value, rows);
  const colHints = parseHints($("colHints").value, cols);

  state.rows = rows;
  state.cols = cols;
  state.rowHints = rowHints;
  state.colHints = colHints;
  state.grid = buildEmptyGrid(rows, cols);
  state.suggestions = [];

  renderBoard();
  setStatus(t("status_board_built"));
}

function loadExample() {
  $("rows").value = 15;
  $("cols").value = 20;
  rebuildFromInputs();
  setStatus(t("status_example_loaded"));
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CELL_UNKNOWN,
    CELL_FILLED,
    CELL_EMPTY,
    state,
    parseHints,
    buildEmptyGrid,
    maxHintDepth,
    generateLinePossibilities,
    analyzeLine,
    findNextLogicalMoves,
    isSolved,
    cloneGrid,
    deterministicReduce,
    backtrackingSolve,
    rebuildFromInputs,
    loadExample,
    validateBoard,
    clearSuggestions,
    getColumn,
    setColumn,
    applyMoves,
    suggestMoves,
    solveOneStep,
    solveAll,
    dedupeMoves
  };
}

// Initialize event listeners (browser only)
if (typeof document !== "undefined") {
  $("buildBtn").addEventListener("click", () => {
    try {
      rebuildFromInputs();
    } catch (err) {
      setStatus(err.message);
    }
  });

  $("clearBoardBtn").addEventListener("click", () => {
    state.grid = buildEmptyGrid(state.rows, state.cols);
    clearSuggestions();
    renderBoard();
    setStatus(t("status_marks_cleared"));
  });

  $("nextMoveBtn").addEventListener("click", suggestMoves);
  $("solveStepBtn").addEventListener("click", solveOneStep);
  $("solveAllBtn").addEventListener("click", solveAll);
  $("validateBtn").addEventListener("click", validateBoard);
  $("clearSuggestionsBtn").addEventListener("click", () => {
    clearSuggestions();
    setStatus(t("status_suggestions_cleared"));
  });

  // Initial load
  try {
    rebuildFromInputs();
  } catch (err) {
    setStatus(err.message);
  }
}