declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    PORT: string;
    SESSION_SECRET: string;
    REDIS_URL: string;
    CORS_ORIGIN: string;
    AWS_S3_ACCESS_KEY_ID: string;
    AWS_S3_SECRET_ACCESS_KEY: string;
  }
}