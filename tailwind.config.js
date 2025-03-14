// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    // 필요한 경로 추가
  ],
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animate")],
};
