import { useEffect, useRef } from "react";
import AnimateOnScroll from "./AnimateOnScroll";
import { Database, Brain, Send } from "lucide-react";

const layers = [
  {
    icon: Database,
    title: "Intelligence Layer",
    description: "Brand memory, audience data, positioning, tone, competitors, performance history.",
    color: "#2dd4a8",
  },
  {
    icon: Brain,
    title: "Decision + Creation Layer",
    description: "AI orchestrates strategy, selects angles, applies psychological frameworks, generates native platform content.",
    color: "#6b8de3",
  },
  {
    icon: Send,
    title: "Operations + Distribution Layer",
    description: "Scheduling, publishing, employee enablement, velocity tracking, amplification timing.",
    color: "#a855f7",
  },
];

const BlueprintGrid = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    let frame: number;
    let t = 0;

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const gridSize = 60;

      // Grid lines
      ctx.strokeStyle = "rgba(107, 141, 227, 0.08)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Nodes
      const nodes = [
        { x: w * 0.15, y: h * 0.2, color: "#2dd4a8" },
        { x: w * 0.35, y: h * 0.35, color: "#6b8de3" },
        { x: w * 0.5, y: h * 0.15, color: "#a855f7" },
        { x: w * 0.65, y: h * 0.4, color: "#2dd4a8" },
        { x: w * 0.8, y: h * 0.25, color: "#6b8de3" },
        { x: w * 0.25, y: h * 0.7, color: "#a855f7" },
        { x: w * 0.55, y: h * 0.75, color: "#2dd4a8" },
        { x: w * 0.75, y: h * 0.65, color: "#6b8de3" },
        { x: w * 0.9, y: h * 0.8, color: "#a855f7" },
        { x: w * 0.1, y: h * 0.5, color: "#6b8de3" },
        { x: w * 0.45, y: h * 0.55, color: "#2dd4a8" },
        { x: w * 0.85, y: h * 0.5, color: "#a855f7" },
      ];

      // Animated connecting lines
      const connections = [
        [0, 1], [1, 2], [2, 4], [1, 3], [3, 4],
        [0, 9], [9, 5], [5, 6], [6, 10], [10, 3],
        [6, 7], [7, 11], [11, 8], [4, 11], [10, 7],
      ];

      connections.forEach(([a, b], i) => {
        const from = nodes[a];
        const to = nodes[b];
        const progress = (Math.sin(t * 0.8 + i * 0.7) + 1) / 2;

        // Base line
        ctx.strokeStyle = "rgba(107, 141, 227, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        // Animated pulse along line
        const px = from.x + (to.x - from.x) * progress;
        const py = from.y + (to.y - from.y) * progress;
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, 12);
        gradient.addColorStop(0, `${from.color}40`);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, 12, 0, Math.PI * 2);
        ctx.fill();
      });

      // Glowing nodes
      nodes.forEach((node) => {
        const pulse = Math.sin(t * 1.2 + node.x * 0.01) * 0.3 + 0.7;

        // Outer glow
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 20);
        glow.addColorStop(0, `${node.color}${Math.round(pulse * 50).toString(16).padStart(2, "0")}`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.fillStyle = `${node.color}${Math.round(pulse * 200).toString(16).padStart(2, "0")}`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      t += 0.016;
      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

const LandingInfrastructure = () => {
  return (
    <section className="relative py-24 sm:py-32 lg:py-40 px-4 sm:px-6 bg-white overflow-hidden">
      <BlueprintGrid />

      <div className="relative z-10 max-w-5xl mx-auto">
        <AnimateOnScroll>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4">
            <span className="text-foreground">Stop Hiring Output.</span>
            <br />
            <span className="bg-gradient-to-r from-[#2dd4a8] via-[#6b8de3] to-[#a855f7] bg-clip-text text-transparent">
              Start Building Infrastructure.
            </span>
          </h2>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-16 sm:mb-20 leading-relaxed font-light">
            Most companies scale marketing by adding people.
            <br />
            KLYC scales marketing by adding systems.
          </p>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-px rounded-xl overflow-hidden">
          {layers.map((layer, i) => (
            <AnimateOnScroll key={i} delay={150 + i * 100}>
              <div className="bg-white/80 backdrop-blur-sm border border-border/40 p-8 sm:p-10 h-full flex flex-col rounded-xl shadow-sm">
                <layer.icon
                  className="w-5 h-5 mb-6"
                  strokeWidth={1.5}
                  style={{ color: layer.color }}
                />
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-3">
                  {layer.title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-light">
                  {layer.description}
                </p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingInfrastructure;
