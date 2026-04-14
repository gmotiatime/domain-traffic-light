const compoundSuffixes = [
  "edu.gov.by",
  "gov.by",
  "mil.by",
  "com.by",
  "net.by",
  "org.by",
  "com.ru",
  "net.ru",
  "org.ru",
  "pp.ru",
  "co.uk",
  "org.uk",
  "gov.uk",
  "ac.uk",
];

const compoundSuffixesSet = new Set(compoundSuffixes);
const maxSuffixDepth = Math.max(...compoundSuffixes.map((s) => s.split(".").length));

function optimizedFindLoop(labels: string[]) {
  const n = labels.length;
  // We only check up to maxSuffixDepth, or the labels length
  const maxParts = Math.min(n, maxSuffixDepth);

  for (let i = maxParts; i >= 1; i--) {
    let candidate = labels[n - i];
    for (let j = 1; j < i; j++) {
      candidate += '.' + labels[n - i + j];
    }
    if (compoundSuffixesSet.has(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

const domains = [
  'example.com',
  'test.edu.gov.by',
  'hello.world.co.uk',
  'a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z.com',
  'secure.bank.login.attempt.net.ru',
  'very-long-domain-name-with-hyphens.org',
  '1234567890.com',
  'amazon.co.uk',
  'random-domain-name.edu.gov.by',
  'www.amazon.co.uk'
];

let start = performance.now();
let iterations = 10000000; // 10M

const labelArrays = domains.map(d => d.split('.'));
for (let i = 0; i < iterations; i++) {
  for (let j = 0; j < labelArrays.length; j++) {
    optimizedFindLoop(labelArrays[j]);
  }
}
let end = performance.now();
console.log(`Optimized (Loop): ${(end - start).toFixed(2)}ms`);
