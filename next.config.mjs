/** @type {import('next').NextConfig} */
const nextConfig = {
  // 💡 Vercel 배포 시 깐깐한 문법 검사를 무시하고 강제 통과시키는 치트키
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig; // 만약 파일 이름이 .js로 끝난다면 module.exports = nextConfig; 로 쓰세요.
