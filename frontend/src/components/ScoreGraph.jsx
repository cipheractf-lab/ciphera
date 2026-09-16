import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';
import { Loading } from './ui';

/**
 * scoreboard graph.
 * Uses /api/v1/scoreboard/top/:count and cumulative sum of solve/award values.
 */
const ScoreGraph = ({ type = 'teams', limit = 10, height = '400px' }) => {
  const [option, setOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    fetchGraphData();
    const interval = setInterval(fetchGraphData, 60000); // 1 minute refresh
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

      setHasData(true);

      const legendData = [];
      const series = [];

      ranks.forEach((rank) => {
        const place = places[rank];
        const solves = Array.isArray(place?.solves) ? [...place.solves] : [];
        if (solves.length === 0) {
          return;
        }

        solves.sort((a, b) => new Date(a.date) - new Date(b.date));

        let running = 0;
        const scores = solves.map((entry) => {
          running += Number(entry.value || 0);
          return [new Date(entry.date), running];
        });

        legendData.push(place.name);
        series.push({
          name: place.name,
          type: 'line',
          data: scores,
          label: { show: false },
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { width: 2.5 }
        });
      });

      if (series.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }

      setOption({
        title: {
          left: 'center',
          text: `Top ${limit} ${type === 'teams' ? 'Teams' : 'Users'}`
        },
        textStyle: {
          color: '#e0e6ed'
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' }
        },
        legend: {
          data: legendData,
          type: 'scroll',
          orient: 'horizontal',
          align: 'left',
          bottom: 35
        },
        toolbox: {
          feature: {
            dataZoom: { yAxisIndex: 'none' },
            saveAsImage: {}
          }
        },
        grid: {
          containLabel: true,
          left: '3%',
          right: '4%',
          bottom: '3%',
          top: '18%'
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#4a5568' } },
          axisLabel: { color: '#a0aec0' },
          splitLine: { lineStyle: { color: 'rgba(74, 85, 104, 0.2)' } }
        },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          axisLine: { lineStyle: { color: '#4a5568' } },
          axisLabel: { color: '#a0aec0' },
          splitLine: { lineStyle: { color: 'rgba(74, 85, 104, 0.2)' } }
        },
        series,
        backgroundColor: 'transparent',
        dataZoom: [
          {
            id: 'dataZoomX',
            type: 'slider',
            xAxisIndex: [0],
            filterMode: 'filter',
            height: 20,
            top: 35,
            fillerColor: 'rgba(233, 236, 241, 0.4)'
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
  if (!hasData) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b0c4de' }}>No solves yet</div>;

  return (
    <div className="score-graph-container" style={{ width: '100%', height }}>
      <ReactECharts
        option={option}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default ScoreGraph;
