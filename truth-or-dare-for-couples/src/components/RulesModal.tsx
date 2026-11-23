import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface RulesModalProps {
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/* ─────────────── Shared SVG Icons ─────────────── */

const VectorClose: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

const VectorCheck: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─────────────── Tab Data ─────────────── */

type TabId = 'overview' | 'levels' | 'progression' | 'wardrobe' | 'rewards' | 'consent';

interface TabDef {
  id: TabId;
  icon: string;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'overview', icon: '🎴', label: 'Cách chơi' },
  { id: 'levels', icon: '🌡️', label: '3 Cấp độ' },
  { id: 'progression', icon: '💗', label: 'Tiến trình' },
  { id: 'wardrobe', icon: '👗', label: 'Trang phục' },
  { id: 'rewards', icon: '⭐', label: 'Sao & Kỹ năng' },
  { id: 'consent', icon: '🛡️', label: 'An toàn' },
];

/* ─────────────── Reusable Section Components ─────────────── */

const SectionCard: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  accentColor?: string;
  children: React.ReactNode;
}> = ({ eyebrow, title, description, accentColor = '#fb7185', children }) => (
  <section className="group rounded-3xl border border-white/10 bg-white/[0.025] p-4 transition-colors duration-300 hover:border-white/15 sm:p-5">
    <div className="mb-3">
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: `${accentColor}99` }}>
          {eyebrow}
        </p>
      )}
      <h3 className="mt-1 break-words text-base font-semibold leading-snug text-white sm:text-lg">{title}</h3>
      {description && <p className="mt-1 break-words text-xs leading-relaxed text-neutral-400 sm:text-sm">{description}</p>}
    </div>
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20 p-3 sm:p-4">{children}</div>
  </section>
);

