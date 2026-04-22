"use strict";

const LANG = {
  pt: {
    // Static UI
    app_title:              "Picross Assistant",
    subtitle:               "Arquivo único. Você define o puzzle, marca o tabuleiro, pede a próxima jogada lógica ou resolve tudo.",
    config_heading:         "Configuração",
    rows_label:             "Linhas",
    cols_label:             "Colunas",
    row_hints_label:        "Dicas das linhas",
    col_hints_label:        "Dicas das colunas",
    row_hints_hint:         "Uma linha por linha do puzzle. Separe números por espaço. Use 0 para linha vazia.",
    col_hints_hint:         "Uma linha por coluna do puzzle.",
    btn_build:              "Montar tabuleiro",
    btn_load_example:       "Carregar exemplo",
    btn_clear_board:        "Limpar marcações",
    click_instructions:     "Clique esquerdo: pinta. Clique direito: X. Clique de novo: limpa.",
    assistance_heading:     "Assistência",
    btn_next_move:          "Próxima jogada lógica",
    btn_solve_step:         "Aplicar 1 passo",
    btn_solve_all:          "Resolver tudo",
    btn_validate:           "Validar estado",
    btn_clear_suggestions:  "Limpar sugestões",
    legend_filled:          "preto",
    legend_cross:           "X",
    legend_suggest:         "sugestão",
    legend_confirm:         "resolvido pelo solver",
    board_heading:          "Tabuleiro",

    // Status messages
    status_ready:           "Pronto.",
    status_board_built:     "Tabuleiro montado.",
    status_example_loaded:  "Exemplo carregado. Esse é só um ponto de partida para você testar.",
    status_marks_cleared:   "Marcações limpas.",
    status_suggestions_cleared: "Sugestões limpas.",
    status_valid:           "Estado válido. Até aqui, as marcações ainda podem levar a uma solução.",
    status_no_moves_backtrack: "Nenhuma jogada lógica certa encontrada.\nTalvez precise de mais informação ou de tentativa/backtracking.",
    status_no_moves_step:   "Não achei nenhuma jogada lógica garantida neste ponto.",
    status_no_moves_suggest: "Nenhuma jogada lógica garantida encontrada no estado atual.",
    status_no_solution:     "Não consegui resolver. O puzzle pode estar inconsistente ou exigir um estado inicial diferente.",
    status_moves_found:     (n, reason) => `${n} jogada(s) lógica(s) encontrada(s). Por quê?\n\n${reason}`,
    status_applied:         (n, reason) => `Apliquei ${n} jogada(s) lógica(s).\n${reason}`,
    status_solved:          (n) => `Puzzle resolvido. ${n} célula(s) foram preenchidas/confirmadas pelo solver.`,
    status_invalid_row:     (r) => `Inválido: a linha ${r} não pode mais satisfazer a dica.`,
    status_invalid_col:     (c) => `Inválido: a coluna ${c} não pode mais satisfazer a dica.`,
    status_impossible_row:  (r) => `A linha ${r} ficou impossível com as marcações atuais.`,
    status_impossible_col:  (c) => `A coluna ${c} ficou impossível com as marcações atuais.`,

    // Parse errors
    parse_wrong_count:   (expected, got) => `Esperava ${expected} linhas de dicas, mas encontrei ${got}.`,
    parse_invalid_hint:  (line, val) => `Dica inválida na linha ${line}: "${val}"`,

    // Forced-cell explanations
    explain_empty_clue:       "A dica está vazia — toda a linha/coluna deve ficar em branco.",
    explain_single_block:     (sz, num, pos) => `O bloco de ${sz} (bloco ${num} da dica) só cabe começando na posição ${pos} → pinta direto.`,
    explain_overlap:          (sz, num, earliest, latest, os, oe) => `O bloco de ${sz} (bloco ${num} da dica) pode começar entre as posições ${earliest} e ${latest}, mas em qualquer caso cobre as posições ${os}–${oe} (sobreposição garantida).`,
    explain_all_arrangements: (n) => `Aparece como preenchida em todos os ${n} arranjos possíveis.`,
    explain_gap:              (maxLeft, minRight) => `Fica no vão entre o bloco anterior (termina antes de ${maxLeft}) e o próximo (começa depois de ${minRight}). Nenhum bloco alcança essa posição em nenhum arranjo possível.`,
    explain_before_first:     (n) => `Fica antes do primeiro bloco em todos os ${n} arranjos possíveis — nenhum bloco chega até aqui.`,
    explain_after_last:       (n) => `Fica após o último bloco em todos os ${n} arranjos possíveis — nenhum bloco chega até aqui.`,

    // Build explanation format
    clue_empty_label:   "[vazia]",
    action_fill:        "● PINTAR",
    action_cross:       "✕ MARCAR X",
    clue_word:          "dica",
    line_label:         (n) => `Linha ${n}`,
    col_label:          (n) => `Coluna ${n}`,
    cell_ref:           (row, col) => `L${row} C${col}`,

    // Tooltip
    tt_row_label:  "Linha",
    tt_col_label:  "Coluna",

    // Ordinals
    ordinal: (n) => n === 1 ? "1º" : n === 2 ? "2º" : n === 3 ? "3º" : `${n}º`,
  },

  en: {
    // Static UI
    app_title:              "Picross Assistant",
    subtitle:               "Single file. Define the puzzle, mark the board, ask for the next logical move or solve everything.",
    config_heading:         "Configuration",
    rows_label:             "Rows",
    cols_label:             "Columns",
    row_hints_label:        "Row clues",
    col_hints_label:        "Column clues",
    row_hints_hint:         "One line per puzzle row. Separate numbers with spaces. Use 0 for empty row.",
    col_hints_hint:         "One line per puzzle column.",
    btn_build:              "Build board",
    btn_load_example:       "Load example",
    btn_clear_board:        "Clear marks",
    click_instructions:     "Left click: fill. Right click: X. Click again: clear.",
    assistance_heading:     "Assistance",
    btn_next_move:          "Next logical move",
    btn_solve_step:         "Apply 1 step",
    btn_solve_all:          "Solve all",
    btn_validate:           "Validate state",
    btn_clear_suggestions:  "Clear suggestions",
    legend_filled:          "filled",
    legend_cross:           "X",
    legend_suggest:         "suggestion",
    legend_confirm:         "solved by solver",
    board_heading:          "Board",

    // Status messages
    status_ready:           "Ready.",
    status_board_built:     "Board built.",
    status_example_loaded:  "Example loaded. This is just a starting point for testing.",
    status_marks_cleared:   "Marks cleared.",
    status_suggestions_cleared: "Suggestions cleared.",
    status_valid:           "Valid state. The current marks can still lead to a solution.",
    status_no_moves_backtrack: "No certain logical move found.\nMight need more information or trial/backtracking.",
    status_no_moves_step:   "No guaranteed logical move found at this point.",
    status_no_moves_suggest: "No guaranteed logical move found in the current state.",
    status_no_solution:     "Could not solve. The puzzle may be inconsistent or require a different starting state.",
    status_moves_found:     (n, reason) => `${n} logical move(s) found. Why?\n\n${reason}`,
    status_applied:         (n, reason) => `Applied ${n} logical move(s).\n${reason}`,
    status_solved:          (n) => `Puzzle solved. ${n} cell(s) were filled/confirmed by the solver.`,
    status_invalid_row:     (r) => `Invalid: row ${r} can no longer satisfy its clue.`,
    status_invalid_col:     (c) => `Invalid: column ${c} can no longer satisfy its clue.`,
    status_impossible_row:  (r) => `Row ${r} became impossible with the current marks.`,
    status_impossible_col:  (c) => `Column ${c} became impossible with the current marks.`,

    // Parse errors
    parse_wrong_count:   (expected, got) => `Expected ${expected} hint lines, but found ${got}.`,
    parse_invalid_hint:  (line, val) => `Invalid hint at line ${line}: "${val}"`,

    // Forced-cell explanations
    explain_empty_clue:       "The clue is empty — the entire row/column must be blank.",
    explain_single_block:     (sz, num, pos) => `The block of ${sz} (hint block ${num}) only fits starting at position ${pos} → fills directly.`,
    explain_overlap:          (sz, num, earliest, latest, os, oe) => `The block of ${sz} (hint block ${num}) can start between positions ${earliest} and ${latest}, but in any case covers positions ${os}–${oe} (guaranteed overlap).`,
    explain_all_arrangements: (n) => `Appears as filled in all ${n} possible arrangements.`,
    explain_gap:              (maxLeft, minRight) => `Falls in the gap between the previous block (ends before ${maxLeft}) and the next (starts after ${minRight}). No block reaches this position in any possible arrangement.`,
    explain_before_first:     (n) => `Before the first block in all ${n} possible arrangements — no block reaches here.`,
    explain_after_last:       (n) => `After the last block in all ${n} possible arrangements — no block reaches here.`,

    // Build explanation format
    clue_empty_label:   "[empty]",
    action_fill:        "● FILL",
    action_cross:       "✕ MARK X",
    clue_word:          "clue",
    line_label:         (n) => `Row ${n}`,
    col_label:          (n) => `Column ${n}`,
    cell_ref:           (row, col) => `R${row} C${col}`,

    // Tooltip
    tt_row_label:  "Row",
    tt_col_label:  "Column",

    // Ordinals
    ordinal: (n) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`,
  },
};

let _currentLang = localStorage.getItem("picross_lang") || "pt";

window.t = function t(key, ...args) {
  const val = LANG[_currentLang]?.[key] ?? LANG["pt"][key];
  if (val === undefined) return key;
  return typeof val === "function" ? val(...args) : val;
};

window.setLang = function setLang(lang) {
  if (!LANG[lang]) return;
  _currentLang = lang;
  localStorage.setItem("picross_lang", lang);
  document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
  applyStaticTranslations();
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
};

function applyStaticTranslations() {
  document.title = window.t("app_title");
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = window.t(el.dataset.i18n);
  });
}

// Apply on load (scripts are at end of <body>, DOM is ready)
applyStaticTranslations();
document.querySelectorAll(".lang-btn").forEach(btn => {
  btn.classList.toggle("active", btn.dataset.lang === _currentLang);
});
