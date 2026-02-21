import type { Metadata } from 'next';
import { PrintButton } from './print-button';

export const metadata: Metadata = {
  title: '操作マニュアル | MeetFlow',
  description: 'MeetFlow の使い方ガイド',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-500 to-brand-600 text-white print:bg-none print:text-black print:border-b print:border-gray-300">
        <div className="max-w-4xl mx-auto px-6 py-10 print:py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand-100 text-sm font-semibold tracking-widest uppercase mb-2 print:text-gray-500">MeetFlow</p>
              <h1 className="text-4xl font-bold tracking-tight print:text-3xl print:text-black">操作マニュアル</h1>
              <p className="mt-2 text-brand-100 print:text-gray-500">予約調整ツールの使い方ガイド</p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 print:hidden">
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                ダッシュボードへ
              </a>
              <PrintButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 print:py-8 print:px-0">
        {/* TOC */}
        <nav className="mb-12 p-6 bg-slate-50 rounded-2xl print:hidden">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">目次</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <a href="#member" className="text-brand-600 hover:underline font-medium">社内メンバー向け</a>
            <a href="#external" className="text-brand-600 hover:underline font-medium">外部ユーザー（予約者）向け</a>
            <a href="#setup" className="text-slate-600 hover:underline pl-4">1. 初期セットアップ</a>
            <a href="#book" className="text-slate-600 hover:underline pl-4">9. 予約の作成</a>
            <a href="#dashboard" className="text-slate-600 hover:underline pl-4">2. ダッシュボード</a>
            <a href="#cancel" className="text-slate-600 hover:underline pl-4">10. 予約のキャンセル</a>
            <a href="#event-types" className="text-slate-600 hover:underline pl-4">3. 予約タイプの管理</a>
            <a href="#faq" className="text-brand-600 hover:underline font-medium">よくある質問</a>
            <a href="#availability" className="text-slate-600 hover:underline pl-4">4. 予約可能時間の設定</a>
            <a href="#team" className="text-slate-600 hover:underline pl-4">6. チーム設定</a>
          </div>
        </nav>

        {/* ===== 社内メンバー向け ===== */}
        <section id="member">
          <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-brand-500 pb-3 mb-8 print:border-gray-400">
            社内メンバー向け
          </h2>

          {/* 1. 初期セットアップ */}
          <div id="setup" className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 print:bg-gray-800">1</span>
              初期セットアップ
            </h3>

            <SubSection title="1.1 ログイン">
              <Steps steps={[
                'アプリケーション URL にアクセス',
                '「Googleでログイン」ボタンをクリック',
                'Googleアカウントを選択',
                'カレンダーへのアクセスを許可',
              ]} />
            </SubSection>

            <SubSection title="1.1.1 ログイン時に警告が表示された場合">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">「このアプリはGoogleで確認されていません」と表示された場合</p>
                <ol className="space-y-1 mt-2">
                  <li>1. 「<strong>詳細</strong>」をクリック</li>
                  <li>2. 「<strong>（安全ではないページ）に移動</strong>」をクリック</li>
                  <li>3. 通常通りログインを続行</li>
                </ol>
              </div>
            </SubSection>

            <SubSection title="1.2 承認を待つ">
              <p className="text-slate-600 mb-3">初回ログイン後、<strong>承認待ち画面</strong>が表示されます。</p>
              <ul className="space-y-1.5 text-slate-600">
                <li>• システム管理者があなたのアカウントを承認するまでお待ちください</li>
                <li>• 画面は30秒ごとに自動でステータスを確認します</li>
                <li>• 「ステータスを確認」ボタンで手動確認も可能です</li>
                <li>• 承認されると自動的にチーム画面に移動します</li>
              </ul>
            </SubSection>

            <SubSection title="1.3 チームに参加する">
              <p className="text-slate-600 mb-4">承認後、チーム画面が表示されます。</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="font-semibold text-slate-800 mb-3">既存チームに参加する場合</p>
                  <Steps steps={['管理者から招待コードを受け取る', '招待コードを入力', '「参加する」ボタンをクリック']} />
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="font-semibold text-slate-800 mb-3">新しいチームを作成する場合</p>
                  <Steps steps={['チーム名を入力', '「作成する」ボタンをクリック', '表示された招待コードを他のメンバーに共有']} />
                </div>
              </div>
              <Note>複数のチームに所属することができます。サイドバー下部の「チームを切り替え」ボタン、またはサイドバー上部のチーム名をクリックすると「マイチーム」画面でチームの追加・切り替えができます。</Note>
            </SubSection>
          </div>

          {/* 2. ダッシュボード */}
          <div id="dashboard" className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 print:bg-gray-800">2</span>
              ダッシュボード
            </h3>
            <p className="text-slate-600 mb-4">ログイン後のメイン画面です。</p>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-slate-700 mb-2">表示内容</p>
                <ul className="space-y-1 text-slate-600">
                  <li>• 今後の予約数</li>
                  <li>• 今月の予約数</li>
                  <li>• 有効な予約タイプ数</li>
                  <li>• 直近の予約一覧</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-2">できること</p>
                <ul className="space-y-1 text-slate-600">
                  <li>• 予約タイプへのクイックアクセス</li>
                  <li>• 予約一覧へのアクセス</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 3. 予約タイプの管理 */}
          <div id="event-types" className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 print:bg-gray-800">3</span>
              予約タイプの管理
            </h3>

            <SubSection title="3.1 予約タイプを作成する">
              <Steps steps={[
                'ナビゲーションから「予約タイプ」をクリック',
                '「新規作成」ボタンをクリック',
                '以下の項目を入力',
                '「作成」ボタンをクリック',
              ]} />
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">項目</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">説明</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="px-4 py-3 font-medium text-slate-800">タイトル</td><td className="px-4 py-3 text-slate-600">予約の名前（例: 初回相談、定例ミーティング）</td></tr>
                    <tr><td className="px-4 py-3 font-medium text-slate-800">説明</td><td className="px-4 py-3 text-slate-600">予約の詳細説明（任意）</td></tr>
                    <tr><td className="px-4 py-3 font-medium text-slate-800">所要時間</td><td className="px-4 py-3 text-slate-600">15分 / 30分 / 45分 / 60分 から選択</td></tr>
                    <tr><td className="px-4 py-3 font-medium text-slate-800">参加方式</td><td className="px-4 py-3 text-slate-600">「全員参加」または「誰か1名参加」</td></tr>
                    <tr><td className="px-4 py-3 font-medium text-slate-800">参加メンバー</td><td className="px-4 py-3 text-slate-600">この予約に参加するメンバーを選択</td></tr>
                    <tr><td className="px-4 py-3 font-medium text-slate-800">メモ取り担当者を自動招待</td><td className="px-4 py-3 text-slate-600">ONにするとメモ取り担当メンバーが自動でカレンダー招待に追加されます</td></tr>
                    <tr><td className="px-4 py-3 font-medium text-slate-800">カレンダータイトル</td><td className="px-4 py-3 text-slate-600">チーム内部のカレンダーに表示されるタイトルをカスタマイズ。変数ボタンをクリックして挿入でき、プレビューで確認できます（ゲストには表示されません）</td></tr>
                    <tr><td className="px-4 py-3 font-medium text-slate-800">予約可能時間帯の制限</td><td className="px-4 py-3 text-slate-600">「すべての空き時間」「テンプレートから選択」「曜日・時間を指定」から選択。メンバーの可用性設定との共通部分が予約可能枠になります</td></tr>
                  </tbody>
                </table>
                </div>
              </div>
            </SubSection>

            <SubSection title="3.2 予約リンクを共有する">
              <Steps steps={[
                '予約タイプ一覧で対象の予約タイプを見つける',
                '「リンクをコピー」ボタンをクリック',
                'コピーされた URL を相手に共有',
              ]} />
            </SubSection>

            <SubSection title="3.3 予約タイプを編集する">
              <Steps steps={[
                '予約タイプ一覧で対象の「編集」ボタンをクリック',
                '必要な項目を修正',
                '「更新」ボタンをクリック',
              ]} />
            </SubSection>

            <SubSection title="3.4 予約タイプを削除する">
              <Steps steps={[
                '予約タイプ編集画面を開く',
                '「削除」ボタンをクリック',
                '確認ダイアログで「削除」を選択',
              ]} />
            </SubSection>
          </div>

          {/* 4. 予約可能時間の設定 */}
          <div id="availability" className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 print:bg-gray-800">4</span>
              予約可能時間の設定
            </h3>
            <p className="text-slate-600 mb-4">自分が予約を受け付ける曜日と時間を設定します。</p>
            <Steps steps={[
              'ナビゲーションから「設定」をクリック',
              '曜日ごとにチェックボックスで有効/無効を切り替え',
              '「終日」トグルを ON にすると、時間帯の指定なしで終日オープンになります（Googleカレンダーの予定がある時間は自動的に除外）',
              '「終日」が OFF の場合は開始時間と終了時間を選択',
              '「設定を保存」ボタンをクリック',
            ]} />
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">例</p>
              <ul className="space-y-1">
                <li>• 月〜金: 10:00〜17:00</li>
                <li>• 月曜日のみ「終日」ON（Googleカレンダーの予定がある時間を除く終日）</li>
                <li>• 土日: 無効</li>
              </ul>
            </div>
          </div>

          {/* 5. 予約の確認 */}
          <div className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 print:bg-gray-800">5</span>
              予約の確認
            </h3>
            <SubSection title="5.1 予約一覧を見る">
              <Steps steps={[
                'ナビゲーションから「予約一覧」をクリック',
                'フィルターで表示を切り替え（今後の予約 / 過去の予約 / すべて）',
              ]} />
            </SubSection>
            <SubSection title="5.2 予約詳細の確認">
              <ul className="space-y-1.5 text-slate-600 text-sm">
                <li>• 予約者名・メールアドレス</li>
                <li>• 日時</li>
                <li>• 予約タイプ名</li>
                <li>• ステータス（確定 / キャンセル）</li>
                <li>• 備考</li>
              </ul>
            </SubSection>
          </div>

          {/* 6. チーム設定 */}
          <div id="team" className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 print:bg-gray-800">6</span>
              チーム設定
            </h3>
            <Steps steps={['ナビゲーションから「チーム設定」をクリック', 'メンバー一覧が表示される']} />
            <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="font-semibold text-slate-700 mb-3">全メンバーが確認できる情報</p>
                <ul className="space-y-1.5 text-slate-600">
                  <li>• 名前・メールアドレス</li>
                  <li>• ロール（管理者 / メンバー）</li>
                  <li>• Google連携状態</li>
                  <li>• メモ取り担当バッジ</li>
                </ul>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="font-semibold text-purple-800 mb-3">管理者のみ操作可能</p>
                <ul className="space-y-1.5 text-purple-700">
                  <li>• チーム名の編集</li>
                  <li>• 招待コードの確認・コピー</li>
                  <li>• メンバーのロール変更</li>
                  <li>• メモ取り担当の切り替え</li>
                  <li>• メンバーの削除</li>
                  <li>• 時間帯テンプレートの作成・編集・削除</li>
                  <li>• チームの削除</li>
                </ul>
              </div>
            </div>
            <Note>「マイチーム」画面（サイドバー下部の「チームを切り替え」または上部のチーム名をクリック）から、複数チームへの参加・切り替えができます。</Note>
          </div>

          {/* 7. システム管理 */}
          <div className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 print:bg-gray-800">7</span>
              システム管理
              <span className="text-sm font-normal text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">システム管理者のみ</span>
            </h3>
            <Steps steps={['ナビゲーションから「システム管理」をクリック']} />
            <ul className="mt-3 space-y-1.5 text-slate-600 text-sm">
              <li>• 承認待ちユーザーの承認 / 拒否</li>
              <li>• 全ユーザーのステータス管理</li>
              <li>• システム管理者権限の付与 / 解除</li>
              <li>• API 利用量の確認</li>
              <li>• メンテナンスモードの切り替え</li>
            </ul>
          </div>
        </section>

        <div className="border-t-2 border-dashed border-slate-200 my-12 print:my-8" />

        {/* ===== 外部ユーザー向け ===== */}
        <section id="external">
          <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-amber-400 pb-3 mb-8 print:border-gray-400">
            外部ユーザー（予約者）向け
          </h2>

          {/* 9. 予約の作成 */}
          <div id="book" className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-400 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 print:bg-gray-800">9</span>
              予約の作成
            </h3>

            <SubSection title="9.1 予約ページにアクセス">
              <p className="text-slate-600 mb-2">担当者から共有された URL にアクセスします。</p>
              <div className="bg-slate-100 rounded-lg px-4 py-2 font-mono text-sm text-slate-700">
                例: https://meetflow-xxx.run.app/book/abc123
              </div>
            </SubSection>

            <SubSection title="9.2 ステップを確認する">
              <div className="flex items-center gap-3 text-sm font-semibold">
                <span className="px-3 py-1.5 bg-brand-500 text-white rounded-full">① 日時を選ぶ</span>
                <span className="text-slate-400">→</span>
                <span className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-full">② 情報を入力</span>
                <span className="text-slate-400">→</span>
                <span className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-full">③ 予約確定</span>
              </div>
            </SubSection>

            <SubSection title="9.3 カレンダーから日付・時間を選択">
              <ul className="space-y-1.5 text-slate-600 text-sm mb-3">
                <li>• 月間カレンダー形式で空き状況を確認</li>
                <li>• 各日付に「最早時間」と「残り枠数」が表示されます</li>
                <li>• 空きがない日は「ー」と表示されます</li>
                <li>• 日付をクリックすると時間枠が表示されます</li>
              </ul>
              <Steps steps={['カレンダーで希望の日付をクリック', 'その日の空き時間一覧が表示される', '希望の時間をクリック']} />
            </SubSection>

            <SubSection title="9.4 情報を入力">
              <div className="overflow-hidden rounded-xl border border-slate-200 text-sm">
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">項目</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">必須</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-700">説明</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr><td className="px-4 py-3 font-medium">お名前</td><td className="px-4 py-3 text-red-500">必須</td><td className="px-4 py-3 text-slate-600">予約者の名前</td></tr>
                    <tr><td className="px-4 py-3 font-medium">メールアドレス</td><td className="px-4 py-3 text-red-500">必須</td><td className="px-4 py-3 text-slate-600">連絡先メールアドレス</td></tr>
                    <tr><td className="px-4 py-3 font-medium">ご相談内容・備考</td><td className="px-4 py-3 text-red-500">必須</td><td className="px-4 py-3 text-slate-600">相談したい内容や伝達事項</td></tr>
                  </tbody>
                </table>
                </div>
              </div>
            </SubSection>

            <SubSection title="9.5 予約を確定">
              <Steps steps={['「予約を確定する」ボタンをクリック', '確定画面が表示されます']} />
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <p className="font-semibold text-amber-800 mb-2">確定後に表示される情報</p>
                <ul className="space-y-1 text-amber-700">
                  <li>• 予約日時</li>
                  <li>• Google Meet リンク（オンライン会議用）</li>
                  <li>• キャンセル URL</li>
                </ul>
              </div>
              <Note>キャンセル URL は後で使用するため、控えておいてください。</Note>
            </SubSection>
          </div>

          {/* 10. キャンセル */}
          <div id="cancel" className="mb-12">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-400 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 print:bg-gray-800">10</span>
              予約のキャンセル
            </h3>
            <Steps steps={[
              '予約確定時に表示されたキャンセル URL にアクセス',
              '予約内容を確認',
              '「予約をキャンセル」ボタンをクリック',
              'キャンセル完了',
            ]} />
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">注意</p>
              <ul className="space-y-1">
                <li>• 過去の予約はキャンセルできません</li>
                <li>• キャンセル後の再予約は、新規に予約を作成してください</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="border-t-2 border-dashed border-slate-200 my-12 print:my-8" />

        {/* FAQ */}
        <section id="faq">
          <h2 className="text-2xl font-bold text-slate-900 border-b-2 border-slate-300 pb-3 mb-8">
            よくある質問
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-6 py-4">
                  <p className="font-semibold text-slate-800">Q. {faq.q}</p>
                </div>
                <div className="px-6 py-4">
                  <p className="text-slate-600 text-sm leading-relaxed">A. {faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-400 print:mt-8">
          <p>MeetFlow 操作マニュアル</p>
        </footer>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { font-size: 12px; }
          h2 { page-break-before: always; }
          h2:first-of-type { page-break-before: auto; }
        }
      `}</style>
    </div>
  );
}

// ---- Helper components ----

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="font-semibold text-slate-700 mb-3 text-base">{title}</h4>
      {children}
    </div>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 print:bg-gray-200 print:text-gray-700">
            {i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 bg-blue-50 border-l-4 border-blue-400 px-4 py-3 text-sm text-blue-800">
      <span className="font-semibold">ポイント: </span>{children}
    </div>
  );
}

// ---- FAQ data ----

const faqs = [
  {
    q: 'ログインしたら「承認待ち」と表示されました',
    a: 'システム管理者があなたのアカウントを承認するまでお待ちください。30秒ごとに自動でステータスが確認されます。承認されると自動的に次の画面に進みます。',
  },
  {
    q: '予約可能な時間が表示されません',
    a: '以下を確認してください: 選択した日付が予約可能な曜日か / 参加メンバー全員が予約可能時間を設定しているか / 参加メンバーのカレンダーが連携されているか',
  },
  {
    q: 'Google Meet リンクが表示されません',
    a: '予約確定後に Google Meet リンクが自動生成されます。表示されない場合は、Google カレンダーでイベントを直接確認してください。',
  },
  {
    q: '予約をキャンセルしたいが URL を忘れました',
    a: '社内メンバーに連絡し、予約一覧から該当予約を確認してもらってください。メンバー側からの対応が必要になる場合があります。',
  },
  {
    q: '予約日時を変更したい',
    a: '日時変更機能はありません。現在の予約をキャンセルして、新しい日時で再度予約してください。',
  },
  {
    q: '招待コードを忘れました',
    a: 'チーム管理者に確認してください。チーム設定画面から招待コードを確認できます。',
  },
  {
    q: '複数のチームに所属できますか？',
    a: 'はい、できます。サイドバーのチーム名をクリックして「マイチーム」画面を開き、「新しいチームを作成」または「招待コードで参加」から追加できます。チームの切り替えも同画面で行えます。',
  },
  {
    q: 'システム管理者になりたい',
    a: '既存のシステム管理者に依頼して、管理画面から権限を付与してもらってください。',
  },
];
