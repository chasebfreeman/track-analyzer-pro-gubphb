import React, { useMemo } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '@/styles/commonStyles';
import { GraphPoint } from '@/utils/graphFields';
import { IconSymbol } from '@/components/IconSymbol';

interface GraphPointDetailsSheetProps {
  point: GraphPoint | null;
  visible: boolean;
  onClose: () => void;
  onOpenReading: (point: GraphPoint) => void;
}

export default function GraphPointDetailsSheet({ point, visible, onClose, onOpenReading }: GraphPointDetailsSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (!point) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Point Details</Text>
              <Text style={styles.subtitle}>{point.date} at {point.time}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{point.lane === 'left' ? 'Left Lane' : 'Right Lane'}</Text>
            </View>
            {point.session ? (
              <View style={styles.badgeSecondary}>
                <Text style={styles.badgeSecondaryText}>Session {point.session}</Text>
              </View>
            ) : null}
            {point.pair ? (
              <View style={styles.badgeSecondary}>
                <Text style={styles.badgeSecondaryText}>Pair {point.pair}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.valueCard}>
            <Text style={styles.valueLabel}>{point.xLabel}</Text>
            <Text style={styles.valueText}>{point.xValueLabel}</Text>
          </View>

          <View style={styles.valueCard}>
            <Text style={styles.valueLabel}>{point.yLabel}</Text>
            <Text style={styles.valueText}>{point.yValueLabel}</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => onOpenReading(point)}>
            <Text style={styles.primaryButtonText}>Open Reading</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 28,
      borderTopWidth: 1,
      borderColor: colors.border,
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: 16,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '700', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    badge: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    badgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
    badgeSecondary: { backgroundColor: colors.background, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
    badgeSecondaryText: { color: colors.textSecondary, fontWeight: '600', fontSize: 12 },
    valueCard: {
      backgroundColor: colors.background,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    valueLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
    valueText: { fontSize: 24, color: colors.text, fontWeight: '700' },
    primaryButton: {
      marginTop: 10,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  });
}
