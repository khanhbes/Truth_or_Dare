# Truth or Dare for Couples — Tài Liệu Tổng Hợp Gameplay, Logic & Hệ Thống

> Tài liệu này được tổng hợp từ toàn bộ các file `.md` (`README.md`, `PLAN.md`), cấu hình catalog (`data/catalog/manifest.json`, `seed-bundle.json`) và mã nguồn runtime (`src/types.ts`, `src/utils/*`, `src/components/GameTable.tsx`, `RulesModal.tsx`).

---

## 1. Tổng Quan Dự Án & Kiến Trúc Hệ Thống

**Truth or Dare for Couples** là ứng dụng web dành cho cặp đôi (2 người chơi: **Người chơi 1 = Nam (`index 0`)**, **Người chơi 2 = Nữ (`index 1`)**), xây dựng bằng **React 19 + TypeScript + Vite + Tailwind CSS v4**, triển khai trên **Cloudflare Pages** kết hợp **Cloudflare D1**, **Cloudflare R2** và **Cloudflare Access**.

### 1.1. Phân tách vai trò & dữ liệu
- **Player (`/`)**: Luồng chơi công khai. Người chơi chỉ nhập tên hiển thị; server đặt cookie ID ẩn danh, không yêu cầu email/OTP/mật khẩu và không lưu IP. Tên, trang phục và thiết lập cá nhân nằm trên thiết bị (`localStorage`).
- **Tài khoản cặp đôi (Couple Session)** — mỗi cặp tự tạo tài khoản, các tài khoản độc lập hoàn toàn:
  - Đăng ký/đăng nhập theo email hoặc tên cặp đôi + **PIN bắt buộc 4–8 chữ số** (`/api/couple/register`, `/api/couple/login`, `/api/couple/session`, `/api/couple/sync-unlocked`, `/api/couple/logout`). Không còn tài khoản viết cứng trong mã nguồn; đăng nhập không tự tạo tài khoản.
  - Chống dò PIN: sai **5 lần → khóa 15 phút** (bảng `couple_login_attempts`). Tài khoản cũ có PIN rỗng bị **khóa** (`ACCOUNT_LOCKED_NO_PIN`), người dùng được mời tạo tài khoản mới.
  - **Bộ sưu tập riêng**: danh sách thẻ đã mở (`unlocked_cards`) giảm 90% lặp bài giữa các buổi chơi.
  - **Bộ thẻ riêng** (`couple_catalogs`): thẻ tự thêm của tài khoản (id `acct-…`, tối đa 300) + danh sách thẻ chung đã xóa khỏi bộ của mình (`hiddenCardIds`), lưu có `revision` chống ghi đè (`409 STALE_ACCOUNT_CATALOG`). API: `GET/PUT /api/couple/catalog`.
  - **Ảnh riêng tư**: `POST /api/couple/assets` (PNG/JPEG/WebP/GIF ≤ 2 MB) lưu R2 `couple-assets/<coupleId>/<sha256>`, chỉ chính tài khoản đọc được qua `GET /api/couple/assets/<sha256>`.
  - **Khôi phục bộ thẻ mặc định**: `POST /api/couple/catalog/reset` xóa thẻ tự thêm + ảnh riêng, hiện lại mọi thẻ đã xóa; **giữ nguyên tiến trình thẻ đã mở**.
  - Bảng D1: `couple_accounts` (migration `0003`), `couple_login_attempts`, `couple_catalogs`, `couple_assets` (migration `0004_couple_security_and_decks.sql`, API cũng tự tạo nếu thiếu).
- **Developer / Admin (`/admin`, `/api/admin/*`)**: Bảo vệ bằng **Cloudflare Access Email OTP** (JWT được API tự xác minh với `ACCESS_TEAM_DOMAIN` và `ACCESS_AUD`). Admin quản lý catalog thẻ, cấu hình xác suất, xem thống kê người chơi (online trong 2 phút gần nhất, hoạt động 24h, tổng thiết bị), xuất/nhập gói `.todbackup.zip` (có dry-run) và tạo snapshot thủ công.
- **Đồng bộ Catalog thời gian thực**:
  - Player kiểm tra `datasetRevision` mỗi **10 giây** và khi quay lại tab. Bản cập nhật từ Admin tự tải về; lỗi mạng không ghi đè cache hợp lệ.
  - Snapshot local dự phòng đặt tại `data/catalog/`:
    - `catalog.json`: **235 thẻ hiển thị** (108 thẻ hệ thống + 131 thẻ custom + 78 bản ghi đè − 4 thẻ hệ thống đã xóa).
    - `seed-bundle.json`: Cấu trúc nhập cloud kèm cấu hình `progressionConfig`, `luxuryProgressionConfig`, `deletedSystemCardIds`.
    - `assets/`: **59 ảnh minh họa** định danh theo SHA-256 bất biến.
    - `manifest.json`: Checksum SHA-256 cho toàn bộ payload và ảnh.

---

## 2. Thiết Lập Ván Chơi & Mô Hình Dữ Liệu

