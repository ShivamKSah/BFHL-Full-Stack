# 🌳 BFHL Challenge — Graph Hierarchy Explorer

> **A full-stack Node.js application** that parses directed-edge strings (`A->B`), validates input, constructs tree hierarchies, detects cycles, and returns a structured JSON report — all wrapped in a premium, Scrapivo-inspired dark UI.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
  - [Endpoint](#endpoint)
  - [Request Format](#request-format)
  - [Response Schema](#response-schema)
  - [Processing Pipeline](#processing-pipeline)
- [Frontend](#frontend)
- [Example](#example)
- [Design Decisions](#design-decisions)

---

## Overview

This project solves the **BFHL Full-Stack Challenge**: given an array of edge strings like `["A->B", "A->C", "B->D"]`, the API:

1. **Validates** each edge against the `X->Y` pattern (single uppercase letters).
2. **De-duplicates** edges, keeping the first occurrence.
3. **Builds tree hierarchies** with "first-parent-wins" for multi-parent nodes.
4. **Detects cycles** in groups with no natural root.
5. Returns a JSON report with hierarchies, depth, cycle flags, invalid entries, duplicates, and a summary.

The frontend provides a cinematic landing page and an interactive explorer to visualize the results.

---

## Tech Stack

| Layer      | Technology                      |
|------------|---------------------------------|
| Runtime    | Node.js                        |
| Framework  | Express.js                     |
| CORS       | `cors` middleware               |
| Frontend   | Vanilla HTML/CSS/JS (no framework) |
| Fonts      | Playfair Display, Inter (Google Fonts) |
| Design     | Glassmorphism, dark theme, CSS transitions |

---

## Project Structure

```
Bajaj/
├── index.js              # Express server + POST /bfhl logic
├── package.json          # Dependencies & scripts
├── public/               # Static frontend served by Express
│   ├── index.html        # SPA markup
│   ├── style.css         # Scrapivo-inspired dark theme
│   ├── script.js         # API interaction & DOM rendering
│   └── hero-bg.png       # Cinematic hero background image
└── README.md             # ← You are here
```

---

## Getting Started

### Prerequisites

- **Node.js** v16 or later
- **npm** (included with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Bajaj

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

The server starts at **http://localhost:3000**. Open it in your browser to see the frontend.

### Environment Variables

| Variable | Default | Description       |
|----------|---------|-------------------|
| `PORT`   | `3000`  | Server port number |

---

## API Documentation

### Endpoint

```
POST /bfhl
Content-Type: application/json
```

CORS is enabled for all origins.

### Request Format

```json
{
  "data": ["A->B", "A->C", "B->D", "C->E", "E->F"]
}
```

Each element should be a string in the format `X->Y` where X and Y are **single uppercase letters** (A-Z).

### Response Schema

```json
{
  "user_id": "shivam_kumar_sah_24042026",
  "email_id": "shivam.ksah@college.edu",
  "college_roll_number": "22BCS1234",
  "hierarchies": [
    {
      "root": "A",
      "tree": { "A": { "B": { "D": {} }, "C": { "E": { "F": {} } } } },
      "depth": 4
    }
  ],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

#### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | `string` | Identifier in `fullname_ddmmyyyy` format |
| `email_id` | `string` | College email address |
| `college_roll_number` | `string` | College roll number |
| `hierarchies` | `array` | Array of tree/cycle objects |
| `hierarchies[].root` | `string` | Root node of the tree (or lex-smallest node in a cycle) |
| `hierarchies[].tree` | `object` | Nested parent-child map; `{}` for cyclic groups |
| `hierarchies[].depth` | `number` | Node count on longest root-to-leaf path *(omitted if cyclic)* |
| `hierarchies[].has_cycle` | `boolean` | `true` only for cyclic groups *(omitted if non-cyclic)* |
| `invalid_entries` | `string[]` | Entries that failed validation |
| `duplicate_edges` | `string[]` | Duplicate edges (only first occurrence is used) |
| `summary.total_trees` | `number` | Count of non-cyclic hierarchies |
| `summary.total_cycles` | `number` | Count of cyclic groups |
| `summary.largest_tree_root` | `string` | Root of the deepest tree (lex tiebreak) |

### Processing Pipeline

The API processes input through 6 well-defined steps:

```
Input Array
    │
    ▼
┌─────────────────────────────┐
│  STEP 1: Validate & Dedup   │  ← Regex /^[A-Z]->[A-Z]$/, self-loop check,
│                             │    first-occurrence wins for duplicates
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  STEP 2: Build Adjacency    │  ← childrenMap (parent → [children])
│          Structures          │    parentMap (child → first parent only)
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  STEP 3: Identify Roots     │  ← Nodes with no parent entry
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  STEP 4: Build Trees        │  ← Recursive DFS from each root
│          (depth-first)       │    Calculates depth = 1 + max(child depths)
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  STEP 5: Detect Cycles      │  ← BFS over unvisited nodes
│          (remaining nodes)   │    Group → lex-smallest root, tree: {}
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  STEP 6: Assemble Response   │  ← Combine hierarchies, summary,
│                             │    invalid_entries, duplicate_edges
└─────────────────────────────┘
```

---

## Frontend

The frontend is a single-page application with two views:

### 1. Hero Landing Page
A full-screen cinematic landing with:
- AI-generated background illustration
- Glassmorphism navbar and stats bar
- Playfair Display serif headings
- "Start Exploring" CTA that transitions to the app

### 2. Explorer App
- **Input area** — Textarea accepting comma or newline-separated edges
- **Process Nodes** — Calls `POST /bfhl` and renders results
- **Invalid Entries** — Red tags for failed validations
- **Duplicate Edges** — Amber tags for deduplicated edges
- **Hierarchy Cards** — Interactive cards showing:
  - Root node badge with depth indicator
  - Visual tree structure with `├──` / `└──` branch connectors
  - Orange-glowing CYCLE badge for cyclic groups

---

## Example

### Input
```
A->B, A->C, B->D, C->E, E->F, X->Y, Y->Z, Z->X, P->Q, Q->R, G->H, G->H, G->I, hello, 1->2, A->
```

### Output Summary

| Metric | Value |
|--------|-------|
| Trees | 3 (A, P, G) |
| Cycles | 1 (X→Y→Z→X) |
| Largest Root | A (depth 4) |
| Invalid | `hello`, `1->2`, `A->` |
| Duplicates | `G->H` |

### Tree: Root A (Depth 4)
```
A
├── B
│   └── D
└── C
    └── E
        └── F
```

### Tree: Root P (Depth 3)
```
P
└── Q
    └── R
```

### Tree: Root G (Depth 2)
```
G
├── H
└── I
```

### Cycle: Root X
```
X → Y → Z → X  (cyclic — no valid tree)
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **First-parent-wins** | For multi-parent/diamond cases, only the first `X->child` edge in the input array is used. This prevents ambiguous trees and matches the spec. |
| **Lex-smallest cycle root** | Cycles have no natural root. Using the alphabetically smallest node ensures deterministic, reproducible output. |
| **Depth = node count** | Depth includes the root itself. A single-node tree has depth 1, matching "node count on the longest root-to-leaf path." |
| **No frameworks** | Vanilla JS keeps the frontend zero-dependency, fast to load, and easy to deploy anywhere. |
| **Hero → App transition** | The landing page stays fixed and slides away on CTA click, giving a polished SaaS-product feel. |

---

## License

This project was built for the BFHL Full-Stack Challenge.
