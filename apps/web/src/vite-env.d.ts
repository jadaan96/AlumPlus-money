/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** عنوان الـ API في الإنتاج، مثال: https://api.example.com (بدون شرطة أخيرة) */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
