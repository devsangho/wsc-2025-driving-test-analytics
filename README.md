This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# 월드 솔라 챌린지(WSC) 2025 시뮬레이션

이 애플리케이션은 월드 솔라 챌린지 2025를 위한 태양광 자동차 시뮬레이션 도구입니다. 에너지 생산, 소비 및 경로 계획을 시뮬레이션하여 경기 전략을 최적화할 수 있습니다.

## 날씨 데이터 사용 안내

현재 이 애플리케이션은 2023년 8월 18일부터 9월 15일까지의 기상 데이터를 사용합니다. 2025년 및 다른 연도 시뮬레이션을 위해 다음과 같은 매핑 로직을 적용합니다:

- 2025년과 같은 미래 날짜는 동일한 월/일의 2023년 데이터를 사용합니다.
- 예를 들어, 2025년 10월 22일 시뮬레이션은 2023년 10월 22일의 기상 데이터를 사용합니다.
- 2023년 데이터가 없는 날짜는 가용한 가장 가까운 날짜의 데이터로 대체됩니다.

이 접근 방식은 연도별 기상 패턴의 일반적 유사성을 가정하며, 정확한 예측보다는 대략적인 에너지 생산 추정을 제공합니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
