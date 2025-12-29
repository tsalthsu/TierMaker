import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// 성능을 위해 Math 함수 캐싱
const PI2 = Math.PI * 2;
const random = Math.random;

// 이징 함수 (CSS animation-timing-function 대체)
// easeOutCubic
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const SparkleSystem = forwardRef((props, ref) => {
  const backRef = useRef(null);
  const frontRef = useRef(null);
  const particles = useRef([]); // 파티클 상태를 Ref로 관리 (리렌더링 방지)
  const reqId = useRef(null);

  // 화면 크기에 맞춰 캔버스 사이징 (Retina 디스플레이 대응)
  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    [backRef.current, frontRef.current].forEach(canvas => {
      if (!canvas) return;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      // 합성 모드 설정 (CSS mix-blend-mode: screen 효과)
      ctx.globalCompositeOperation = 'screen';
    });
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 애니메이션 루프 시작
    let lastTime = performance.now();
    const loop = (time) => {
      const dt = time - lastTime;
      lastTime = time;

      updateAndDraw(dt);
      reqId.current = requestAnimationFrame(loop);
    };
    reqId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(reqId.current);
    };
  }, []);

  // 외부에서 이펙트를 트리거하는 함수 노출
  useImperativeHandle(ref, () => ({
    trigger(x, y) {
      spawnSparkles(x, y);
    }
  }));

  // 파티클 생성 로직 (기존 App.jsx의 triggerSparkles 로직 이식)
  const spawnSparkles = (x, y) => {
    const now = performance.now();
    const newParticles = [];
    const idBase = now.toString();

    // 1. Back Ring (36개)
    for (let i = 0; i < 36; i++) {
      const angle = (PI2 * i) / 36 + (random() * 0.3 - 0.15);
      const dist = 70 + random() * 30;
      newParticles.push(createParticle(x, y, angle, dist, 'back', 'dust', now));
    }

    // 2. Back Dust (60개)
    for (let i = 0; i < 60; i++) {
      const angle = random() * PI2;
      const dist = 40 + random() * 60;
      newParticles.push(createParticle(x, y, angle, dist, 'back', 'dust', now));
    }

    // 3. Back Flare (1개)
    newParticles.push({
      ...createParticle(x, y, random() * PI2, 60 + random() * 20, 'back', 'flare', now),
      size: 18 + random() * 6,
      rotate: random() * 20 - 10,
      life: 1400 + random() * 260,
      delay: 30 + random() * 90
    });

    // 4. Front Flare (확률적 생성)
    if (random() < 0.6) {
      newParticles.push({
        ...createParticle(x, y, random() * PI2, 45 + random() * 14, 'front', 'flare', now),
        size: 10 + random() * 4,
        rotate: random() * 16 - 8,
        life: 1100 + random() * 220,
        delay: 80 + random() * 120
      });
    }

    particles.current.push(...newParticles);
  };

  const createParticle = (x, y, angle, dist, layer, type, now) => ({
    x, y,
    tx: x + Math.cos(angle) * dist, // 목표 X
    ty: y + Math.sin(angle) * dist, // 목표 Y
    layer, type,
    size: type === 'dust' ? (type === 'back' ? 2 + random() * 2 : 1.6 + random() * 2.4) : 10,
    life: type === 'dust' ? 900 + random() * 280 : 1200,
    maxLife: type === 'dust' ? 900 + random() * 280 : 1200,
    createdAt: now,
    delay: type === 'dust' ? Math.floor(random() * 160) : 0,
    rotate: 0,
    color: '#fbbf24' // amber-400
  });

  // 그리기 & 업데이트 로직
  const updateAndDraw = (dt) => {
    const now = performance.now();
    const backCtx = backRef.current?.getContext('2d');
    const frontCtx = frontRef.current?.getContext('2d');

    if (!backCtx || !frontCtx) return;

    // 캔버스 초기화
    backCtx.clearRect(0, 0, backRef.current.width, backRef.current.height);
    frontCtx.clearRect(0, 0, frontRef.current.width, frontRef.current.height);

    // 파티클 업데이트 및 필터링
    particles.current = particles.current.filter(p => {
      const age = now - p.createdAt;
      
      // 수명 다함
      if (age > p.maxLife + p.delay) return false;
      // 아직 딜레이 중
      if (age < p.delay) return true;

      const progress = (age - p.delay) / p.maxLife; // 0.0 ~ 1.0
      const eased = easeOut(progress);

      // 현재 위치 계산 (Interpolation)
      const currX = p.x + (p.tx - p.x) * eased;
      const currY = p.y + (p.ty - p.y) * eased;

      // 투명도 및 크기 계산 (기존 CSS keyframe 근사)
      let alpha = 1;
      let scale = 1;

      if (progress < 0.1) {
        // fade in
        alpha = progress * 10; 
        scale = 0.7 + progress * 3; 
      } else if (progress > 0.6) {
        // fade out
        alpha = 1 - (progress - 0.6) / 0.4;
        scale = 1 + (progress - 0.6) * 0.3;
      }

      if (alpha <= 0) return false;

      const ctx = p.layer === 'back' ? backCtx : frontCtx;
      
      ctx.globalAlpha = alpha;
      
      if (p.type === 'dust') {
        drawDust(ctx, currX, currY, p.size * scale);
      } else {
        drawFlare(ctx, currX, currY, p.size * scale, p.rotate);
      }

      return true;
    });
  };

  // Dust 그리기 (Radial Gradient)
  const drawDust = (ctx, x, y, size) => {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
    grad.addColorStop(0, '#fff8e1');   // center
    grad.addColorStop(0.4, '#fde047'); // mid
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)'); // edge
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, PI2);
    ctx.fill();
  };

  // Flare 그리기 (Star + Cross)
  const drawFlare = (ctx, x, y, size, rotate) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rotate * Math.PI) / 180);

    // Glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    grad.addColorStop(0, '#fff8e1');
    grad.addColorStop(0.5, 'rgba(253, 224, 71, 0.8)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, PI2);
    ctx.fill();

    // Cross lines
    ctx.fillStyle = '#fde047';
    ctx.globalAlpha *= 0.8;
    const len = size * 1.5;
    const thin = size * 0.1;
    ctx.beginPath();
    // 가로세로
    ctx.rect(-len, -thin/2, len*2, thin);
    ctx.rect(-thin/2, -len, thin, len*2);
    ctx.fill();

    // 대각선 (45도)
    ctx.save();
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.rect(-len*0.7, -thin/2, len*1.4, thin);
    ctx.rect(-thin/2, -len*0.7, thin, len*1.4);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  return (
    <>
      <canvas ref={backRef} className="fixed inset-0 z-0 pointer-events-none" />
      <canvas ref={frontRef} className="fixed inset-0 z-40 pointer-events-none" />
    </>
  );
});

export default SparkleSystem;
