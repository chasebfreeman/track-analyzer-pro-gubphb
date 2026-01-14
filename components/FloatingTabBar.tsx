
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { BlurView } from 'expo-blur';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useThemeColors } from '@/styles/commonStyles';

const { width: screenWidth } = Dimensions.get('window');

interface TabConfig {
  name: string;
  ios_icon_name: string;
  android_material_icon_name: string;
  label: string;
}

const TAB_CONFIGS: TabConfig[] = [
  { name: 'tracks', ios_icon_name: 'map.fill', android_material_icon_name: 'map', label: 'Tracks' },
  { name: 'record', ios_icon_name: 'plus.circle.fill', android_material_icon_name: 'add_circle', label: 'Record' },
  { name: 'browse', ios_icon_name: 'magnifyingglass', android_material_icon_name: 'search', label: 'Browse' },
  { name: 'settings', ios_icon_name: 'gearshape.fill', android_material_icon_name: 'settings', label: 'Settings' },
];

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const isDark = colorScheme === 'dark';

  const blurTint = isDark ? 'dark' : 'light';
  const backgroundColor = isDark
    ? 'rgba(28, 28, 30, 0.95)'
    : 'rgba(255, 255, 255, 0.95)';

  console.log('FloatingTabBar rendering, current route:', state.routes[state.index]?.name);
  console.log('FloatingTabBar colors:', { primary: colors.primary, text: colors.text });

  return (
    <View 
      style={styles.outerContainer}
      pointerEvents="box-none"
    >
      <SafeAreaView 
        style={styles.safeArea} 
        edges={['bottom']}
        pointerEvents="box-none"
      >
        <View 
          style={[
            styles.container,
            {
              width: Math.min(screenWidth * 0.85, 500),
              marginBottom: 20
            }
          ]}
        >
          <BlurView
            intensity={80}
            tint={blurTint}
            style={[
              styles.blurContainer,
              { 
                borderRadius: 35,
                backgroundColor,
                borderWidth: 1.2,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              }
            ]}
          >
            <View style={styles.tabsContainer}>
              {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const isFocused = state.index === index;
                const tabConfig = TAB_CONFIGS.find(t => t.name === route.name);

                if (!tabConfig) {
                  console.warn('Tab config not found for route:', route.name);
                  return null;
                }

                const onPress = () => {
                  console.log('Tab pressed:', route.name, 'currently focused:', isFocused);
                  
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    console.log('Navigating to tab:', route.name);
                    navigation.navigate(route.name);
                  } else {
                    console.log('Tab already focused or navigation prevented');
                  }
                };

                const onLongPress = () => {
                  console.log('Tab long pressed:', route.name);
                  navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  });
                };

                const iconColor = isFocused ? colors.primary : colors.text;
                const labelColor = isFocused ? colors.primary : colors.text;

                console.log(`Tab ${route.name} - isFocused: ${isFocused}, iconColor: ${iconColor}, labelColor: ${labelColor}`);

                return (
                  <TouchableOpacity
                    key={route.key}
                    accessibilityRole="button"
                    accessibilityState={isFocused ? { selected: true } : {}}
                    accessibilityLabel={options.tabBarAccessibilityLabel}
                    testID={options.tabBarTestID}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={[
                      styles.tab,
                      isFocused && {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.04)',
                        borderRadius: 27,
                      }
                    ]}
                    activeOpacity={0.6}
                    hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                  >
                    <IconSymbol
                      ios_icon_name={tabConfig.ios_icon_name}
                      android_material_icon_name={tabConfig.android_material_icon_name}
                      size={24}
                      color={iconColor}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: labelColor },
                        isFocused && { fontWeight: '600' },
                      ]}
                    >
                      {tabConfig.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </BlurView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  safeArea: {
    alignItems: 'center',
  },
  container: {
    marginHorizontal: 20,
    alignSelf: 'center',
  },
  blurContainer: {
    overflow: 'hidden',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      },
    }),
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
