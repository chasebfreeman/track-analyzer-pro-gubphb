import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '@/styles/commonStyles';
import { GraphFieldId, GraphLaneFilter, graphFieldOptions, getGraphFieldLabel } from '@/utils/graphFields';
import { IconSymbol } from '@/components/IconSymbol';

interface GraphBuilderCardProps {
  xField: GraphFieldId;
  yField: GraphFieldId;
  laneFilter: GraphLaneFilter;
  onChangeXField: (field: GraphFieldId) => void;
  onChangeYField: (field: GraphFieldId) => void;
  onChangeLaneFilter: (lane: GraphLaneFilter) => void;
  onSwapAxes: () => void;
}

export default function GraphBuilderCard({
  xField,
  yField,
  laneFilter,
  onChangeXField,
  onChangeYField,
  onChangeLaneFilter,
  onSwapAxes,
}: GraphBuilderCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [picker, setPicker] = useState<'x' | 'y' | null>(null);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Build A Graph</Text>
          <Text style={styles.subtitle}>Choose the relationship you want to see.</Text>
        </View>

        <TouchableOpacity style={styles.swapButton} onPress={onSwapAxes}>
          <IconSymbol ios_icon_name="arrow.left.arrow.right" android_material_icon_name="swap-horiz" size={18} color="#FFFFFF" />
          <Text style={styles.swapButtonText}>Swap</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.axisRow}>
        <View style={styles.axisGroup}>
          <Text style={styles.label}>X-Axis</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setPicker('x')}>
            <Text style={styles.selectorText}>{getGraphFieldLabel(xField)}</Text>
            <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.axisGroup}>
          <Text style={styles.label}>Y-Axis</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setPicker('y')}>
            <Text style={styles.selectorText}>{getGraphFieldLabel(yField)}</Text>
            <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="arrow-drop-down" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.label}>Lane</Text>
      <View style={styles.chipRow}>
        {([
          ['left', 'Left'],
          ['right', 'Right'],
          ['both', 'Both'],
        ] as const).map(([value, label]) => {
          const active = laneFilter === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChangeLaneFilter(value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPicker(null)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{picker === 'x' ? 'Select X-Axis' : 'Select Y-Axis'}</Text>
              <TouchableOpacity onPress={() => setPicker(null)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionList}>
              {graphFieldOptions.map((field) => {
                const active = (picker === 'x' ? xField : yField) === field.id;
                return (
                  <TouchableOpacity
                    key={field.id}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      if (picker === 'x') onChangeXField(field.id as GraphFieldId);
                      else onChangeYField(field.id as GraphFieldId);
                      setPicker(null);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{field.label}</Text>
                    {active ? (
                      <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={18} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
      gap: 12,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    swapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    swapButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    axisRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    axisGroup: { flex: 1 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
    selector: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    selectorText: { color: colors.text, fontSize: 15, fontWeight: '500', flex: 1 },
    chipRow: { flexDirection: 'row', gap: 8 },
    chip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.text, fontWeight: '600' },
    chipTextActive: { color: '#FFFFFF' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      overflow: 'hidden',
      maxHeight: '75%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    optionList: { maxHeight: 420 },
    option: {
      paddingHorizontal: 16,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionActive: { backgroundColor: colors.background },
    optionText: { color: colors.text, fontSize: 16 },
    optionTextActive: { color: colors.primary, fontWeight: '600' },
  });
}