### 2.1. Thiết lập mặc định (`DEFAULT_GAME_SETTINGS`)
| Thiết lập | Mặc định | Tùy chọn |
| :--- | :--- | :--- |
| Cấp độ (`levels`) | `['gentle', 'intimate', 'passionate']` | Bật/tắt từng cấp: Nhẹ nhàng (`gentle`), Thân mật (`intimate`), Nồng nhiệt (`passionate`) |
| Chế độ vòng (`roundsMode`) | `'unlimited'` | Màn Thiết lập luôn dùng `'unlimited'`; ván khép lại bằng lá Have Sex hoặc nút **Kết thúc ván** (`'target'` chỉ còn trong dữ liệu cũ) |
| Riêng tư (`privacyDefault`) | `true` | Che mờ nội dung thẻ cho tới khi người rút chạm để xem |
| Kiểu rút (`drawMode`) | `'random'` | `'random'` (hệ thống chọn Truth/Dare) hoặc `'choose'` (người chơi tự chọn Truth hoặc Dare nếu còn bài hợp lệ) |
| Luật phạt trang phục (`penaltyClothingEnabled`) | `true` | Từ **20% Tim Hồng**, khi chọn **Bỏ qua**, đề xuất cởi 1 món đồ hợp lệ (luôn tùy chọn, có thể từ chối). Trước 20% bỏ qua không bị phạt |
| Trang phục (`outfits`) | `[MALE_DEFAULT, FEMALE_DEFAULT]` | Tùy chỉnh từng món đồ (kiểu dáng + màu trong 8 màu chuẩn) |

### 2.2. Đối tượng lượt (`TurnAudience`)
- Trường `turnAudience` nhận giá trị `'male' | 'female' | 'both'` và **chỉ quyết định lượt của ai được rút thẻ đó**:
  - `'male'`: chỉ rút ở lượt Người chơi 1 (Nam, `actorIndex === 0`).
  - `'female'`: chỉ rút ở lượt Người chơi 2 (Nữ, `actorIndex === 1`).
  - `'both'`: rút được ở cả hai lượt.
- **Người rút thẻ luôn là người thực hiện chính, nhận sao (`★`), điểm hoàn thành và chịu luật phạt** (nếu bỏ qua).
- Tương thích ngược: dữ liệu cũ dùng `audience` hoặc `recipient` (kể cả `'current'`) vẫn được hydrate sang `TurnAudience` (`'current'` → `'both'`).

### 2.3. Quy tắc sắp xếp bộ sưu tập (`compareCollectionCards`)
Dùng chung một comparator duy nhất cho Player, Admin, export và catalog materialized (thẻ custom chen đúng vị trí theo metadata, không bị dồn xuống cuối):
1. **Deck**: `standard` trước `position`.
2. **Nếu là `standard` (Bài thường)**:
   - Cấp độ: `gentle` → `intimate` → `passionate`
   - Số sao: `1★` → `5★`
   - Loại bài: `truth` → `dare`
   - Đối tượng lượt: `both` → `male` → `female`
   - ID tự nhiên (`Intl.Collator('vi', { numeric: true, sensitivity: 'base' })`)
3. **Nếu là `position` (Bộ Tư Thế)**:
   - `orderGroup`: `1` (Oral) → `2` (Blowjob) → `3` (Handjob) → `4` (Have Sex)
   - Số sao: `6★` → `10★`
   - Family: `oral` → `blowjob` → `handjob` → `other` → `have_sex`
   - Đối tượng lượt: `both` → `male` → `female`
   - ID tự nhiên.

---

## 3. Vòng Lặp Gameplay & Các Giai Đoạn (`JourneyPhase`)

Trò chơi gồm 4 trạng thái hành trình:
`standard` (Tim Hồng 0% → 100%) → `position_consent` (Đồng thuận & chuẩn bị trang phục) → `position` (Luxury 0% → 100%) → `final` (Lá tối thượng Have Sex).

### 3.1. Vòng lặp một lượt chơi
1. **Rút bài (`idle` → `selecting_type` → `shuffling` → `drawing` → `drawn`)**:
   - Nếu `drawMode === 'choose'`, chỉ hiển thị nút **Truth** / **Dare** nào thực sự còn ít nhất 1 lá hợp lệ sau khi lọc cấp độ, lượt Nam/Nữ, trang phục, trọng số và ID đã dùng.
   - Lưu **snapshot xác suất tại thời điểm rút** để hiển thị "Tỷ lệ lúc rút" trong khi lá bài đang mở.
   - Chạy hiệu ứng xáo bài (900ms) → lật 3D (500ms).
2. **Đếm giờ (`cardTimer.ts`)**:
   - Giá trị hợp lệ: số nguyên `1..3600` giây; `timerSeconds === null` tắt đếm giờ tường minh.
   - **Dare**: không khai báo → mặc định **60 giây**. **Truth** và **Tư thế**: chỉ có đồng hồ khi lá khai báo `timerSeconds`.
   - Lá Standard có timer: phải bấm **"Bắt đầu thực hiện"** trước khi xác nhận hoàn thành; vẫn **bỏ qua được trước khi bấm đếm giờ**.
   - Lá Tư thế: đồng hồ là **tùy chọn** (nút "Bắt đầu đếm giờ"), không chặn nút hoàn thành.
