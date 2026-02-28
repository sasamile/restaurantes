import { action } from "./_generated/server";
import { v } from "convex/values";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Genera una URL pre-firmada para subir el logo del restaurante a S3.
 * El cliente sube el archivo con PUT a esta URL; luego usa la publicUrl para guardar en el tenant.
 *
 * Variables de entorno en Convex Dashboard (Settings > Environment Variables):
 * - AWS_REGION (ej: us-east-1)
 * - AWS_S3_BUCKET_NAME
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 *
 * Para que la imagen se vea en el front, el bucket debe permitir lectura pública
 * (bucket policy o ACL) para los objetos en logos/*.
 */
export const generateLogoUploadUrl = action({
  args: {
    fileName: v.string(),
    contentType: v.string(),
    tenantId: v.optional(v.id("tenants")), // opcional: para namespacing (editar) o crear sin ID aún
  },
  handler: async (ctx, args) => {
    const region = process.env.AWS_REGION ?? "us-east-1";
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Configura AWS_REGION, AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY en Convex Dashboard > Environment Variables"
      );
    }

    const ext = args.fileName.includes(".")
      ? args.fileName.slice(args.fileName.lastIndexOf("."))
      : ".png";
    const safeName = args.fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .slice(0, 80);
    const key = args.tenantId
      ? `logos/${args.tenantId}/${Date.now()}-${safeName}`
      : `logos/temp/${Date.now()}-${safeName}`;

    const client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: args.contentType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return { uploadUrl, publicUrl };
  },
});
