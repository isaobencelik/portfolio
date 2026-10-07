// Animated teal network background (shared by all pages)
const canvas = document.getElementById('network-bg');
const ctx = canvas.getContext('2d');
// Colour is set per page with data-rgb="r, g, b" on the canvas (default: teal)
const RGB = canvas.dataset.rgb || '94, 234, 212';
const STILL = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const nodes = [];
const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createNodes() {
  const count = Math.min(70, Math.max(35, Math.floor(window.innerWidth / 18)));
  nodes.length = 0;

  for (let i = 0; i < count; i++) {
    nodes.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 2 + 2
    });
  }
}

function drawNetwork() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (!STILL) {
      node.x += node.vx;
      node.y += node.vy;
    }

    if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
    if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

    if (mouse.active) {
      const dx = mouse.x - node.x;
      const dy = mouse.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Pull nearby nodes towards the cursor, but push back inside a small ring
      // so they gather around it instead of collapsing into one point.
      const REACH = 180, RING = 70;
      if (dist > 0 && dist < REACH) {
        const f = dist > RING
          ? ((REACH - dist) / REACH) * 0.03
          : -((RING - dist) / RING) * 0.12;
        node.x += dx * f;
        node.y += dy * f;
      }
    }

    ctx.beginPath();
    ctx.fillStyle = `rgba(${RGB}, 0.98)`;
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 140) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${RGB}, ${0.38 - dist / 600})`;
        ctx.lineWidth = 1;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
}

function animate() {
  drawNetwork();
  if (!STILL) requestAnimationFrame(animate);
}

window.addEventListener('pointermove', (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  mouse.active = true;
});

window.addEventListener('pointerleave', () => {
  mouse.active = false;
});

window.addEventListener('resize', () => {
  resizeCanvas();
  createNodes();
});

resizeCanvas();
createNodes();
animate();
  
