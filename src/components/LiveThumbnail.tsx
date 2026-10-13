import React, { useEffect, useRef, useState } from 'react';
import { Project } from '../types';
import { StaticDesign } from '../render/Render';

export function LiveThumbnail({ project }: { project: Project }) {
  const [rect, setRect] = useState({ width: 0, height: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver((entries) => {
      setRect({
        width: entries[0].contentRect.width,
        height: entries[0].contentRect.height,
      });
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const scale = rect.width ? rect.width / project.canvas.width : 1;

  return (
    <div ref={ref} className="w-full h-full relative overflow-hidden bg-white">
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: project.canvas.width,
          height: project.canvas.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <StaticDesign project={project} />
      </div>
    </div>
  );
}
