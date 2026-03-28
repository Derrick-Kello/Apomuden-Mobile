/**
 * Cross-platform icon wrapper using @expo/vector-icons (MaterialIcons).
 * Drop-in replacement for SymbolView — accepts the same `name`, `size`, `tintColor` props.
 */
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

// Map of logical icon names → MaterialIcons glyph names
const ICON_MAP: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  // navigation / UI
  'chevron.right':                 'chevron-right',
  'chevron_right':                 'chevron-right',
  'chevron.up':                    'expand-less',
  'expand_less':                   'expand-less',
  'chevron.down':                  'expand-more',
  'expand_more':                   'expand-more',
  'xmark':                         'close',
  'keyboard':                      'keyboard',
  'magnifyingglass':               'search',
  'search':                        'search',
  'globe':                         'language',
  'language':                      'language',
  'arrow.up.right.square':         'open-in-new',
  'link':                          'open-in-new',
  'arrow.up':                      'arrow-upward',
  'arrow-upward':                  'arrow-upward',
  'info.circle.fill':              'info',
  'info':                          'info',
  'arrow.counterclockwise':        'refresh',
  'refresh':                       'refresh',
  'checkmark':                     'check',
  'check':                         'check',
  'exclamationmark.triangle.fill': 'warning',
  'warning':                       'warning',
  // health / mic
  'mic.fill':                      'mic',
  'mic':                           'mic',
  'stop.fill':                     'stop',
  'stop':                          'stop',
  'shield.fill':                   'health-and-safety',
  'health_and_safety':             'health-and-safety',
  'heart.fill':                    'favorite',
  'favorite':                      'favorite',
  'heart.circle.fill':             'favorite',
  'leaf.fill':                     'eco',
  'eco':                           'eco',
  'brain.head.profile':            'psychology',
  'psychology':                    'psychology',
  'drop.fill':                     'water-drop',
  'water_drop':                    'water-drop',
  'drop.circle.fill':              'water-drop',
  'bandage.fill':                  'healing',
  'healing':                       'healing',
  'ribbon.fill':                   'volunteer-activism',
  'volunteer_activism':            'volunteer-activism',
  'cross.case.fill':               'local-hospital',
  'local_hospital':                'local-hospital',
  'figure.run':                    'directions-run',
  'directions_run':                'directions-run',
  'moon.fill':                     'bedtime',
  'bedtime':                       'bedtime',
  'hands.sparkles.fill':           'clean-hands',
  'clean_hands':                   'clean-hands',
  'bubble.left.fill':              'chat',
  'chat':                          'chat',
  'lock.fill':                     'lock',
  'lock':                          'lock',
  'public':                        'public',
  // misc
  'waveform':                      'graphic-eq',
  'graphic-eq':                    'graphic-eq',
  'house':                         'home',
  'house.fill':                    'home',
  'home':                          'home',
  'book':                          'menu-book',
  'book.fill':                     'menu-book',
  'menu-book':                     'menu-book',
  'person':                        'person',
  'person.fill':                   'person',
};

type IconName = keyof typeof ICON_MAP | string;

interface IconProps {
  name: IconName | { ios?: string; android?: string; web?: string };
  size?: number;
  tintColor?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 24, tintColor, color, style }: IconProps) {
  // Resolve platform-object or string name
  const rawName: string =
    typeof name === 'object'
      ? (name as { android?: string; ios?: string; web?: string }).android ??
        (name as { ios?: string }).ios ??
        ''
      : (name as string);

  const glyphName: keyof typeof MaterialIcons.glyphMap =
    (ICON_MAP[rawName] as keyof typeof MaterialIcons.glyphMap) ??
    (rawName as keyof typeof MaterialIcons.glyphMap) ??
    'help-outline';

  return (
    <MaterialIcons
      name={glyphName}
      size={size}
      color={tintColor ?? color ?? '#000000'}
      style={style as any}
    />
  );
}
