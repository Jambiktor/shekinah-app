import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#1A73E8",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});

export default FilterChips;
