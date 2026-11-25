/**
 * Questions of the "Đoán ý" event turn. Both players pick an answer in secret; the same
 * pick earns stars. `{p1}` and `{p2}` become the players' names.
 */
export interface MatchQuestion {
  id: string;
  /** Tim Hồng milestone the question belongs to: the tone warms up with it. */
  milestone: 25 | 50 | 75;
  text: string;
  options: readonly string[];
}

export const MATCH_QUESTIONS: readonly MatchQuestion[] = [
  // 25%: light and sweet
  { id: 'm25-evening', milestone: 25, text: 'Buổi tối hợp với hai mình nhất?', options: ['Nấu ăn ở nhà', 'Xem phim trong chăn', 'Dạo phố đêm', 'Đi thật xa một chuyến'] },
  { id: 'm25-gesture', milestone: 25, text: 'Cử chỉ nhỏ nào làm hai mình mềm lòng nhanh nhất?', options: ['Nắm tay bất chợt', 'Ôm từ phía sau', 'Nhắn tin giữa ngày', 'Xoa đầu'] },
  { id: 'm25-memory', milestone: 25, text: 'Ai nhớ những ngày kỷ niệm giỏi hơn?', options: ['{p1}', '{p2}', 'Cả hai cùng hay quên'] },
  { id: 'm25-dayoff', milestone: 25, text: 'Nếu mai được nghỉ, hai mình sẽ làm gì?', options: ['Ngủ nướng tới trưa', 'Đi ăn sáng thật ngon', 'Ở lì trong phòng', 'Xách xe đi đâu đó'] },
  { id: 'm25-first', milestone: 25, text: 'Điều đầu tiên hai mình để ý ở nhau?', options: ['Ánh mắt', 'Nụ cười', 'Giọng nói', 'Cách nói chuyện'] },
  { id: 'm25-peace', milestone: 25, text: 'Giận nhau xong, ai hay làm hòa trước?', options: ['{p1}', '{p2}', 'Cùng lúc'] },
  { id: 'm25-gift', milestone: 25, text: 'Món quà hai mình thích nhận nhất?', options: ['Thời gian bên nhau', 'Một lời thật lòng', 'Một cái ôm lâu', 'Món đồ bất ngờ'] },
  { id: 'm25-fit', milestone: 25, text: 'Hai mình hợp nhau nhất ở điểm nào?', options: ['Cùng hay cười', 'Biết lắng nghe', 'Cùng thích phiêu lưu', 'Ở yên bên nhau cũng vui'] },

  // 50%: flirty
  { id: 'm50-kiss', milestone: 50, text: 'Nụ hôn hợp với lúc này nhất?', options: ['Lên trán', 'Lên môi, thật lâu', 'Lên cổ', 'Lên mu bàn tay'] },
  { id: 'm50-shiver', milestone: 50, text: 'Chạm vào đâu dễ làm hai mình rùng mình nhất?', options: ['Gáy', 'Eo', 'Lòng bàn tay', 'Vành tai'] },
  { id: 'm50-mood', milestone: 50, text: 'Không khí hai mình muốn ngay bây giờ?', options: ['Đèn mờ hơn', 'Nhạc chậm', 'Im lặng nghe nhịp thở', 'Nghe lời ngọt ngào'] },
  { id: 'm50-lead', milestone: 50, text: 'Tối nay ai sẽ chủ động hơn?', options: ['{p1}', '{p2}', 'Thay phiên nhau'] },
  { id: 'm50-whisper', milestone: 50, text: 'Hai mình muốn nghe gì bên tai nhất?', options: ['Một lời khen', 'Một lời yêu', 'Một điều bí mật', 'Một câu trêu'] },
  { id: 'm50-hug', milestone: 50, text: 'Một cái ôm hoàn hảo kéo dài bao lâu?', options: ['Mười giây', 'Một phút', 'Tới khi thở cùng nhịp', 'Không buông'] },
  { id: 'm50-blush', milestone: 50, text: 'Nghe lời tán tỉnh, ai đỏ mặt trước?', options: ['{p1}', '{p2}', 'Cả hai cùng đỏ'] },
  { id: 'm50-outfit', milestone: 50, text: 'Thấy người kia mặc gì là quyến rũ nhất?', options: ['Áo sơ mi', 'Đồ ngủ', 'Chiếc áo rộng mượn của nhau', 'Không mặc gì cả'] },

  // 75%: sensual
  { id: 'm75-pace', milestone: 75, text: 'Nhịp độ hai mình muốn lúc này?', options: ['Thật chậm', 'Dịu rồi nhanh dần', 'Bất ngờ', 'Để người kia dẫn'] },
  { id: 'm75-melt', milestone: 75, text: 'Điều gì làm hai mình tan chảy nhất?', options: ['Hơi thở sát tai', 'Ánh nhìn thật lâu', 'Bàn tay dọc sống lưng', 'Nụ hôn sâu'] },
  { id: 'm75-touch', milestone: 75, text: 'Hai mình muốn được vuốt ve thêm ở đâu?', options: ['Cổ và vai', 'Lưng', 'Bụng và eo', 'Đùi'] },
  { id: 'm75-light', milestone: 75, text: 'Ánh sáng hợp với phần tiếp theo?', options: ['Tắt hết đèn', 'Ánh nến', 'Đèn ngủ', 'Đủ sáng để nhìn nhau'] },
  { id: 'm75-more', milestone: 75, text: 'Ai sẽ nói “tiếp đi” trước?', options: ['{p1}', '{p2}', 'Cùng một lúc'] },
  { id: 'm75-after', milestone: 75, text: 'Sau ván này hai mình sẽ làm gì?', options: ['Ôm nhau ngủ', 'Tắm cùng nhau', 'Ăn khuya', 'Nói chuyện tới sáng'] },
  { id: 'm75-wish', milestone: 75, text: 'Hai mình muốn gì hơn nữa ở nhau lúc này?', options: ['Nói nhiều hơn', 'Hôn nhiều hơn', 'Chậm lại', 'Táo bạo hơn'] },
  { id: 'm75-moment', milestone: 75, text: 'Khoảnh khắc đáng nhớ nhất tối nay?', options: ['Lá đầu tiên', 'Món đồ đầu tiên rơi xuống', 'Lúc cùng bật cười', 'Ngay bây giờ'] },
];
