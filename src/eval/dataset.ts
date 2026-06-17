/**
 * Evaluation set: 20 cases over the seeded DSA + cloud corpus.
 *  - in_corpus  : answerable from the notes; `expectedSources` are the titles a
 *                 correct answer should cite (used for citation precision).
 *  - out_of_corpus: plausible DSA/cloud questions NOT in the notes; the system
 *                 must REFUSE (used for refusal accuracy). Deliberately realistic
 *                 so refusal isn't gamed by obviously-silly questions.
 */
export type EvalCase = {
  id: string;
  question: string;
  kind: "in_corpus" | "out_of_corpus";
  expectAnswerable: boolean;
  expectedSources: string[];
};

export const EVAL_CASES: EvalCase[] = [
  // --- in-corpus (answerable) ---
  {
    id: "sw-shrink",
    question: "When should I shrink the window in a sliding-window problem?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Sliding Window Technique"],
  },
  {
    id: "sw-bug",
    question: "What common off-by-one bug happens when shrinking a sliding window?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Sliding Window Technique"],
  },
  {
    id: "bs-overflow",
    question: "How do you compute mid in binary search to avoid integer overflow?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Binary Search Invariants"],
  },
  {
    id: "bs-complexity",
    question: "What is the time complexity of binary search?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Binary Search Invariants"],
  },
  {
    id: "tp-cycle",
    question: "How does the fast and slow pointer method detect a cycle in a linked list?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Two Pointers Technique"],
  },
  {
    id: "hash-collisions",
    question: "What is the average lookup time of a hash map and how are collisions resolved?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Hash Maps and Hashing"],
  },
  {
    id: "rec-base",
    question: "Why does a recursive function need a base case?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Recursion and Base Cases"],
  },
  {
    id: "bigo-nested",
    question: "What is the time complexity of two nested loops over n elements?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Big-O Time Complexity"],
  },
  {
    id: "bigo-halving",
    question: "Which time complexity class results from halving the input each step?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Big-O Time Complexity"],
  },
  {
    id: "dp-fib",
    question: "How does memoization change the time complexity of computing Fibonacci numbers?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Dynamic Programming Basics"],
  },
  {
    id: "sq-diff",
    question: "What is the difference between a stack and a queue?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Stacks and Queues"],
  },
  {
    id: "autoscale-cooldown",
    question: "What is a cooldown period in an autoscaling policy and why does it matter?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Cloud Autoscaling"],
  },
  {
    id: "lb-least-conn",
    question: "What does the least-connections load balancing algorithm do?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Load Balancing"],
  },
  {
    id: "cache-aside",
    question: "What is the cache-aside (lazy loading) caching strategy?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["Caching Strategies"],
  },
  {
    id: "cap-partition",
    question:
      "According to the CAP theorem, what must a distributed system trade off during a network partition?",
    kind: "in_corpus",
    expectAnswerable: true,
    expectedSources: ["CAP Theorem and Consistency"],
  },

  // --- out-of-corpus (must refuse) ---
  {
    id: "neg-france",
    question: "What is the capital of France?",
    kind: "out_of_corpus",
    expectAnswerable: false,
    expectedSources: [],
  },
  {
    id: "neg-dijkstra",
    question: "How does Dijkstra's shortest path algorithm work?",
    kind: "out_of_corpus",
    expectAnswerable: false,
    expectedSources: [],
  },
  {
    id: "neg-btree",
    question: "Explain how a B-tree index works in a database.",
    kind: "out_of_corpus",
    expectAnswerable: false,
    expectedSources: [],
  },
  {
    id: "neg-quicksort",
    question: "How does the quicksort partitioning step work?",
    kind: "out_of_corpus",
    expectAnswerable: false,
    expectedSources: [],
  },
  {
    id: "neg-k8s",
    question: "What is a Kubernetes pod and how is it scheduled?",
    kind: "out_of_corpus",
    expectAnswerable: false,
    expectedSources: [],
  },
];