3. **Xử lý kết quả (`CardResolutionEvent`)**:
   - Mỗi lần kết thúc lá bài sinh một event chống ghi trùng (idempotent) với trạng thái: `'completed' | 'skipped' | 'rerolled' | 'passed' | 'final_viewed'`.
   - **Hiệu ứng đặc biệt `pass_turn`** (ví dụ `g-d-14`): không có timer (`timerSeconds: null`), hiển thị nút **"Chuyển lượt"**, mở khóa lá trong Bộ sưu tập, **không cộng sao, không cộng thân mật, không phạt**.
   - **Hiệu ứng trang phục (`clothingEffect`)**: nếu lá có `remove_garment` (1 người hoặc cả 2) hoặc `swap_garments`, hệ thống mở dialog xử lý trang phục trước khi commit kết quả hoàn thành.
   - **Bỏ qua (`skipped`)**: mở `PenaltyPrompt`. Nếu bật `penaltyClothingEnabled`, Tim Hồng ≥ 20% và người chơi còn đồ hợp lệ, có thể chọn cởi 1 món đồ hoặc chọn **"Không áp dụng phạt · Chuyển lượt"** (dưới 20% lựa chọn cởi bị khóa kèm lý do).
   - **Mở khóa Bộ sưu tập**: Chỉ mở khóa thẻ khi **hoàn thành** (`completed`), **chuyển lượt hợp lệ** (`passed`), hoặc **xác nhận Have Sex** (`final_viewed`). Đổi bài (`rerolled`) hoặc bỏ qua (`skipped`) không mở khóa lá bài.
4. **Đổi lượt**: Chuyển `currentPlayerIndex` (`0 ↔ 1`), tăng `currentRound`, cập nhật `clothingJourney` và `cardDirectorState`.

### 3.2. Điều kiện kết thúc ván (`GameEndReason`) & Bảng Tổng Kết (`SummaryModal`)
1. `'have_sex'`: Chọn 1 trong 3 lá **Have Sex** úp và xác nhận (xem 6.3).
2. `'pink_complete'`: Đạt **100% Tim Hồng** và chọn dừng lại thay vì bước vào Bộ Tư Thế.
3. `'no_cards'`: Hết lá bài hợp lệ / cấu hình không còn trọng số khả dụng.
4. `'manual'`: Bấm nút **"Kết thúc ván"** trên bàn chơi (có hộp xác nhận) bất kỳ lúc nào.

- **Huy hiệu tình cảm trong `SummaryModal`**:
  - 🌸 *Gắn Kết Nhẹ Nhàng* (`< 40%`)
  - 🔥 *Thân Mật Đắm Say* (`40% – 79%`)
  - 💋 *Bùng Nổ Nồng Nhiệt* (`80% – 99%`)
  - 🏆 *Đạt Đến Have Sex!* (hoàn thành lá tối thượng)
- Hiển thị thêm: số lượt hoàn thành/bỏ qua & ví sao từng người, thống kê Tư thế (`drawn / opened / completed / skipped`), trạng thái trang phục còn lại.

### 3.3. Quy ước nhận diện UI & Thang sao liên tục (`1★ – 10★`)
- **Thanh Tim Hồng (`Standard`)**: Giữ duy nhất tông hồng pastel (`#f9a8d4 → #fecdd3`), chỉ thay đổi mức fill/glow/pulse theo %; phân tách rõ `💗 = Intimacy Progress` và `⭐ = Card Intensity`.
- **Thang sao liên tục không reset**:
  - **Standard (`1★–5★`)**: `1★` Khởi động → `2★` Flirt nhẹ → `3★` Thân mật → `4★` Nóng → `5★` Passionate cuối Standard.
  - **Position (`6★–10★`)**: `6★` Dạo đầu Tư thế → `7★` Kích thích sâu → `8★` Nồng nhiệt → `9★` Kỹ thuật cao → `10★` Tuyệt đỉnh / Finale.
- **Standard Extension**: Nếu Tim Hồng chạm `100%` nhưng ít nhất một người vẫn còn đồ, ván chơi tiếp tục ở mốc `100%`, mỗi lá Dare kế tiếp mang yêu cầu cởi nốt (dải **"Kèm theo: …"**) cho tới khi **cả hai đã cởi hết (`empty`)**. Mô phỏng 1.500 ván: trung bình chỉ thêm **0,2 lượt** ở mốc 100%.
- **Thanh "Độ nóng"**: thay dải 7 con số bằng 5 nấc nhiệt; bấm **"Tỉ lệ sao"** để xem chi tiết. Khi đến lượt cởi đồ, bảng tỉ lệ hiển thị đúng tỉ lệ của lượt Dare bắt buộc.

---

## 4. Giai Đoạn 1: Hành Trình Tim Hồng (`standard`, 0% → 100%)

### 4.1. Bảng trọng số theo mốc Thân mật (`DEFAULT_PROGRESSION_CONFIG`)
Mỗi lá Standard có độ khó `1★ – 5★` (nếu thiếu metadata: `gentle truth = 1★`, `gentle dare = 2★`, `intimate = 3★`, `passionate = 4★`).

| Mốc Thân mật | Truth | Dare | 1★ | 2★ | 3★ | 4★ | 5★ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **0 – 19%** | 65% | 35% | 70% | 25% | 5% | 0% | 0% |
| **20 – 39%** | 55% | 45% | 45% | 35% | 15% | 5% | 0% |
| **40 – 59%** | 45% | 55% | 20% | 30% | 30% | 15% | 5% |
| **60 – 79%** | 35% | 65% | 10% | 15% | 30% | 30% | 15% |
| **80 – 99%** | 25% | 75% | 5% | 10% | 20% | 35% | 30% |

