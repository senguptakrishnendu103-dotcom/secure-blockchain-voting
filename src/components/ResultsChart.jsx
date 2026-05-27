import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export function ResultsDoughnut({ candidates }) {
  if (!candidates || candidates.length === 0) return null;

  const totalVotes = candidates.reduce((acc, curr) => acc + curr.voteCount, 0);

  if (totalVotes === 0) {
    return (
      <div className="flex items-center justify-center h-48 border border-dashed border-white/20 rounded-xl">
        <p className="text-slate-500">No votes cast yet.</p>
      </div>
    );
  }

  // Generate dynamic colors based on candidate count
  const bgColors = [
    'rgba(59, 130, 246, 0.8)', // blue
    'rgba(16, 185, 129, 0.8)', // emerald
    'rgba(139, 92, 246, 0.8)', // violet
    'rgba(245, 158, 11, 0.8)', // amber
    'rgba(236, 72, 153, 0.8)', // pink
  ];

  const borderColors = [
    'rgba(59, 130, 246, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(236, 72, 153, 1)',
  ];

  const data = {
    labels: candidates.map(c => c.name.split(' (')[0]),
    datasets: [
      {
        label: 'Votes',
        data: candidates.map(c => c.voteCount),
        backgroundColor: bgColors.slice(0, candidates.length),
        borderColor: borderColors.slice(0, candidates.length),
        borderWidth: 1,
        hoverOffset: 4
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 20,
          font: { family: 'inherit' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, family: 'inherit' },
        bodyFont: { size: 14, family: 'inherit' },
        padding: 12,
        cornerRadius: 8,
        displayColors: true
      }
    },
    cutout: '70%',
    animation: {
      animateScale: true,
      animateRotate: true
    }
  };

  return (
    <div className="relative h-64 w-full flex items-center justify-center">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
        <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
          {totalVotes}
        </span>
        <span className="text-xs text-slate-400 uppercase tracking-widest mt-1">Total Votes</span>
      </div>
    </div>
  );
}

export function ResultsBarChart({ candidates }) {
  if (!candidates || candidates.length === 0) return null;
  const totalVotes = candidates.reduce((acc, curr) => acc + curr.voteCount, 0);
  if (totalVotes === 0) return null;

  const bgColors = [
    'rgba(59, 130, 246, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(236, 72, 153, 0.8)',
  ];

  const data = {
    labels: candidates.map(c => c.name.split(' (')[0]),
    datasets: [{
      label: 'Votes Cast',
      data: candidates.map(c => c.voteCount),
      backgroundColor: bgColors.slice(0, candidates.length),
      borderRadius: 4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: { size: 14, family: 'inherit' },
        bodyFont: { size: 14, family: 'inherit' },
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0, color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { color: 'rgba(255,255,255,0.7)' }, grid: { display: false } }
    }
  };

  return (
    <div className="h-64 w-full mt-6">
      <Bar data={data} options={options} />
    </div>
  );
}
