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

S2 — Cứng hóa token bằng cookie HttpOnly đã xong (build pass ✅)

Refresh token (credential nguy hiểm nhất, sống dài) giờ nằm trong cookie HttpOnly mà JavaScript không đọc được; access token (ngắn hạn) chuyển khỏi localStorage vào RAM. Cả frontend, AuthService và APIGateway đều build sạch (0 lỗi, 0 cảnh báo).

Backend:
- AuthController.cs — signin/signup/refresh nay đặt refresh token vào cookie HttpOnly (Path=/api/auth, hết hạn 2 ngày khớp vòng đời refresh JWT) và xóa nó khỏi body trước khi trả về. Refresh đọc token từ cookie (fallback body để tương thích). Thêm POST /api/auth/logout để xóa cookie. Bảo mật cookie tự điều chỉnh theo môi trường: Dev = SameSite=Lax + Secure=false (http localhost); Prod = SameSite=None + Secure=true (cần HTTPS).
- APIGateway/Program.cs — CORS bắt buộc đổi từ AllowAnyOrigin() sang WithOrigins(...) + AllowCredentials() (trình duyệt chặn cookie khi origin là *). Danh sách origin đọc từ config Cors:AllowedOrigins, mặc định localhost:5173/4173. Ocelot tự chuyển tiếp Set-Cookie/Cookie nên không cần đụng route.

Frontend:
- api/tokenStore.js (mới) — giữ access token trong RAM + cờ không bí mật app_session để biết có phiên.
- axiosClient.js — bật withCredentials: true, lấy token từ RAM, tự refresh qua cookie (không gửi token trong body), dọn sạch phiên khi refresh thất bại.
- AuthContext.jsx — đăng nhập/đăng ký lưu access token vào RAM + đặt cờ phiên; khi tải lại trang gọi refresh() để lấy access token mới từ cookie; đăng xuất gọi /logout để xóa cookie.
- authApi.js, SettingsContext.jsx, LockGate.jsx — cập nhật theo cờ phiên thay cho access_token.

Lợi ích bảo mật: XSS không còn đọc được refresh token (cookie HttpOnly), và không còn token dài hạn nằm trong localStorage. Một access token bị lộ chỉ sống tối đa ~5 giờ.

Cần lưu ý khi kiểm thử:
1. Phải chạy đủ 4 thành phần: AuthService (5134), APIService (5133), APIGateway (5229), frontend (5173) — và khởi động lại các service đang chạy để nạp code mới (DLL cũ đang bị khóa sẽ phục vụ code cũ).
2. Khi deploy production: phải dùng HTTPS (vì SameSite=None yêu cầu Secure) và cập nhật Cors:AllowedOrigins theo domain thật.
3. Người dùng cũ đang có token trong localStorage: sau khi cập nhật, lần tải đầu họ sẽ phải đăng nhập lại (localStorage token không còn được đọc) — đây là hành vi mong muốn.


