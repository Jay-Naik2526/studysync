import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../api';

const HeaderIcon = ({ onClick, children }) => (<button onClick={onClick} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors duration-200">{children}</button>);
const CircularProgress = ({ percentage, label }) => { const radius = 55; const stroke = 12; const normalizedRadius = radius - stroke / 2; const circumference = normalizedRadius * 2 * Math.PI; const strokeDashoffset = circumference - (percentage / 100) * circumference; const color = label === "Attendance" ? "#22c55e" : "#3b82f6"; return (<div className="flex flex-col items-center justify-center bg-gray-800 rounded-xl p-6 h-full transition-transform duration-300 hover:scale-105"><div className="relative"><svg height={radius * 2} width={radius * 2} className="-rotate-90"><circle stroke="#374151" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} /><circle stroke={color} fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + " " + circumference} style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s" }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} /></svg><span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white">{percentage}%</span></div><span className="mt-4 text-lg font-medium text-gray-300">{label}</span></div>);};
const InfoCard = ({ icon, label, value }) => (<div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-4 transition-transform duration-300 hover:scale-105"><div className="text-2xl">{icon}</div><div><div className="text-gray-400 text-sm">{label}</div><div className="text-xl font-bold text-white">{value}</div></div></div>);
const LowAttendanceSubjects = ({ subjects }) => (<div className="bg-gray-800 rounded-xl p-6 h-full"><h2 className="text-lg font-semibold text-white mb-4">Low Attendance Subjects</h2><div className="space-y-4">{subjects && subjects.length > 0 ? (subjects.map((subject, i) => (<div key={i} className="flex items-center justify-between"><div className="flex items-center"><span className="text-red-500 mr-3">⚠️</span><div><p className="text-white font-medium">{subject.name}</p><p className="text-sm text-red-400">{subject.percentage.toFixed(1)}% Attendance</p></div></div><div className="text-right"><p className="text-white font-medium">{subject.remainingSkippable}</p><p className="text-xs text-gray-400">Classes to Skip</p></div></div>))) : (<div className="text-center text-gray-400 py-8"><p>Great job!</p><p>No subjects are below 80%.</p></div>)}</div></div>);
const MarksBySubjectChart = ({ data }) => { if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-500">No marks recorded</div>; return (<div className="flex justify-around items-end w-full h-full pt-4 px-1">{data.map((item) => (<div key={item.subject} className="flex flex-col items-center flex-grow h-full justify-end"><div className="w-3/5 bg-blue-500 rounded-t-md transition-all duration-500" style={{ height: `${item.percentage}%` }}></div><div className="text-xs text-gray-400 mt-2 truncate w-full text-center">{item.subject.substring(0, 4)}</div></div>))}</div>);};
const SkippableClassesChart = ({ data }) => { if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-gray-500">No data available</div>; const maxVal = Math.max(...data.map(d => d.remaining), 5); return (<div className="flex justify-around items-end w-full h-full pt-4 px-1">{data.map((item) => (<div key={item.name} className="flex flex-col items-center flex-grow h-full justify-end"><div className="text-white text-xs mb-1 font-bold">{item.remaining}</div><div className="w-3/5 bg-green-500 rounded-t-md transition-all duration-500" style={{ height: `${(item.remaining / maxVal) * 80}%` }} ></div><div className="text-xs text-gray-400 mt-2 truncate w-full text-center">{item.name.substring(0, 4)}</div></div>))}</div>);};

export default function DashboardPage({ onNavigate }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => { 
      try { const response = await dashboardAPI.getDashboard(); setDashboardData(response.data); } catch (error) { console.error("Failed to load dashboard data:", error); } finally { setIsLoading(false); } 
    };
    loadData();
  }, []);

  if (isLoading) return ( <div className="min-h-screen bg-[#0d1524] flex items-center justify-center text-white">Loading Your Dashboard...</div> );
  if (!dashboardData) return ( <div className="min-h-screen bg-[#0d1524] flex items-center justify-center text-white">Could not load dashboard data. Please try logging out and back in.</div> );

  const { stats, charts, lowAttendanceSubjects } = dashboardData;
  return (
    <div className="min-h-screen bg-[#0d1524] text-white p-4 sm:p-6 md:p-8 font-sans">
      <header className="flex justify-between items-center mb-6">
        <div><h1 className="text-3xl font-bold">StudySync</h1><p className="text-gray-400">Track your attendance and academic performance</p></div>
        <div className="flex items-center space-x-2"><HeaderIcon onClick={() => onNavigate('attendance')}>📅</HeaderIcon><HeaderIcon onClick={() => onNavigate('marks')}>📊</HeaderIcon><HeaderIcon onClick={() => onNavigate('subjects')}>📚</HeaderIcon></div>
      </header>
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <CircularProgress percentage={stats.attendance} label="Attendance" />
          <CircularProgress percentage={stats.averageMarks} label="Average Marks" />
          <InfoCard icon="👍" label="Days Present" value={stats.daysPresent} />
          <InfoCard icon="👎" label="Absences" value={stats.absences} />
          <InfoCard icon="📚" label="Subjects" value={stats.subjects} />
          <InfoCard icon="" label="Total Marks" value={stats.totalMarks} />
          <div className="sm:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 h-48"><h2 className="text-lg font-semibold text-white -mt-2 mb-2">Remaining Skippable Classes</h2><SkippableClassesChart data={charts.skippableClassesData} /></div>
            <div className="bg-gray-800 rounded-xl p-6 h-48"><h2 className="text-lg font-semibold text-white -mt-2 mb-2">Marks by Subject</h2><MarksBySubjectChart data={charts.marksBySubject} /></div>
          </div>
        </div>
        <div className="md:col-span-1">
          <LowAttendanceSubjects subjects={lowAttendanceSubjects} />
        </div>
      </main>
    </div>
  );
}

