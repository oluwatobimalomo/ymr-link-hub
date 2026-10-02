const RAY_COLORS = ["gold", "red", "teal", "violet", "gold-deep"];
const RAY_COUNT = 16;

export default function RayBurst() {
  return (
    <div className="ray-burst" aria-hidden="true">
      <div className="ray-burst__spin">
        {Array.from({ length: RAY_COUNT }).map((_, i) => {
          const angle = (360 / RAY_COUNT) * i;
          const color = RAY_COLORS[i % RAY_COLORS.length];
          return (
            <div
              key={i}
              className={`ray-burst__ray ray-burst__ray--${color}`}
              style={{
                transform: `translate(-50%,0) rotate(${angle}deg)`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          );
        })}
      </div>
      <div className="ray-burst__beam-v" />
      <div className="ray-burst__beam-h" />
    </div>
  );
}
