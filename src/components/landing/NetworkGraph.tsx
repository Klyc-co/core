const NetworkGraph = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 800 600"
        className="w-full h-full opacity-[0.07]"
        fill="none"
      >
        {/* Central node */}
        <circle cx="400" cy="300" r="4" fill="currentColor" className="animate-pulse" />
        
        {/* Expanding rings */}
        {[80, 160, 260].map((r, i) => (
          <circle
            key={r}
            cx="400"
            cy="300"
            r={r}
            stroke="currentColor"
            strokeWidth="0.5"
            opacity={0.6 - i * 0.15}
            strokeDasharray="4 8"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 400 300`}
              to={`${i % 2 === 0 ? 360 : -360} 400 300`}
              dur={`${60 + i * 20}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Nodes on orbits */}
        {[
          [320, 260], [480, 340], [340, 380], [460, 220],
          [250, 300], [550, 300], [400, 160], [400, 440],
          [300, 190], [500, 410], [280, 400], [520, 200],
          [180, 260], [620, 340], [350, 100], [450, 500],
          [160, 350], [640, 250], [220, 180], [580, 420],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <line x1="400" y1="300" x2={cx} y2={cy} stroke="currentColor" strokeWidth="0.3" opacity="0.4" />
            <circle cx={cx} cy={cy} r={1.5 + (i % 3)} fill="currentColor" opacity={0.3 + (i % 4) * 0.1}>
              <animate attributeName="opacity" values={`${0.2 + (i % 3) * 0.1};${0.5 + (i % 2) * 0.2};${0.2 + (i % 3) * 0.1}`} dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default NetworkGraph;
