import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

export async function createPresignedUpload(userId, filename, contentType) {
  const REGION = process.env.AWS_REGION;
  const BUCKET = process.env.AWS_S3_BUCKET;
  const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

  if (!REGION || !BUCKET) {
    throw new Error('Missing AWS_REGION or AWS_S3_BUCKET');
  }
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    throw new Error('Missing AWS credentials');
  }

  const s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });

  const ext = filename.split('.').pop() || 'bin';
  const key = `documents/${userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl, key };
}
