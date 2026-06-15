import { useEffect, useRef, type ReactNode } from "react";
import { Animated, type ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
};

/**
 * Springs its children in with a small overshoot — a tasteful "pop" for things
 * that appear on a state change (e.g. a "done today" check). Native-driven, no
 * worklets. Re-pops whenever it mounts, which is exactly when the state flips.
 */
export function PopIn({ children, style }: Props) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 9,
      stiffness: 180,
      mass: 0.6,
    }).start();
  }, [scale]);

  return <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>;
}
