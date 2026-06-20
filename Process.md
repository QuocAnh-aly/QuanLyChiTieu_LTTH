Bối cảnh đã xác minh

Kiến trúc: Frontend React SPA (Vite + Tailwind 4 + Radix/shadcn + next-themes) gọi qua APIGateway localhost:5229; Backend .NET nhiều project (Entities → Repository → Services → APIService/AuthService/APIGateway), DB SQL Server, kế toán bút toán kép (Journal_Entry + 2 Journal_Detail).

Trạng thái 5 NFR hiện tại:

┌─────────────┬─────────────┬─────────────────────────────────────────────────────────────────────────────────────┐
│     NFR     │ Trạng thái  │                                     Bằng chứng                                      │
│             │    thật     │                                                                                     │
├─────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Bảo mật     │ ❌ Chưa làm │ Token để trần trong localStorage (axiosClient.js); không có App Lock/PIN; thư mục   │
│             │             │ security/ rỗng                                                                      │
├─────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Sẵn sàng    │ ❌ Chưa làm │ Không có vite-plugin-pwa/Dexie/manifest/service worker; offline/,sync/,db/ rỗng     │
│ (Offline)   │             │                                                                                     │
├─────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Tiện dụng   │ ✅ Đã có    │ next-themes ThemeProvider attribute="class" trong App.jsx, dark: ở ~30 file         │
│ (Dark mode) │             │                                                                                     │
├─────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│             │ 🟡 Nền tảng │ Backend dùng decimal (không float); balance cộng dồn nguyên tử qua                  │
│ Chính xác   │  tốt, thiếu │ Accountrepository.UpdateBalanceAsync (delta). Nhưng: không cấu hình HasPrecision    │
│             │  đối soát   │ (EF mặc định decimal(18,2)), không có cơ chế recompute/đối soát từ sổ cái           │
├─────────────┼─────────────┼─────────────────────────────────────────────────────────────────────────────────────┤
│ Mở rộng     │ 🟡 Kiến     │ AccountType là bảng tra cứu TypeId/TypeName linh hoạt; nhưng chưa có khái niệm số   │
│ (đầu tư)    │ trúc cho    │ lượng/giá thị trường                                                                │
│             │ phép        │                                                                                     │
└─────────────┴─────────────┴─────────────────────────────────────────────────────────────────────────────────────┘

▎ ⚠️ Lưu ý quan trọng: phần Bảo mật + Offline mà các session trước báo "đã xong" không có trong codebase. Phải làm lại từ đầu.

---
Kế hoạch theo từng NFR (ưu tiên giảm dần)

1. Bảo mật (Security) — ưu tiên cao nhất

Phân làm 2 tầng: tầng nhanh (client-only, không động backend) và tầng thực sự cần backend.

Giai đoạn S1 — App Lock PIN (client-only, làm trước):
- src/app/security/pinCrypto.js: PBKDF2 dẫn xuất khóa từ PIN → AES-GCM (Web Crypto, chuẩn).
- AppLockContext: hasPin / isLocked / setupPin / unlock / lock / changePin; tự khóa theo visibilitychange + thời gian không hoạt động.
- LockScreen + LockGate bọc trong App.jsx; thẻ "Bảo mật" trong Preferences.jsx; nút "Khóa ngay" ở Layout.
- Lưu verifier (không lưu PIN gốc) trong localStorage.

Giai đoạn S2 — Cứng hóa lưu token:
- Hiện token nằm localStorage (lộ với XSS). Lựa chọn nên chốt với người dùng: chuyển refresh token sang cookie HttpOnly + SameSite (cần sửa AuthService — đụng backend) hoặc giữ client-only nhưng mã hóa access token bằng khóa từ PIN (yếu hơn). Khuyến nghị hướng cookie HttpOnly cho tài chính.

Giai đoạn S3 — Biometric (tùy chọn): WebAuthn/navigator.credentials để mở khóa bằng vân tay/Face ID, fallback về PIN.

2. Tính sẵn sàng (Availability / Offline)

A1 — PWA nền: thêm vite-plugin-pwa (precache app shell, registerType: autoUpdate), manifest + icon, useOnlineStatus, banner offline. Tuyệt đối không cache /api/ trong service worker (tránh lộ dữ liệu tài chính dạng plaintext).

A2 — Offline ĐỌC: Dexie (IndexedDB) cache cho transactions/accounts/dashboard, mã hóa AES-GCM bằng khóa từ App Lock; pattern readThrough (online → gọi API + cache; offline → đọc cache giải mã).

A3 — Offline GHI + đồng bộ: hàng đợi syncQueue (mã hóa payload), processQueue FIFO khi có mạng/khi mở khóa; toast "đã lưu offline"; thanh đồng bộ + nút "Đồng bộ ngay". Cần thêm: cột idempotency key phía backend để chống tạo trùng khi sync lại (đây là việc đụng backend — phần trước bỏ qua nên có rủi ro trùng giao dịch).

3. Tiện dụng (Usability) — gần như xong

