# Talking Head Social Overlays

Skill dựng overlay cho video talking-head dọc 9:16: key text xuất hiện đúng lúc
được nhắc tới, SVG/diagram, visual template, GSAP keyframe, vùng an toàn cho
TikTok/Reels/Shorts và render GPU bằng HyperFrames.

Đây là **skill**, không chỉ là một workflow tài liệu. Nó mang theo quy trình,
schema storyboard, bộ template, font Be Vietnam Pro, animation runtime, script
scaffold và các cổng kiểm tra để agent có thể lặp lại cùng một tiêu chuẩn trên
nhiều video.

## Khả năng chính

- Giữ nguyên video và audio nguồn; ưu tiên hard link, fallback sang copy.
- Không ghi đường dẫn tuyệt đối của video nguồn vào project.
- Text và node xuất hiện tuần tự theo timestamp của lời nói.
- 23 template cho hook, chapter, network, workflow, funnel, recap, roadmap...
- Nội dung chính nằm trong dải trên, chừa `420px` phía dưới cho caption và UI.
- Font Be Vietnam Pro 600/700/800/900 được đóng gói sẵn.
- Build có schema validation, draft gate, kiểm tra overlap và số item theo template.
- HyperFrames CLI được ghim phiên bản và dùng npm cache riêng từng project.
- Render cuối bằng GPU/browser GPU ở 1080×1920, 30 fps.

## Yêu cầu

- Node.js 22 trở lên.
- FFmpeg và `ffprobe` có trong `PATH`.
- Git.
- GPU/NVENC chỉ bắt buộc cho bước render GPU; scaffold, build và check vẫn chạy
  được không cần GPU.
- Internet ở lần chạy HyperFrames đầu tiên vì CLI được tải qua `npx`.

Kiểm tra nhanh:

```bash
node --version
ffmpeg -version
ffprobe -version
git --version
```

## Cài vào Codex

Clone repo:

```powershell
git clone https://github.com/abm-dungtq/talking-head-social-overlays.git
cd talking-head-social-overlays
```

Windows PowerShell:

```powershell
$destination = Join-Path $env:USERPROFILE ".codex\skills\talking-head-social-overlays"
New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
Copy-Item -LiteralPath ".\skill" -Destination $destination -Recurse
```

macOS/Linux:

```bash
mkdir -p ~/.codex/skills
cp -R ./skill ~/.codex/skills/talking-head-social-overlays
```

Khởi động lại Codex, sau đó gọi tên skill trong prompt:

```text
Dùng talking-head-social-overlays để dựng video /path/to/video.mp4.
Phân tích transcript, lập storyboard tuần tự và chỉ render sau khi tôi duyệt preview.
```

## Cài vào Claude Code, AgentKit hoặc agent khác

Các agent đọc chuẩn `SKILL.md` chỉ cần toàn bộ thư mục `skill/` ở đúng thư mục
skills của chúng:

| Agent/runtime | Thư mục gợi ý |
|---|---|
| Claude Code | `.claude/skills/talking-head-social-overlays/` |
| AgentKit / thư mục dùng chung | `.agents/skills/talking-head-social-overlays/` |
| Codex theo user | `~/.codex/skills/talking-head-social-overlays/` |
| Runtime riêng | thư mục skills được runtime cấu hình |

Ví dụ cài ở mức project:

```bash
mkdir -p .agents/skills/talking-head-social-overlays
cp -R /path/to/repo/skill/. .agents/skills/talking-head-social-overlays/
```

Nếu agent không tự phát hiện skill, thêm vào system prompt hoặc cấu hình agent:

```text
Trước khi xử lý talking-head video, đọc đầy đủ
<đường-dẫn>/talking-head-social-overlays/SKILL.md và các reference mà file đó yêu cầu.
```

Skill có nhắc tới các companion skill HyperFrames. Nếu runtime không có các skill
đó, agent vẫn có thể dùng workflow và script đi kèm, nhưng phải tự đảm nhiệm phần
transcript, timing và review theo các file trong `skill/references/`.

## Tạo project video mới

Lệnh đa nền tảng:

```bash
node "<SKILL_DIR>/scripts/scaffold.mjs" \
  --video "/absolute/path/video.mp4" \
  --project "/absolute/path/new-project" \
  --title "Tiêu đề video" \
  --id "video-id"
```

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File "<SKILL_DIR>\scripts\scaffold.ps1" `
  -VideoPath "E:\Videos\input.mp4" `
  -ProjectDir "E:\Videos\input-social" `
  -Title "Tiêu đề video" `
  -CompositionId "input-social"
```

Thư mục đích phải mới hoặc rỗng. Script không có chế độ force và không ghi đè
project đang có dữ liệu.

## Quy trình sản xuất

1. Dùng transcript có word timestamp để lập `data/storyboard.json`.
2. Đặt từng `item.at` tại từ đầu tiên nhắc tới đúng ý đó.
3. Đổi `status` từ `draft` sang `ready` sau khi kiểm tra biên tập.
4. Build và kiểm tra:

```bash
npm run build
npm run check
```

5. Mở preview để duyệt:

```bash
npm run dev
```

6. Chỉ sau khi được duyệt mới render:

```bash
npm run render:gpu -- --output "output/final-gpu.mp4" --browser-timeout 120
```

`npm run build:draft` chỉ dùng để xem placeholder vừa scaffold, không phải đường
tắt cho production.

## Tự kiểm tra skill

```bash
node skill/scripts/self-test.mjs
```

Self-test tạo video tạm, kiểm tra scaffold, hash, quyền riêng tư, draft gate,
build và bảo vệ chống ghi đè; dữ liệu tạm được dọn sau khi hoàn tất.

## Nâng cấp

```bash
git pull
```

Sau đó copy lại thư mục `skill/` vào vị trí cài đặt. Nếu đã chỉnh skill cục bộ,
hãy commit hoặc sao lưu trước khi copy để tránh mất thay đổi.

## An toàn và quyền riêng tư

- Video MP4 trong project, output render, snapshot và npm cache đều bị `.gitignore`.
- Storyboard chỉ lưu tên file nguồn và SHA-256, không lưu đường dẫn máy.
- Scaffold từ chối thư mục không rỗng và tạo project qua thư mục tạm trước khi
  đổi tên hoàn tất.
- Video nguồn không bị sửa, trim, transcode hoặc di chuyển.

## Giấy phép

Mã và tài liệu do repo này cung cấp dùng giấy phép MIT. Font Be Vietnam Pro dùng
SIL Open Font License 1.1. GSAP dùng GSAP Standard License và không được tái cấp
phép theo MIT. Xem `skill/THIRD_PARTY_NOTICES.md`.
