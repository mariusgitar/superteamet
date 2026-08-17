import confetti from 'canvas-confetti';

const COLORS = ['#6366F1', '#A78BFA', '#38BDF8'];
const EMOJIS = ['🎉', '🥳', '🚀', '✨', '💫', '🌟', '🎯', '💡', '🔥', '🎊', '⚡', '🌈'];
const LEFT_POSITIONS = [
  'left-[3%]', 'left-[8%]', 'left-[13%]', 'left-[18%]', 'left-[23%]',
  'left-[28%]', 'left-[33%]', 'left-[38%]', 'left-[43%]', 'left-[48%]',
  'left-[53%]', 'left-[58%]', 'left-[63%]', 'left-[68%]', 'left-[73%]',
  'left-[78%]', 'left-[83%]', 'left-[88%]', 'left-[93%]', 'left-[97%]',
];
const FALL_ANIMATIONS = ['animate-celebration-fall-fast', 'animate-celebration-fall', 'animate-celebration-fall-slow'];

function confettiBurst(): void {
  void confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
}

function confettiWave(): void {
  const end = Date.now() + 1500;
  const frame = () => {
    void confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: COLORS });
    void confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

function starExplosion(): void {
  void confetti({
    particleCount: 80,
    spread: 360,
    startVelocity: 20,
    shapes: ['star'],
    colors: ['#FFD700', '#FFA500', '#FF6347', '#6366F1'],
    origin: { x: 0.5, y: 0.5 },
    gravity: 0.5,
    scalar: 1.5,
  });
}

function shower(emojiPool: string[]): void {
  const container = document.createElement('div');
  container.className = 'pointer-events-none fixed inset-0 z-[9999] overflow-hidden';
  container.setAttribute('aria-hidden', 'true');

  let finished = 0;
  for (let index = 0; index < 20; index += 1) {
    const emoji = document.createElement('div');
    emoji.className = `absolute -top-14 text-3xl ${LEFT_POSITIONS[Math.floor(Math.random() * LEFT_POSITIONS.length)]} ${FALL_ANIMATIONS[Math.floor(Math.random() * FALL_ANIMATIONS.length)]}`;
    emoji.textContent = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    emoji.addEventListener('animationend', () => {
      emoji.remove();
      finished += 1;
      if (finished === 20) container.remove();
    }, { once: true });
    container.appendChild(emoji);
  }

  document.body.appendChild(container);
}

function balloons(): void {
  shower(['🎈']);
}

function fireworks(): void {
  const end = Date.now() + 2000;
  const colors = ['#6366F1', '#E86B5F', '#6BCB8B', '#F4A442'];
  const frame = () => {
    void confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
    void confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

function emojiShower(): void {
  shower(EMOJIS);
}

export function celebrate(): void {
  const effects = [
    confettiBurst,
    confettiWave,
    starExplosion,
    balloons,
    fireworks,
    emojiShower,
  ];
  const chosen = effects[Math.floor(Math.random() * effects.length)];
  chosen();
}
