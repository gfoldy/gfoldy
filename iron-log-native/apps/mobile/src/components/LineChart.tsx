// Minimal dependency-light line chart (react-native-svg), mirroring the web
// app's svgLine: a single series with grid lines and point markers.

import React from 'react';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';
import { T } from '../theme';

export interface Point { label: string; y: number; }

export function LineChart({ points, color = T.gold, height = 150 }: { points: Point[]; color?: string; height?: number }) {
  const W = 340, H = height, padL = 30, padR = 8, padT = 12, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  if (points.length < 2) return null;
  const ys = points.map((p) => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo = Math.max(0, lo - 5); hi = hi + 5; }
  const pad = (hi - lo) * 0.15; lo = Math.max(0, lo - pad); hi = hi + pad;
  const n = points.length;
  const xFor = (i: number) => padL + (i / (n - 1)) * plotW;
  const yFor = (v: number) => padT + plotH - ((v - lo) / (hi - lo)) * plotH;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)} ${yFor(p.y).toFixed(1)}`).join(' ');

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {[lo, (lo + hi) / 2, hi].map((v, i) => (
        <React.Fragment key={i}>
          <Line x1={padL} x2={W - padR} y1={yFor(v)} y2={yFor(v)} stroke={T.hairline} strokeWidth={1} />
          <SvgText x={padL - 4} y={yFor(v) + 3} fill={T.textFaint} fontSize={9} textAnchor="end">{Math.round(v)}</SvgText>
        </React.Fragment>
      ))}
      <Path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <React.Fragment key={i}>
          <Circle cx={xFor(i)} cy={yFor(p.y)} r={3.2} fill={color} stroke={T.bgElev} strokeWidth={1.5} />
          {(n <= 9 || i % 2 === 0 || i === n - 1) && (
            <SvgText x={xFor(i)} y={H - 7} fill={T.textFaint} fontSize={9} textAnchor="middle">{p.label}</SvgText>
          )}
        </React.Fragment>
      ))}
    </Svg>
  );
}
