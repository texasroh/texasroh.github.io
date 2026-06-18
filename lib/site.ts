export const SITE_URL = 'https://texasroh.github.io'

export const AUTHOR = {
  name: 'Junhyeok Roh',
  email: 'june.roh@avomd.io',
  github: 'texasroh',
  linkedin: 'junhyeok-roh',
}

export const LANGUAGES = ['ko', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

export type Section = 'blog' | 'resume' | 'portfolio'

export const DEFAULT_LANGUAGE: Language = 'ko'

export const UI = {
  en: {
    site: {
      title: 'Junhyeok Roh',
      tagline: 'Hobby == Job',
      description: "Full-stack developer's portfolio and blog",
    },
    nav: {
      resume: 'Resume',
      portfolio: 'Portfolio',
      blog: 'Blog',
      languageToggle: '한국어',
      languageNoTranslation: 'No Korean translation - opens the Korean blog list',
    },
    resume: {
      hero: {
        name: 'Junhyeok Roh',
        role: 'Full-Stack Developer',
      },
      sections: {
        intro: 'About',
        experience: 'Experience',
        otherExperience: 'Other Experiences',
        skills: 'Skills',
        education: 'Education',
      },
    },
    blog: {
      title: 'Blog',
      description: 'Notes on this and that',
      noPosts: 'No posts yet.',
      backToList: '<- Back to list',
      readingTime: 'min read',
      views: 'views',
      series: 'In this series',
    },
    footer: {
      copyright: '© 2026 Junhyeok Roh',
    },
  },
  ko: {
    site: {
      title: '노준혁',
      tagline: '덕업 일치중인 개발자',
      description: '개발하면서 배운 것들을 기록합니다',
    },
    nav: {
      resume: '이력서',
      portfolio: '포트폴리오',
      blog: '블로그',
      languageToggle: 'English',
      languageNoTranslation: '이 글은 영어 번역이 없어 영어 블로그 목록으로 이동합니다',
    },
    resume: {
      hero: {
        name: '노준혁',
        role: 'Full-Stack Developer',
      },
      sections: {
        intro: '소개',
        experience: '경력',
        otherExperience: '기타 경험',
        skills: '기술 스택',
        education: '학력',
      },
    },
    blog: {
      title: '블로그',
      description: '이런저런 기록을 남깁니다',
      noPosts: '아직 작성된 글이 없습니다.',
      backToList: '<- 목록으로 돌아가기',
      readingTime: '분 분량',
      views: '조회',
      series: '이 시리즈의 다른 글',
    },
    footer: {
      copyright: '© 2026 Junhyeok Roh',
    },
  },
} as const

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value)
}

export function otherLanguage(lang: Language): Language {
  return lang === 'ko' ? 'en' : 'ko'
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString()
}
