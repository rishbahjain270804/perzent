import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

/**
 * Small, consistent line-icon set (Feather-style: 24px grid, 2px stroke, round caps) drawn with
 * react-native-svg. Replaces the emoji that used to stand in for icons, so the app reads as a
 * professional product across every device instead of relying on the OS emoji font.
 */

export type IconName =
  | 'user' | 'settings' | 'help' | 'info' | 'logout'
  | 'chevronRight' | 'chevronLeft' | 'close'
  | 'bell' | 'mapPin' | 'download' | 'globe' | 'lock' | 'fileText' | 'trash' | 'alert'
  | 'users' | 'calendar' | 'check' | 'x' | 'refresh' | 'phone';

export function Icon({ name, size = 22, color = '#0F172A', strokeWidth = 2 }: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'user' && (<>
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...p} />
        <Circle cx="12" cy="7" r="4" {...p} />
      </>)}
      {name === 'settings' && (<>
        <Line x1="4" y1="7" x2="20" y2="7" {...p} />
        <Line x1="4" y1="12" x2="20" y2="12" {...p} />
        <Line x1="4" y1="17" x2="20" y2="17" {...p} />
        <Circle cx="9" cy="7" r="2.2" {...p} fill={color} />
        <Circle cx="15" cy="12" r="2.2" {...p} fill={color} />
        <Circle cx="8" cy="17" r="2.2" {...p} fill={color} />
      </>)}
      {name === 'help' && (<>
        <Circle cx="12" cy="12" r="9" {...p} />
        <Path d="M9.2 9.2a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.2-2.6 4" {...p} />
        <Line x1="12" y1="17.4" x2="12" y2="17.5" {...p} />
      </>)}
      {name === 'info' && (<>
        <Circle cx="12" cy="12" r="9" {...p} />
        <Line x1="12" y1="11" x2="12" y2="16" {...p} />
        <Line x1="12" y1="8" x2="12" y2="8.1" {...p} />
      </>)}
      {name === 'logout' && (<>
        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...p} />
        <Polyline points="16 17 21 12 16 7" {...p} />
        <Line x1="21" y1="12" x2="9" y2="12" {...p} />
      </>)}
      {name === 'chevronRight' && <Polyline points="9 6 15 12 9 18" {...p} />}
      {name === 'chevronLeft' && <Polyline points="15 6 9 12 15 18" {...p} />}
      {name === 'close' && (<>
        <Line x1="6" y1="6" x2="18" y2="18" {...p} />
        <Line x1="18" y1="6" x2="6" y2="18" {...p} />
      </>)}
      {name === 'bell' && (<>
        <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" {...p} />
        <Path d="M13.7 21a2 2 0 0 1-3.4 0" {...p} />
      </>)}
      {name === 'mapPin' && (<>
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" {...p} />
        <Circle cx="12" cy="10" r="3" {...p} />
      </>)}
      {name === 'download' && (<>
        <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...p} />
        <Polyline points="7 10 12 15 17 10" {...p} />
        <Line x1="12" y1="15" x2="12" y2="3" {...p} />
      </>)}
      {name === 'globe' && (<>
        <Circle cx="12" cy="12" r="9" {...p} />
        <Line x1="3" y1="12" x2="21" y2="12" {...p} />
        <Path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" {...p} />
      </>)}
      {name === 'lock' && (<>
        <Rect x="4.5" y="11" width="15" height="10" rx="2" {...p} />
        <Path d="M8 11V7a4 4 0 0 1 8 0v4" {...p} />
      </>)}
      {name === 'fileText' && (<>
        <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" {...p} />
        <Polyline points="14 3 14 8 19 8" {...p} />
        <Line x1="8.5" y1="13" x2="15.5" y2="13" {...p} />
        <Line x1="8.5" y1="16.5" x2="13" y2="16.5" {...p} />
      </>)}
      {name === 'trash' && (<>
        <Polyline points="3 6 5 6 21 6" {...p} />
        <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" {...p} />
        <Path d="M10 11v6M14 11v6" {...p} />
      </>)}
      {name === 'alert' && (<>
        <Path d="M12 2 1 21h22L12 2z" {...p} />
        <Line x1="12" y1="9" x2="12" y2="14" {...p} />
        <Line x1="12" y1="17.5" x2="12" y2="17.6" {...p} />
      </>)}
      {name === 'users' && (<>
        <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...p} />
        <Circle cx="9" cy="7" r="3.2" {...p} />
        <Path d="M22 21v-2a4 4 0 0 0-3-3.87" {...p} />
        <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...p} />
      </>)}
      {name === 'calendar' && (<>
        <Rect x="3" y="4.5" width="18" height="16" rx="2" {...p} />
        <Line x1="3" y1="9" x2="21" y2="9" {...p} />
        <Line x1="8" y1="2.5" x2="8" y2="6" {...p} />
        <Line x1="16" y1="2.5" x2="16" y2="6" {...p} />
      </>)}
      {name === 'check' && <Polyline points="4 12.5 9.5 18 20 6" {...p} />}
      {name === 'x' && (<>
        <Line x1="6" y1="6" x2="18" y2="18" {...p} />
        <Line x1="18" y1="6" x2="6" y2="18" {...p} />
      </>)}
      {name === 'refresh' && (<>
        <Path d="M21 12a9 9 0 1 1-3-6.7" {...p} />
        <Polyline points="21 3 21 8 16 8" {...p} />
      </>)}
      {name === 'phone' && (
        <Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" {...p} />
      )}
    </Svg>
  );
}
