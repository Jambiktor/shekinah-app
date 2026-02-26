import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../shared/theme/ThemeProvider";

type Option = {
  id: string;
  label: string;
};

type Props = {
  options: Option[];
  selectedId: string;
  onSelect: (optionId: string) => void;
};

const FilterChips = ({ options, selectedId, onSelect }: Props) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = option.id === selectedId;
        return (
          <Pressable
            key={option.id}
            onPress={() => onSelect(option.id)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (theme: import("../../../shared/theme/types").SchoolTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 14,
      backgroundColor: `${theme.colors.primary}1A`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}33`,
    },
    chipActive: {
      backgroundColor: theme.colors.primary,
    },
    chipText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.text,
    },
    chipTextActive: {
      color: theme.colors.surface,
    },
  });

export default FilterChips;
