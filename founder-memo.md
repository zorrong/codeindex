# Founder Memo: Codeindex

## Thesis
`codeindex` là lớp context infrastructure cho AI coding agents. Sản phẩm này giúp agent truy xuất đúng phần codebase cần thiết với ít token hơn, từ đó giảm chi phí AI và tăng độ chính xác trên repo thực tế.

## Problem
AI agents hiện gặp một điểm nghẽn cơ bản: chúng không thiếu intelligence, chúng thiếu context retrieval đủ tốt.

Khi làm việc với codebase thật, agent thường:
- đọc quá nhiều file cho một task nhỏ
- kéo theo prompt rất dài và chi phí token tăng nhanh
- vẫn trả lời sai vì context nhiễu hoặc thiếu dependency quan trọng

Kết quả là team đang dùng AI coding nhiều sẽ gặp hai vấn đề cùng lúc: agent đắt hơn kỳ vọng và kém reliable hơn kỳ vọng.

## Solution
`codeindex` index codebase theo cấu trúc và dùng reasoning để trả về một context pack ngắn, liên quan, và dùng được ngay cho agent.

Thay vì dump cả repo vào prompt, `codeindex` giúp agent lấy:
- đúng symbol
- đúng dependency chain
- đúng file liên quan
- đúng phạm vi ngữ cảnh

Value proposition rất rõ:
- giảm token spend mỗi task
- tăng tỷ lệ agent giải quyết đúng task
- giảm thời gian agent mò codebase

## Why Now
AI coding đang dịch chuyển từ autocomplete sang autonomous agents. Khi agent trở thành workflow thực tế, context retrieval trở thành lớp hạ tầng bắt buộc.

Càng nhiều AI được dùng trong engineering:
- chi phí token càng lớn
- độ sai lệch vì thiếu context càng rõ
- nhu cầu cho một context layer độc lập càng mạnh

Đây là timing tốt để xây infrastructure thay vì chỉ build thêm một wrapper cho model.

## Target Customer
ICP ban đầu:
- AI-native engineering teams
- startup và product teams dùng Claude, Codex, Cursor hàng ngày
- codebase vừa đến lớn, nhiều module, nhiều dependency
- đã cảm thấy AI hữu ích nhưng quá đắt hoặc chưa đủ reliable

Đây không phải tool cho mọi developer ở giai đoạn đầu. Đây là tool cho những team đã có pain đủ mạnh để trả tiền cho độ chính xác và hiệu quả.

## Product Strategy
`codeindex` nên đi theo hướng devtool infrastructure, không phải chỉ là một CLI utility.

Các lớp sản phẩm hợp lý:
- local CLI cho cá nhân
- local server / MCP cho đa AI client
- self-hosted deployment cho team và enterprise
- context API cho internal agents hoặc agent platforms

MCP là lớp mở rộng quan trọng nhất vì nó cho phép phân phối qua nhiều AI system thay vì khóa vào một vendor.

## Why This Can Win
Khác biệt không nằm ở việc “có search”, mà ở:
- context quality
- token efficiency
- workflow fit với coding agents
- privacy và local-first deployment
- multi-agent, multi-client compatibility

Nếu làm đúng, `codeindex` trở thành lớp ROI rõ ràng trong AI coding stack: dùng ít token hơn để làm được nhiều task đúng hơn.

## Business Model
Các hướng thương mại hóa khả thi:
- Pro plan cho cá nhân dùng AI coding chuyên sâu
- Team plan cho shared context workflows
- Self-hosted / enterprise cho công ty có yêu cầu bảo mật
- API / infrastructure licensing cho agent products

Khách hàng không mua “index”. Họ mua:
- chi phí AI thấp hơn
- agent đáng tin hơn
- code riêng tư hơn
- năng suất kỹ sư cao hơn

## Key Risks
- Bị commoditize bởi IDE hoặc agent platform lớn
- Khó chứng minh value nếu không có benchmark rõ
- Dễ bị nhìn như utility nếu không khóa được workflow must-have

## What Must Be True
Để trở thành business thật, `codeindex` phải chứng minh được:
- token spend giảm rõ rệt
- task success rate tăng rõ rệt
- cài đặt đủ đơn giản để dùng hàng ngày
- tích hợp được với nhiều AI client qua MCP hoặc chuẩn tương đương

## Near-Term Priorities
1. Công bố benchmark: token saved, latency, task success uplift
2. Ship MCP support
3. Mở rộng multi-language support ngoài TypeScript
4. Hoàn thiện integrations cho Codex, Claude, Cursor
5. Siết product positioning quanh thông điệp: context infrastructure for coding agents

## Bottom Line
`codeindex` có tiềm năng trở thành một devtool infrastructure quan trọng trong thời kỳ AI-native software development. Nếu công ty chứng minh được ROI bằng benchmark và chiếm được lớp context retrieval trước khi thị trường bị commoditize, đây có thể là một sản phẩm có giá trị thương mại thực sự chứ không chỉ là một OSS utility.
