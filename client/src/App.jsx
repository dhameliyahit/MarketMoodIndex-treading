import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  Activity, 
  Database, 
  Table, 
  Download,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus,
  Smartphone,
  Laptop,
  Target,
  RefreshCw
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Modern Gauge Component
const ModernGauge = ({ value, size = 280, onClick }) => {
  const radius = size / 2.4;
  const strokeWidth = size / 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const getGradientColor = (val) => {
    if (val <= 25) return '#ef4444';
    if (val <= 45) return '#f97316';
    if (val <= 55) return '#eab308';
    if (val <= 75) return '#84cc16';
    return '#22c55e';
  };

  const getMoodLabel = (val) => {
    if (val <= 25) return 'Extreme Fear';
    if (val <= 45) return 'Fear';
    if (val <= 55) return 'Neutral';
    if (val <= 75) return 'Greed';
    return 'Extreme Greed';
  };

  const needleAngle = -180 + (value / 100) * 360;

  return (
    <div 
      className="relative flex flex-col items-center cursor-pointer transition-transform hover:scale-105"
      onClick={onClick}
    >
      <div className="relative">
        <svg width={size} height={size / 2} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={normalizedRadius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          <circle
            cx={size / 2}
            cy={size / 2}
            r={normalizedRadius}
            fill="none"
            stroke={getGradientColor(value)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out drop-shadow-lg"
          />
        </svg>

        <div 
          className="absolute top-1/2 left-1/2 w-1 h-20 bg-gray-900 origin-bottom transition-transform duration-1000 ease-out drop-shadow-lg"
          style={{
            transform: `translateX(-50%) rotate(${needleAngle}deg)`,
            height: `${radius - 10}px`
          }}
        >
          <div className="w-3 h-3 bg-gray-900 rounded-full absolute -top-1.5 -left-1" />
        </div>

        <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-gray-900 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-4 border-white shadow-lg" />
      </div>

      <div className="text-center mt-8">
        <div className="text-5xl font-bold text-gray-800 mb-3 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          {value?.toFixed(1) || '0.0'}
        </div>
        <div className={`inline-flex items-center px-6 py-3 rounded-2xl font-bold text-lg shadow-lg border-2 ${
          value <= 25 ? 'bg-red-50 border-red-200 text-red-800' :
          value <= 45 ? 'bg-orange-50 border-orange-200 text-orange-800' :
          value <= 55 ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          value <= 75 ? 'bg-lime-50 border-lime-200 text-lime-800' :
          'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className={`w-3 h-3 rounded-full mr-3 ${
            value <= 25 ? 'bg-red-500' :
            value <= 45 ? 'bg-orange-500' :
            value <= 55 ? 'bg-yellow-500' :
            value <= 75 ? 'bg-lime-500' :
            'bg-green-500'
          }`} />
          {getMoodLabel(value)}
        </div>
      </div>

      <div className="flex justify-between w-72 mt-8 text-sm font-semibold text-gray-600">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
};

// Analytics Dashboard Component
const AnalyticsDashboard = ({ data, stats, isOpen, onClose }) => {
  const [activeChart, setActiveChart] = useState('line');

  if (!isOpen) return null;

  // Dynamic chart data preparation
  const timeLabels = data.map(item => 
    new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  ).slice(-50); // Last 50 points for better visibility

  const values = data.map(item => item.value).slice(-50);

  // Status distribution - dynamic calculation
  const statusCounts = data.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { up: 0, down: 0, same: 0 });

  // Mood distribution - dynamic calculation
  const moodDistribution = data.reduce((acc, item) => {
    if (item.value <= 25) acc.extremeFear = (acc.extremeFear || 0) + 1;
    else if (item.value <= 45) acc.fear = (acc.fear || 0) + 1;
    else if (item.value <= 55) acc.neutral = (acc.neutral || 0) + 1;
    else if (item.value <= 75) acc.greed = (acc.greed || 0) + 1;
    else acc.extremeGreed = (acc.extremeGreed || 0) + 1;
    return acc;
  }, {});

  // Chart configurations
  const lineChartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'MMI Value',
        data: values,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: 'rgb(34, 197, 94)',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 3,
      },
    ],
  };

  const barChartData = {
    labels: ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'],
    datasets: [
      {
        label: 'Count',
        data: [
          moodDistribution.extremeFear || 0,
          moodDistribution.fear || 0,
          moodDistribution.neutral || 0,
          moodDistribution.greed || 0,
          moodDistribution.extremeGreed || 0
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(132, 204, 22, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(249, 115, 22)',
          'rgb(234, 179, 8)',
          'rgb(132, 204, 22)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const doughnutData = {
    labels: ['Increasing', 'Decreasing', 'Stable'],
    datasets: [
      {
        data: [
          statusCounts.up || 0,
          statusCounts.down || 0,
          statusCounts.same || 0
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(239, 68, 68)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 3,
        hoverOffset: 15,
      },
    ],
  };

  // Enhanced chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y?.toFixed(2) || context.raw}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          maxTicksLimit: 8,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
        },
        ticks: {
          color: '#6b7280',
          stepSize: 20,
        },
      },
    },
  };

  const doughnutOptions = {
    ...chartOptions,
    cutout: '60%',
    plugins: {
      ...chartOptions.plugins,
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        <div className="flex items-center justify-between p-8 border-b">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Advanced Analytics</h2>
            <p className="text-gray-600 mt-2">Comprehensive Market Mood Index Analysis</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-2xl transition-all duration-200 cursor-pointer"
          >
            <Clock className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 space-y-8">
          {/* Chart Type Selector */}
          <div className="flex gap-4">
            {[
              { id: 'line', label: 'Trend', icon: TrendingUp },
              { id: 'bar', label: 'Distribution', icon: BarChart3 },
              { id: 'doughnut', label: 'Direction', icon: PieChart }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveChart(id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all cursor-pointer ${
                  activeChart === id 
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center border border-blue-200 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-3xl font-bold text-blue-600">{stats.allTime?.average?.toFixed(1) || '0.0'}</div>
              <div className="text-blue-700 font-semibold">Average MMI</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 text-center border border-green-200 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-3xl font-bold text-green-600">{stats.allTime?.max?.toFixed(1) || '0.0'}</div>
              <div className="text-green-700 font-semibold">All Time High</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 text-center border border-red-200 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-3xl font-bold text-red-600">{stats.allTime?.min?.toFixed(1) || '0.0'}</div>
              <div className="text-red-700 font-semibold">All Time Low</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 text-center border border-purple-200 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-3xl font-bold text-purple-600">{stats.allTime?.count || '0'}</div>
              <div className="text-purple-700 font-semibold">Total Records</div>
            </div>
          </div>

          {/* Dynamic Chart Display */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <div className="h-96">
              {activeChart === 'line' && (
                <Line data={lineChartData} options={chartOptions} />
              )}
              {activeChart === 'bar' && (
                <Bar data={barChartData} options={chartOptions} />
              )}
              {activeChart === 'doughnut' && (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              )}
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Market Metrics</h3>
              <div className="space-y-3">
                {[
                  { label: 'Current Volatility', value: 'Medium', color: 'text-orange-600' },
                  { label: 'Trend Strength', value: 'Strong', color: 'text-green-600' },
                  { label: 'Market Sentiment', value: 'Positive', color: 'text-lime-600' },
                  { label: 'Risk Level', value: 'Moderate', color: 'text-yellow-600' }
                ].map((metric, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                    <span className="font-semibold text-gray-700">{metric.label}</span>
                    <span className={`font-bold ${metric.color}`}>{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Data Insights</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="font-semibold text-gray-700">Records Analyzed</span>
                  <span className="font-bold text-blue-600">{data.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="font-semibold text-gray-700">Data Period</span>
                  <span className="font-bold text-purple-600">
                    {data.length > 0 ? 
                      `${Math.round((new Date() - new Date(data[0]?.time)) / (1000 * 60 * 60 * 24))} days` : 
                      'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="font-semibold text-gray-700">Update Frequency</span>
                  <span className="font-bold text-green-600">15 seconds</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="font-semibold text-gray-700">Data Source</span>
                  <span className="font-bold text-red-600">Tickertape</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Data Table Component
const DataTable = ({ data, currentPage, onPageChange, loading, onRefresh }) => {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = data.slice(startIndex, startIndex + itemsPerPage);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getValueColor = (value) => {
    if (value <= 25) return 'text-red-600';
    if (value <= 45) return 'text-orange-600';
    if (value <= 55) return 'text-yellow-600';
    if (value <= 75) return 'text-lime-600';
    return 'text-green-600';
  };

  const getMoodLabel = (value) => {
    if (value <= 25) return 'Extreme Fear';
    if (value <= 45) return 'Fear';
    if (value <= 55) return 'Neutral';
    if (value <= 75) return 'Greed';
    return 'Extreme Greed';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Value', 'Status', 'Mood'];
    const csvData = data.map(item => [
      new Date(item.time).toLocaleDateString(),
      new Date(item.time).toLocaleTimeString(),
      item.value.toFixed(2),
      item.status,
      getMoodLabel(item.value)
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mmi-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Table className="w-6 h-6" />
          Historical Data
          <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {data.length} records
          </span>
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <th className="text-left py-4 px-6 font-bold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">Date & Time</th>
              <th className="text-left py-4 px-6 font-bold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">Value</th>
              <th className="text-left py-4 px-6 font-bold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">Status</th>
              <th className="text-left py-4 px-6 font-bold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">Market Mood</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="py-4 px-6">
                  <div className="text-sm font-semibold text-gray-900">
                    {new Date(item.time).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(item.time).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`text-xl font-bold ${getValueColor(item.value)}`}>
                    {item.value.toFixed(2)}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <span className="capitalize font-semibold text-gray-700">
                      {item.status === 'up' ? 'Increasing' : 
                       item.status === 'down' ? 'Decreasing' : 'Stable'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                    item.value <= 25 ? 'bg-red-100 text-red-800 border border-red-200' :
                    item.value <= 45 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                    item.value <= 55 ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    item.value <= 75 ? 'bg-lime-100 text-lime-800 border border-lime-200' :
                    'bg-green-100 text-green-800 border border-green-200'
                  }`}>
                    {getMoodLabel(item.value)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Previous
          </button>
          
          <span className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [mmiData, setMmiData] = useState({
    value: 50.0,
    status: 'same',
    time: new Date().toISOString()
  });
  const [isConnected, setIsConnected] = useState(false);
  const [historicalData, setHistoricalData] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdate, setLastUpdate] = useState('Just now');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  // Fetch historical data
  const fetchHistoricalData = async (range = '24h') => {
    try {
      setLoading(true);
      let url = 'http://localhost:3000/api/all?limit=1000';
      
      if (range === '24h') {
        url += '&days=1';
      } else if (range === '7d') {
        url += '&days=7';
      } else if (range === '30d') {
        url += '&days=30';
      }
      
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setHistoricalData(result.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching historical data:', error);
      setHistoricalData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result);
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  // Refresh all data
  const refreshData = () => {
    fetchHistoricalData(timeRange);
    fetchStats();
    setLastUpdate('Just now');
  };

  useEffect(() => {
    refreshData();

    const socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setIsConnected(true);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      setIsConnected(false);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('mmi-update', (data) => {
      console.log('📊 MMI Update received:', data);
      
      setMmiData({
        value: data.value || 0,
        status: data.status || 'same',
        time: data.time || new Date().toISOString()
      });

      setLastUpdate('Just now');
      fetchStats();
      
      // Add to historical data if it's new
      setHistoricalData(prev => {
        const newData = [...prev, {
          value: data.value,
          time: data.time,
          status: data.status
        }];
        // Keep only last 1000 records
        return newData.slice(-1000);
      });
    });

    // Update time ago
    const interval = setInterval(() => {
      setLastUpdate(prev => {
        if (prev === 'Just now') return '1 min ago';
        const match = prev.match(/(\d+) min/);
        if (match) {
          const mins = parseInt(match[1]) + 1;
          return `${mins} min ago`;
        }
        return prev;
      });
    }, 60000);

    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    fetchHistoricalData(timeRange);
  }, [timeRange]);

  const getStatusIcon = () => {
    switch (mmiData.status) {
      case 'up':
        return <TrendingUp className="w-6 h-6 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-6 h-6 text-red-600" />;
      default:
        return <Activity className="w-6 h-6 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (mmiData.status) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-2xl cursor-pointer hover:scale-105 transition-transform">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent cursor-default">
                  Market Mood Index
                </h1>
                <p className="text-gray-600 text-sm">Real-time market sentiment analysis</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 cursor-default">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              
              <button
                onClick={() => setShowAnalytics(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
              >
                <BarChart3 className="w-5 h-5" />
                Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Dashboard */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Gauge and Quick Stats */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Current Market Sentiment</h2>
                  <div className="flex items-center gap-4 mt-2 text-gray-600">
                    <div className="flex items-center gap-2 cursor-default">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{lastUpdate}</span>
                    </div>
                    <div className="flex items-center gap-2 cursor-default">
                      {getStatusIcon()}
                      <span className={`text-sm font-medium ${getTrendColor()}`}>
                        {mmiData.status === 'up' ? 'Trending Up' : 
                         mmiData.status === 'down' ? 'Trending Down' : 'Stable'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Time Range Selector */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-2xl p-1">
                  {['24h', '7d', '30d', 'All'].map(range => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                        timeRange === range 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <ModernGauge 
                  value={mmiData.value} 
                  size={320} 
                  onClick={() => setShowAnalytics(true)}
                />
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
                {[
                  { label: 'Current', value: mmiData.value?.toFixed(1) || '0.0', color: 'blue' },
                  { label: 'All Time High', value: stats.allTime?.max?.toFixed(1) || '0.0', color: 'green' },
                  { label: 'All Time Low', value: stats.allTime?.min?.toFixed(1) || '0.0', color: 'red' },
                  { label: 'Total Records', value: stats.allTime?.count || '0', color: 'purple' }
                ].map((stat, index) => (
                  <div 
                    key={index}
                    className="text-center p-6 rounded-2xl border cursor-pointer hover:shadow-lg transition-shadow"
                    style={{
                      background: `linear-gradient(135deg, var(--tw-${stat.color}-50), var(--tw-${stat.color}-100))`,
                      borderColor: `var(--tw-${stat.color}-200)`
                    }}
                  >
                    <div className={`text-2xl font-bold text-${stat.color}-600`}>
                      {stat.value}
                    </div>
                    <div className={`text-${stat.color}-700 font-semibold text-sm`}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Market Insights */}
          <div className="space-y-8">
            {/* Market Status */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 cursor-default">
                <Zap className="w-6 h-6 text-yellow-500" />
                Market Insights
              </h3>
              
              <div className="space-y-4">
                {[
                  { 
                    label: 'Sentiment', 
                    value: mmiData.value <= 25 ? 'Very Bearish' :
                           mmiData.value <= 45 ? 'Bearish' :
                           mmiData.value <= 55 ? 'Neutral' :
                           mmiData.value <= 75 ? 'Bullish' : 'Very Bullish',
                    color: mmiData.value <= 25 ? 'red' :
                           mmiData.value <= 45 ? 'orange' :
                           mmiData.value <= 55 ? 'yellow' :
                           mmiData.value <= 75 ? 'lime' : 'green'
                  },
                  { label: 'Volatility', value: 'Medium', color: 'orange' },
                  { label: 'Trend Strength', value: 'Strong', color: 'green' },
                  { label: 'Risk Level', value: 'Moderate', color: 'yellow' }
                ].map((insight, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-semibold text-gray-700">{insight.label}</span>
                    <span className={`font-bold text-${insight.color}-600`}>
                      {insight.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 cursor-default">
                <Activity className="w-6 h-6 text-blue-500" />
                Recent Activity
              </h3>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {historicalData.slice(-5).reverse().map((item, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.status === 'up' ? (
                        <ArrowUp className="w-4 h-4 text-green-600" />
                      ) : item.status === 'down' ? (
                        <ArrowDown className="w-4 h-4 text-red-600" />
                      ) : (
                        <Minus className="w-4 h-4 text-gray-600" />
                      )}
                      <span className={`font-bold ${
                        item.value <= 25 ? 'text-red-600' :
                        item.value <= 45 ? 'text-orange-600' :
                        item.value <= 55 ? 'text-yellow-600' :
                        item.value <= 75 ? 'text-lime-600' :
                        'text-green-600'
                      }`}>
                        {item.value.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(item.time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <DataTable 
          data={historicalData}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          loading={loading}
          onRefresh={refreshData}
        />
      </div>

      {/* Analytics Modal */}
      <AnalyticsDashboard 
        data={historicalData}
        stats={stats}
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />

      {/* Footer */}
      <div className="bg-white/80 backdrop-blur-lg border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6 cursor-default">
              <span>Market Mood Index Dashboard v1.0</span>
              <span>•</span>
              <span>Real-time Data</span>
              <span>•</span>
              <span>Powered by Tickertape</span>
            </div>
            <div className="flex items-center gap-4 cursor-default">
              <span className="flex items-center gap-2">
                <Laptop className="w-4 h-4" />
                Professional Tool
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;