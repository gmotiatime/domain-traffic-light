## 2026-04-14 - Optimize OpenRouter Fallback Model Requests with Promise.any
**Learning:** Sequential fallback loops (`for (const model of modelCandidates)`) for external AI requests introduce unnecessary latency if the primary model is slow to respond or times out. Wait times compound sequentially.
**Action:** Replaced sequential `for` loops in `server/openrouter-proxy.mjs` (`analyzeResponse`, `generateArticleResponse`, `generateQuizScenarioResponse`) with a concurrent approach using `Promise.any(modelCandidates.map(...))`. This dispatches requests to all configured models simultaneously and returns the first successful response, dramatically reducing worst-case latency. To ensure failures are handled correctly, individual errors within the `.map` must be explicitly re-thrown so `Promise.any` can aggregate them, and the `AggregateError` is caught to return the final 502 error if all models fail.

## 2025-02-18 - Domain Analyzer Suffix Matching Optimization

**Learning:**
The `domain-analyzer.ts` heavily processes incoming hostnames. It previously verified suffixes using an array `compoundSuffixes.find(...)` which is O(N) over array contents and scales linearly with the number of known suffixes and the length of the string to match against. Hardcoding length checks inside this match condition can introduce bugs if `compoundSuffixes` later accepts domains with non-standard lengths (e.g. 1 part, or 4+ parts).

**Action:**
Transformed `compoundSuffixes` lookup to a dynamic Set-based O(M) search. The logic pre-computes `maxSuffixDepth` to ensure we only look at feasible sub-segments up to the maximum depth of registered suffixes in the set. We loop over `labels.slice` starting from `maxParts` and iteratively check `Set.has()`, reducing the execution time significantly (~1.8x faster on the measured microbenchmark) while maintaining exact compatibility with suffixes of any shape or length without fragile hardcoded bounds.
