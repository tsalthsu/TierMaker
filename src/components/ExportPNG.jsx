import { useRef } from 'react'; 
import * as domtoimage from 'dom-to-image-more';

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

    try {
      const node = document.getElementById(targetId);
      if (!node) throw new Error(`Target element not found: #${targetId}`);

      // 숨길 요소 처리
      const hidden = [];
      node.querySelectorAll('[data-export-hide="true"]').forEach((el) => {
        const prev = el.style.visibility;
        hidden.push([el, prev]);
        el.style.visibility = 'hidden';
      });

      const width = node.scrollWidth;
      const height = node.scrollHeight;

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

      hidden.forEach(([el, prev]) => (el.style.visibility = prev));

      const a = document.createElement('a');
      a.download = `${fileName}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error(err);
      alert('PNG 내보내기 오류 (콘솔 확인)');
    } finally {
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
