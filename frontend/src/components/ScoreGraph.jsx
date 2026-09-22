import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { Loading } from './ui';
import './ScoreGraph.css';

// Dark Cyber Harmonious Palette - Violet, Indigo & Cyan tones matching Ciphera's dark aesthetic
const CYBER_DARK_PALETTE = [
  '#A855F7', // Electric Violet (Primary)
  '#22D3EE', // Cyber Cyan (Accent)
  '#818CF8', // Neon Indigo
  '#C084FC', // Lavender Violet
  '#38BDF8', // Electric Sky
  '#7C3AED', // Deep Violet
  '#E879F9', // Orchid
  '#06B6D4', // Deep Cyan
  '#A78BFA', // Soft Violet
  '#4F46E5', // Royal Indigo
];

/**
 * Clean & Minimalist Dark-Themed CTF Timeline Graph.
 * Blends seamlessly into Ciphera's dark UI with cool-toned violet/cyan aesthetics,
 * no muddy fill layers, and clutter-free hover interactions.
 */
const ScoreGraph = ({ type = 'teams', limit = 10, height = '400px' }) => {
  const [option, setOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    fetchGraphData();
    const interval = setInterval(fetchGraphData, 60000);
    return () => clearInterval(interval);
  }, [type, limit]);

  const fetchGraphData = async () => {
    try {
      const res = await axios.get(`/api/v1/scoreboard/top/${limit}?type=${type}`);
      const places = res.data?.data || {};
      const ranks = Object.keys(places);

      if (ranks.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      // Collect timestamps across all solves
      let maxDate = null;
      const validRanks = [];

      ranks.forEach((rank) => {
        const place = places[rank];
        const solves = Array.isArray(place?.solves) ? place.solves : [];
        if (solves.length > 0) {
          validRanks.push(rank);
          solves.forEach((s) => {
            const d = new Date(s.date);
            if (!maxDate || d > maxDate) maxDate = d;
          });
        }
      });

      if (validRanks.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      setHasData(true);

      const latestDate = maxDate ? new Date(maxDate.getTime() + 60 * 1000) : null;
      const legendData = [];
      const series = [];
      const leaderMap = {};

      validRanks.forEach((rank, idx) => {
        const place = places[rank];
        const color = CYBER_DARK_PALETTE[idx % CYBER_DARK_PALETTE.length];
        const solves = Array.isArray(place?.solves) ? [...place.solves] : [];

        solves.sort((a, b) => new Date(a.date) - new Date(b.date));

        const finalScore = Number(place.score ?? solves.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0));
        leaderMap[place.name] = { score: finalScore, color, rank: Number(rank) || idx + 1 };
        legendData.push(place.name);

        const dataPoints = [];
        let running = 0;

        solves.forEach((entry) => {
          const val = Number(entry.value || 0);
          running += val;
          const solveTime = new Date(entry.date);

          dataPoints.push({
            value: [solveTime, running],
            symbol: 'circle',
            symbolSize: 5,
            pointsAdded: val,
            runningScore: running,
            isSolve: true
          });
        });

        // Extend line horizontally to latest timestamp for active standings
        if (latestDate && solves.length > 0) {
          const lastSolve = new Date(solves[solves.length - 1].date);
          if (lastSolve < latestDate) {
            dataPoints.push({
              value: [latestDate, running],
              symbol: 'none',
              isExtension: true
            });
          }
        }

        series.push({
          name: place.name,
          type: 'line',
          data: dataPoints,
          smooth: 0.1,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 5,
          lineStyle: { width: 2, color },
          itemStyle: { color },
          // No areaStyle to preserve dark theme clarity and avoid muddy brown overlays
          emphasis: {
            focus: 'series',
            lineStyle: { width: 3.2, shadowColor: color, shadowBlur: 10 },
            label: {
              show: true,
              position: 'top',
              distance: 8,
              formatter: (params) => `${params.value[1]} pts`,
              color: '#F5F1EA',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: 'rgba(12, 11, 15, 0.95)',
              borderColor: color,
              borderWidth: 1,
              borderRadius: 4,
              padding: [3, 6]
            }
          }
        });
      });

      setOption({
        color: CYBER_DARK_PALETTE,
        textStyle: {
          color: '#6F6973',
          fontFamily: 'JetBrains Mono, Inter, sans-serif'
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(12, 11, 15, 0.97)',
          borderColor: '#29202D',
          borderWidth: 1,
          padding: [10, 14],
          textStyle: {
            color: '#F5F1EA',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 12
          },
          axisPointer: {
            type: 'line',
            lineStyle: {
              color: 'rgba(124, 58, 237, 0.4)',
              width: 1,
              type: 'dashed'
            }
          },
          formatter: (params) => {
            if (!params || params.length === 0) return '';
            const first = params[0];
            const dateVal = new Date(first.value[0]);
            const timeStr = !isNaN(dateVal.getTime())
              ? dateVal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'Timeline';

            const valid = params.filter(p => p.value && typeof p.value[1] === 'number');
            valid.sort((a, b) => b.value[1] - a.value[1]);

            let html = `
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; min-width: 180px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1D1722; padding-bottom: 6px; margin-bottom: 8px;">
                  <span style="color: #7C3AED; font-weight: 700;">⏱ ${timeStr}</span>
                  <span style="color: #6F6973; font-size: 10px;">TOP STANDINGS</span>
                </div>
            `;

            valid.forEach((p) => {
              const pts = p.value[1];
              const added = p.data?.pointsAdded ? `<span style="color: #A855F7; font-size: 10px; margin-left: 4px;">(+${p.data.pointsAdded})</span>` : '';
              html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 4px 0; gap: 14px;">
                  <span style="display: flex; align-items: center; gap: 6px; color: #F5F1EA; font-weight: 500;">
                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${p.color}; box-shadow: 0 0 5px ${p.color};"></span>
                    ${p.seriesName}
                  </span>
                  <span style="font-weight: 700; color: #C084FC;">
                    ${pts.toLocaleString()} pts ${added}
                  </span>
                </div>
              `;
            });

            html += `</div>`;
            return html;
          }
        },
        legend: {
          data: legendData,
          type: 'scroll',
          orient: 'horizontal',
          top: 8,
          left: '4%',
          right: '12%',
          itemWidth: 8,
          itemHeight: 8,
          itemGap: 14,
          formatter: '{name}',
          textStyle: {
            color: '#A8A3AD',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 500
          },
          pageTextStyle: { color: '#6F6973' },
          pageIconColor: '#7C3AED',
          pageIconInactiveColor: '#29202D'
        },
        toolbox: {
          top: 6,
          right: '2%',
          itemSize: 13,
          feature: {
            restore: { title: 'Reset View' },
            saveAsImage: {
              title: 'Export Chart',
              pixelRatio: 2,
              backgroundColor: '#0C0B0F'
            }
          },
          iconStyle: {
            borderColor: '#4A4350'
          },
          emphasis: {
            iconStyle: {
              borderColor: '#7C3AED'
            }
          }
        },
        grid: {
          containLabel: true,
          left: '2%',
          right: '3%',
          bottom: 30,
          top: 44
        },
        yAxis: {
          type: 'value',
          name: 'PTS',
          minInterval: 1,
          nameTextStyle: {
            color: '#6F6973',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            fontWeight: 600,
            padding: [0, 0, 4, 0],
            align: 'left'
          },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: '#6F6973',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(41, 32, 45, 0.35)',
              type: 'dashed'
            }
          }
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          axisLine: { lineStyle: { color: '#1D1722' } },
          axisTick: { lineStyle: { color: '#1D1722' } },
          axisLabel: {
            color: '#6F6973',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            formatter: (val) => {
              const d = new Date(val);
              return !isNaN(d.getTime())
                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
            }
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(41, 32, 45, 0.2)',
              type: 'dashed'
            }
          }
        },
        series,
        backgroundColor: 'transparent',
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0],
            filterMode: 'filter'
          },
          {
            id: 'dataZoomX',
            type: 'slider',
            xAxisIndex: [0],
            filterMode: 'filter',
            height: 12,
            bottom: 2,
            borderColor: '#1D1722',
            backgroundColor: '#070609',
            fillerColor: 'rgba(124, 58, 237, 0.15)',
            handleStyle: {
              color: '#7C3AED',
              borderColor: '#29202D',
              borderWidth: 1
            },
            moveHandleStyle: {
              color: '#7C3AED'
            },
            dataBackground: {
              lineStyle: { color: '#1D1722', width: 1 },
              areaStyle: { opacity: 0 }
            },
            selectedDataBackground: {
              lineStyle: { color: '#7C3AED', width: 1 },
              areaStyle: { opacity: 0 }
            },
            textStyle: {
              color: '#4A4350',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9
            }
          }
        ]
      });

      setLoading(false);
    } catch (err) {
      console.error('Graph Error:', err);
      setHasData(false);
      setLoading(false);
    }
  };

  if (loading) return <Loading text="LOADING GRAPH..." />;
  if (!hasData) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6F6973', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>No solves yet</div>;

  return (
    <div className="score-graph-container" style={{ width: '100%', height }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
        notMerge={true}
      />
    </div>
  );
};

export default ScoreGraph;