### 4.2. Điểm cộng Thân mật (`starGains` & `cardRemovalBonus`)
- **Điểm cơ bản theo sao**: `1★ = +3%`, `2★ = +4%`, `3★ = +5%`, `4★ = +6%`, `5★ = +7%` (một hành trình chuẩn kéo dài khoảng **20–24 lá hoàn thành**; từng lá có thể override qua `progression.intimacyGain`).
- **Thưởng cởi đồ từ lá bài (`cardRemovalBonus`)**:
  - Mặc định trong mã nguồn (`DEFAULT_PROGRESSION_CONFIG`): **`+3%`** (trước đây `+8%`, làm ván ngắn lại khoảng 5 lá).
  - Cấu hình đang chạy lưu trên cloud (`seed-bundle.json` staging: `+2%`) — nên đặt **`3`** trong Admin để khớp mô phỏng.
  - Lưu ý: cởi đồ do **luật phạt (`penalty`)** hoặc **chuẩn bị trước Tư thế (`preparation`)** **không** nhận bonus này.
- **Nhịp ván ~70 phút (mô phỏng 1.500 ván, cấu hình mặc định)**: ~23 lượt rút Tim Hồng (p10–p90: 20–26) + ~10 lượt Tư thế + màn chọn Have Sex; 100% ván vào được Tư thế, 0 ván kẹt.

### 4.3. Trần sao & Phối trọng số theo Trang phục (`WardrobeDifficultyProfile`)
Hệ thống lấy trạng thái trang phục của **người mặc NHIỀU đồ nhất** (`dressed` > `underwear_only` > `empty`) làm chuẩn để tránh việc một người bị phạt cởi đồ sớm kéo cả bàn chơi lên bài 4–5★ quá nhanh:

| Trạng thái (`OutfitStage`) | Trần sao (`maxStars`) | Trọng số trang phục (1★ / 2★ / 3★ / 4★ / 5★) |
| :--- | :---: | :--- |
| `dressed` (còn áo hoặc quần ngoài) | 3★ | 45 / 35 / 20 / 0 / 0 |
| `underwear_only` (chỉ còn nội y) | 4★ | 5 / 10 / 20 / 65 / 0 |
| `empty` (đã cởi hết đồ) | 5★ | 3 / 7 / 15 / 25 / 50 |

- **Trần sao kết hợp (`getIntimacyStarCap`)**: Khi còn ít nhất 1 người ở trạng thái `dressed`, trần sao theo thân mật là:
  - **`< 40%`**: tối đa **`3★`** (chặn hoàn toàn bài 4★–5★ trước mốc 40% khi còn mặc đồ ngoài).
  - **`40% – 59%`**: tối đa **`4★`**.
  - **`≥ 60%`**: mở khóa **`5★`**.
  - Nếu cả hai người đều đã đạt `underwear_only` (`4★`) hoặc `empty` (`5★`), hệ thống lấy `max(profile.maxStars, intimacyMaxStars)`.
- **Trọng số sao cuối cùng**:
  $$\text{Weight}(s) = 0.6 \times \text{WardrobeWeight}(s) + 0.4 \times \text{BandWeight}(s)$$
  (Từ `60%` trở lên, `WardrobeWeight(s)` được nâng lên ít nhất bằng `BandWeight(s)` để không bóp nghẹt sao cao).
- **Nếu đang kích hoạt Tăng Độ Khó (`difficultyBoost`)**: toàn bộ trọng số của mỗi bậc sao `s` được dịch chuyển sang bậc sao khả dụng cao hơn kế tiếp (`s' > s`).

### 4.4. Thuật toán chọn bài thông minh (`CardDirector`)
Khi `directorState` được bật (mặc định trong ván chơi), việc rút chia làm 2 tầng (`computeJourneyWeighting`) — **tỉ lệ hiển thị trên màn hình chính là tỉ lệ rút thật**:
1. **Tầng (loại, sao)** nhận đúng phần đã cấu hình: `TypeShare × Pacing × StarWeight(sao | loại)`. Tầng có nhiều lá không còn lấn tầng có ít lá.
2. **Trong một tầng**, lá cụ thể được chọn theo trọng số đạo diễn:
$$\text{CardFactor}(c) = \text{HeatFactor} \times \text{Novelty} \times \text{TargetBalance} \times \text{UnlockPenalty} \times \text{ClothingPreference}$$

- **Ưu tiên lá cởi đồ (`ClothingPreference`, chỉ nhân trong tầng, không bao giờ thu hẹp pool)**: đúng nhóm đồ đang tới lượt ×`1.5`; nhóm đồ chưa xuất hiện (từ 20%) ×`1.25`; giúp người chưa cởi lần nào ×`1.3`.

- **Độ nóng (`heat`, thang 1–10)**: Lấy từ `card.heat` hoặc suy ra (`gentle = 2`, `intimate = 5`, `passionate = 8`, cộng `+1` nếu có `clothingEffect`). So sánh với trung bình `heat` của tối đa 3 lá gần nhất (`recentHeat`):
  - Nếu `heat > recentHeat + 1.5`: nhân `0.28` (tránh sốc nhiệt quá đột ngột).
  - Nếu `heat > recentHeat + 0.5`: nhân `0.65`.
  - Ngược lại: nhân `1.0`.
