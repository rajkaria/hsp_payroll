"use client";

export function MeshBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Purple glow regions */}
      <div className="absolute top-[10%] left-[15%] w-[500px] h-[500px] bg-[#8B5CF6]/[0.12] rounded-full blur-[150px]" />
      <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] bg-[#7C3AED]/[0.08] rounded-full blur-[180px]" />
      <div className="absolute bottom-[10%] left-[30%] w-[700px] h-[700px] bg-[#8B5CF6]/[0.10] rounded-full blur-[160px]" />
      <div className="absolute top-[60%] left-[5%] w-[400px] h-[400px] bg-[#C084FC]/[0.06] rounded-full blur-[120px]" />

      {/* SVG Mesh Network */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C084FC" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nodeGlowBright" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E9D5FF" stopOpacity="1" />
            <stop offset="40%" stopColor="#C084FC" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connection lines */}
        <g stroke="#8B5CF6" strokeWidth="0.5" opacity="0.2">
          {/* Top cluster */}
          <line x1="8%" y1="12%" x2="22%" y2="28%" />
          <line x1="22%" y1="28%" x2="38%" y2="8%" />
          <line x1="38%" y1="8%" x2="55%" y2="18%" />
          <line x1="55%" y1="18%" x2="72%" y2="6%" />
          <line x1="72%" y1="6%" x2="88%" y2="15%" />
          <line x1="88%" y1="15%" x2="95%" y2="30%" />

          {/* Middle connections */}
          <line x1="22%" y1="28%" x2="35%" y2="42%" />
          <line x1="55%" y1="18%" x2="65%" y2="35%" />
          <line x1="65%" y1="35%" x2="82%" y2="40%" />
          <line x1="82%" y1="40%" x2="95%" y2="30%" />
          <line x1="35%" y1="42%" x2="50%" y2="50%" />
          <line x1="50%" y1="50%" x2="65%" y2="35%" />
          <line x1="8%" y1="12%" x2="5%" y2="35%" />
          <line x1="5%" y1="35%" x2="15%" y2="55%" />

          {/* Center web */}
          <line x1="35%" y1="42%" x2="22%" y2="58%" />
          <line x1="50%" y1="50%" x2="42%" y2="65%" />
          <line x1="65%" y1="35%" x2="78%" y2="55%" />
          <line x1="82%" y1="40%" x2="92%" y2="55%" />

          {/* Lower cluster */}
          <line x1="15%" y1="55%" x2="22%" y2="58%" />
          <line x1="22%" y1="58%" x2="30%" y2="72%" />
          <line x1="42%" y1="65%" x2="30%" y2="72%" />
          <line x1="42%" y1="65%" x2="58%" y2="75%" />
          <line x1="78%" y1="55%" x2="58%" y2="75%" />
          <line x1="78%" y1="55%" x2="92%" y2="55%" />
          <line x1="92%" y1="55%" x2="88%" y2="72%" />

          {/* Bottom web */}
          <line x1="30%" y1="72%" x2="18%" y2="85%" />
          <line x1="30%" y1="72%" x2="45%" y2="88%" />
          <line x1="58%" y1="75%" x2="45%" y2="88%" />
          <line x1="58%" y1="75%" x2="72%" y2="85%" />
          <line x1="88%" y1="72%" x2="72%" y2="85%" />
          <line x1="88%" y1="72%" x2="95%" y2="88%" />
          <line x1="18%" y1="85%" x2="8%" y2="92%" />
          <line x1="45%" y1="88%" x2="55%" y2="95%" />
          <line x1="72%" y1="85%" x2="80%" y2="95%" />

          {/* Cross links for density */}
          <line x1="8%" y1="12%" x2="38%" y2="8%" opacity="0.5" />
          <line x1="50%" y1="50%" x2="78%" y2="55%" opacity="0.5" />
          <line x1="15%" y1="55%" x2="42%" y2="65%" opacity="0.5" />
          <line x1="22%" y1="28%" x2="55%" y2="18%" opacity="0.4" />
          <line x1="5%" y1="35%" x2="35%" y2="42%" opacity="0.4" />
        </g>

        {/* Glowing nodes — large */}
        {[
          [8, 12], [22, 28], [38, 8], [55, 18], [72, 6], [88, 15], [95, 30],
          [35, 42], [50, 50], [65, 35], [82, 40], [5, 35], [15, 55],
          [22, 58], [42, 65], [78, 55], [92, 55],
          [30, 72], [58, 75], [88, 72],
          [18, 85], [45, 88], [72, 85],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={`${cx}%`} cy={`${cy}%`} r="8" fill="url(#nodeGlow)" opacity="0.5" />
            <circle cx={`${cx}%`} cy={`${cy}%`} r="2.5" fill="#C084FC" opacity="0.8" />
          </g>
        ))}

        {/* Bright accent nodes */}
        {[
          [22, 28], [55, 18], [50, 50], [78, 55], [45, 88],
        ].map(([cx, cy], i) => (
          <g key={`b${i}`}>
            <circle cx={`${cx}%`} cy={`${cy}%`} r="14" fill="url(#nodeGlowBright)" opacity="0.4" />
            <circle cx={`${cx}%`} cy={`${cy}%`} r="3" fill="#E9D5FF" opacity="0.9" />
          </g>
        ))}

        {/* Tiny scattered dots */}
        {[
          [3, 20], [12, 40], [28, 15], [45, 30], [62, 12], [80, 25],
          [10, 70], [25, 50], [40, 78], [55, 60], [70, 45], [85, 65],
          [20, 92], [38, 55], [60, 88], [75, 70], [90, 82],
          [48, 22], [33, 35], [68, 58], [52, 82], [85, 48],
          [7, 55], [95, 42], [15, 30], [75, 15], [42, 92],
        ].map(([cx, cy], i) => (
          <circle key={`s${i}`} cx={`${cx}%`} cy={`${cy}%`} r="1" fill="#8B5CF6" opacity="0.3" />
        ))}
      </svg>
    </div>
  );
}
