# Rhodes TierMaker (Vercel + React + Tailwind)

## 로컬 실행
```bash
npm i
npm run dev
```

## 배포 (Vercel)
1) GitHub에 이 폴더를 push
2) Vercel 대시보드에서 이 저장소 연결 → Deploy
3) 도메인 rhodes.kr 추가 → DNS 설정 적용 (A 76.76.21.21 / www CNAME cname.vercel-dns.com)

### API (서버리스)
- `/api/prts6?rarity=6` : PRTS에서 6성 영문명 + 대표 이미지 가져와서 JSON으로 반환
- 프론트의 App.jsx에서 버튼(“PRTS 6★ 불러오기”)이 이 API를 호출해 아이템 풀에 자동 추가
