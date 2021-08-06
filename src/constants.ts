export const __prod__ = process.env.NODE_ENV === "production";
export const COOKIE_NAME = "struct_id";
export const FORGET_PASSWORD_PREFIX = "forget-password:";

// aws s3 variables
export const S3REGION = "ca-central-1";
export const S3BUCKET_NAME = "struct-bucket";
export const S3SIGN_EXPIRE_TIME = 600;
