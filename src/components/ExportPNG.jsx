import { useRef } from 'react';
import * as domtoimage from 'dom-to-image-more';

async function waitForImages(node) {
  const imgs = Array.from(node.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      try {
        // decode()가 가장 확실 (지원 안 하면 load 완료 체크)
        if ('decode' in img) await img.decode();
        else if (!img.complete) await new Promise((res, rej) => {
          img.onload = () => res();
          img.onerror = () => res(); // 에러여도 계속
        });
      } catch { /* ignore */ }
    })
  );
}

export default function ExportPNG({
  targetId = 'tierboard',
  fileName = 'tierlist',
  scale = 3,
  bgColor = '#0b0b0d',
}) {
  const busy = useRef(false);

  const handleExport = async () => {
    if (busy.current) return;
    busy.current = true;

    const html = document.documentElement;
    html.classList.add('exporting'); // 전역 export 모드

    try {
      const node = document.getElementById(targetId);
      if (!node) throw new Error(`Target element not found: #${targetId}`);

      // 툴바/버튼 비노출
      const hidden = [];
      node.querySelectorAll('[data-export-hide="true"]').forEach((el) => {
        const prev = el.style.visibility;
        hidden.push([el, prev]);
        el.style.visibility = 'hidden';
      });

      // 폰트/이미지 준비 대기
      if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }
      await waitForImages(node);

      const width = Math.ceil(node.scrollWidth);
      const height = Math.ceil(node.scrollHeight);

      const dataUrl = await domtoimage.toPng(node, {
        bgcolor: bgColor,
        cacheBust: true,
        style: { transform: `scale(${scale})`, transformOrigin: 'top left' },
        width: width * scale,
        height: height * scale,
        filter: (el) => {
          const htmlEl = el;
          return htmlEl?.getAttribute?.('data-export-hide') !== 'true';
        },
      });

      // 복구
      hidden.forEach(([el, prev]) => (el.style.visibility = prev));

      const a = document.createElement('a');
      a.download = `${fileName}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error(err);
      alert('PNG 내보내기 오류 (콘솔 확인)');
    } finally {
      html.classList.remove('exporting');
      busy.current = false;
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
    >
      PNG 저장
    </button>
  );
}
