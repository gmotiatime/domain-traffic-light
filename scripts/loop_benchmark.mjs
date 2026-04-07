
const particleCount = 50;
const particles = Array.from({ length: particleCount }, () => ({
  x: Math.random() * 1000,
  y: Math.random() * 1000,
  vx: (Math.random() - 0.5) * 0.5,
  vy: (Math.random() - 0.5) * 0.5,
  size: Math.random() * 2 + 1,
  opacity: Math.random() * 0.5 + 0.2,
}));

function benchmarkSliceForEach() {
  let count = 0;
  particles.forEach((particle, i) => {
    particles.slice(i + 1).forEach((otherParticle) => {
      const dx = particle.x - otherParticle.x;
      const dy = particle.y - otherParticle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 120) {
        count++;
      }
    });
  });
  return count;
}

function benchmarkForLoop() {
  let count = 0;
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    for (let j = i + 1; j < particles.length; j++) {
      const otherParticle = particles[j];
      const dx = particle.x - otherParticle.x;
      const dy = particle.y - otherParticle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 120) {
        count++;
      }
    }
  }
  return count;
}

const iterations = 100000;

console.log(`Running ${iterations} iterations...`);

console.time('SliceForEach');
for (let i = 0; i < iterations; i++) {
  benchmarkSliceForEach();
}
console.timeEnd('SliceForEach');

console.time('ForLoop');
for (let i = 0; i < iterations; i++) {
  benchmarkForLoop();
}
console.timeEnd('ForLoop');
