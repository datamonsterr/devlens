# Báo Cáo Công Việc: Developer Team Member View (Devlens)

Tài liệu này ghi lại toàn bộ các công việc và chỉnh sửa đã được thực hiện đối với repository `devlens` trong phiên làm việc vừa qua. Mục tiêu chính là tạo ra một giao diện tối giản, an toàn cho đối tượng người dùng "Team Member / Developer", giấu đi các tính năng quản trị của Manager.

## 1. Cấu trúc UI & Điều hướng (Phases 1-3)
- **Cập nhật `Sidebar.js`**: 
  - Đã phân tách menu điều hướng thành 2 nhóm rõ ràng cho Developer và Manager. 
  - Các Developer chỉ nhìn thấy các mục: `Endpoint`, `API Keys`, `Combos`, `Models`, `Usage`, `CLI Config`, `Console Log`, và `Account`.
  - Đã ẩn hoàn toàn nút tắt server (`Shutdown`), mục cấu hình hệ thống (Translator, Skills) và các tab quản trị (Providers, Pricing, RTK Pool, Team) khỏi UI của Developer.
- **Tạo `RoleGuard` component**: Đã áp dụng `RoleGuard` để bảo vệ các route (trang) phía Frontend. Nếu Developer cố tình nhập URL truy cập vào các trang dành riêng cho Manager (như `/dashboard/providers`, `/dashboard/team`, `/dashboard/pricing`...), hệ thống sẽ chặn và chuyển hướng họ về trang chủ an toàn.

## 2. Rà soát & Phân quyền chi tiết trên từng trang (Phases 4-5)
- **Trang Combos (`combos/page.js`)**: 
  - Cấu hình lại giao diện thành **chỉ xem (Read-only)** đối với Developer. 
  - Các nút tạo (Create), sửa, xóa, và nút cấu hình Round-robin đã bị giấu đi hoàn toàn. 
  - Bổ sung thêm một huy hiệu "Read-only" (có icon con mắt) cạnh tiêu đề trang để Developer nhận biết được giới hạn quyền hạn của mình.
- **Trang Endpoint (`endpoint/EndpointPageClient.js`)**: 
  - Giấu đi các thiết lập phức tạp và nhạy cảm như: Cấu hình Cloudflare Tunnel, Cấu hình bật/tắt yêu cầu API Key toàn cục, tính năng nén Token Saver (RTK & Caveman).
  - Developer chỉ thấy thông tin cần thiết: URL Endpoint Local, danh sách API Keys do chính họ tạo ra và đoạn code mẫu CLI Snippet để tích hợp.

## 3. Củng cố bảo mật Backend API (Phase 6)
Không chỉ chặn trên giao diện, tất cả các API nhạy cảm đã được bọc lại bằng các hàm kiểm tra phân quyền (Auth guards) để tránh trường hợp gọi API thủ công:
- **Áp dụng `requireTeamContext()` (Developer có thể truy cập nhưng bị giới hạn dữ liệu cá nhân)**:
  - `GET /api/usage/stats`
  - `GET /api/usage/logs`
  - `GET /api/usage/history` *(Lưu ý: đã fix lỗi không truyền tham số lọc)*
  - `GET /api/usage/chart`
  - `GET /api/usage/stream`
  - `GET /api/usage/request-details`
  - `GET /api/usage/request-logs`
  - `GET /api/pricing` (Dùng để Client tính toán chi phí token).
- **Áp dụng `requireManagerContext()` (Chỉ Manager mới được gọi API này)**:
  - `GET /api/usage/providers`
  - `GET /api/usage/[connectionId]`

## 4. Fix lỗi kiến trúc phân quyền (Auth/Role Bugfix)
- **Mô tả lỗi**: Tài khoản Manager (được tạo qua luồng Onboarding) bị mất hiển thị mục `Team` do Clerk lưu quyền "manager" vào trường `unsafeMetadata`. Ngược lại, tính năng mời Developer lại ghi quyền vào `publicMetadata`.
- **Cách xử lý**: Đã can thiệp và sửa lại logic tại `useRole.js` (Client-side) và `auth.js` (Server-side) để hệ thống tự động kiểm tra cả 2 vùng nhớ `publicMetadata` và `unsafeMetadata`. Kết quả là các Manager đã được khôi phục quyền quản trị đầy đủ.

## 5. Xác thực (Verification)
- Đã chạy lệnh `npm run build` thành công, xác nhận toàn bộ project không có lỗi biên dịch.
- Đã restart lại server dev (`npm run dev`) trên cổng `20128` để test toàn bộ luồng sử dụng.

## 6. Cập nhật cấu hình phụ trợ
- Tạo mới/Chép đè file cấu hình cho AI Agent: `opencode.json`.
- Cập nhật `baseURL` trong `opencode.json` thành `https://rcn7stl.abc-tunnel.us/v1` theo yêu cầu cấu hình tunnel mới nhất.
