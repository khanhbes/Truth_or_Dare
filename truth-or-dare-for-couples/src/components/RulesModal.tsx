import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Check,
  ChevronRight,
  CircleStop,
  Flame,
  HandHeart,
  Heart,
  Layers,
  MessageCircle,
  Pause,
  RefreshCw,
  Shirt,
  Sparkles,
  Star,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { dialogPanelMotion } from '../utils/motionTokens';
import { useDialogFocus } from './useDialogFocus';

interface RulesModalProps {
  onClose: () => void;
  /** Opened from the table: the button continues the game instead of starting one. */
  inGame?: boolean;
}

type TabId = 'overview' | 'levels' | 'progression' | 'wardrobe' | 'rewards' | 'consent';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'overview', icon: '🎴', label: 'Cách chơi' },
  { id: 'levels', icon: '🌡️', label: '3 cấp độ' },
  { id: 'progression', icon: '💗', label: 'Tiến trình' },
  { id: 'wardrobe', icon: '👗', label: 'Trang phục' },
  { id: 'rewards', icon: '⭐', label: 'Sao và kỹ năng' },
  { id: 'consent', icon: '🛡️', label: 'An toàn' },
];

/* ─────────────── Building blocks ───────────────
   Diagrams are plain HTML: their text keeps a readable size on every screen. */

const SectionCard: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:p-5">
    <h3 className="text-base font-semibold leading-snug text-white sm:text-lg">{title}</h3>
    {description && <p className="mt-1 text-sm leading-relaxed text-neutral-300">{description}</p>}
    <div className="mt-3">{children}</div>
  </section>
);

const Note: React.FC<{ title: string; tone?: 'rose' | 'amber' | 'violet' | 'emerald'; children: React.ReactNode }> = ({ title, tone = 'rose', children }) => {
  const tones = {
    rose: 'border-rose-400/25 bg-rose-500/[0.06] [&>p:first-child]:text-rose-200',
    amber: 'border-amber-400/25 bg-amber-500/[0.06] [&>p:first-child]:text-amber-200',
    violet: 'border-violet-400/25 bg-violet-500/[0.06] [&>p:first-child]:text-violet-200',
    emerald: 'border-emerald-400/25 bg-emerald-500/[0.06] [&>p:first-child]:text-emerald-200',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-1 text-sm leading-relaxed text-neutral-200">{children}</div>
    </div>
  );
};

interface FlowStep {
  icon: LucideIcon;
  title: string;
  text: string;
  tone: string;
}

const Flow: React.FC<{ steps: FlowStep[] }> = ({ steps }) => (
  <ol className={`grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 ${steps.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
    {steps.map((step, index) => {
      const Icon = step.icon;
      return (
        <li key={step.title} className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 sm:flex-col sm:gap-2 sm:py-4 sm:text-center">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${step.tone}`} aria-hidden="true">
            <Icon className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">{step.title}</span>
            <span className="block text-xs leading-snug text-neutral-300">{step.text}</span>
          </span>
          {index < steps.length - 1 && (
            <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-neutral-400 sm:block" aria-hidden="true" />
          )}
        </li>
      );
    })}
  </ol>
);

const Panel: React.FC<{ icon: LucideIcon; title: string; text: string; tone: string }> = ({ icon: Icon, title, text, tone }) => (
  <div className={`flex items-start gap-3 rounded-2xl border p-4 ${tone}`}>
    <Icon className="mt-0.5 h-7 w-7 shrink-0" aria-hidden="true" />
    <div>
      <p className="font-serif-romantic text-lg font-bold text-white">{title}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-neutral-200">{text}</p>
    </div>
  </div>
);

/* ─────────────── Tabs ─────────────── */

