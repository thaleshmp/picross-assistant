# Picross Assistant

A browser-based solving aid for Picross (Nonogram) puzzles. Enter your row and column clues, mark cells on the board, and get step-by-step logical guidance — or let the solver finish the puzzle for you.

## Features

- **Next logical move** — highlights every cell that can be determined with certainty and explains why, in plain language
- **Apply one step** — automatically fills all currently forced cells
- **Solve all** — full backtracking solver that completes the puzzle
- **Validate state** — checks whether the current board is still consistent with the clues
- **Didactic explanations** — identifies which clue block drives each decision and describes the reasoning (overlap, gap exclusion, single position, etc.)
- **Cell tooltips** — hover over any cell while suggestions are active to see which clue blocks can reach it from both its row and column
- **PT / EN** — interface available in Portuguese and English; preference is saved in `localStorage`

## How to use

1. Set the number of rows and columns
2. Enter the clues — one puzzle row/column per text line, numbers separated by spaces; use `0` for an empty row or column
3. Click **Build board**
4. Mark cells on the board (left click to fill, right click to mark as empty, click again to clear)
5. Use the assistance buttons to get hints or let the solver take over

## Running locally

No build step or dependencies required. Just open `index.html` in a browser:

```
open index.html
```

Or serve it with any static file server:

```
npx serve .
```

## How the solver works

1. `generateLinePossibilities` enumerates every valid block arrangement for a line, respecting already-marked cells
2. `analyzeLine` compares all arrangements: any position that is filled (or empty) in 100% of them is forced
3. `deterministicReduce` applies forced cells repeatedly until no more progress is made
4. `backtrackingSolve` falls back to a guess-and-backtrack strategy when pure logic is not enough