{Đây là hướng dẫn kiểm thử thủ công để xác nhận cả S1 (App Lock PIN) và S2 (cookie HttpOnly + access token trong RAM) đã hoạt động. Ports trong project: Gateway 5229, API 5133, Auth 5134, Frontend 5173.

Bước 0 — Khởi động lại toàn bộ (bắt buộc)

Code S2 đụng backend, mà service đang chạy giữ DLL cũ. Phải dừng hết rồi chạy lại:

! bash kill.sh          # dừng service cũ (nếu đang chạy)
! bash run.sh           # chạy lại API + Auth + Gateway + Frontend

Mở http://localhost:5173. Nếu run.sh báo cả 4 service ✅ là sẵn sàng. (Nếu muốn chạy tay: dotnet run trong 3 thư mục APIService/AuthService/APIGateway + npm run dev.)

---
Phần A — Test S1: Khóa ứng dụng bằng PIN

┌─────┬─────────────────────────────────────────────────────────────────┬──────────────────────────────────────────┐
│  #  │                            Thao tác                             │             Kết quả mong đợi             │
├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A1  │ Đăng nhập → vào Tùy chọn hiển thị → thẻ "Bảo mật — Khóa ứng     │ Toast "Đã bật khóa ứng dụng"; trạng thái │
│     │ dụng" → Thiết lập mã PIN, nhập 6 số + xác nhận                  │  chuyển "Đang bật"                       │
├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A2  │ Bấm nút khóa (ổ khóa ở góc dưới sidebar) hoặc "Khóa ngay" trong │ Màn hình PIN phủ toàn bộ, che hết dữ     │
│     │  thẻ                                                            │ liệu phía sau                            │
├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A3  │ Nhập sai PIN                                                    │ Báo "Mã PIN không đúng", ô nhập reset    │
├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A4  │ Nhập đúng PIN                                                   │ Mở khóa, quay lại đúng trang đang xem    │
│     │                                                                 │ (giữ nguyên route)                       │
├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A5  │ Chuyển sang tab khác / thu nhỏ trình duyệt rồi quay lại         │ Ứng dụng tự khóa (visibilitychange)      │
├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A6  │ Để yên không thao tác quá thời gian đã chọn (mặc định 5 phút,   │ Tự khóa do không hoạt động               │
│     │ có thể đặt 1 phút để test nhanh)                                │                                          │
├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A7  │ F5 / tải lại trang khi đã đặt PIN                               │ Vẫn ở trạng thái khóa, phải nhập PIN     │
├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A8  │ Thẻ Bảo mật → Đổi mã PIN (nhập PIN cũ + PIN mới)                │ Đổi thành công; PIN cũ không mở khóa     │
│     │                                                                 │ được nữa                                 │
├─────┼─────────────────────────────────────────────────────────────────┼──────────────────────────────────────────┤
│ A9  │ Thẻ Bảo mật → Tắt khóa (nhập PIN)                               │ Trạng thái về "Chưa bật"; tải lại trang  │
│     │                                                                 │ không còn hỏi PIN                        │
└─────┴─────────────────────────────────────────────────────────────────┴──────────────────────────────────────────┘

Kiểm tra thêm bằng DevTools (F12) → Application → Local Storage: có key app_pin_cred (chỉ chứa salt/iv/blob đã mã hóa — không thấy PIN gốc) và app_lock_timeout.

---
Phần B — Test S2: Token đã được cứng hóa

Mở DevTools (F12) trước khi đăng nhập.

B1 — Refresh token nằm trong cookie HttpOnly, không ở localStorage
1. Đăng nhập.
2. Application → Cookies → http://localhost:5229: phải thấy cookie tên refresh_token, cột HttpOnly = ✓, Path = /api/auth.
3. Application → Local Storage → http://localhost:5173: KHÔNG còn key access_token hay refresh_token. Chỉ có app_session = 1 và user_id (đây là dữ liệu không bí mật).

B2 — Access token không lộ trong response body
- Network → request signin → tab Response: trường refresh_token rỗng (""); có access_token (token này chỉ sống trong RAM của tab).
- Cũng request signin → tab Headers → Response Headers: có Set-Cookie: refresh_token=...; HttpOnly.

B3 — Mô phỏng XSS không lấy được token bí mật
Vào tab Console, gõ:
document.cookie          // KHÔNG chứa "refresh_token" (vì HttpOnly)
localStorage.access_token // undefined
localStorage.refresh_token // undefined
→ Kẻ tấn công chèn được JS cũng không đọc được refresh token.

B4 — Tải lại trang vẫn giữ đăng nhập (bootstrap từ cookie)
1. F5.
2. Network: thấy một request refresh chạy lúc tải trang, trả về access_token mới (cookie tự được gửi kèm).
3. Vẫn vào thẳng app, không bị đá ra login.

B5 — Đăng xuất xóa cookie
1. Bấm đăng xuất.
2. Network: có request logout.
3. Application → Cookies: refresh_token đã biến mất; bị chuyển về trang login.

B6 — CORS credentials hoạt động
- Trong suốt các bước trên, Console không có lỗi CORS (kiểu "Access-Control-Allow-Origin" hay "credentials"). Nếu có, kiểm tra Cors:AllowedOrigins ở Gateway có khớp origin http://localhost:5173.

---
Checklist kết luận

Bảo mật coi như hoàn thành nếu:
- ✅ A1–A9 đều đúng (PIN setup/khóa/tự khóa/đổi/tắt, giữ khóa sau reload).
- ✅ B1: refresh_token là cookie HttpOnly, không có token nào trong localStorage.
- ✅ B3: console không đọc được refresh token.
- ✅ B4: reload vẫn đăng nhập nhờ refresh qua cookie.
- ✅ B5: logout xóa cookie.

---
Hai điểm cần biết khi test:
- Người dùng cũ phải đăng nhập lại lần đầu sau cập nhật (token cũ trong localStorage không còn được đọc) — đúng thiết kế.
- Test này chạy trên HTTP localhost (cookie dùng SameSite=Lax). Khi lên production HTTPS, cookie chuyển SameSite=None; Secure — nhớ cập nhật Cors:AllowedOrigins theo domain thật, nếu không B6 sẽ báo lỗi CORS.
}

//---------------------------------------------------------------------------------------------------

Nhóm Tính sẵn sàng (A1–A3) đã triển khai xong — build pass ✅

Đã cài thêm dexie + vite-plugin-pwa và xây 3 phần offline/PWA hoàn toàn phía client. Build sạch, service worker được sinh ra (dist/sw.js, manifest.webmanifest).

A1 — PWA nền
- vite.config.ts: cấu hình VitePWA (auto-update, manifest MoneyFlow, tự đăng ký SW). Workbox chỉ precache app shell; /api/ không bao giờ bị cache (API ở origin 5229 khác origin frontend nên SW không đụng tới — tránh lộ dữ liệu tài chính dạng plaintext).
- public/pwa-icon.svg (icon cài đặt), hooks/useOnlineStatus.js, banner vàng "Đang ngoại tuyến" trong Layout.