const InfoPill: React.FC<{ icon: string; label: string; value: string; color?: string }> = ({
  icon,
  label,
  value,
  color = '#fda4af',
}) => (
  <div className="flex min-w-0 items-center gap-2.5 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
    <span className="text-base">{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="break-words text-xs font-bold leading-tight" style={{ color }}>
        {value}
      </p>
    </div>
  </div>
);

/* ─────────────── SVG Graphics ─────────────── */

const TurnFlowGraphic: React.FC = () => (
  <svg
    viewBox="0 0 560 124"
    className="h-auto w-full"
    role="img"
    aria-label="Rút thẻ, hoàn thành, tăng thân mật, đổi lượt"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <linearGradient id="flowGlow" x1="0" x2="1">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#60a5fa" />
      </linearGradient>
    </defs>

    {/* Arrows sit in dedicated gaps instead of touching the cards. */}
    <path d="M128 62H151" fill="none" stroke="url(#flowGlow)" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
    <path d="M145 56l8 6-8 6" fill="none" stroke="url(#flowGlow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
    <path d="M268 62H291" fill="none" stroke="url(#flowGlow)" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
    <path d="M285 56l8 6-8 6" fill="none" stroke="url(#flowGlow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
    <path d="M408 62H431" fill="none" stroke="url(#flowGlow)" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
    <path d="M425 56l8 6-8 6" fill="none" stroke="url(#flowGlow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />

    <g>
      <rect x="8" y="24" width="120" height="76" rx="17" fill="#26131b" stroke="#fb7185" strokeOpacity=".45" />
      <rect x="28" y="43" width="22" height="31" rx="4" fill="none" stroke="#fda4af" strokeWidth="1.8" opacity=".6" />
      <rect x="37" y="38" width="22" height="31" rx="4" fill="#2e1720" stroke="#fecdd3" strokeWidth="1.8" />
      <text x="91" y="58" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">RÚT</text>
      <text x="91" y="73" textAnchor="middle" fill="#a8a29e" fontSize="8.5">một lá</text>
    </g>

    <g>
      <rect x="151" y="24" width="117" height="76" rx="17" fill="#20180f" stroke="#f59e0b" strokeOpacity=".45" />
      <circle cx="178" cy="62" r="14" fill="none" stroke="#fcd34d" strokeWidth="1.8" />
      <path d="M171 62l5 5 10-12" fill="none" stroke="#fde68a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="226" y="59" textAnchor="middle" fill="#fff" fontSize="10.5" fontWeight="800">HOÀN</text>
      <text x="226" y="73" textAnchor="middle" fill="#fff" fontSize="10.5" fontWeight="800">THÀNH</text>
    </g>

    <g>
      <rect x="291" y="24" width="117" height="76" rx="17" fill="#26131b" stroke="#fb7185" strokeOpacity=".45" />
      <path d="M319 71C306 62 309 51 318 51c5 0 8 4 8 4s3-4 8-4c9 0 12 11-1 20l-7 5-7-5Z" fill="#fb7185" opacity=".85" />
      <text x="365" y="58" textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="800">+ THÂN</text>
      <text x="365" y="72" textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="800">MẬT</text>
    </g>

    <g>
      <rect x="431" y="24" width="121" height="76" rx="17" fill="#161b2a" stroke="#60a5fa" strokeOpacity=".45" />
      <path d="M460 48c13-5 22 2 22 13s-8 17-19 17" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" />
      <path d="M468 73l-7 6 6 5" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="515" y="59" textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="800">ĐỔI</text>
      <text x="515" y="73" textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="800">LƯỢT</text>
    </g>
  </svg>
);

const TruthDareGraphic: React.FC = () => (
  <svg
    viewBox="0 0 560 164"
    className="h-auto w-full"
    role="img"
    aria-label="Truth là trả lời, Dare là thử thách"
    preserveAspectRatio="xMidYMid meet"
  >
    <g>
      <rect x="12" y="12" width="262" height="140" rx="22" fill="#161b2a" stroke="#60a5fa" strokeOpacity=".35" />
      <path d="M43 47h66a11 11 0 0 1 11 11v23a11 11 0 0 1-11 11H77l-14 11 4-11H43A11 11 0 0 1 32 81V58A11 11 0 0 1 43 47Z" fill="none" stroke="#93c5fd" strokeWidth="1.8" />
      <circle cx="54" cy="69" r="2.5" fill="#bfdbfe" />
      <circle cx="69" cy="69" r="2.5" fill="#bfdbfe" />
      <circle cx="84" cy="69" r="2.5" fill="#bfdbfe" />

      <text x="196" y="55" fill="#dbeafe" fontSize="17" fontWeight="800" textAnchor="middle">TRUTH</text>
      <text x="196" y="77" fill="#94a3b8" fontSize="10.5" textAnchor="middle">Trả lời thật lòng</text>
      <text x="196" y="104" fill="#64748b" fontSize="8.8" textAnchor="middle">
        <tspan x="196" dy="0">Chia sẻ suy nghĩ, kỷ niệm</tspan>
        <tspan x="196" dy="13">hoặc cảm xúc của bạn</tspan>
      </text>
    </g>

    <g>
      <rect x="286" y="12" width="262" height="140" rx="22" fill="#281613" stroke="#fb7185" strokeOpacity=".35" />
      <path d="M337 111c-13-10-15-24-6-33 6-7 6-13 4-21 11 5 17 14 16 24 6-3 9-8 10-14 8 9 13 18 11 29-2 13-13 23-27 23-3 0-6 0-8-1Z" fill="#fb7185" opacity=".8" />

      <text x="467" y="55" fill="#ffe4e6" fontSize="17" fontWeight="800" textAnchor="middle">DARE</text>
      <text x="467" y="77" fill="#a8a29e" fontSize="10.5" textAnchor="middle">Thực hiện thử thách</text>
      <text x="467" y="104" fill="#64748b" fontSize="8.8" textAnchor="middle">
        <tspan x="467" dy="0">Cử chỉ, hành động</tspan>
        <tspan x="467" dy="13">hoặc thử thách cùng nhau</tspan>
      </text>
    </g>
  </svg>
);

const HeartProgressGraphic: React.FC = () => (
  <svg
    viewBox="0 0 560 172"
    className="h-auto w-full"
    role="img"
    aria-label="Intimacy tăng từ 0 đến 100 phần trăm"
    preserveAspectRatio="xMidYMid meet"
  >
    <defs>
      <linearGradient id="heartFill" x1="0" x2="1">
        <stop offset="0%" stopColor="#fda4af" />
        <stop offset="100%" stopColor="#fb7185" />
      </linearGradient>
      <linearGradient id="barBg" x1="0" x2="1">
        <stop offset="0%" stopColor="#2b1a21" />
        <stop offset="100%" stopColor="#1f1218" />
      </linearGradient>
      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    <path d="M78 91C43 66 52 34 71 34c11 0 19 7 24 15 5-8 13-15 24-15 19 0 28 32-8 57l-16 11-17-11Z" fill="url(#heartFill)" filter="url(#softGlow)" />

    <rect x="156" y="48" width="360" height="20" rx="10" fill="url(#barBg)" stroke="#fb7185" strokeOpacity=".25" />
    <rect x="156" y="48" width="259" height="20" rx="10" fill="url(#heartFill)" opacity=".9" />
    <text x="286" y="62" fill="#fff" fontSize="10" fontWeight="800" textAnchor="middle">72%</text>
    <text x="156" y="87" fill="#a8a29e" fontSize="9.5">0%</text>
    <text x="516" y="87" fill="#fecdd3" fontSize="9.5" textAnchor="end">100%</text>

    <text x="336" y="113" fill="#fff" fontSize="11" fontWeight="700" textAnchor="middle">Hoàn thành thẻ để làm đầy trái tim</text>

    {/* Star gains are split into compact pills so the line never overflows. */}
    {[
      { x: 156, label: '★1', gain: '+3%' },
      { x: 228, label: '★2', gain: '+4%' },
      { x: 300, label: '★3', gain: '+5%' },
      { x: 372, label: '★4', gain: '+6%' },
      { x: 444, label: '★5', gain: '+7%' },
    ].map(({ x, label, gain }) => (
      <g key={label}>
        <rect x={x} y="129" width="62" height="27" rx="9" fill="#1b1317" stroke="#fb7185" strokeOpacity=".18" />
        <text x={x + 19} y="146" fill="#fda4af" fontSize="8.5" fontWeight="800" textAnchor="middle">{label}</text>
        <text x={x + 44} y="146" fill="#d4d4d8" fontSize="8.5" fontWeight="700" textAnchor="middle">{gain}</text>
      </g>
    ))}
  </svg>
);

const ClothingGraphic: React.FC = () => (
  <svg
    viewBox="0 0 560 208"
    className="h-auto w-full"
    role="img"
    aria-label="Game tự theo dõi trang phục của hai người"
    preserveAspectRatio="xMidYMid meet"
  >
    <g transform="translate(52 20)">
      <circle cx="58" cy="20" r="16" fill="#2c1b22" stroke="#fb7185" strokeOpacity=".45" />
      <path d="M29 120V78c0-20 13-33 29-33s29 13 29 33v42" fill="#24161c" stroke="#fb7185" strokeOpacity=".4" strokeWidth="1.5" />
      <path d="M21 68l20-17 17 15 17-15 20 17-10 22-12-7v34H45V83l-12 7-12-22Z" fill="#7f1d3f" opacity=".75" />
      <text x="58" y="150" fill="#fecdd3" fontSize="10.5" fontWeight="700" textAnchor="middle">NGƯỜI A</text>
      <text x="58" y="167" fill="#a8a29e" fontSize="8.5" textAnchor="middle">Áo · Quần · Lót</text>
    </g>

    <g>
      <path d="M223 92h114" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 6" opacity=".55" />
      <circle cx="280" cy="92" r="29" fill="#21190f" stroke="#f59e0b" strokeOpacity=".4" />
      <text x="280" y="84" fill="#fde68a" fontSize="7.8" fontWeight="800" textAnchor="middle">TỰ ĐỘNG</text>
      <path d="M269 97l8 8 16-19" fill="none" stroke="#fcd34d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="280" y="134" fill="#a8a29e" fontSize="8" textAnchor="middle">lọc thẻ phù hợp</text>
    </g>

    <g transform="translate(392 20)">
      <circle cx="58" cy="20" r="16" fill="#171e2a" stroke="#60a5fa" strokeOpacity=".45" />
      <path d="M29 120V78c0-20 13-33 29-33s29 13 29 33v42" fill="#151b25" stroke="#60a5fa" strokeOpacity=".4" strokeWidth="1.5" />
      <path d="M21 68l20-17 17 15 17-15 20 17-10 22-12-7v34H45V83l-12 7-12-22Z" fill="#1e3a8a" opacity=".7" />
      <text x="58" y="150" fill="#bfdbfe" fontSize="10.5" fontWeight="700" textAnchor="middle">NGƯỜI B</text>
      <text x="58" y="167" fill="#a8a29e" fontSize="8.1" textAnchor="middle">Áo · Quần · Lót · Bra</text>
    </g>
  </svg>
);

const PositionUnlockGraphic: React.FC = () => (
  <svg
    viewBox="0 0 560 224"
    className="h-auto w-full"
    role="img"
    aria-label="Ba điều kiện mở Position Deck"
    preserveAspectRatio="xMidYMid meet"
  >
    <g>
      <circle cx="105" cy="70" r="35" fill="#28151d" stroke="#fb7185" strokeOpacity=".35" />
      <path d="M105 86C87 73 91 58 101 58c5 0 9 4 9 4s4-4 9-4c10 0 14 15-4 28l-5 4-5-4Z" fill="#fb7185" />
      <text x="105" y="124" fill="#fecdd3" fontSize="10.5" fontWeight="800" textAnchor="middle">STANDARD</text>
      <text x="105" y="140" fill="#a8a29e" fontSize="9.5" textAnchor="middle">100%</text>
    </g>

    <path d="M146 70H218" stroke="#a8a29e" strokeWidth="1.5" strokeDasharray="5 6" />
    <path d="M210 64l8 6-8 6" fill="none" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

    <g>
      <circle cx="280" cy="70" r="35" fill="#21190f" stroke="#f59e0b" strokeOpacity=".35" />
      <path d="M264 68h32M268 56h24M271 80h18" stroke="#fcd34d" strokeWidth="2.2" strokeLinecap="round" />
      <text x="280" y="124" fill="#fde68a" fontSize="10.2" fontWeight="800" textAnchor="middle">TRANG PHỤC</text>
      <text x="280" y="140" fill="#a8a29e" fontSize="9" textAnchor="middle">Đã cởi hết</text>
    </g>

    <path d="M322 70H394" stroke="#a8a29e" strokeWidth="1.5" strokeDasharray="5 6" />
    <path d="M386 64l8 6-8 6" fill="none" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

    <g>
      <circle cx="455" cy="70" r="35" fill="#112136" stroke="#60a5fa" strokeOpacity=".35" />
      <path d="M441 74l8 8 18-22" fill="none" stroke="#93c5fd" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <text x="455" y="124" fill="#bfdbfe" fontSize="10.5" fontWeight="800" textAnchor="middle">CẢ HAI</text>
      <text x="455" y="140" fill="#a8a29e" fontSize="9.5" textAnchor="middle">Đồng ý</text>
    </g>

    <path d="M280 153v20" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
    <path d="M272 166l8 8 8-8" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="174" y="184" width="212" height="28" rx="14" fill="#0f1b2a" stroke="#60a5fa" strokeOpacity=".3" />
    <text x="280" y="202" fill="#dbeafe" fontSize="10.5" fontWeight="900" textAnchor="middle">MỞ KHÓA POSITION DECK</text>
  </svg>
);

const ConsentGraphic: React.FC = () => (
  <svg
    viewBox="0 0 560 142"
    className="h-auto w-full"
    role="img"
    aria-label="Có thể bỏ qua hoặc dừng bất cứ lúc nào"
    preserveAspectRatio="xMidYMid meet"
  >
    <rect x="18" y="22" width="244" height="96" rx="19" fill="#21161a" stroke="#fb7185" strokeOpacity=".35" />
    <g transform="translate(46 49)">
      <path d="M0 0v34M12 0v34" stroke="#fda4af" strokeWidth="4.5" strokeLinecap="round" />
    </g>
    <text x="164" y="57" fill="#fff" fontSize="14" fontWeight="800" textAnchor="middle">BỎ QUA</text>
    <text x="164" y="78" fill="#a8a29e" fontSize="8.8" textAnchor="middle">
      <tspan x="164" dy="0">Không muốn làm thì bỏ qua</tspan>
      <tspan x="164" dy="13">không cần giải thích</tspan>
    </text>

    <text x="280" y="74" fill="#64748b" fontSize="10" fontWeight="700" textAnchor="middle">HOẶC</text>

    <rect x="298" y="22" width="244" height="96" rx="19" fill="#17231d" stroke="#34d399" strokeOpacity=".35" />
    <g transform="translate(326 50)">
      <rect width="28" height="28" rx="5" fill="none" stroke="#6ee7b7" strokeWidth="2" />
      <path d="M7 8h14M7 15h14M7 22h8" stroke="#a7f3d0" strokeWidth="1.6" strokeLinecap="round" />
    </g>
    <text x="446" y="57" fill="#fff" fontSize="14" fontWeight="800" textAnchor="middle">DỪNG</text>
    <text x="446" y="78" fill="#a8a29e" fontSize="8.8" textAnchor="middle">
      <tspan x="446" dy="0">Kết thúc ngay khi cần</tspan>
      <tspan x="446" dy="13">bất cứ lúc nào</tspan>
    </text>
  </svg>
);

/* ─────────────── Tab Content Panels ─────────────── */

const OverviewTab: React.FC = () => (
  <div className="space-y-4">
    <SectionCard eyebrow="Vòng lặp cơ bản" title="Rút → Làm → Tăng Thân Mật → Đổi Lượt" description="Mỗi lượt, một người rút thẻ bài, hoàn thành nội dung (Truth hoặc Dare), nhận điểm thân mật rồi đổi lượt cho đối phương.">
      <TurnFlowGraphic />
    </SectionCard>

    <SectionCard eyebrow="Hai loại thẻ" title="Truth (Sự Thật) & Dare (Thử Thách)" description="Truth yêu cầu trả lời câu hỏi thành thật. Dare yêu cầu thực hiện một hành động, cử chỉ hoặc thử thách cùng đối phương.">
      <TruthDareGraphic />
    </SectionCard>

    {/* Quick stats */}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <InfoPill icon="⏱️" label="Một ván" value="~70 phút" color="#fda4af" />
      <InfoPill icon="📦" label="Tim Hồng" value="Truth & Dare" color="#fde68a" />
      <InfoPill icon="🔮" label="Tư thế" value="✦6 – ✦9" color="#93c5fd" />
      <InfoPill icon="⭐" label="Cấp sao" value="★1 – ★5" color="#fcd34d" />
    </div>

    {/* Game flow summary */}
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/60">Luồng trò chơi</p>
      <div className="flex flex-col gap-1.5">
        {[
          { step: '1', text: 'Thiết lập: Nhập tên, chọn avatar, tùy chỉnh cấp độ & trang phục', color: '#fb7185' },
          { step: '2', text: 'Rút bài: Chọn ngẫu nhiên hoặc tự bấm Truth / Dare', color: '#fcd34d' },
          { step: '3', text: 'Hoàn thành hoặc Bỏ qua (từ 20% Tim Hồng, bỏ qua có thể bị phạt cởi 1 món nếu bật)', color: '#fda4af' },
          { step: '4', text: 'Tim Hồng 0% → 100%, mọi món đồ được cởi qua lá bài → mở bộ Tư thế', color: '#93c5fd' },
          { step: '5', text: 'Chọn 1 trong 3 lá Have Sex úp để khép ván, hoặc chủ động dừng bất cứ lúc nào', color: '#34d399' },
        ].map(({ step, text, color }) => (
          <div key={step} className="flex items-start gap-2.5">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {step}
            </span>
            <p className="text-xs leading-relaxed text-neutral-300">{text}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LevelsTab: React.FC = () => (
  <div className="space-y-4">
    {/* Three levels */}
    {[
      {
        icon: '🌸',
        name: 'Nhẹ Nhàng',
        eng: 'Gentle',
        stars: '⭐1 – ⭐2',
        cards: 'Truth + Dare khởi động',
        color: '#FF6B9D',
        bg: '#26131b',
        border: 'rgba(255, 107, 157, 0.35)',
        desc: 'Khởi động êm ái, kỷ niệm đầu, câu hỏi dễ thương, cử chỉ dịu dàng. Nhìn mắt 30s, ôm 20s, thì thầm khen ngợi.',
        examples: ['"Ấn tượng đầu tiên của bạn về đối phương?"', '"Nhìn vào mắt nhau 30 giây không chớp mắt"'],
      },
      {
        icon: '🔥',
        name: 'Thân Mật',
        eng: 'Intimate',
        stars: '⭐2 – ⭐4',
        cards: 'Truth + Dare chạm nhẹ',
        color: '#D4AF37',
        bg: '#20180f',
        border: 'rgba(212, 175, 55, 0.35)',
        desc: 'Tán tỉnh, cử chỉ đắm đuối, hôn sâu, vuốt ve, thử thách cởi bớt đồ ngoài.',
        examples: ['"Bạn thích được hôn ở đâu nhất?"', '"Hôn nhẹ lên cổ đối phương 15 giây"'],
      },
      {
        icon: '💋',
        name: 'Nồng Nhiệt',
        eng: 'Passionate',
        stars: '⭐3 – ⭐5',
        cards: 'Truth + Dare táo bạo',
        color: '#fb7185',
        bg: '#2d0c13',
        border: 'rgba(251, 113, 133, 0.35)',
        desc: 'Quyến rũ, táo bạo, khám phá khao khát, tiếp xúc cơ thể trực tiếp, đổi đồ cho nhau, ôm ấp nồng nàn.',
        examples: ['"Điều gì khiến bạn khao khát nhất ở đối phương?"', '"Cùng cởi 1 món đồ rồi ôm sát nhau"'],
      },
    ].map((level) => (
      <div
        key={level.eng}
        className="overflow-hidden rounded-2xl border p-4 sm:p-5"
        style={{ backgroundColor: level.bg, borderColor: level.border }}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="text-2xl">{level.icon}</span>
          <div>
            <h4 className="text-sm font-bold text-white">
              {level.name} <span className="ml-1 text-xs font-normal text-neutral-500">({level.eng})</span>
            </h4>
            <div className="mt-0.5 flex flex-wrap gap-2">
              <span className="text-[10px] font-bold" style={{ color: level.color }}>
                {level.stars}
              </span>
              <span className="text-[10px] text-neutral-500">·</span>
              <span className="text-[10px] text-neutral-400">{level.cards}</span>
            </div>
          </div>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-neutral-300">{level.desc}</p>
        <div className="space-y-1.5">
          {level.examples.map((ex, i) => (
            <div key={i} className="rounded-lg bg-black/20 px-3 py-2">
              <p className="text-[11px] italic text-neutral-400">{ex}</p>
            </div>
          ))}
        </div>
      </div>
    ))}

    {/* Tỉ lệ Truth/Dare thay đổi */}
    <SectionCard
      eyebrow="Tỉ lệ biến thiên"
      title="Truth / Dare thay đổi theo Intimacy"
      description="Ban đầu ưu tiên câu hỏi (65% Truth). Càng thân mật, Dare tăng dần lên 75%. Đây là cấu hình mặc định, Admin có thể chỉnh."
      accentColor="#f59e0b"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] sm:text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="py-2 pr-2 text-left font-bold text-neutral-400">Intimacy</th>
              <th className="py-2 px-2 text-center font-bold text-blue-300">Truth</th>
              <th className="py-2 px-2 text-center font-bold text-rose-300">Dare</th>
              <th className="py-2 pl-2 text-center font-bold text-amber-300">Sao phổ biến</th>
            </tr>
          </thead>
          <tbody className="text-neutral-300">
            {[
              { range: '0–19%', truth: '65%', dare: '35%', stars: '⭐1 (70%)' },
              { range: '20–39%', truth: '55%', dare: '45%', stars: '⭐1-2 (80%)' },
              { range: '40–59%', truth: '45%', dare: '55%', stars: '⭐2-3 (60%)' },
              { range: '60–79%', truth: '35%', dare: '65%', stars: '⭐3-4 (60%)' },
              { range: '80–99%', truth: '25%', dare: '75%', stars: '⭐4-5 (65%)' },
            ].map((row) => (
              <tr key={row.range} className="border-b border-white/[0.03]">
                <td className="py-1.5 pr-2 font-semibold text-white">{row.range}</td>
                <td className="py-1.5 px-2 text-center text-blue-200">{row.truth}</td>
                <td className="py-1.5 px-2 text-center text-rose-200">{row.dare}</td>
                <td className="py-1.5 pl-2 text-center text-amber-200">{row.stars}</td>
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
    {/* Phase 1: Standard */}
    <SectionCard
      eyebrow="Giai đoạn 1"
      title="Hành Trình Tim Hồng (0% → 100%)"
      description="Mỗi thẻ hoàn thành giúp tăng thanh Intimacy. Khi đạt 100%, mở khóa giai đoạn Position."
    >
      <HeartProgressGraphic />
    </SectionCard>

    {/* Star gains detail */}
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-200/60">Điểm thân mật theo sao</p>
      <div className="grid grid-cols-5 gap-2">
        {[
          { star: 1, gain: '+3%', color: '#fda4af' },
          { star: 2, gain: '+4%', color: '#fda4af' },
          { star: 3, gain: '+5%', color: '#fcd34d' },
          { star: 4, gain: '+6%', color: '#f59e0b' },
          { star: 5, gain: '+7%', color: '#fb7185' },
        ].map(({ star, gain, color }) => (
          <div key={star} className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-black/20 py-2.5">
            <span className="text-sm" style={{ color }}>{'★'.repeat(star)}</span>
            <span className="mt-1 text-xs font-black text-white">{gain}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-amber-500/[0.08] px-3 py-2">
        <p className="text-[11px] text-amber-200">
          <strong className="font-bold">Bonus trang phục:</strong> Mỗi lượt có cởi đồ thành công → thêm <strong>+3%</strong> Tim Hồng.
        </p>
      </div>
    </div>

    {/* Phase 2: Position / Luxury */}
    <SectionCard
      eyebrow="Giai đoạn 2"
      title="Hành Trình Tư Thế (Luxury 0% → 100%)"
      description="Mở khóa bộ Tư thế. Thang sao ✦6–✦9 tăng dần, các nhóm tư thế và lượt Nam/Nữ được chia đều. Mỗi ván khép lại bằng đúng 1 lá Have Sex."
      accentColor="#60a5fa"
    >
      <div className="space-y-3">
        {/* Position star gains */}
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { star: '✦6', gain: '+9%' }, { star: '✦7', gain: '+10%' }, { star: '✦8', gain: '+11%' },
            { star: '✦9', gain: '+12%' }, { star: 'Have Sex', gain: '🏆' },
          ].map(({ star, gain }) => (
            <div key={star} className="flex flex-col items-center rounded-lg border border-white/[0.05] bg-black/20 py-1.5">
              <span className="text-[10px] font-black text-blue-200">{star}</span>
              <span className="text-[9px] font-bold text-neutral-400">{gain}</span>
            </div>
          ))}
        </div>

        {/* Have Sex mechanic */}
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-3 py-2.5">
          <p className="text-xs font-semibold text-rose-200">◆ Lá Tối Thượng: Have Sex — chọn 1 trong 3 lá úp</p>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
            Tư thế 80–99% → <strong className="text-white">5%</strong> cơ hội mỗi lượt mở màn chọn lá cuối.
            Tư thế 100% → <strong className="text-white">chắc chắn</strong> mở. Ba lá Have Sex được úp, ưu tiên lá hai bạn chưa mở.
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
            Muốn xem trước? Tiêu <strong className="text-white">10★</strong> để lật 2 lá hoặc <strong className="text-white">20★</strong> để lật cả 3, rồi chọn 1 lá.
          </p>
        </div>
      </div>
    </SectionCard>

    {/* Position unlock */}
    <SectionCard
      eyebrow="Điều kiện mở khóa"
      title="Ba bước chuyển sang Position"
      description="Tim Hồng 100% + Cả hai đã cởi hết đồ qua lá bài + Cả hai đồng ý."
      accentColor="#60a5fa"
    >
      <PositionUnlockGraphic />
    </SectionCard>
  </div>
);

const WardrobeTab: React.FC = () => (
  <div className="space-y-4">
    <SectionCard
      eyebrow="Hệ thống Avatar"
      title="Game tự theo dõi trang phục của cả hai"
      description="Mỗi người có mô hình Avatar với trang phục riêng. Hệ thống tự động lọc bài phù hợp."
    >
      <ClothingGraphic />
    </SectionCard>

    {/* Outfit layers */}
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.04] p-3 sm:p-4">
        <p className="mb-2 text-xs font-bold text-rose-200">👨 Nam</p>
        <div className="space-y-1.5">
          {[
            { slot: 'Áo (shirt)', layer: 'Ngoài cùng', removable: true },
            { slot: 'Quần (pants)', layer: 'Ngoài cùng', removable: true },
            { slot: 'Quần lót (underwear)', layer: 'Trong cùng', removable: false },
          ].map((item) => (
            <div key={item.slot} className="flex items-start justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
              <span className="min-w-0 break-words text-[11px] leading-snug text-neutral-300">{item.slot}</span>
              <span className={`max-w-[58%] shrink-0 text-right text-[9px] font-bold leading-snug ${item.removable ? 'text-emerald-300' : 'text-amber-300'}`}>
                {item.removable ? '✓ Cởi trước' : '⬆ Cần cởi quần ngoài'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[0.04] p-3 sm:p-4">
        <p className="mb-2 text-xs font-bold text-blue-200">👩 Nữ</p>
        <div className="space-y-1.5">
          {[
            { slot: 'Áo (shirt)', layer: 'Ngoài cùng', removable: true },
            { slot: 'Quần (pants)', layer: 'Ngoài cùng', removable: true },
            { slot: 'Áo lót (bra)', layer: 'Trong', removable: false },
            { slot: 'Quần lót (underwear)', layer: 'Trong cùng', removable: false },
          ].map((item) => (
            <div key={item.slot} className="flex items-start justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
              <span className="min-w-0 break-words text-[11px] leading-snug text-neutral-300">{item.slot}</span>
              <span className={`max-w-[58%] shrink-0 text-right text-[9px] font-bold leading-snug ${item.removable ? 'text-emerald-300' : 'text-amber-300'}`}>
                {item.removable ? '✓ Cởi trước' : '⬆ Cần cởi đồ ngoài'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Clothing effects */}
    <SectionCard eyebrow="Hiệu ứng cởi đồ" title="5 kiểu hiệu ứng trang phục" accentColor="#f59e0b">
      <div className="space-y-1.5">
        {[
          { icon: '👤', name: 'Tự cởi (self)', desc: 'Bạn tự chọn 1 món đồ hợp lệ của mình để cởi.' },
          { icon: '👫', name: 'Cởi cho đối phương (opponent)', desc: 'Chọn 1 món trên người đối phương để họ cởi.' },
          { icon: '🤝', name: 'Cả hai cùng cởi (both)', desc: 'Mỗi người cùng bỏ 1 món đồ hợp lệ.' },
          { icon: '🎯', name: 'Cùng chọn người cởi (choice)', desc: 'Cặp đôi thỏa thuận ai sẽ cởi 1 món.' },
          { icon: '🔄', name: 'Đổi đồ cho nhau (swap)', desc: 'Cùng tháo 1 món rồi đổi mặc cho nhau!' },
        ].map((effect) => (
          <div key={effect.name} className="flex items-start gap-2.5 rounded-lg bg-black/15 px-3 py-2">
            <span className="mt-0.5 text-sm">{effect.icon}</span>
            <div className="min-w-0">
              <p className="break-words text-[11px] font-bold text-white">{effect.name}</p>
              <p className="break-words text-[10px] leading-relaxed text-neutral-400">{effect.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>

    {/* Every garment comes off through a card */}
    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.04] px-4 py-3">
      <p className="text-xs font-semibold text-rose-200">👗 Mọi món đồ đều được cởi qua lá bài</p>
      <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
        Lá cởi đồ xuất hiện ngẫu nhiên từ khoảng 20% Tim Hồng, đồ ngoài trước rồi đến đồ lót. Nếu gần cuối vẫn còn đồ,
        lá Dare kế tiếp sẽ có dải <strong className="text-white">"Kèm theo: …"</strong> để cởi nốt. Bộ Tư thế chỉ mở khi cả hai đã cởi hết.
      </p>
    </div>

    {/* Penalty */}
    <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.04] px-4 py-3">
      <p className="text-xs font-semibold text-amber-200">⚡ Luật phạt trang phục (tùy chọn)</p>
      <p className="mt-1 text-[11px] leading-relaxed text-neutral-300">
        Khi bật trong Thiết lập, từ <strong className="text-white">20% Tim Hồng</strong> trở đi, nếu bạn chọn <strong className="text-white">"Bỏ qua"</strong> thẻ bài, bạn cởi 1 món đồ hợp lệ để chuộc lỗi. Trước mốc này bỏ qua không bị phạt.
      </p>
    </div>
  </div>
);

const RewardsTab: React.FC = () => (
  <div className="space-y-4">
    {/* Star wallet */}
    <SectionCard eyebrow="Ví sao cá nhân" title="Hoàn thành thẻ → Nhận Sao vào ví" description="Mỗi thẻ hoàn thành tặng số sao bằng cấp độ sao của thẻ đó. Dùng sao để kích hoạt kỹ năng chiến thuật." accentColor="#f59e0b">
      <div className="flex items-center justify-center gap-6 py-3">
        <div className="flex flex-col items-center">
          <span className="text-3xl">⭐</span>
          <p className="mt-1 text-xs font-bold text-amber-200">Ví Sao</p>
          <p className="text-[10px] text-neutral-400">Tích lũy mỗi lượt</p>
        </div>
        <div className="h-12 w-px bg-white/10" />
        <div className="space-y-1 text-xs text-neutral-300">
          <p>Thẻ ⭐1 → nhận <strong className="text-white">1 sao</strong></p>
          <p>Thẻ ⭐3 → nhận <strong className="text-white">3 sao</strong></p>
          <p>Thẻ ⭐5 → nhận <strong className="text-white">5 sao</strong></p>
        </div>
      </div>
    </SectionCard>

    {/* Two skills */}
    <div className="grid gap-3 sm:grid-cols-2">
      {/* Reroll */}
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15">
            <span className="text-xl">🎲</span>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-200">Đổi Bài</p>
            <p className="text-[10px] font-bold text-amber-400">Chi phí: 8 ⭐</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-neutral-300">
          Rút lá bài không ưng? Tiêu <strong className="text-white">8 sao</strong> để đổi ngay lá khác mà không bị tính "Bỏ qua" hay bị phạt.
        </p>
      </div>

      {/* Difficulty Boost */}
      <div className="rounded-2xl border border-rose-400/25 bg-rose-500/[0.05] p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15">
            <span className="text-xl">🔥</span>
          </div>
          <div>
            <p className="text-sm font-bold text-rose-200">Tăng Nhiệt</p>
            <p className="text-[10px] font-bold text-rose-400">Chi phí: 10 ⭐</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-neutral-300">
          Tiêu <strong className="text-white">10 sao</strong> để lượt rút kế tiếp nhảy vọt lên độ khó cao nhất. Ép bàn chơi xuất hiện bài nồng cháy và táo bạo!
        </p>
      </div>
    </div>

    {/* Have Sex flips */}
    <div className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.05] p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15">
          <span className="text-xl">🂠</span>
        </div>
        <div>
          <p className="text-sm font-bold text-violet-200">Lật lá Have Sex</p>
          <p className="text-[10px] font-bold text-violet-300">Chi phí: 10 ⭐ (2 lá) · 20 ⭐ (cả 3 lá)</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-neutral-300">
        Ở màn chọn lá cuối, hai bạn dùng <strong className="text-white">ví chung</strong>: trừ sao của người đang tới lượt trước, thiếu thì trừ tiếp của người kia.
        Đã lật 2 lá thì chỉ cần thêm 10 ⭐ để lật lá còn lại.
      </p>
    </div>
  </div>
);

const ConsentTab: React.FC = () => (
  <div className="space-y-4">
    <SectionCard eyebrow="Nguyên tắc vàng" title="Bỏ qua hoặc Dừng — bất cứ lúc nào" description="Không ai bị ép buộc. Mọi hành động đều tự nguyện, có thể đổi ý mà không cần giải thích.">
      <ConsentGraphic />
    </SectionCard>

    {/* Consent rules */}
    <div className="space-y-2">
      {[
        {
          icon: '🛑',
          title: 'Quyền dừng tuyệt đối',
          desc: 'Bất kỳ lúc nào, bất kỳ ai cũng có thể nói "Dừng" hoặc bấm Bỏ qua mà không cần giải thích. Lá có đồng hồ vẫn bỏ qua được trước khi bấm đếm giờ.',
          color: '#fb7185',
        },
        {
          icon: '🔒',
          title: 'Chế độ riêng tư (Privacy Mode)',
          desc: 'Nội dung thẻ bị làm mờ mặc định. Người rút thẻ chạm để xem trước, đánh giá rồi mới đọc to cho đối phương.',
          color: '#60a5fa',
        },
        {
          icon: '🤝',
          title: 'Xác nhận đồng thuận chuyển giai đoạn',
          desc: 'Khi hoàn thành 100% Standard, CẢ HAI phải bấm "Đồng ý" thì mới mở khóa bộ bài Position.',
          color: '#fcd34d',
        },
        {
          icon: '💚',
          title: 'An toàn cảm xúc & cơ thể',
          desc: 'Không bao giờ ép đối phương trả lời bí mật nhạy cảm hay thực hiện hành động vượt giới hạn.',
          color: '#34d399',
        },
      ].map((rule) => (
        <div key={rule.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">{rule.icon}</span>
            <div className="min-w-0">
              <p className="break-words text-xs font-bold" style={{ color: rule.color }}>
                {rule.title}
              </p>
              <p className="mt-1 break-words text-[11px] leading-relaxed text-neutral-300">{rule.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Game end conditions */}
    <SectionCard eyebrow="Kết thúc ván" title="3 cách kết thúc trò chơi" accentColor="#34d399">
      <div className="space-y-1.5">
        {[
          { icon: '🏆', text: 'Chọn 1 trong 3 lá Have Sex úp — đỉnh cao của ván' },
          { icon: '💗', text: 'Hoàn thành 100% Tim Hồng và chọn dừng lại (không vào Tư thế)' },
          { icon: '⏹️', text: 'Bấm nút "Kết thúc ván" bất cứ lúc nào' },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-2.5 rounded-lg bg-black/15 px-3 py-2">
            <span className="text-sm">{item.icon}</span>
            <p className="text-[11px] text-neutral-300">{item.text}</p>
          </div>
        ))}
      </div>
    </SectionCard>

    {/* Bottom consent banner */}
    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.06] px-4 py-3.5">
      <p className="text-center text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
        <strong className="font-semibold text-emerald-200">Nghe "Dừng" là dừng ngay.</strong>{' '}
        Không quay phim, chụp ảnh hoặc chia sẻ nội dung riêng tư nếu chưa được đồng ý rõ ràng.
      </p>
    </div>
  </div>
);

/* ─────────────── Main Modal ─────────────── */

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusable = Array.from(panelRef.current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element): element is HTMLElement => element instanceof HTMLElement && !element.hasAttribute('disabled')
      );

      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const TAB_CONTENT: Record<TabId, React.ReactNode> = {
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
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        className="relative my-auto flex max-h-[calc(100svh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-rose-400/25 bg-[#120c0f]/[0.98] text-left text-white shadow-[0_28px_90px_rgba(0,0,0,0.72)]"
      >
        {/* ── Header ── */}
        <header className="z-10 flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#120c0f]/95 px-5 py-4 backdrop-blur-xl sm:px-7 sm:py-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-200">
                18+ · 2 người · tự nguyện
              </span>
            </div>
            <h2 id="rules-title" className="font-serif-romantic text-2xl font-bold text-white sm:text-3xl">
              Cách chơi & Luật chơi
            </h2>
            <p id="rules-description" className="mt-1 max-w-xl text-xs leading-relaxed text-neutral-400 sm:text-sm">
              Toàn bộ hướng dẫn, hệ thống tiến trình, trang phục, kỹ năng và nguyên tắc đồng thuận.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng luật chơi"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-400 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <VectorClose />
          </button>
        </header>

        {/* ── Tab Navigation ── */}
        <nav className="shrink-0 border-b border-white/[0.06] bg-[#120c0f]/80 backdrop-blur-sm" aria-label="Mục lục luật chơi">
          <div className="flex gap-0.5 overflow-x-auto px-3 py-2 sm:justify-center sm:px-5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all duration-200 sm:text-xs ${
                  activeTab === tab.id
                    ? 'bg-rose-500/15 text-rose-200 shadow-[0_0_12px_rgba(251,113,133,0.12)]'
                    : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-300'
                }`}
                aria-pressed={activeTab === tab.id}
              >
                <span className="text-sm">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* ── Scrollable Content ── */}
        <div ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain">
          <main className="px-5 py-5 sm:px-7 sm:py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {TAB_CONTENT[activeTab]}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* ── Footer ── */}
        <footer className="shrink-0 border-t border-white/10 bg-[#120c0f]/95 px-5 py-4 backdrop-blur-xl sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-full bg-gold-gradient px-5 py-3 text-sm font-bold text-neutral-950 shadow-[0_0_24px_rgba(212,175,55,0.24)] transition hover:shadow-[0_0_30px_rgba(255,107,157,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <VectorCheck />
            <span>Đã hiểu, bắt đầu chơi</span>
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
};
