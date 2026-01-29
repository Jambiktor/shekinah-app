import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle } from "react-native";

type Props = {
  style?: ViewStyle;
};

const SkeletonBlock = ({ style }: Props) => {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { opacity }, style]} />;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#E8ECEF",
    borderRadius: 12,
  },
});

export default SkeletonBlock;
