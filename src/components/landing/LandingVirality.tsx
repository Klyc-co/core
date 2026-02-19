import { useEffect, useRef } from "react";
import AnimateOnScroll from "./AnimateOnScroll";

const checkpoints = ["1 min", "5 min", "15 min", "30 min", "1 hr", "2 hr"];

const DecayCurve = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 2;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      if (w === 0 || h === 0) return;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const padding = { top: 20, bottom: 30, left: 10, right: 10 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      ctx.clearRect(0, 0, w, h);

      const gradient = ctx.createLinearGradient(padding.left, 0, w - padding.right, 0);
      gradient.addColorStop(0, "#2dd4a8");
      gradient.addColorStop(0.5, "#6b8de3");
      gradient.addColorStop(1, "#a855f7");

      const fillGrad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
      fillGrad.addColorStop(0, "rgba(45, 212, 168, 0.15)");
      fillGrad.addColorStop(1, "transparent");

      ctx.beginPath();
      ctx.moveTo(padding.left, padding.top + chartH);

      const points: [number, number][] = [];
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        const x = padding.left + t * chartW;
        let y: number;
        if (t < 0.6) {
          const progress = t / 0.6;
          y = padding.top + chartH * (1 - (1 - Math.pow(1 - progress, 2.5)) * 0.85);
        } else {
          const decay = (t - 0.6) / 0.4;
          const peakY = chartH * (1 - 0.85);
          y = padding.top + peakY + decay * chartH * 0.3;
        }
        points.push([x, y]);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(padding.left + chartW, padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = fillGrad;
      ctx.fill();

      ctx.beginPath();
      points.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      const markerX = padding.left + 0.6 * chartW;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(markerX, padding.top);
      ctx.lineTo(markerX, padding.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("0", padding.left, h - 10);
      ctx.fillText("90 min", markerX, h - 10);
      ctx.fillText("2 hr+", padding.left + chartW, h - 10);
    };

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

const LandingVirality = () => {
  return (
    <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 bg-[#08080c]">
      <div className="max-w-5xl mx-auto">
        {/* Headline — centered */}
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4 text-center">
            <span className="text-white">Attention Is Won</span>
            <br />
            <span className="bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">
              in the First 2 Hours.
            </span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={50}>
          <p className="text-base sm:text-lg text-white/70 max-w-2xl mx-auto mb-16 leading-relaxed font-light text-center">
            After that, the algorithm moves on. Momentum either compounds — or disappears.
          </p>
        </AnimateOnScroll>

        {/* Checkpoints + Graph side by side */}
        <AnimateOnScroll delay={100}>
          <p className="text-xs font-mono uppercase tracking-widest text-white/60 mb-4 text-center">
            The first 120 minutes determine reach velocity.
          </p>
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center mb-6">
            {/* Left: vertically stacked checkpoint boxes */}
            <div className="flex flex-col gap-2 sm:gap-3 shrink-0">
              {checkpoints.map((cp, i) => (
                <div
                  key={cp}
                  className="px-5 py-2.5 rounded-lg border text-sm font-mono text-center"
                  style={{
                    borderColor: `rgba(${45 + i * 25}, ${212 - i * 20}, ${168 + i * 15}, 0.25)`,
                    color: `rgba(${45 + i * 25}, ${212 - i * 20}, ${168 + i * 15}, ${0.5 + i * 0.1})`,
                  }}
                >
                  {cp}
                </div>
              ))}
            </div>
            {/* Right: line graph */}
            <div className="flex-1 w-full h-52 sm:h-60">
              <DecayCurve />
            </div>
          </div>
          <p className="text-sm text-white/60 max-w-xl mx-auto leading-relaxed font-light text-center mb-14">
            Most posts plateau because amplification happens too late.
            By the time teams "review performance," momentum is already gone.
          </p>
        </AnimateOnScroll>

        {/* Decision Engine — centered */}
        <AnimateOnScroll delay={150}>
          <div className="p-6 sm:p-8 rounded-xl border border-[#2dd4a8]/20 bg-gradient-to-br from-[#2dd4a8]/[0.04] via-transparent to-[#a855f7]/[0.04] max-w-2xl mx-auto mb-14">
            <p className="text-xs font-mono uppercase tracking-widest bg-gradient-to-r from-[#2dd4a8] to-[#a855f7] bg-clip-text text-transparent mb-5">
              If engagement velocity exceeds baseline thresholds
            </p>
            <ul className="space-y-3">
              {[
                "Real-time alert triggered",
                "Paid amplification recommended",
                "Distribution expanded while growth curve is rising",
                "Momentum captured before algorithm decay",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm sm:text-base text-white font-medium">
                  <span className="bg-gradient-to-r from-[#2dd4a8] to-[#a855f7] bg-clip-text text-transparent">→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </AnimateOnScroll>

        {/* Close — centered */}
        <AnimateOnScroll delay={200}>
          <div className="pt-6 border-t border-white/[0.06] text-center">
            <p className="text-xl sm:text-2xl font-bold text-white">
              Marketing isn't guesswork.
            </p>
            <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">
              It's velocity management.
            </p>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
};

export default LandingVirality;
