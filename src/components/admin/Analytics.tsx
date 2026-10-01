import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  MessageSquare,
  UserPlus,
  Activity,
  RefreshCw,
  Clock,
  TrendingUp,
  Radio,
  PhoneCall,
  Flame,
  ShieldAlert,
  Database,
  CheckCircle2,
  Layers,
  Sparkles,
  Zap,
  BarChart3,
  Calendar,
  Share2
} from 'lucide-react';
import { fetchRealtimeAnalytics, RealtimeAnalyticsData } from '../../lib/analyticsService';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<RealtimeAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRealtimeAnalytics();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err?.message || 'Failed to execute Firestore aggregation queries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh interval (every 30 seconds if enabled)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const formatNumber = (num: number = 0) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatTime = (d?: Date) => {
    if (!d) return '--:--:--';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Live Aggregation Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Platform Analytics & Server Aggregations
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono border border-emerald-500/20">
              <Zap className="w-3 h-3" /> Real-time
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
            <span>Powered by Firestore server-side <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-300">getCountFromServer()</code> aggregation engine.</span>
            {data && (
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                • {data.queriesExecuted} queries in {data.queryExecutionTimeMs}ms
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer ${
              autoRefresh
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
            title="Toggle 30s auto-refresh interval"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>Auto-Refresh {autoRefresh ? '(30s)' : 'Off'}</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Aggregating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Top Three Core Metric Cards (DAU, Messages, Signups) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1: Daily Active Users (DAU) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Daily Active Users (DAU)
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              24h Window
            </span>
          </div>

          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading && !data ? '...' : formatNumber(data?.dau)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              active today
            </span>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Online Now</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {formatNumber(data?.onlineNow)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">7-Day WAU</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatNumber(data?.wau)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Stickiness</p>
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {data?.stickiness || 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Message Volume */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Message Volume
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              All Channels
            </span>
          </div>

          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading && !data ? '...' : formatNumber(data?.totalMessages)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              messages delivered
            </span>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Sent Today</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatNumber(data?.messagesToday)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">1-on-1 Chats</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatNumber(data?.totalChats)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Group Chats</p>
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {formatNumber(data?.totalGroups)}
              </p>
            </div>
          </div>
        </div>

        {/* Metric 3: New Account Signups */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Account Signups
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
              Lifetime Total
            </span>
          </div>

          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading && !data ? '...' : formatNumber(data?.totalSignups)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              registered accounts
            </span>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Today (24h)</p>
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                +{formatNumber(data?.signupsToday)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">This Week</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                +{formatNumber(data?.signupsWeek)}
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Growth (7d)</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                +{data?.growthRatePct || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Secondary Real-Time Aggregations Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Calls */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2">
            <PhoneCall className="w-4 h-4 text-violet-500" />
            <span>WebRTC Calls</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatNumber(data?.totalCalls)}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {data?.activeCalls ? `${data.activeCalls} active` : 'P2P Ready'}
          </div>
        </div>

        {/* Stories */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Active Stories</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatNumber(data?.totalStories)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
            24-hour status
          </div>
        </div>

        {/* Channels */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2">
            <Radio className="w-4 h-4 text-sky-500" />
            <span>Broadcasts</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatNumber(data?.totalChannels)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
            Public channels
          </div>
        </div>

        {/* Communities */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Communities</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatNumber(data?.totalCommunities)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
            Topic hubs
          </div>
        </div>

        {/* 30-Day MAU */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>30-Day MAU</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatNumber(data?.mau)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
            Active monthly
          </div>
        </div>

        {/* Safety Reports */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Moderation</span>
          </div>
          <div className={`text-2xl font-bold ${data?.pendingReports ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
            {formatNumber(data?.pendingReports)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
            Pending tickets
          </div>
        </div>
      </div>

      {/* 4. Engagement & Activity Distribution Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Channel Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-indigo-500" />
              Communication Flow Distribution
            </h3>
            <span className="text-xs text-slate-400 font-mono">Live Sessions</span>
          </div>

          <div className="space-y-4">
            {/* Direct Messages */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700 dark:text-slate-300">Direct 1-on-1 Chats</span>
                <span className="text-slate-900 dark:text-white font-mono">{formatNumber(data?.totalChats)} chats</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, (data?.totalChats || 1) * 20))}%` }}
                />
              </div>
            </div>

            {/* Groups */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700 dark:text-slate-300">Group Channels</span>
                <span className="text-slate-900 dark:text-white font-mono">{formatNumber(data?.totalGroups)} groups</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, (data?.totalGroups || 1) * 30))}%` }}
                />
              </div>
            </div>

            {/* Broadcast Channels */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700 dark:text-slate-300">Broadcast Channels</span>
                <span className="text-slate-900 dark:text-white font-mono">{formatNumber(data?.totalChannels)} channels</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(8, (data?.totalChannels || 1) * 40))}%` }}
                />
              </div>
            </div>

            {/* WebRTC Calls */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-slate-700 dark:text-slate-300">P2P Voice / Video Calls</span>
                <span className="text-slate-900 dark:text-white font-mono">{formatNumber(data?.totalCalls)} calls</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(12, (data?.totalCalls || 1) * 25))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* User Lifecycle & Engagement Ratio */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Platform Stickiness & Engagement
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              DAU / MAU: {data?.stickiness || 0}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 mb-4">
            <div className="flex items-center justify-between text-xs mb-2 font-medium">
              <span className="text-slate-600 dark:text-slate-400">Daily Active Ratio</span>
              <span className="text-slate-900 dark:text-white font-bold">{data?.stickiness || 0}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, data?.stickiness || 0))}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              Industry standard for top-tier social messaging platforms is &gt;20% DAU/MAU ratio.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Weekly Growth Rate</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">+{data?.growthRatePct || 0}%</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Messages / User Ratio</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {data?.totalSignups && data?.totalMessages
                  ? (data.totalMessages / data.totalSignups).toFixed(1)
                  : '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Firestore Aggregation Engine Telemetry Panel */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Aggregation Engine Telemetry
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Refreshed: {formatTime(data?.lastRefreshed)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="pb-2 font-medium">Metric Target</th>
                <th className="pb-2 font-medium">Firestore Method</th>
                <th className="pb-2 font-medium">Query Scope</th>
                <th className="pb-2 font-medium">Result Value</th>
                <th className="pb-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">Total Signups</td>
                <td className="py-2.5 text-indigo-600 dark:text-indigo-400">getCountFromServer()</td>
                <td className="py-2.5">/users</td>
                <td className="py-2.5 font-bold">{data?.totalSignups ?? 0}</td>
                <td className="py-2.5 text-right text-emerald-500">OPTIMAL</td>
              </tr>
              <tr>
                <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">Daily Active Users (DAU)</td>
                <td className="py-2.5 text-indigo-600 dark:text-indigo-400">getCountFromServer()</td>
                <td className="py-2.5">/users [lastActiveAt &gt;= 24h]</td>
                <td className="py-2.5 font-bold">{data?.dau ?? 0}</td>
                <td className="py-2.5 text-right text-emerald-500">OPTIMAL</td>
              </tr>
              <tr>
                <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">Total Messages</td>
                <td className="py-2.5 text-indigo-600 dark:text-indigo-400">getCountFromServer()</td>
                <td className="py-2.5">collectionGroup('messages')</td>
                <td className="py-2.5 font-bold">{data?.totalMessages ?? 0}</td>
                <td className="py-2.5 text-right text-emerald-500">AGGREGATED</td>
              </tr>
              <tr>
                <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">WebRTC Calls</td>
                <td className="py-2.5 text-indigo-600 dark:text-indigo-400">getCountFromServer()</td>
                <td className="py-2.5">/calls</td>
                <td className="py-2.5 font-bold">{data?.totalCalls ?? 0}</td>
                <td className="py-2.5 text-right text-emerald-500">OPTIMAL</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
