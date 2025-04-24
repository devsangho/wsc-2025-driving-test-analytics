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

  // 지형 프로필 그래프 내에 세그먼트 유형별 표시
  const renderSegmentMarkers = () => {
    let distanceAccumulated = 0;
    
    return segments.map((segment, index) => {
      // 배터리 충전 세그먼트는 위치 이동이 없으므로 특별 처리
      if (segment.segmentType === 'BatteryCharging' && segment.distance === 0) {
        // 이전 세그먼트의 위치에 마커 표시
        const centerX = (distanceAccumulated / totalDistance) * 1000;
        
        // 화면 위치 계산 (이전 포인트와 동일)
        const prevSegmentIndex = index > 0 ? index - 1 : 0;
        const elevation = generateRandomElevation(prevSegmentIndex, false);
        const normalizedElev = Math.min(0.95, elevation / 500);
        const y = height - (normalizedElev * height);
        
        return (
          <g key={`charging-${index}`} className="segment-marker">
            {/* 배터리 충전 아이콘 - 정지 표시 */}
            <circle
              cx={centerX}
              cy={y}
              r="6"
              className="fill-amber-600"
              opacity="0.8"
            />
            <text
              x={centerX}
              y={y - 10}
              textAnchor="middle"
              fill="#78350f"
              fontSize="9"
              fontWeight="bold"
            >
              충전 {segment.chargingTime}h
            </text>
            <text
              x={centerX}
              y={y + 3}
              textAnchor="middle"
              fill="white"
              fontSize="8"
              fontWeight="bold"
            >
              ⚡
            </text>
          </g>
        );
      }
      
      // 세그먼트 위치 계산 (시작 및 끝 위치)
      const startX = (distanceAccumulated / totalDistance) * 1000;
      // 거리가 0이 아닌 경우에만 누적 거리 업데이트
      if (segment.distance > 0) {
        distanceAccumulated += segment.distance;
      }
      const endX = (distanceAccumulated / totalDistance) * 1000;
      const centerX = (startX + endX) / 2;
      
      // 무작위 고도값 (실제로는 지형 데이터 사용)
      const elevation = generateRandomElevation(index, segment.isControlStop);
      const normalizedElev = Math.min(0.95, elevation / 500);
      const y = height - (normalizedElev * height);
      
      // 각 세그먼트 유형별 마커 생성
      if (segment.segmentType === 'ControlStop') {
        return (
          <g key={`segment-${index}`} className="segment-marker">
            {/* 컨트롤 스탑 세그먼트 바 */}
            <rect
              x={startX}
              y={0}
              width={endX - startX}
              height={height}
              fill="rgba(99, 102, 241, 0.2)"
              stroke="#6366f1"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            {/* 컨트롤 스탑 마커 */}
            <circle
              cx={centerX}
              cy={y}
              r="5"
              className="fill-indigo-600"
            />
            <text
              x={centerX}
              y={y - 10}
              textAnchor="middle"
              fill="#4338ca"
              fontSize="10"
              fontWeight="bold"
            >
              {segment.controlStopName}
            </text>
          </g>
        );
      } else if (segment.segmentType === 'Driving') {
        return (
          <g key={`segment-${index}`} className="segment-marker">
            {/* Driving 세그먼트 바 */}
            <rect
              x={startX}
              y={0}
              width={endX - startX}
              height={height}
              fill="rgba(34, 197, 94, 0.05)"
              strokeWidth="0"
            />
            {/* Driving 마커 */}
            <circle
              cx={centerX}
              cy={y}
              r="2"
              className="fill-green-600"
            />
          </g>
        );
      }
      
      // 기본 반환 (위에서 처리되지 않은 경우)
      return null;
    });
  };

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
          fill="rgba(248, 250, 252, 0.1)"
          strokeWidth="1"
          stroke="#94a3b8"
        />

        {/* 그라디언트 정의 - 사용하지 않음 */}
        <defs>
          <linearGradient id="terrainGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" stopOpacity="0" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>

        {renderSegmentMarkers()}
      </svg>

      {/* 거리 표시 */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-between px-2 text-xs text-muted-foreground">
        <span>0 km</span>
        <span>{Math.round(totalDistance)} km</span>
      </div>
    </div>
  );
} 