A2 — Offline ĐỌC (cache mã hóa)
- security/keyHolder.js: khóa thiết bị AES-GCM 256-bit (lưu localStorage) + encryptJson/decryptJson. Quyết định thiết kế: khóa độc lập với PIN để cache luôn giải mã được kể cả khi chưa đặt PIN (có thể nâng cấp sang khóa-từ-PIN sau).
- db/offlineDb.js (Dexie: bảng cache + syncQueue), offline/offlineCache.js (readThrough: online → gọi API + lưu cache mã hóa; offline → đọc cache giải mã).
- Bọc các API đọc chính: giao dịch (getAll), tài khoản (getAll/getByType/getSummary), dashboard (getSummary/recent).

A3 — Offline GHI + đồng bộ
- sync/syncQueue.js: hàng đợi mã hóa, processQueue gửi lại theo FIFO khi có mạng (dừng nếu vẫn offline, bỏ mục bị server từ chối để không kẹt).
- context/SyncContext.jsx: useSync (số mục chờ, trạng thái, "đồng bộ ngay"); tự đồng bộ khi có mạng / mở app / mở khóa PIN.
- transactionApi.create: offline → đưa vào hàng đợi, trả {__offline:true}. Bốn trang Deposit/Withdrawal/Transfers/Transactions hiện toast "Đã lưu offline — sẽ đồng bộ khi có mạng". Layout có thanh "X mục chờ đồng bộ + nút Đồng bộ ngay". Đăng xuất tự dọn cache + khóa.

Cách test (quan trọng): service worker bị tắt ở dev, nên phải dùng bản build:
npm run build ; npm run preview
Mở app → đăng nhập → trong DevTools tab Network bật Offline → tạo giao dịch (thấy toast "đã lưu offline", thanh "1 mục chờ đồng bộ"), tải lại trang vẫn xem được dữ liệu (đọc từ cache mã hóa) → tắt Offline → hàng đợi tự gửi, số mục về 0.

Hai hạn chế đã biết:
1. Giao dịch tạo offline chưa hiện trong danh sách cho tới khi đồng bộ + refresh (dữ liệu vẫn an toàn trong hàng đợi mã hóa).
2. Chống tạo trùng (idempotency) phía server chưa có — nếu mạng chập chờn lúc đồng bộ, về lý thuyết một giao dịch có thể gửi 2 lần. Khắc phục triệt để cần thêm cột idempotency key ở backend (đụng DB) — nằm ngoài phạm vi client-only này.

//------------------------------------------------------------------------------------------------------------------------------------------

1. Cấu hình HasPrecision (backend)
- BudgetManagementDbContext: vòng lặp đặt mọi cột decimal về precision (19,4); riêng ExchangeRate.Rate để (18,8). Trước đó EF ngầm mặc định (18,2) (kèm cảnh báo, dễ cắt số lẻ khi quy đổi ngoại tệ) — giờ rõ ràng và đã hết cảnh báo.
- Lưu ý: DB này được tạo bằng SQL script chứ không phải EF migration, nên kiểu cột thật trong DB vẫn theo DDL script. HasPrecision làm EF nhất quán + tham số đúng kiểu; muốn DB khớp tuyệt đối cần sửa DDL (ngoài phạm vi lần này).

2. Đối soát số dư (reconcile) — đây là "lưới an toàn" thực sự cho độ chính xác
- Nguồn chân lý tính lại từ sổ cái: InitialBalance + factor·Σ(Debit−Credit) (factor +1 cho Tài sản/Nợ/Chi, −1 cho Vốn/Thu — khớp đúng quy ước trong TransactionService).
- Backend: DTO ReconcileResultDto/ReconcileItemDto; repo GetAllByUserAsync + GetLedgerSumsAsync (GROUP BY trực tiếp trên Journal_Details); service ReconcileBalancesAsync(userId, repair); endpoint POST /api/accounts/reconcile?repair=false.
- repair=true sửa số dư lệch bằng cách áp UpdateBalanceAsync(delta = computed − stored).
- 4 test mới: khớp / lệch-không-sửa / sửa-đúng-delta / factor-cho-Nợ.

3. Frontend
- accountApi.reconcile(repair).
- Thẻ "Đối soát số dư" trong trang Quản trị hệ thống (/administrations): nút Kiểm tra (chỉ báo cáo) và Kiểm tra & Sửa, hiển thị danh sách ví lệch dạng số dư cũ → số dư đúng.

Cách test

Vào Cài đặt → Quản trị → thẻ Đối soát số dư → Kiểm tra. Nếu dữ liệu nhất quán sẽ báo "tất cả khớp". Để thử thấy nó bắt lỗi: sửa tay cột balance của một ví trong DB cho lệch, rồi bấm Kiểm tra (thấy ví đó liệt kê) → Kiểm tra & Sửa (số dư về đúng theo sổ cái).