- **Nhịp độ (`pacing`)**: nếu 2 lá gần nhất cùng loại (`truth`/`dare`), phần của loại đó ở lượt kế tiếp nhân `0.58` (áp ở tầng loại).
- **Độ mới trong ván (`novelty`)**: Chưa rút trong ván → `1.18`; đã từng xuất hiện → `0.72`.
- **Cân bằng cởi đồ (`targetBalanceFactor`)**: Nếu chênh lệch số món đồ đã cởi giữa Nam và Nữ `≥ 2` và lá có `clothingEffect`:
  - Nhắm vào người đang cởi ít hơn: nhân `1.8`.
  - Nhắm vào người đang cởi nhiều hơn: nhân `0.45`.
- **Ưu tiên thẻ chưa mở khóa của tài khoản (`unlockPenalty`)**: Nếu pool ứng viên vẫn còn thẻ chưa có trong `accountUnlockedCardIds`, các thẻ đã mở khóa trước đó bị nhân **`0.1`** (giảm 90% xác suất lặp lại giữa các buổi chơi).
- **Cơ chế chống lặp (`usedCardIds`)**: Các lá đã rút được loại khỏi pool ứng viên; chỉ khi toàn bộ pool hợp lệ đã dùng hết mới tự động reset pool (`didResetPool = true`), vẫn tôn trọng `excludedCardIds` cứng (như lá vừa đổi bài).

---

## 5. Hệ Thống Trang Phục & Lịch Trình Cởi Đồ

### 5.1. Cấu trúc lớp đồ (`wardrobe.ts`)
- **Nam (`male`)**: `shirt` (Áo: Áo thun, Sơ mi, Hoodie), `pants` (Quần: Jeans, Quần tây, Quần short), `underwear` (Quần lót: Briefs, Boxer briefs, Boxers). *(Có thêm geometry riêng cho `bra` khi nhận áo lót nữ qua hiệu ứng Đổi đồ — giữ nguyên ID, slot, kiểu gốc và màu mà không áp SVG nữ trực tiếp lên thân nam)*.
- **Nữ (`female`)**: `shirt` (Áo thun, Blouse, Camisole), `pants` (Jeans, Quần tây, Quần short), `bra` (Cổ điển, Bralette, Áo lót thể thao), `underwear` (Bikini, Cạp cao, Boyshort).
- **Bảng 8 màu chuẩn**: Hồng (`#FF6B9D`), Trắng kem (`#FFF5EC`), Đỏ rượu (`#7A1F2B`), Đen (`#19151A`), Navy (`#263A67`), Xanh ngọc (`#2A9D8F`), Tím (`#7950A8`), Vàng (`#D4AF37`).
- **Thứ tự lớp bắt buộc (`getRemovableGarmentSlots`)**:
  - `shirt` và `pants`: luôn cởi được trước.
  - `bra`: **chỉ cởi được khi không còn `shirt`**.
  - `underwear`: **chỉ cởi được khi không còn `pants`**.

### 5.2. Các hiệu ứng trang phục (`ClothingEffect`)
1. `remove_garment` (`target: 'self' | 'opponent'` trên bài thường; `'male' | 'female' | 'both'` trên Tư thế): Mở dialog chọn món đồ hợp lệ. Nếu `target === 'both'`, mở `DualGarmentRemovalDialog` xác nhận nguyên tử cho cả hai người.
2. `swap_garments`: Mở `GarmentSwapDialog` — trao đổi nguyên tử 1 món đồ hợp lệ từ mỗi người (cho phép khác slot; nếu người nhận đang có đồ ở slot đó thì món cũ bị thay thế và ghi nhận `action: 'replaced'`).

> **Mục tiêu**: mọi món đồ đều được cởi **qua lá bài** trong Tim Hồng; Bộ Tư thế chỉ mở khi cả hai đã cởi hết.
> Mô phỏng 1.500 ván: lần cởi đầu tiên ở trung vị **28%** (p10: 23%), cả hai còn nội y ở trung vị **79–80%**; mỗi ván ≈ 4,6–4,8 lần cởi theo lịch + 1,6 lá cởi đồ cố định + 0,6 lần phạt.

1. **Clothing Journey (`clothingJourney.ts`)**:
   - 6 cửa sổ thân mật: `[20–35]`, `[35–50]`, `[50–65]`, `[60–75]`, `[75–88]`, `[85–97]`, yêu cầu tối thiểu `2` lượt kể từ lần cởi đồ gần nhất (`turnsSinceClothing >= 2`).
   - 5 mức cường độ trang phục (`C1..C5`) với cửa sổ thân mật tương ứng (`C1: 20–40`, `C2: 35–55`, `C3: 50–70`, `C4: 65–85`, `C5: 80–100`, biên độ linh hoạt `±15%`), nhưng **không lá cởi đồ cố định nào xuất hiện trước 20%** (`FIXED_CLOTHING_MIN_PERCENT`).
   - Cấm lá `both` ở `< 20%`. Các ưu tiên (nhóm đồ đang tới lượt, cân bằng lần cởi đầu `firstRemoval`) chỉ còn là hệ số nhân trong tầng sao (xem 4.4), không lọc cứng pool nữa.
