import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

// 성능을 위해 Math 함수 캐싱
const PI2 = Math.PI * 2;
const random = Math.random;
const sin = Math.sin;

// 이징 함수
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

const SparkleSystem = forwardRef((props, ref) => {
  const backRef = useRef(null);
  const frontRef = useRef(null);
  const particles = useRef([]); 
  const reqId = useRef(null);

  // 화면 크기 및 캔버스 설정
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
      // 밝은 빛 번짐 효과를 위해 lighter 사용 (겹칠수록 밝아짐)
      ctx.globalCompositeOperation = 'lighter';
    });
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    let lastTime = performance.now();
    const loop = (time) => {
      const dt = time - lastTime;
      lastTime = time;
      updateAndDraw(dt, time);
      reqId.current = requestAnimationFrame(loop);
    };
    reqId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(reqId.current);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    trigger(x, y) {
      spawnSparkles(x, y);
    }
  }));

  // --- 파티클 생성 로직 ---
  const spawnSparkles = (screenX, screenY) => {
    const now = performance.now();
    
    // [중요] 스크롤 문제를 해결하기 위해 절대 좌표(Page Coordinates)로 변환하여 저장
    const pageX = screenX + window.scrollX;
    const pageY = screenY + window.scrollY;

    const newParticles = [];

    // 1. Glitter Ring (흩뿌려지는 금가루)
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = (PI2 * i) / count + (random() * 0.5 - 0.25);
      const speed = 80 + random() * 120;
      newParticles.push(createParticle(pageX, pageY, angle, speed, 'back', 'glitter', now));
    }

    // 2. Star Burst (중심부 별 모양)
    for (let i = 0; i < 12; i++) {
      const angle = random() * PI2;
      const speed = 20 + random() * 40;
      newParticles.push(createParticle(pageX, pageY, angle, speed, 'front', 'star', now));
    }

    // 3. Main Flares (큰 빛줄기)
    newParticles.push({
      ...createParticle(pageX, pageY, 0, 0, 'front', 'flare', now),
      life: 800 + random() * 200,
      size: 40 + random() * 20, // 매우 큼
      rotate: random() * 180,
    });

    particles.current.push(...newParticles);
  };

  const createParticle = (x, y, angle, speed, layer, type, now) => {
    const life = 600 + random() * 600;
    // 거리가 아니라 속도(velocity) 개념으로 변경하여 퍼지는 느낌 강화
    return {
      x, y, // 생성 원점 (Page Coord)
      vx: Math.cos(angle) * speed * (random() * 0.5 + 0.5),
      vy: Math.sin(angle) * speed * (random() * 0.5 + 0.5),
      layer, type,
      size: type === 'glitter' ? 2 + random() * 3 : (type === 'star' ? 4 + random() * 4 : 20),
      life,
      maxLife: life,
      createdAt: now,
      rotate: random() * 360,
      rotateSpeed: (random() - 0.5) * 10,
      // 반짝임 위상 (각자 다르게 반짝임)
      twinklePhase: random() * PI2,
      twinkleSpeed: 0.005 + random() * 0.01,
      // 약간의 중력 효과
      gravity: type === 'glitter' ? 0.05 + random() * 0.05 : 0
    };
  };

  // --- 그리기 & 업데이트 ---
  const updateAndDraw = (dt, now) => {
    const backCtx = backRef.current?.getContext('2d');
    const frontCtx = frontRef.current?.getContext('2d');
    if (!backCtx || !frontCtx) return;

    backCtx.clearRect(0, 0, backRef.current.width, backRef.current.height);
    frontCtx.clearRect(0, 0, frontRef.current.width, frontRef.current.height);

    // [중요] 현재 스크롤 위치 가져오기
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    particles.current = particles.current.filter(p => {
      const age = now - p.createdAt;
      if (age > p.maxLife) return false;

      const progress = age / p.maxLife; // 0.0 ~ 1.0
      
      // 물리 업데이트 (이동)
      // easeOut 효과를 주기 위해 속도를 감쇠시킴 (마찰력)
      const friction = 0.92; 
      p.vx *= friction;
      p.vy *= friction;
      p.vy += p.gravity; // 중력
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.rotate += p.rotateSpeed;

      // [중요] 화면 그리기 좌표 = 절대좌표 - 스크롤좌표
      const drawX = p.x - scrollX;
      const drawY = p.y - scrollY;

      // 화면 밖이면 그리지 않음 (성능 최적화)
      if (drawX < -50 || drawX > window.innerWidth + 50 || drawY < -50 || drawY > window.innerHeight + 50) {
        return true; 
      }

      // 투명도 및 크기 계산
      let alpha = 1 - easeOutQuart(progress); // 점점 투명해짐
      
      // 반짝임(Twinkle) 효과: 사인파로 알파값 흔들기
      const twinkle = 0.7 + 0.3 * sin(now * p.twinkleSpeed + p.twinklePhase);
      alpha *=QL(twinkle);
      
      if (alpha <= 0.01) return false;

      const ctx = p.layer === 'back' ? backCtx : frontCtx;
      ctx.globalAlpha = alpha;

      // 타입별 그리기
      if (p.type === 'glitter') {
        drawDiamond(ctx, drawX, drawY, p.size * (1 - progress * 0.5)); // 크기도 살짝 줄어듦
      } else if (p.type === 'star') {
        drawStar(ctx, drawX, drawY, p.size, p.rotate);
      } else if (p.type === 'flare') {
        drawFlare(ctx, drawX, drawY, p.size * (1 + progress * 0.2), alpha);
      }

      return true;
    });
  };
  
  // 헬퍼: 값 제한 (0~1)
  const QL = (v) => Math.max(0, Math.min(1, v));

  // --- 도형 그리기 함수들 ---

  // 금빛 다이아몬드 (반짝이)
  const drawDiamond = (ctx, x, y, size) => {
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.6, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size * 0.6, y);
    ctx.closePath();
    ctx.fill();
    
    // 중심부 하이라이트 (흰색)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.4);
    ctx.lineTo(x + size * 0.3, y);
    ctx.lineTo(x, y + size * 0.4);
    ctx.lineTo(x - size * 0.3, y);
    ctx.closePath();
    ctx.fill();
  };

  // 4각 별
  const drawStar = (ctx, x, y, size, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.fillStyle = '#FDB813'; // Rich Gold
    
    const spike = size;
    const inner = size * 0.3;
    
    ctx.beginPath();
    for(let i=0; i<4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.lineTo(0, -spike);
        ctx.lineTo(inner, -inner);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // 거대한 빛 (Flare)
  const drawFlare = (ctx, x, y, size, alpha) => {
    // 부드러운 글로우 (Radial Gradient)
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
    grad.addColorStop(0, `rgba(255, 255, 220, ${alpha})`); // 중심: 아주 밝은 노랑
    grad.addColorStop(0.3, `rgba(255, 215, 0, ${alpha * 0.6})`); // 중간: 골드
    grad.addColorStop(1, `rgba(184, 134, 11, 0)`); // 끝: 다크 골드 (투명)
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, PI2);
    ctx.fill();

    // 십자 빛줄기
    ctx.strokeStyle = `rgba(255, 250, 205, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - size * 1.2, y);
    ctx.lineTo(x + size * 1.2, y);
    ctx.moveTo(x, y - size * 1.2);
    ctx.lineTo(x, y + size * 1.2);
    ctx.stroke();
  };

  return (
    <>
      <canvas ref={backRef} className="fixed inset-0 z-0 pointer-events-none" />
      <canvas ref={frontRef} className="fixed inset-0 z-40 pointer-events-none" />
    </>
  );
});

export default SparkleSystem;
