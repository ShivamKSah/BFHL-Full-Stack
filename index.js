// ─────────────────────────────────────────────────────────
//  BFHL Challenge — Node.js/Express REST API
//  POST /bfhl → Parses directed edges, builds hierarchies,
//  detects cycles, and returns a structured JSON report.
// ─────────────────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ── Middleware ───────────────────────────────────────────
app.use(cors());                                       // Enable CORS for all origins
app.use(express.json());                               // Parse JSON request bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend

// ── POST /bfhl ──────────────────────────────────────────
app.post('/bfhl', (req, res) => {
  const { data } = req.body;

  // Guard: data must be an array
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'Request body must contain a "data" array.' });
  }

  // ─── STEP 1: Validate & de-duplicate edges ────────────
  const invalid_entries = [];
  const duplicate_edges = [];
  const valid_edges = [];      // Array of {parent, child}
  const seenEdges = new Set();
  const reportedDuplicates = new Set();

  // Track the order each NEW node first appears in input (for hierarchy ordering)
  const firstAppearance = new Map();
  let orderCounter = 0;

  const EDGE_PATTERN = /^[A-Z]->[A-Z]$/;

  for (const rawItem of data) {
    const item = typeof rawItem === 'string' ? rawItem.trim() : String(rawItem);

    const isValidFormat = EDGE_PATTERN.test(item);
    const isSelfLoop = isValidFormat && item[0] === item[3];

    if (isValidFormat && !isSelfLoop) {
      // Record first-appearance order for each node
      if (!firstAppearance.has(item[0])) firstAppearance.set(item[0], orderCounter++);
      if (!firstAppearance.has(item[3])) firstAppearance.set(item[3], orderCounter++);

      if (seenEdges.has(item)) {
        if (!reportedDuplicates.has(item)) {
          reportedDuplicates.add(item);
          duplicate_edges.push(item);
        }
      } else {
        seenEdges.add(item);
        valid_edges.push({ parent: item[0], child: item[3] });
      }
    } else {
      invalid_entries.push(item);
    }
  }

  // ─── STEP 2: Build adjacency structures ───────────────
  const childrenMap = new Map();
  const parentMap = new Map();
  const allNodes = new Set();

  for (const { parent, child } of valid_edges) {
    // Multi-parent rule: first-encountered parent wins
    if (!parentMap.has(child)) {
      parentMap.set(child, parent);
      allNodes.add(parent);
      allNodes.add(child);

      if (!childrenMap.has(parent)) childrenMap.set(parent, []);
      childrenMap.get(parent).push(child);
    }
  }

  // ─── STEP 3: Identify root nodes ─────────────────────
  const naturalRoots = [];
  for (const node of allNodes) {
    if (!parentMap.has(node)) {
      naturalRoots.push(node);
    }
  }

  // ─── STEP 4: Build trees from roots ──────────────────
  const visited = new Set();
  const hierarchies = [];       // Will be sorted later
  let totalTrees = 0;
  let totalCycles = 0;
  let largestRoot = '';
  let maxDepth = -1;

  function buildTree(node) {
    visited.add(node);
    const subtree = {};
    let maxChildDepth = 0;

    const children = (childrenMap.get(node) || []).sort();
    for (const child of children) {
      const { tree: childTree, depth: childDepth } = buildTree(child);
      subtree[child] = childTree;
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    }

    return { tree: subtree, depth: 1 + maxChildDepth };
  }

  for (const root of naturalRoots) {
    const { tree, depth } = buildTree(root);

    hierarchies.push({ root, tree: { [root]: tree }, depth });
    totalTrees++;

    if (depth > maxDepth || (depth === maxDepth && root < largestRoot)) {
      maxDepth = depth;
      largestRoot = root;
    }
  }

  // ─── STEP 5: Detect pure cycle groups ────────────────
  for (const node of allNodes) {
    if (visited.has(node)) continue;

    const group = [];
    const queue = [node];
    visited.add(node);

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      group.push(curr);

      for (const child of (childrenMap.get(curr) || [])) {
        if (!visited.has(child)) { visited.add(child); queue.push(child); }
      }
      const p = parentMap.get(curr);
      if (p && !visited.has(p)) { visited.add(p); queue.push(p); }
    }

    group.sort();
    const cycleRoot = group[0];

    hierarchies.push({ root: cycleRoot, tree: {}, has_cycle: true });
    totalCycles++;
  }

  // ─── STEP 6: Sort hierarchies by first-appearance order ─
  // The PDF example shows hierarchies ordered by the order each
  // group's root first appeared in the input data (A, X, P, G),
  // NOT trees-first-then-cycles.
  hierarchies.sort((a, b) => {
    const orderA = firstAppearance.get(a.root) ?? Infinity;
    const orderB = firstAppearance.get(b.root) ?? Infinity;
    return orderA - orderB;
  });

  // ─── STEP 7: Assemble response ───────────────────────
  res.json({
    user_id: 'shivam_kumar_sah_14122005',
    email_id: 'ss7800@srmist.edu.in',
    college_roll_number: 'RA2311027050033',
    hierarchies,
    invalid_entries,
    duplicate_edges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestRoot || ''
    }
  });
});

// ── Start server ────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✦ BFHL server running → http://localhost:${PORT}`));
