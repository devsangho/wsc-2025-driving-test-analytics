"use client";

import { RouteSegment } from "../utils/route-planner";

interface TerrainProfileProps {
  segments: RouteSegment[];
  height?: number;
  width?: number | string;
}

export function TerrainProfile({ segments, height = 120, width = "100%" }: TerrainProfileProps) {
  if (!segments || segments.length === 0) {
    return (
      <div 
        style={{ height: `${height}px`, width: typeof width === 'number' ? `${width}px` : width }} 
        className="bg-muted rounded-md flex items-center justify-center"
      >
        <p className="text-sm text-muted-foreground">지형 데이터 없음</p>
      </div>
    );
  }

  // 세그먼트 총 거리 계산
  const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);

  // 무작위 지형 생성 (실제로는 실제 지형 데이터를 사용해야 함)
  const generateRandomElevation = (index: number, isControlStop: boolean) => {
    // 통제 구역은 낮은 고도로 설정
    if (isControlStop) {
      return 100 + Math.random() * 50;
    }
    
    // 거리에 따른 기본 고도 변화 (사인 웨이브)
    const baseElevation = 200 + Math.sin(index * 0.5) * 150;
    
    // 작은 노이즈 추가
    const noise = Math.random() * 50 - 25;
    
    return baseElevation + noise;
  };

  // 세그먼트별 고도 데이터 생성
  const terrainData = segments.map((segment, index) => {
    return {
      ...segment,
      elevation: generateRandomElevation(index, segment.isControlStop),
      distanceRatio: segment.distance / totalDistance
    };
  });

  return (
    <div 
      style={{ height: `${height}px`, width: typeof width === 'number' ? `${width}px` : width }}
      className="relative bg-muted/30 rounded-md overflow-hidden"
    >
      {/* 지형 프로필 그래프 */}
      <svg width="100%" height="100%" viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none">
        {/* 배경 그리드 */}
        <g className="text-muted-foreground/20">
          {[0, 0.25, 0.5, 0.75, 1].map(y => (
            <line 
              key={`grid-h-${y}`}
              x1="0"
              y1={height - (y * height)}
              x2="1000"
              y2={height - (y * height)}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(x => (
            <line 
              key={`grid-v-${x}`}
              x1={x * 1000}
              y1="0"
              x2={x * 1000}
              y2={height}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}
        </g>

        {/* 지형 윤곽선 */}
        <path
          d={`
            M 0 ${height}
            ${terrainData.reduce((pathD, segment, index) => {
              const x = (terrainData.slice(0, index).reduce((sum, s) => sum + s.distanceRatio, 0) + segment.distanceRatio / 2) * 1000;
              const normalizedElev = Math.min(0.95, segment.elevation / 500); // 높이 정규화
              const y = height - (normalizedElev * height);
              return `${pathD} L ${x} ${y}`;
            }, "")}
            L 1000 ${height}
            Z
          `}
          fill="url(#terrainGradient)"
          strokeWidth="2"
          stroke="#94a3b8"
        />

        {/* 그라디언트 정의 */}
        <defs>
          <linearGradient id="terrainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#a5f3fc" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* 컨트롤 스탑 마커 */}
        {terrainData.map((segment, index) => {
          if (segment.isControlStop) {
            const x = (terrainData.slice(0, index).reduce((sum, s) => sum + s.distanceRatio, 0) + segment.distanceRatio / 2) * 1000;
            const normalizedElev = Math.min(0.95, segment.elevation / 500);
            const y = height - (normalizedElev * height);
            
            return (
              <g key={`control-${index}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  className="fill-blue-500"
                />
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  fill="#475569"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {segment.controlStopName}
                </text>
              </g>
            );
          }
          return null;
        })}

        {/* 배터리 충전 마커 */}
        {terrainData.map((segment, index) => {
          if (segment.batteryChargingStop) {
            const x = (terrainData.slice(0, index).reduce((sum, s) => sum + s.distanceRatio, 0) + segment.distanceRatio / 2) * 1000;
            const normalizedElev = Math.min(0.95, segment.elevation / 500);
            const y = height - (normalizedElev * height);
            
            return (
              <g key={`charging-${index}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  className="fill-amber-500"
                />
                <text
                  x={x}
                  y={y + 15}
                  textAnchor="middle"
                  fill="#78350f"
                  fontSize="9"
                >
                  충전 {segment.chargingTime}h
                </text>
              </g>
            );
          }
          return null;
        })}
      </svg>

      {/* 거리 표시 */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-xs text-muted-foreground">
        <span>0 km</span>
        <span>{Math.round(totalDistance)} km</span>
      </div>
    </div>
  );
} 