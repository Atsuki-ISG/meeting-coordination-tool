import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Settings,
  Search,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Home,
  Bell,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  LayoutGrid,
  List,
  Video,
  MapPin,
  ExternalLink
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'grid'

  const BRAND_COLOR = '#00C198';

  // モックデータ（アバター画像を追加）
  const scheduleData = [
    {
      id: 1,
      title: "プロダクト定例",
      time: "10:00 - 11:00",
      date: "02/06",
      day: "Tue",
      host: { name: "山田 太郎", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
      guests: [
        { name: "鈴木 一郎", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
        { name: "田中", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" }
      ],
      company: "株式会社A",
      room: "Meeting Room A",
      status: "confirmed",
      type: "offline"
    },
    {
      id: 2,
      title: "採用面接（エンジニア）",
      time: "13:00 - 14:00",
      date: "02/06",
      day: "Tue",
      host: { name: "佐藤 花子", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
      guests: [
        { name: "田中 次郎", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=John" }
      ],
      company: "候補者",
      room: "Zoom",
      status: "pending",
      type: "online",
      meetingUrl: "https://zoom.us/j/..."
    },
    {
      id: 3,
      title: "UI/UXレビュー",
      time: "15:30 - 16:30",
      date: "02/06",
      day: "Tue",
      host: { name: "山田 太郎", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
      guests: [
        { name: "Design Team", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Des" },
        { name: "Dev Team", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dev" },
         { name: "PM", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=PM" }
      ],
      company: "Internal",
      room: "Open Space",
      status: "confirmed",
      type: "offline"
    },
    {
      id: 4,
      title: "四半期振り返りMTG",
      time: "10:00 - 12:00",
      date: "02/07",
      day: "Wed",
      host: { name: "高橋 健太", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ken" },
      guests: [
        { name: "経営企画", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Boss" }
      ],
      company: "Internal",
      room: "Meeting Room B",
      status: "confirmed",
      type: "offline"
    },
    {
      id: 5,
      title: "パートナーシップ契約締結",
      time: "14:00 - 15:00",
      date: "02/07",
      day: "Wed",
      host: { name: "伊藤 美咲", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Misa" },
      guests: [
        { name: "John Doe", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=JohnD" }
      ],
      company: "Global Corp",
      room: "Google Meet",
      status: "cancelled",
      type: "online",
      meetingUrl: "https://meet.google.com/..."
    },
  ];

  // コンポーネント: ミニチャート (Sparkline)
  const Sparkline = ({ color }) => (
    <svg width="100" height="30" viewBox="0 0 100 30" fill="none" className="opacity-50">
      <path d="M0 25 C20 25 20 10 40 10 C60 10 60 20 80 15 C90 12 95 5 100 2" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M0 30 L0 25 C20 25 20 10 40 10 C60 10 60 20 80 15 C90 12 95 5 100 2 V 30 H 0 Z" fill={color} fillOpacity="0.1" />
    </svg>
  );

  const SidebarItem = ({ icon: Icon, label, active }) => (
    <div
      className={`
        flex items-center gap-4 px-4 py-3.5 mx-2 rounded-xl cursor-pointer transition-all duration-300 group
        ${active
          ? 'text-slate-900 bg-white shadow-sm font-semibold'
          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}
      `}
    >
      <Icon size={20} className={`transition-colors ${active ? 'text-[#00C198]' : 'text-slate-400 group-hover:text-slate-600'}`} strokeWidth={active ? 2.5 : 2} />
      <span className="tracking-wide text-sm">{label}</span>
    </div>
  );

  const StatusBadge = ({ status }) => {
    const configs = {
      confirmed: { color: "bg-[#00C198]", text: "Confirmed" },
      pending: { color: "bg-orange-400", text: "Pending" },
      cancelled: { color: "bg-slate-300", text: "Cancelled" },
    };
    const config = configs[status] || configs.cancelled;
    return (
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${config.color} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
        <span className={`text-xs font-medium ${status === 'cancelled' ? 'text-slate-400' : 'text-slate-700'}`}>
          {config.text}
        </span>
      </div>
    );
  };

  // Facepile Component (アバターの重なり)
  const AvatarStack = ({ host, guests }) => (
    <div className="flex -space-x-3 items-center">
      <img src={host.img} alt={host.name} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 z-10" title={`Host: ${host.name}`} />
      {guests.map((guest, i) => (
        <img key={i} src={guest.img} alt={guest.name} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100" title={`Guest: ${guest.name}`} style={{ zIndex: 9 - i }} />
      ))}
      {guests.length > 2 && (
        <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500" style={{ zIndex: 0 }}>
          +2
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-[#00C198] selection:text-white">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-50/50 flex flex-col fixed h-full z-10 hidden md:flex border-r border-slate-200/60 backdrop-blur-xl">
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00C198] to-[#009B7C] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#00C198]/20">
              T
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-slate-900 block leading-none">TimeRex</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase mt-1 block">Internal Workspace</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 space-y-1 mt-4">
          <SidebarItem icon={Home} label="Dashboard" />
          <SidebarItem icon={Calendar} label="Schedules" active />
          <SidebarItem icon={Users} label="Team" />
          <SidebarItem icon={Clock} label="Availability" />
          <div className="my-8 mx-6 border-t border-slate-200" />
          <SidebarItem icon={Settings} label="Settings" />
        </nav>

        <div className="p-6">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer group">
            <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" alt="User" className="w-10 h-10 rounded-full bg-slate-100 group-hover:scale-105 transition-transform" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">Taro Kaihatsu</p>
              <p className="text-xs text-slate-400 truncate">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 p-10 overflow-y-auto">
        {/* Sticky Header with Glassmorphism */}
        <header className="sticky top-0 -mx-10 px-10 py-6 bg-slate-50/80 backdrop-blur-md z-20 flex justify-between items-end mb-8 border-b border-transparent transition-all">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2">Schedules</h1>
            <p className="text-slate-500 font-medium">Tuesday, Feb 6, 2024</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white rounded-full p-1.5 shadow-sm border border-slate-100">
               <button
                onClick={() => setActiveTab('list')}
                className={`p-2.5 rounded-full transition-all ${activeTab === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <List size={18} />
               </button>
               <button
                onClick={() => setActiveTab('grid')}
                className={`p-2.5 rounded-full transition-all ${activeTab === 'grid' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <LayoutGrid size={18} />
               </button>
            </div>
            <button className="relative p-3 text-slate-400 hover:text-slate-900 transition-colors">
              <Bell size={22} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-[#00C198] rounded-full ring-2 ring-slate-50"></span>
            </button>
            <button
              className="flex items-center gap-2 px-6 py-3.5 rounded-full text-white font-bold text-sm shadow-xl shadow-[#00C198]/30 hover:shadow-[#00C198]/50 hover:scale-105 transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, #00a080)` }}
            >
              <Plus size={18} strokeWidth={3} />
              <span>New Booking</span>
            </button>
          </div>
        </header>

        {/* Stats Cards with Sparklines */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[
            { label: 'Weekly Appointments', value: '12', sub: '+2 from last week', trend: 'up', color: '#00C198' },
            { label: 'Pending Requests', value: '3', sub: 'Requires attention', trend: 'alert', color: '#F97316' },
            { label: 'Resource Usage', value: '85', unit: '%', sub: 'High efficiency', trend: 'up', color: '#00C198' },
          ].map((stat, idx) => (
            <div key={idx} className="relative group p-8 rounded-[2rem] bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 border border-slate-100 overflow-hidden">
               <div className="absolute right-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <Sparkline color={stat.color} />
               </div>

               <div className="relative z-10">
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">{stat.label}</p>
                 <div className="flex items-baseline gap-2 mb-2">
                   <span className="text-6xl font-bold text-slate-900 tracking-tighter">{stat.value}</span>
                   <span className="text-2xl font-medium text-slate-400">{stat.unit}</span>
                 </div>

                 <div className="flex items-center gap-2 mt-4">
                   <div className={`p-1 rounded-full ${stat.trend === 'alert' ? 'bg-orange-100 text-orange-600' : 'bg-[#00C198]/10 text-[#00C198]'}`}>
                     <ArrowUpRight size={14} strokeWidth={3} className={stat.trend === 'alert' ? 'rotate-90' : ''} />
                   </div>
                   <span className={`text-sm font-medium ${stat.trend === 'alert' ? 'text-orange-600' : 'text-slate-500'}`}>
                     {stat.sub}
                   </span>
                 </div>
               </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 flex justify-between items-center">
             <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00C198] transition-colors" size={20} />
              <input
                type="text"
                placeholder="Search schedules..."
                className="pl-12 pr-6 py-3.5 bg-white border-none rounded-full shadow-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-[#00C198]/50 w-80 transition-all outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1 bg-white p-1.5 rounded-full shadow-sm">
                  <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="font-bold text-slate-900 px-4 min-w-[100px] text-center">Feb 2024</span>
                  <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                    <ChevronRight size={20} />
                  </button>
               </div>
            </div>
        </div>

        {/* Content Area - Supports Grid & List */}
        <div className={activeTab === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
            {scheduleData.map((item) => (
              <div
                key={item.id}
                className={`
                  group relative bg-white rounded-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] border border-transparent
                  hover:border-[#00C198]/30 hover:shadow-[0_15px_40px_-10px_rgba(0,193,152,0.15)]
                  transition-all duration-300 cursor-pointer overflow-hidden
                  ${activeTab === 'grid' ? 'p-8 flex flex-col h-full' : 'p-6 flex items-center'}
                `}
              >
                {/* Date Block */}
                <div className={`
                  flex flex-col items-center justify-center
                  ${activeTab === 'grid' ? 'absolute top-8 right-8' : 'w-20 px-4 border-r border-slate-100 mr-8 group-hover:border-[#00C198]/20 transition-colors'}
                `}>
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.day}</span>
                   <span className="text-2xl font-bold text-slate-900">{item.date.split('/')[1]}</span>
                </div>

                {/* Main Info */}
                <div className={`flex-1 min-w-0 ${activeTab === 'grid' ? 'mt-4' : 'mr-8'}`}>
                   <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-[#00C198]">{item.time}</span>
                      <StatusBadge status={item.status} />
                   </div>
                   <h3 className={`font-bold text-slate-900 group-hover:text-[#00C198] transition-colors ${activeTab === 'grid' ? 'text-xl mb-4' : 'text-lg truncate'}`}>
                     {item.title}
                   </h3>

                   {/* Participants & Location - Adaptive Layout */}
                   <div className={`flex ${activeTab === 'grid' ? 'flex-col gap-4' : 'items-center gap-12'}`}>
                     <div className="flex items-center gap-3">
                       <AvatarStack host={item.host} guests={item.guests} />
                       {activeTab === 'grid' && <span className="text-xs text-slate-400 ml-2">{item.company}</span>}
                     </div>

                     <div className="flex items-center gap-2 text-slate-600">
                        {item.type === 'online' ? <Video size={16} className="text-blue-400" /> : <MapPin size={16} className="text-purple-400" />}
                        <span className="text-sm font-medium">{item.room}</span>
                     </div>
                   </div>
                </div>

                {/* Smart Action Button (Hover Only) */}
                <div className={`
                  ${activeTab === 'grid' ? 'mt-8 pt-6 border-t border-slate-50 flex justify-between items-center' : 'ml-auto flex items-center gap-4'}
                `}>
                  {item.type === 'online' && (
                    <button className={`
                      flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-bold
                      opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg
                      ${activeTab === 'grid' ? 'w-full justify-center' : ''}
                    `}>
                      <ExternalLink size={14} />
                      Join Meeting
                    </button>
                  )}

                  {!activeTab === 'grid' && (
                    <button className="p-3 rounded-xl text-slate-300 hover:text-[#00C198] hover:bg-[#00C198]/5 transition-all">
                      <MoreHorizontal size={20} />
                    </button>
                  )}
                </div>

              </div>
            ))}
        </div>
      </main>
    </div>
  );
};

export default App;