const OverviewTab: React.FC = () => (
  <div className="space-y-4">
    <SectionCard title="Rút → làm → tăng thân mật → đổi lượt" description="Mỗi lượt, một người rút lá bài, làm theo nội dung, nhận điểm thân mật rồi tới lượt người kia.">
      <Flow
        steps={[
          { icon: Layers, title: 'Rút', text: 'một lá từ bộ bài', tone: 'bg-rose-500/15 text-rose-200' },
          { icon: Check, title: 'Hoàn thành', text: 'hoặc bỏ qua', tone: 'bg-amber-400/15 text-amber-200' },
          { icon: Heart, title: 'Tăng Tim Hồng', text: 'và nhận sao', tone: 'bg-rose-500/15 text-rose-200' },
          { icon: RefreshCw, title: 'Đổi lượt', text: 'tới người kia', tone: 'bg-white/10 text-neutral-100' },
        ]}
      />
    </SectionCard>

    <SectionCard title="Hai loại lá" description="Lúc đầu thường gặp Sự thật; càng thân mật, Thử thách càng nhiều.">
      <div className="grid gap-2 sm:grid-cols-2">
        <Panel icon={MessageCircle} title="Sự thật" text="Trả lời thật lòng một câu hỏi về hai bạn." tone="border-blue-400/35 bg-blue-500/[0.08] text-blue-200" />
        <Panel icon={Zap} title="Thử thách" text="Làm một cử chỉ hoặc hành động cùng người kia." tone="border-rose-400/35 bg-rose-500/[0.08] text-rose-200" />
      </div>
    </SectionCard>

    <SectionCard title="Một ván đi qua những gì">
      <ol className="space-y-2">
        {[
          'Thiết lập: nhập tên, chọn cấp độ, trang phục và xác nhận 18+.',
          'Rút bài: game chọn ngẫu nhiên, hoặc tự chọn Sự thật hay Thử thách.',
          'Hoàn thành hoặc bỏ qua. Từ 20% Tim Hồng, bỏ qua có thể kèm lựa chọn cởi 1 món, nếu hai bạn bật luật này.',
          'Tim Hồng đầy 100% và cả hai đã cởi hết qua các lá bài thì Bộ Tư thế mở.',
          'Chọn 1 trong 3 lá Have Sex úp để khép ván, hoặc dừng bất cứ lúc nào. Một ván dài khoảng 70 phút.',
        ].map((text, index) => (
          <li key={text} className="flex items-start gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rose-500/15 text-xs font-bold text-rose-200">{index + 1}</span>
            <span className="text-sm leading-relaxed text-neutral-200">{text}</span>
          </li>
        ))}
      </ol>
    </SectionCard>

    <div className="hidden md:block">
      <SectionCard title="Phím tắt trên bàn chơi">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-neutral-200">
          {[
            ['Space', 'rút, mở, hoàn thành'],
            ['S', 'bỏ qua'],
            ['R', 'đổi lá khác'],
            ['P', 'tạm dừng'],
          ].map(([key, text]) => (
            <div key={key} className="flex items-center gap-3">
              <dt><kbd className="inline-grid min-w-10 place-items-center rounded-lg border border-white/20 bg-white/[0.06] px-2 py-1 text-xs font-bold text-white">{key}</kbd></dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  </div>
);

/** The same three colours as the badges and the cards: rose, amber, wine red. */
const LEVELS = [
  {
    icon: '🌸',
    name: 'Nhẹ nhàng',
    meta: '1★ – 2★ · khởi động',
    color: '#ffa9c8',
    style: { backgroundColor: '#26101a', borderColor: 'rgba(255, 107, 157, 0.4)' },
    text: 'Kỷ niệm đầu, câu hỏi dễ thương, cử chỉ dịu dàng: nhìn mắt nhau, ôm, thì thầm khen ngợi.',
    examples: ['Ấn tượng đầu tiên của bạn về đối phương?', 'Nhìn vào mắt nhau 30 giây.'],
  },
  {
    icon: '🔥',
    name: 'Thân mật',
    meta: '2★ – 4★ · chạm nhẹ',
    color: '#f0c065',
    style: { backgroundColor: '#2c1d0c', borderColor: 'rgba(245, 158, 11, 0.4)' },
    text: 'Tán tỉnh, cử chỉ đắm đuối, hôn sâu, vuốt ve, thử thách cởi bớt đồ ngoài.',
    examples: ['Bạn thích được hôn ở đâu nhất?', 'Hôn nhẹ lên cổ đối phương 15 giây.'],
  },
  {
    icon: '💋',
    name: 'Nồng nhiệt',
    meta: '3★ – 5★ · táo bạo',
    color: '#ff9aa4',
    style: { backgroundColor: '#3a0d17', borderColor: 'rgba(220, 60, 75, 0.5)' },
    text: 'Quyến rũ, khám phá khao khát, tiếp xúc cơ thể trực tiếp, đổi đồ cho nhau, ôm ấp nồng nàn.',
    examples: ['Điều gì khiến bạn khao khát nhất ở đối phương?', 'Cùng cởi 1 món đồ rồi ôm sát nhau.'],
  },
];

const LevelsTab: React.FC = () => (
  <div className="space-y-4">
    {LEVELS.map((level) => (
      <section key={level.name} className="rounded-2xl border p-4 sm:p-5" style={level.style}>
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{level.icon}</span>
          <div>
            <h3 className="font-serif-romantic text-lg font-bold text-white">{level.name}</h3>
            <p className="text-xs font-semibold" style={{ color: level.color }}>{level.meta}</p>
          </div>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-200">{level.text}</p>
        <ul className="mt-3 space-y-1.5">
          {level.examples.map((example) => (
            <li key={example} className="rounded-lg bg-black/25 px-3 py-2 text-sm italic text-neutral-200">“{example}”</li>
          ))}
        </ul>
      </section>
    ))}

    <SectionCard title="Tỉ lệ đổi theo Tim Hồng" description="Đây là cấu hình mặc định; Admin có thể chỉnh.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-2 pr-2 text-left font-semibold text-neutral-300">Tim Hồng</th>
              <th className="px-2 py-2 text-center font-semibold text-blue-200">Sự thật</th>
              <th className="px-2 py-2 text-center font-semibold text-rose-200">Thử thách</th>
              <th className="py-2 pl-2 text-center font-semibold text-amber-200">Sao hay gặp</th>
            </tr>
          </thead>
          <tbody className="tabular-nums text-neutral-200">
            {[
              ['0–19%', '65%', '35%', '1★ (70%)'],
              ['20–39%', '55%', '45%', '1–2★ (80%)'],
              ['40–59%', '45%', '55%', '2–3★ (60%)'],
              ['60–79%', '35%', '65%', '3–4★ (60%)'],
              ['80–99%', '25%', '75%', '4–5★ (65%)'],
            ].map(([range, truth, dare, stars]) => (
              <tr key={range} className="border-b border-white/5">
                <td className="py-1.5 pr-2 font-semibold text-white">{range}</td>
                <td className="px-2 py-1.5 text-center">{truth}</td>
                <td className="px-2 py-1.5 text-center">{dare}</td>
                <td className="py-1.5 pl-2 text-center">{stars}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  </div>
);

const ProgressionTab: React.FC = () => (
  <div className="space-y-4">
    <SectionCard title="Giai đoạn 1: Tim Hồng (0% → 100%)" description="Mỗi lá hoàn thành làm đầy trái tim. Lá càng nhiều sao, tim càng đầy nhanh.">
      <div className="flex items-center gap-3">
        <Heart className="h-9 w-9 shrink-0 fill-rose-400/80 text-rose-300" aria-hidden="true" />
        <div className="relative h-5 flex-1 overflow-hidden rounded-full border border-rose-300/25 bg-black/40" role="img" aria-label="Ví dụ: Tim Hồng đang ở 72 phần trăm">
          <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-rose-300 to-rose-500" />
          <span className="absolute inset-0 grid place-items-center text-xs font-bold text-white">72%</span>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-5 gap-1.5 text-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <li key={star} className="rounded-xl border border-white/10 bg-black/25 py-2">
            <span className="block text-sm font-bold text-amber-200">{star}★</span>
            <span className="block text-sm font-bold text-white">+{star + 2}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-amber-500/[0.1] px-3 py-2 text-sm text-amber-100">
        Lượt nào có cởi đồ thì cộng thêm <strong>+3%</strong> Tim Hồng.
      </p>
    </SectionCard>

    <SectionCard title="Mở Bộ Tư thế" description="Đủ cả ba điều kiện thì Bộ Tư thế mới mở.">
      <Flow
        steps={[
          { icon: Heart, title: 'Tim Hồng 100%', text: 'nhờ các lá đã làm', tone: 'bg-rose-500/15 text-rose-200' },
          { icon: Shirt, title: 'Cởi hết đồ', text: 'qua các lá bài', tone: 'bg-amber-400/15 text-amber-200' },
          { icon: HandHeart, title: 'Cả hai đồng ý', text: 'hỏi lại một lần nữa', tone: 'bg-emerald-400/15 text-emerald-200' },
        ]}
      />
    </SectionCard>

    <SectionCard title="Giai đoạn 2: Bộ Tư thế (Luxury 0% → 100%)" description="Thang sao tăng dần từ 6★ tới 9★; các nhóm tư thế và lượt của hai bạn được chia đều.">
      <ul className="grid grid-cols-4 gap-1.5 text-center">
        {[[6, 9], [7, 10], [8, 11], [9, 12]].map(([star, gain]) => (
          <li key={star} className="rounded-xl border border-[#e2c275]/25 bg-black/25 py-2">
            <span className="block text-sm font-bold text-[#f7e7b0]">{star}★</span>
            <span className="block text-sm font-bold text-white">+{gain}%</span>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <Note title="Lá cuối: chọn 1 trong 3 lá Have Sex úp" tone="violet">
          Từ 80%, mỗi lượt có 5% cơ hội mở màn chọn lá cuối; đầy 100% thì chắc chắn mở. Ưu tiên lá hai bạn chưa mở.
          Giữ một lá để chọn. Muốn xem trước: 10★ lật 2 lá, 20★ lật cả 3.
        </Note>
      </div>
    </SectionCard>
  </div>
);

const WardrobeTab: React.FC = () => (
  <div className="space-y-4">
    <SectionCard title="Game tự theo dõi trang phục" description="Mỗi người có một nhân vật và trang phục riêng. Lá không hợp với đồ đang mặc sẽ không được rút.">
      <div className="grid gap-2 sm:grid-cols-2">
        {[
          { name: 'Nam', tone: 'border-rose-400/30 bg-rose-500/[0.06]', slots: [['Áo', ''], ['Quần', ''], ['Quần lót', 'sau quần']] },
          { name: 'Nữ', tone: 'border-amber-400/30 bg-amber-500/[0.06]', slots: [['Áo', ''], ['Quần', ''], ['Áo lót', 'sau áo'], ['Quần lót', 'sau quần']] },
        ].map((person) => (
          <div key={person.name} className={`rounded-2xl border p-4 ${person.tone}`}>
            <p className="text-sm font-bold text-white">{person.name}</p>
            <ul className="mt-2 space-y-1.5">
              {person.slots.map(([slot, after]) => (
                <li key={slot} className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-3 py-2 text-sm text-neutral-100">
                  <span className="flex items-center gap-2"><Shirt className="h-4 w-4 text-rose-200" aria-hidden="true" />{slot}</span>
                  <span className={`text-xs font-semibold ${after ? 'text-amber-200' : 'text-emerald-200'}`}>{after || 'cởi trước'}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>

    <SectionCard title="Năm kiểu lá có trang phục">
      <ul className="space-y-1.5">
        {[
          ['Tự cởi', 'Bạn tự chọn 1 món của mình.'],
          ['Cởi cho người kia', 'Bạn chọn 1 món trên người đối phương.'],
          ['Cả hai cùng cởi', 'Mỗi người bỏ 1 món.'],
          ['Cùng chọn người cởi', 'Hai bạn thống nhất ai cởi 1 món.'],
          ['Đổi đồ cho nhau', 'Mỗi người đưa 1 món để người kia mặc.'],
        ].map(([name, text]) => (
          <li key={name} className="rounded-xl bg-black/20 px-3 py-2 text-sm">
            <span className="font-semibold text-white">{name}.</span> <span className="text-neutral-200">{text}</span>
          </li>
        ))}
      </ul>
    </SectionCard>

    <Note title="Mọi món đồ đều được cởi qua lá bài">
      Lá cởi đồ xuất hiện ngẫu nhiên từ khoảng 20% Tim Hồng, đồ ngoài trước rồi đến đồ lót. Nếu gần cuối vẫn còn đồ, lá Thử thách kế tiếp sẽ có dải <strong className="text-white">“Kèm theo: …”</strong> để cởi nốt.
    </Note>
    <Note title="Bỏ lượt (tùy chọn trong Thiết lập)" tone="amber">
      Từ <strong className="text-white">20% Tim Hồng</strong>, người bỏ qua một lá được hỏi với hai lựa chọn ngang nhau: không phạt, hoặc cởi 1 món của mình. Trước mốc này bỏ qua không bị phạt.
    </Note>
  </div>
);

const RewardsTab: React.FC = () => (
  <div className="space-y-4">
    <SectionCard title="Hoàn thành lá, nhận sao" description="Lá mấy sao thì người thực hiện nhận bấy nhiêu sao vào ví của mình.">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[1, 3, 5].map((star) => (
          <div key={star} className="rounded-xl border border-amber-300/20 bg-black/25 py-3">
            <Star className="mx-auto h-5 w-5 fill-amber-300/30 text-amber-300" aria-hidden="true" />
            <p className="mt-1 text-sm text-neutral-200">Lá {star}★ → <strong className="text-amber-200">{star} sao</strong></p>
          </div>
        ))}
      </div>
    </SectionCard>

    <div className="grid gap-3 sm:grid-cols-2">
      <Note title="Đổi lá · 8★" tone="amber">
        Không ưng lá vừa rút? Đổi ngay lá khác, không tính là bỏ qua và không bị phạt. Mỗi lượt đổi được một lần.
      </Note>
      <Note title="Tăng khó · 10★">
        Lượt rút kế tiếp của người kia khó hơn một bậc sao. Đặt trước khi bạn rút bài.
      </Note>
    </div>
    <Note title="Lật lá Have Sex · 10★ (2 lá) hoặc 20★ (cả 3)" tone="violet">
      Ở màn chọn lá cuối, hai bạn dùng ví chung: trừ sao của người đang tới lượt trước, thiếu thì trừ của người kia. Đã lật 2 lá thì chỉ cần thêm 10★ để lật lá còn lại.
    </Note>
  </div>
);

const ConsentTab: React.FC = () => (
  <div className="space-y-4">
    <SectionCard title="Bỏ qua hoặc dừng, bất cứ lúc nào" description="Mọi hành động đều tự nguyện, được đổi ý mà không cần giải thích.">
      <div className="grid gap-2 sm:grid-cols-2">
        <Panel icon={Pause} title="Bỏ qua hoặc tạm dừng" text="Không muốn làm thì bỏ qua. Nút Tạm dừng dừng đồng hồ và cho bỏ lá đang mở, không phạt." tone="border-sky-300/30 bg-sky-500/[0.07] text-sky-200" />
        <Panel icon={CircleStop} title="Dừng" text="Kết thúc ván ngay khi một trong hai người muốn." tone="border-rose-400/35 bg-rose-500/[0.08] text-rose-200" />
      </div>
    </SectionCard>

    <SectionCard title="Bốn điều hai bạn giữ cho nhau">
      <ul className="space-y-2">
        {[
          ['Quyền dừng tuyệt đối', 'Bất kỳ ai cũng có thể nói “Dừng” hoặc bấm Bỏ qua. Lá có đồng hồ vẫn bỏ qua được trước khi bấm đếm giờ.'],
          ['Che nội dung lá bài', 'Lá vừa rút được che cho tới khi bấm Xem nội dung, để không ai đọc trước. Có thể tắt trong Thiết lập.'],
          ['Hỏi lại khi chuyển giai đoạn', 'Bộ Tư thế chỉ mở khi cả hai cùng đồng ý.'],
          ['An toàn cảm xúc và cơ thể', 'Không ép trả lời điều nhạy cảm, không vượt giới hạn đã thống nhất.'],
        ].map(([title, text]) => (
          <li key={title} className="rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-neutral-200">{text}</p>
          </li>
        ))}
      </ul>
    </SectionCard>

    <SectionCard title="Ba cách kết thúc ván">
      <ul className="space-y-1.5 text-sm text-neutral-200">
        <li className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2"><Sparkles className="h-4 w-4 shrink-0 text-violet-200" aria-hidden="true" />Chọn lá cuối trong 3 lá Have Sex úp.</li>
        <li className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2"><Heart className="h-4 w-4 shrink-0 text-rose-200" aria-hidden="true" />Tim Hồng đầy và hai bạn chọn dừng lại ở đó.</li>
        <li className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2"><Flame className="h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />Bấm Kết thúc ván bất cứ lúc nào.</li>
      </ul>
    </SectionCard>

    <Note title="Nghe “Dừng” là dừng ngay." tone="emerald">
      Không quay phim, chụp ảnh hoặc chia sẻ nội dung riêng tư nếu chưa được đồng ý rõ ràng.
    </Note>
  </div>
);

/* ─────────────── Dialog ─────────────── */

export const RulesModal: React.FC<RulesModalProps> = ({ onClose, inGame = false }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const panelRef = useDialogFocus<HTMLDivElement>({ onEscape: onClose, initialFocusRef: closeButtonRef });
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    contentRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const tabContent: Record<TabId, React.ReactNode> = {
    overview: <OverviewTab />,
    levels: <LevelsTab />,
    progression: <ProgressionTab />,
    wardrobe: <WardrobeTab />,
    rewards: <RewardsTab />,
    consent: <ConsentTab />,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-md sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      aria-describedby="rules-description"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        {...dialogPanelMotion(Boolean(reduceMotion))}
        className="relative my-auto flex max-h-[calc(100svh-1.5rem)] w-full max-w-3xl sm:max-h-[calc(100svh-2.5rem)] flex-col overflow-hidden rounded-[28px] border border-rose-400/25 bg-[#120c0f]/[0.98] text-left text-white shadow-[0_28px_90px_rgba(0,0,0,0.72)]"
      >
        <header className="z-10 flex shrink-0 items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <h2 id="rules-title" className="font-serif-romantic text-2xl font-bold text-white sm:text-3xl">Cách chơi và luật</h2>
            <p id="rules-description" className="mt-1 text-sm text-neutral-300">18+ · hai người · tự nguyện</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng luật chơi"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-200 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <nav className="shrink-0 border-b border-white/[0.08]" aria-label="Mục lục luật chơi">
          <div className="flex gap-0.5 overflow-x-auto px-3 py-2 sm:justify-center">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                  activeTab === tab.id ? 'bg-rose-500/20 text-rose-50' : 'text-neutral-300 hover:bg-white/[0.05] hover:text-white'
                }`}
                aria-pressed={activeTab === tab.id}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-7 sm:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px)' }}
              transition={{ duration: reduceMotion ? 0.08 : 0.18, ease: 'easeOut' }}
            >
              {tabContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="shrink-0 border-t border-white/10 px-5 py-3 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="mx-auto flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 text-sm font-bold text-neutral-950 shadow-[0_0_24px_rgba(212,175,55,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{inGame ? 'Đã hiểu, chơi tiếp' : 'Đã hiểu'}</span>
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
};