2. **Dynamic Clothing Scheduler (`dynamicClothingScheduler.ts`)**:
   - Khởi tạo lúc bắt đầu ván dựa trên danh sách đồ hiện có của 2 người (`count0 + count1`), tách thành **2 giai đoạn theo lớp đồ** và đan xen luân phiên Nam ↔ Nữ (`interleaveTargets`):
     - **Lớp đồ ngoài (`shirt`, `pants`)**: rải phân tầng trong khoảng **`22% – 76%` Thân mật** (không bao giờ cởi trước `20%`).
     - **Lớp nội y (`bra`, `underwear`)**: rải phân tầng trong khoảng **`76% – 93%` Thân mật** (Emergency Catch-Up tại `≥ 88%`).
   - Khi đến mốc kích hoạt, `GameTable` **ưu tiên rút lá `Dare`** và chỉ gắn `clothingEffect: remove_garment` vào lá `Dare` chưa có hiệu ứng (tuyệt đối **không gắn vào câu hỏi `Truth`**). Nội dung lá giữ nguyên; mặt lá hiện dải **"Kèm theo: …"** cho biết ai cởi.
   - Lá Standard `remove_garment` với `target: 'both'` = **mỗi người cùng bỏ 1 món** (2 món/lá).
   - Mọi lần cởi đồ ngoài lịch trình (lá có `clothingEffect` cố định, cởi đôi `both`, hoặc cởi do **luật phạt `penalty`**) đều gọi `consumeScheduledRemoval` để trừ trực tiếp vào lịch trình chờ của người đó, không bao giờ đòi cởi vượt số đồ.
   - Nếu lượt bị bỏ qua (`skipped`) hoặc đổi bài (`rerolled`), mốc kích hoạt được lùi lại `+5%` (`SKIPPED_REMOVAL_DELAY_PERCENT`) để không ép cởi ngay lượt kế tiếp.

---

## 6. Chuyển Pha Đồng Thuận & Giai Đoạn 2: Bộ Tư Thế (`position` / Luxury)

### 6.1. Điều kiện mở khóa & Pha `position_consent`
1. Thanh Tim Hồng đạt **100%** và **cả hai đã cởi hết (`'empty'`)** → chuyển sang `position_consent` (nếu còn đồ, tiếp tục Standard ở mốc 100% với yêu cầu cởi nốt — kể cả khi lượt bị bỏ qua).
2. **Xác nhận đồng thuận một lần** ở đầu pha Tư thế (không lặp lại popup đồng thuận ở từng lá).
3. **Chuẩn bị trang phục (`source: 'preparation'`)**:
   - Trước khi rút Tư thế, cả hai bắt buộc bỏ hết các món đồ đã chọn theo đúng thứ tự lớp.
   - Sự kiện `preparation` **không cộng sao, không cộng thân mật, không tính là luật phạt**, và **không ghi đè outfit mặc định** của ván sau.
   - Có thể hủy bất kỳ lúc nào để kết thúc ván ở mốc Tim Hồng 100% (`pink_complete`).
   - Selector Tư thế vẫn kiểm tra lại `outfits.every(o => getOutfitStage(o) === 'empty')` ở runtime để đảm bảo an toàn.

### 6.2. Thang sao Tư thế (`6★ – 10★`) & Đường cong Luxury
*(Schema v2 tự động migrate các bản lưu cũ `1..5★` → `6..10★` qua `positionStarMigration.ts`)*

