import { PassThrough } from "stream";

import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import type { UploadHandler } from "@remix-run/node";
import { writeAsyncIterableToWritable } from "@remix-run/node";

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  S3_STORAGE_BUCKET,
  S3_STORAGE_REGION,
} = process.env;

if (
  !(
    AWS_ACCESS_KEY_ID &&
    AWS_SECRET_ACCESS_KEY &&
    S3_STORAGE_BUCKET &&
    S3_STORAGE_REGION
  )
) {
  throw new Error(`Storage is missing required configuration.`);
}

const uploadStream = ({ Key }: Pick<PutObjectCommandInput, "Key">) => {
  const client = new S3Client({ region: S3_STORAGE_REGION });
  const pass = new PassThrough();
  return {
    writeStream: pass,
    promise: new Upload({
      client,
      params: {
        Body: pass,
        Bucket: S3_STORAGE_BUCKET,
        Key,
      },
    }).done(),
  };
};

export async function uploadStreamToS3(data: any, filename: string) {
  const stream = uploadStream({
    Key: filename,
  });
  await writeAsyncIterableToWritable(data, stream.writeStream);
  const file = await stream.promise;

  if ('Location' in file) {
    return file.Location;
  }

  throw new Error('Upload to S3 aborted');
}

export const s3UploadHandler: UploadHandler = async ({
  name,
  filename,
  data,
}) => {
  if (name !== "img") {
    return undefined;
  }
  const uploadedFileLocation = await uploadStreamToS3(data, filename!);
  return uploadedFileLocation;
};
