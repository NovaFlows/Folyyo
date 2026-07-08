import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function putJson(key: string, data: unknown): Promise<void> {
  await R2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: "application/json",
    })
  );
}

export async function getJson<T = unknown>(key: string): Promise<T> {
  const res = await R2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const text = await res.Body!.transformToString();
  return JSON.parse(text) as T;
}

export async function putFile(key: string, body: Buffer, contentType: string): Promise<void> {
  await R2.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  const res = await R2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function deleteObject(key: string): Promise<void> {
  await R2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// Key helpers
export const keys = {
  sourceCode: (portfolioId: string) => `portfolios/${portfolioId}/code.json`,
  version:    (portfolioId: string, num: number) => `portfolios/${portfolioId}/versions/${num}.json`,
  cv:         (userId: string, portfolioId: string) => `cvs/${userId}/${portfolioId}.pdf`,
};
