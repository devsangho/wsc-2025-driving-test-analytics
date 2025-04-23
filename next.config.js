/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['three'],
  reactStrictMode: true,
  // 향후 STL 모델을 로드하기 위한 설정
  webpack(config) {
    config.module.rules.push({
      test: /\.(stl)$/,
      use: {
        loader: 'file-loader',
        options: {
          publicPath: '/_next/static/files',
          outputPath: 'static/files',
          name: '[name].[hash].[ext]',
        },
      },
    });

    return config;
  },
};

module.exports = nextConfig; 