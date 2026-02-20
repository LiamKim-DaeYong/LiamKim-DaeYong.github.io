export const SITE = {
  website: "https://liamkim-daeyong.github.io", // replace this with your deployed domain
  author: "Liam Kim",
  profile: "https://liamkim-daeyong.github.io",
  desc: "백엔드 개발 학습 기록",
  title: "Liam's Dev Log",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "Edit page",
    url: "https://github.com/LiamKim-DaeYong/LiamKim-DaeYong.github.io/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "ko", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Seoul", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
