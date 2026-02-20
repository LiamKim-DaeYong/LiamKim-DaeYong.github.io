export const SITE = {
  website: "https://liamkim-daeyong.github.io", // replace this with your deployed domain
  author: "라프",
  profile: "https://github.com/LiamKim-DaeYong",
  desc: "여러 주제를 직접 다뤄보며, 코드와 구조에서 확인한 내용을 정리합니다.",
  title: "라프의 실험일지",
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
