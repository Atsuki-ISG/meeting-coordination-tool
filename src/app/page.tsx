import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/20">
              M
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">MeetFlow</span>
          </div>
          <Link href="/login">
            <button className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors">
              ログイン
            </button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-purple-50"></div>
          <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="text-center">
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
                チームの
                <span className="bg-gradient-to-r from-brand-500 to-purple-500 bg-clip-text text-transparent">スケジュール調整</span>
                を<br className="hidden sm:block" />
                シンプルに
              </h1>
              <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Googleカレンダーと連携し、チームメンバーの空き時間を自動で表示。
                面倒なやり取りなしで、最適な時間を見つけられます。
              </p>
              <div className="mt-10 flex items-center justify-center gap-4">
                <Link href="/login">
                  <button className="px-8 py-4 rounded-full text-white font-bold text-base shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 transition-all active:scale-95 bg-gradient-to-r from-brand-500 to-brand-600">
                    無料で始める
                  </button>
                </Link>
                <a href="#features">
                  <button className="px-8 py-4 rounded-full bg-white text-slate-700 font-semibold text-base border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
                    詳しく見る
                  </button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900">主な機能</h2>
              <p className="mt-4 text-slate-600">チームのスケジュール管理を効率化</p>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group p-8 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="mb-6 w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Googleカレンダー連携</h3>
                <p className="text-slate-600 leading-relaxed">
                  Googleカレンダーと自動同期。リアルタイムで空き時間を表示します。
                </p>
              </div>

              <div className="group p-8 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="mb-6 w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">チームスケジューリング</h3>
                <p className="text-slate-600 leading-relaxed">
                  最大5人のメンバーの空き時間を統合。グループミーティングの調整も簡単。
                </p>
              </div>

              <div className="group p-8 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="mb-6 w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">プライバシー保護</h3>
                <p className="text-slate-600 leading-relaxed">
                  予定の詳細は非公開。空き時間のみを安全に共有します。
                </p>
              </div>

              <div className="group p-8 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="mb-6 w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">予約リンク共有</h3>
                <p className="text-slate-600 leading-relaxed">
                  専用のリンクを共有するだけ。相手はログイン不要で予約できます。
                </p>
              </div>

              <div className="group p-8 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="mb-6 w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">自動通知</h3>
                <p className="text-slate-600 leading-relaxed">
                  予約確定・キャンセル時にメールで自動通知。見逃しを防ぎます。
                </p>
              </div>

              <div className="group p-8 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="mb-6 w-14 h-14 rounded-2xl bg-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-7 h-7 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Google Meet連携</h3>
                <p className="text-slate-600 leading-relaxed">
                  予約時にGoogle Meetリンクを自動生成。すぐにオンライン会議を開始。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              今すぐスケジュール調整を始めましょう
            </h2>
            <p className="text-slate-400 text-lg mb-10">
              Googleアカウントでログインするだけ。セットアップは数分で完了します。
            </p>
            <Link href="/login">
              <button className="px-10 py-4 rounded-full text-slate-900 font-bold text-base bg-white hover:bg-slate-100 hover:scale-105 transition-all active:scale-95 shadow-xl">
                無料で始める
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <span className="font-semibold text-slate-900">MeetFlow</span>
          </div>
          <p className="text-sm text-slate-500">
            Internal Scheduling Tool
          </p>
        </div>
      </footer>
    </div>
  );
}