#### Cấu hình mặc định trong mã nguồn (`DEFAULT_LUXURY_PROGRESSION_CONFIG`)
| Mốc Luxury | 6★ | 7★ | 8★ | 9★ | 10★ | Have Sex (`finalCardChance`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **0 – 19%** | 65% | 35% | 0% | 0% | 0% | 0% |
| **20 – 39%** | 30% | 50% | 20% | 0% | 0% | 0% |
| **40 – 59%** | 10% | 35% | 45% | 10% | 0% | 0% |
| **60 – 79%** | 0% | 15% | 45% | 40% | 0% | 0% |
| **80 – 99%** | 0% | 10% | 30% | 60% | 0% | **5%** (độc lập) |
| **100%** | — | — | — | — | — | **100%** (mở màn chọn Have Sex) |

- **Điểm cộng Luxury mặc định (`starGains`)**: `6★ = +9%`, `7★ = +10%`, `8★ = +11%`, `9★ = +12%`, `10★ = 0%` → khoảng **10 lá Tư thế** mỗi ván (mô phỏng: trung bình 10,4; p10–p90: 10–11).
- **Không đặt trọng số cho 10★ trong bảng**: lá kết thúc được chọn theo `family === 'have_sex'`, không theo sao.
- **Cấu hình đang chạy lưu trên cloud** (staging: gains `7/8/9/10`, band `80–99%` có `10★:25`) — nên cập nhật trong Admin theo bảng trên để khớp nhịp ~70 phút.
- **Bộ kiểm tra cấu hình (`validateProgressionConfig` & `validateLuxuryProgressionConfig`)**: Hiển thị cảnh báo trực tiếp trong `ProgressionConfigModal` khi Admin cấu hình đường cong sao/Dare bị lùi nhiệt giữa các mốc, đặt trọng số vào bậc sao không có thẻ, hoặc đặt điểm cộng Luxury quá cao làm hẹp cửa sổ 80–99%.
- Tư thế **không** nhận bonus cởi đồ (`removalApplied = 0`).

### 6.3. Logic rút lá Tối Thượng (`Have Sex`)
- **Phân loại theo `family === 'have_sex'`**, không dựa vào số sao (một lá Tư thế thường vẫn có thể là `10★`, và lá `have_sex` có thể có sao từ `7★–10★`).
- **Không có `clothingEffect` và không có `gameplayEffect`**.
- **Tại 80–99% Luxury**: kiểm tra xác suất `finalCardChance` (mặc định **5%**) độc lập với bảng sao. Nếu trúng → mở **màn chọn lá cuối**; nếu không → rút Tư thế thường (`family !== 'have_sex'`).
- **Tại 100% Luxury**: luôn mở màn chọn lá cuối. Nếu không còn lá `have_sex` hợp lệ, trả về `missing_final` và cho kết thúc an toàn.
- **Màn chọn lá cuối (`selectFinalChoiceCandidates`)**:
  - Úp **3 lá Have Sex khác nhau**; mọi lá có cơ hội như nhau (không phụ thuộc sao), **ưu tiên lá tài khoản chưa mở** (lá đã mở giữ 10% trọng số khi còn lá chưa mở).
  - Cặp đôi chọn 1 lá úp để lật. Muốn xem trước: tiêu **10★ lật 2 lá** hoặc **20★ lật cả 3** (đã lật 2 thì nâng lên 3 chỉ thêm 10★), rồi chọn 1 lá.
  - Sao trả từ **ví chung**: trừ người đang tới lượt trước, thiếu thì trừ tiếp người kia (`spendSharedStars`, sự kiện `final_card_flips`).
  - Mỗi ván chỉ mở đúng **1 lá Have Sex**. Admin được cảnh báo nếu catalog có ít hơn 3 lá Have Sex; tài khoản không thể xóa Have Sex xuống dưới 3 lá.
- **Rút Tư thế thường (`pickBalancedPositionCard`)**: sau khi chọn bậc sao, chọn **nhóm tư thế** rút ít nhất trong ván (trọng số `1/(1+số lần đã rút)²`), rồi ưu tiên lá chưa mở của tài khoản. Mô phỏng: Oral cùng nhau 23,5% · Oral (nam làm) 22,5% · Oral (nữ làm) 20,2% · Hand ~32% gộp.
- **Fallback bậc sao tự động**: Nếu band Luxury hiện tại có trọng số = 0 cho mọi bậc sao đang có trong pool ứng viên (hoặc `chooseWeighted` trả `null`), `selectLuxuryPositionCard` tự động chọn bậc sao gần nhất còn thẻ thay vì báo lỗi `no_positive_weight`.
- **Thống kê Tư thế (`PositionSessionStats`)**: Tách bạch 4 chỉ số `drawn` (đã rút), `opened` (đã mở nội dung), `completed` (hoàn thành), `skipped` (bỏ qua).

---

## 7. Hệ Thống Ví Sao & Kỹ Năng Chiến Thuật (`rewards.ts`)

- **Kiếm sao**: Ở giai đoạn Tim Hồng (`standard`), mỗi khi hoàn thành 1 thẻ, người rút nhận số sao bằng đúng bậc sao của thẻ đó (`1★` → `+1★`, ..., `5★` → `+5★`).
- **2 Kỹ năng tiêu sao**:
  1. **Đổi Bài (`reroll`) — Chi phí `8★`**:
     - Dùng khi đã rút lá bài nhưng không muốn làm (tối đa **1 lần/lượt**, `activeCardWasRerolled`).
     - Không tính là "Bỏ qua", không bị phạt trang phục, không mở khóa lá cũ và loại cứng lá cũ khỏi lượt đổi.
  2. **Tăng Độ Khó (`difficulty_boost`) — Chi phí `10★`**:
     - Kích hoạt khi đang ở trạng thái `idle` (trước khi rút), áp dụng lên **lượt rút kế tiếp của đối phương** (mỗi người tối đa 1 lượt tăng khó đang chờ).
     - Dịch chuyển toàn bộ trọng số sao của lượt đó lên bậc sao khả dụng cao hơn kế tiếp.
     - **Hoàn trả tự động**: Nếu Tim Hồng chạm 100% khi vẫn còn `pendingDifficultyBoosts` chưa tiêu thụ, hệ thống tự động hoàn lại `10★` cho chủ sở hữu (`refunded_difficulty_boost`).
     - Nút chỉ hiện khi người chơi đủ sao (hoặc đang có lượt tăng khó chờ).
  3. **Lật lá Have Sex (`final_card_flips`) — `10★` (2 lá) / `20★` (3 lá)**: dùng ví chung ở màn chọn lá cuối (xem 6.3).

---

## 8. Vận Hành, Triển Khai & Kiểm Thử

### 8.1. Lệnh phát triển & kiểm thử
```powershell
npm install
npm run dev                  # Vite local tại http://localhost:3000 (dữ liệu cục bộ)
npm run build                # Build production vào dist/
npm run cf:migrate:local     # Áp migration D1 local
npm run dev:cloud            # Chạy đầy đủ Pages Functions tại http://localhost:8788
npm run lint                 # Kiểm tra TypeScript (tsc --noEmit)
npm test                     # Chạy toàn bộ 19 bộ unit/integration test (kể cả drawAudit, accountCatalog, expansionCards)
npx tsx scripts/simulate-journey.ts --runs=1500   # Mô phỏng Monte Carlo nhịp ván (Tim Hồng → Tư thế → Have Sex)
```

### 8.2. Đồng bộ Catalog & Backup / Restore
- Tạo snapshot local từ file backup: `npm run catalog:materialize -- C:\path\to\backup.todbackup.zip`
- Kéo catalog + ảnh mới nhất từ staging: `npm run catalog:pull` (hoặc truyền origin tùy chọn)
- Import/Restore cloud: `python scripts\import_catalog.py <file.todbackup.zip> --base-url <url> [--apply] [--replace]` (tự tạo snapshot `pre_restore` trước khi ghi đè).
- **Backup tự động**: Worker cron chạy `0 17 * * *` UTC (daily giữ 30 ngày, Chủ nhật giữ 12 tuần). Mỗi mutation tăng `datasetRevision` và lưu before/after trong `catalog_revisions`. Ảnh mirror sang bucket backup trước khi commit metadata D1.
- **CI/CD**: `.github/workflows/deploy-staging.yml` tự động chạy TypeScript check, test, build và deploy `staging.true-or-dare-couples.pages.dev` khi `main` có commit mới (dùng secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`).

### 8.3. Bảo mật nội dung thẻ & Tối ưu hiệu năng
- **Bảo mật nội dung thẻ 2 lớp**:
  1. *DOM Content Guard*: Khi `isRevealed === false`, không đưa `card.content`, `hint`, `icon` vào DOM/React tree để ngăn xem trước qua DevTools.
  2. *Bundle Obfuscation*: Production build dùng `vite-plugin-obfuscator` (`javascript-obfuscator`) mã hóa chuỗi trong `cards.ts` (`stringArray`, base64).
- **Nguyên tắc tối ưu hiệu năng**:
  - Gộp tính toán rút bài qua `getJourneyDrawAnalysis` (tránh lọc candidate pool 2 lần); chỉ gọi `getLuxuryDrawProbabilities` khi đang ở pha `position`.
  - Ổn định reference (`useMemo` cho `allCards`, `availableCards`, `journeySelectionOptions`) và bỏ qua `setState` khi polling trả về cùng `datasetRevision`.
  - Tách render boundary cho các state cập nhật tần suất cao (`CardTimer`, `PlayerOutfitStatus`) để không re-render toàn bộ `GameTable`.

---

## 9. Bộ Thẻ Mở Rộng & Khung Thẻ Chờ Nội Dung (`src/data/expansionCards.ts`)

### 9.1. Lá cởi đồ hoàn chỉnh (9 lá, chơi được ngay)
Bổ sung để mọi món đồ được cởi bằng lá bài thật, không chỉ dựa vào dải "Kèm theo":

| Sao | Lá | Đối tượng cởi | Cường độ |
| :---: | :--- | :--- | :---: |
| 2★ | `x-cloth-2-01`, `x-cloth-2-03` | Đối phương | C1 |
| 2★ | `x-cloth-2-02` | Tự cởi | C1 |
| 3★ | `x-cloth-3-01` | Cả hai (mỗi người 1 món) | C2 |
| 3★ | `x-cloth-3-02` / `x-cloth-3-03` / `x-cloth-3-04` | Đối phương / Tự cởi / Cả hai | C3 |
| 4★ | `x-cloth-4-01` / `x-cloth-4-02` | Đối phương / Tự cởi | C4 |

### 9.2. Khung thẻ (64 khung — Admin chỉ cần viết nội dung và thêm ảnh)
- Mỗi khung đã có sẵn **bộ bài, loại thẻ, mức độ, số sao, lượt Nam/Nữ, nhóm tư thế, biểu tượng**. Nội dung bắt đầu bằng `[KHUNG]` kèm gợi ý hướng viết.
- Khung **không bao giờ xuất hiện với người chơi** (`withoutCardFrames`) cho tới khi Admin sửa nội dung (xóa `[KHUNG]`). Trong Admin, tab **"▢ Khung chưa điền"** liệt kê các khung còn trống.
- **Standard (47 khung)**: Dare 1★ (4 cả hai / 4 nam / 4 nữ), Dare 2★ (1 / 4 / 4), Dare 3★ (2 / 5 / 5), Dare 4★ (0 / 2 / 2), Truth 1★ dạng "đoán ý người ấy" (10 cả hai).
- **Tư thế (17 khung)**: Oral cùng nhau 6★×2, 7★×2, 8★×1 · Oral (nam làm) 6★×2, 7★×1, 8★×1 · Oral (nữ làm) 7★×2, 8★×1, 9★×1 · Hand (nam làm) 6★×1, 7★×1, 8★×2. Ghi tên tư thế vào ô Gợi ý, mô tả 2–3 bước ngắn và thêm ảnh minh họa.

### 9.3. Bộ thẻ riêng của tài khoản (Bộ sưu tập)
- Người chơi đã đăng nhập có thể **thêm thẻ riêng** (kèm ảnh lưu riêng tư), **sửa thẻ của mình**, **xóa thẻ chung khỏi bộ của mình**, xem lại và **khôi phục** từng thẻ đã xóa.
- Nút **"Khôi phục bộ thẻ mặc định"** (có xác nhận) đưa bộ thẻ về như ban đầu nhưng giữ tiến trình thẻ đã mở.
- Thay đổi của một tài khoản không ảnh hưởng tài khoản khác hay catalog chung.