Dark mode đã hoạt động. Việc còn lại nhỏ: kiểm tra toggle Sáng/Tối/Hệ thống trong Preferences đầy đủ chưa, rà các trang còn thiếu dark: (đặc biệt modal/chart recharts cần chỉnh màu theo theme), và đảm bảo <meta name="color-scheme"> + tránh "flash" theme khi load.

4. Tính chính xác (Accuracy)

Nền tảng đã đúng (decimal, cộng dồn nguyên tử). Bổ sung để "chính xác tuyệt đối":
- Cấu hình HasPrecision rõ ràng cho mọi cột tiền trong BudgetManagementDbContext (vd decimal(18,4) cho số tiền có quy đổi ngoại tệ; quyết định số lẻ theo nghiệp vụ). Hiện đang phụ thuộc mặc định (18,2) — quy đổi ngoại tệ có thể bị cắt số lẻ.
- Recompute/đối soát: thêm hàm tính lại Balance từ tổng Journal_Detail (initial_balance + factor·Σ(debit−credit)) làm nguồn chân lý, dùng để kiểm tra định kỳ rằng balance cộng dồn không bị lệch.
- Test hồi quy cho cộng/trừ liên tiếp và giao dịch quy đổi ngoại tệ.
- Frontend dùng JS Number (double) ở formatMoney/fmt — chỉ ảnh hưởng hiển thị; không tính toán tài chính ở client, nên giữ nguyên nhưng tránh cộng dồn nhiều bước trên client.

5. Khả năng mở rộng (Investment: Chứng khoán/Vàng/Crypto)

Kiến trúc hiện cho phép thêm AccountType mới, nhưng tài sản đầu tư khác tiền mặt ở chỗ có số lượng × giá thị trường biến động. Hướng mở rộng (thiết kế trước, làm sau):
- Entity mới InvestmentHolding (symbol, quantity, avgCost, assetClass: stock/gold/crypto) liên kết với một Account loại "Đầu tư".
- Bảng giá thị trường (MarketPrice) — tái dùng pattern ExchangeRate đã có.
- NetWorth mở rộng: cộng Σ(quantity × marketPrice) vào tài sản. Giữ nguyên quy ước kế toán hiện tại để không phá vỡ tính chính xác.

//---------------------------------------------------------------------------------------------

S1 — App Lock PIN đã triển khai xong (build pass ✅)

Tôi đã làm lại từ đầu lớp khóa ứng dụng bằng PIN, hoàn toàn phía client (không đụng backend). Build production chạy sạch.

File mới:
- src/app/security/pinCrypto.js — Web Crypto: PBKDF2 (150.000 vòng) dẫn xuất khóa AES-GCM 256-bit từ PIN. Không lưu PIN gốc; chỉ lưu verifier (một chuỗi cố định đã mã hóa). Mở khóa = thử giải mã verifier. Khóa AES được trả về để giữ trong RAM, dùng cho mã hóa offline ở các giai đoạn A2/A3 sau này.
- src/app/context/AppLockContext.jsx — useAppLock(): hasPin / isLocked / aesKey / setupPin / unlock / lock / changePin / disablePin / setAutoLockMinutes. Tự khóa khi rời tab (visibilitychange) và sau thời gian không hoạt động (mặc định 5 phút, có thể chỉnh).
- src/app/components/security/LockScreen.jsx — màn hình nhập PIN 6 số (dùng InputOTP sẵn có), tự xác minh khi nhập đủ, có nút đăng xuất dự phòng.
- src/app/components/security/LockGate.jsx — phủ màn hình khóa opaque toàn màn hình, chỉ kích hoạt khi đã đặt PIN + đang khóa + đã đăng nhập (không chặn luồng login).
- src/app/components/security/SecuritySettingsCard.jsx — thiết lập / đổi / tắt PIN + chọn thời gian tự khóa.

Đã nối dây: App.jsx (bọc AppLockProvider + LockGate), Preferences.jsx (thẻ "Bảo mật — Khóa ứng dụng"), Layout.jsx (nút khóa nhanh ở footer khi đã có PIN).

Cách kiểm thử nhanh: chạy npm run dev, đăng nhập → vào Tùy chọn hiển thị → thẻ Bảo mật → đặt PIN 6 số. Sau đó thử chuyển tab/thu nhỏ hoặc bấm nút khóa ở góc dưới sidebar → màn hình PIN xuất hiện; nhập đúng để mở. (App Lock chạy được cả ở dev, không phụ thuộc service worker.)

Lưu ý quan trọng — tôi chưa commit. Lý do session trước "mất" code là vì chỉ build cục bộ rồi không commit. Lần này nên commit ngay để khỏi lặp lại. Bạn muốn tôi tạo commit trên branch feature/qanh không?

Còn lại trong nhóm Bảo mật: S2 (cứng hóa lưu token — cần bạn chốt hướng cookie HttpOnly hay client-only) và S3 (biometric/WebAuthn). Hai phần này tôi để chờ bạn quyết trước khi làm.