# IMPLEMENTATION PLAN — NÂNG CẤP HỆ THỐNG TÀI KHOẢN, PHÂN PHỐI BÀI & CƠ CHẾ CỞI ĐỒ CHUẨN XÁC

> **Phiên bản**: 1.0  
> **Áp dụng cho**: `truth-or-dare-for-couples` (Web App & Backend Cloudflare Pages/D1)  
> **Mục tiêu**: Đáp ứng trọn vẹn 3 yêu cầu cốt lõi về tài khoản cặp đôi, giảm tỉ lệ lặp bài đã mở, và đảm bảo sạch đồ sau Giai đoạn 1.

---

## 1. TỔNG QUAN YÊU CẦU

1. **Tài khoản Cặp đôi ghi nhớ bài đã mở**:
   - Một tài khoản chung cho cặp đôi (Tên cặp đôi + Mã PIN 4–6 số).
   - Lưu trữ an toàn trên Cloudflare D1 Database kết hợp bộ nhớ đệm `localStorage` (Offline-first).
   - Đồng bộ danh sách bài đã mở (`unlockedCardIds`) và số lượng bài đã mở trên mọi thiết bị.

2. **Giảm 85% – 90% tỉ lệ xuất hiện lại bài đã mở khóa**:
   - Thẻ chưa từng mở khóa có trọng số chuẩn $1.0$.
   - Thẻ đã từng mở khóa bị giảm trọng số xuống $0.1$ (giảm 90% cơ hội xuất hiện).
   - Tự động fallback linh hoạt nếu hết bài mới trong nhóm sao hiện tại, đảm bảo không bao giờ bị lỗi thiếu bài.

3. **Cơ chế cởi đồ ngẫu nhiên trong Giai đoạn 1 (0% – 100% Tim hồng)**:
   - Số lần cởi đồ tương ứng chính xác với số món đồ mỗi người đang mặc (Ví dụ: Nam 3 món, Nữ 4 món ➔ Nam cởi đúng 3 lần, Nữ cởi đúng 4 lần, tổng cộng 7 lần).
   - Các mốc cởi đồ được sinh ngẫu nhiên ở bất kỳ % nào trong hành trình (Poisson/Jittered distribution từ 0% đến 95%).
   - Tự động gán hiệu ứng cởi đồ vào các lá Thách (Dare) ngẫu nhiên + bổ sung thêm các thẻ cởi đồ chuyên biệt.
   - Nếu người chơi bấm **Bỏ qua (Skip)**, bài cởi đồ sẽ được hoãn và rút lại ở 1-2 lượt kế tiếp, đảm bảo 100% kết thúc Giai đoạn 1 cả hai đều không còn quần áo.

---

## 2. KIẾN TRÚC KỸ THUẬT CHI TIẾT

### Module 1: Cloudflare D1 & API Tài khoản (`couple_accounts`)
- **Table**: `couple_accounts`
  - `id` (TEXT PRIMARY KEY)
  - `couple_name` (TEXT UNIQUE)
  - `pin_hash` (TEXT)
  - `unlocked_cards` (TEXT - JSON array ID)
  - `total_cards_opened` (INTEGER)
  - `created_at`, `last_login_at`
- **APIs**:
  - `POST /api/couple/register`
  - `POST /api/couple/login`
  - `GET /api/couple/session`
  - `POST /api/couple/sync-unlocked`
  - `POST /api/couple/logout`
- **Frontend UI**:
  - `PlayerLoginScreen.tsx` cập nhật form đăng nhập / tạo tài khoản cặp đôi sang trọng.
  - Hiển thị tiến độ: *"Đã mở X/217 lá bài"*.

### Module 2: Trọng số chống lặp bài (`cardDirector.ts` & `progression.ts`)
- Truyền danh sách `unlockedCardIds` vào `getDirectorWeights()`.
- Áp dụng hệ số phạt:
  ```ts
  const unlockPenalty = accountUnlockedCardIds.has(card.id) ? 0.1 : 1.0;
  weight *= unlockPenalty;
  ```
- Duy trì tính ngẫu nhiên nhưng ưu tiên tuyệt đối các nội dung mới lạ cho cặp đôi.

### Module 3: Bộ điều phối cởi đồ ngẫu nhiên (`dynamicClothingScheduler.ts`)
- Khởi tạo lịch trình cởi đồ dựa trên cấu hình trang phục:
  ```ts
  interface ClothingScheduleItem {
    targetPlayerIndex: 0 | 1;
    triggerIntimacyPercent: number; // sinh ngẫu nhiên từ 5% đến 92%
    status: 'pending' | 'triggered' | 'completed' | 'skipped_rescheduled';
  }
  ```
- Khi lượt chơi chạm tới hoặc vượt qua mốc trigger:
  - Nếu lá bài rút là Dare thông thường, engine tự động tiêm (inject) `clothingEffect: { kind: 'remove_garment', target: 'self' | 'opponent' }`.
  - Nếu bị Skip, lập tức chuyển sang lượt tiếp theo của người đó.
  - Khi Intimacy $\ge 95\%$, tất cả các món còn lại sẽ được kích hoạt liên tục cho đến khi sạch đồ.

---

## 3. LỘ TRÌNH THỰC HIỆN

1. **Bước 1**: Viết migration SQL `0003_couple_accounts.sql` & Endpoints API D1 trong `functions/api/[[path]].ts`.
2. **Bước 2**: Nâng cấp UI `PlayerLoginScreen.tsx` & Module đồng bộ `coupleSession.ts`.
3. **Bước 3**: Cập nhật công thức trọng số trong `cardDirector.ts` & `progression.ts`.
4. **Bước 4**: Thêm các thẻ Thách cởi đồ chuyên biệt vào `cards.ts` & `catalog.json`.
5. **Bước 5**: Xây dựng `dynamicClothingScheduler.ts` và tích hợp vào `GameTable.tsx`.
6. **Bước 6**: Chạy simulation 1.000 ván kiểm tra tính toàn vẹn và độ mượt mà.
