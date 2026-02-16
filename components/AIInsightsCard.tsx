
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useThemeColors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';

interface AIInsightsCardProps {
  trackId: string;
  date: string;
}

interface Insight {
  id: string;
  type: 'trend' | 'recommendation' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
}

export default function AIInsightsCard({ trackId, date }: AIInsightsCardProps) {
  const colors = useThemeColors();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [trackId, date]);

  const loadInsights = async () => {
    console.log('Loading AI insights for track:', trackId, 'date:', date);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('track_id', trackId)
        .eq('date', date)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading insights:', error);
      } else if (data && data.length > 0) {
        setInsights(data.map(d => ({
          id: d.id,
          type: d.insight_type,
          title: d.title,
          description: d.description,
          confidence: d.confidence,
        })));
        
        // Get summary from metadata of first insight
        if (data[0].metadata?.summary) {
          setSummary(data[0].metadata.summary);
        }
        
        console.log('Loaded insights:', data.length);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeData = async () => {
    console.log('User requested AI analysis');
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'You must be logged in to use AI analysis');
        return;
      }

      const response = await fetch(
        'https://fdgnmcaxiclsqlydftpq.supabase.co/functions/v1/analyze-track-trends',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trackId, date }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.insights && result.insights.length > 0) {
        setInsights(result.insights);
        setSummary(result.summary || '');
        Alert.alert('Success', 'AI analysis completed!');
      } else {
        Alert.alert('No Data', result.message || 'No readings found for analysis');
      }
    } catch (error) {
      console.error('Error analyzing data:', error);
      Alert.alert('Error', 'Failed to analyze data. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

 type MaterialIconName = keyof typeof import("@expo/vector-icons/MaterialIcons").default.glyphMap;

  const getInsightIcon = (
  type: string
): { ios: string; android: MaterialIconName } => {

    switch (type) {
      case 'trend':
        return { ios: 'chart.line.uptrend.xyaxis', android: 'trending-up' };
      case 'recommendation':
        return { ios: 'lightbulb', android: 'lightbulb' };
      case 'anomaly':
        return { ios: 'exclamationmark.triangle', android: 'warning' };
      default:
        return { ios: 'info.circle', android: 'info' };
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'trend':
        return '#007bff';
      case 'recommendation':
        return '#28a745';
      case 'anomaly':
        return '#ffc107';
      default:
        return colors.primary;
    }
  };

  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading AI insights...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconSymbol
            ios_icon_name="brain"
            android_material_icon_name="psychology"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.title}>AI Insights</Text>
        </View>
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={analyzeData}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <React.Fragment>
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto-awesome"
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.analyzeButtonText}>
                {insights.length > 0 ? 'Refresh' : 'Analyze'}
              </Text>
            </React.Fragment>
          )}
        </TouchableOpacity>
      </View>

      {insights.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No AI insights yet. Tap "Analyze" to get AI-powered analysis of your track readings.
          </Text>
        </View>
      ) : (
        <React.Fragment>
          {summary && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
          )}

          <View style={styles.insightsList}>
            {insights.map((insight, index) => {
              const icon = getInsightIcon(insight.type);
              const color = getInsightColor(insight.type);
              
              return (
                <View key={`insight-${insight.id || index}`} style={[styles.insightCard, { borderLeftColor: color }]}>
                  <View style={styles.insightHeader}>
                    <IconSymbol
                      ios_icon_name={icon.ios}
                      android_material_icon_name={icon.android}
                      size={20}
                      color={color}
                    />
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                  </View>
                  <Text style={styles.insightDescription}>{insight.description}</Text>
                  <View style={styles.confidenceBar}>
                    <View style={styles.confidenceBarBg}>
                      <View
                        style={[
                          styles.confidenceBarFill,
                          { width: `${insight.confidence * 100}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                    <Text style={styles.confidenceText}>
                      {Math.round(insight.confidence * 100)}% confidence
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </React.Fragment>
      )}
    </View>
  );
}

function getStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginVertical: 12,
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      elevation: 3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    analyzeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    analyzeButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      gap: 8,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyState: {
      padding: 20,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    summaryCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    summaryText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    insightsList: {
      gap: 12,
    },
    insightCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      borderLeftWidth: 4,
    },
    insightHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    insightTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    insightDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
    },
    confidenceBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    confidenceBarBg: {
      flex: 1,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    confidenceBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    confidenceText: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
    },
  });
}
