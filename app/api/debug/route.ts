export async function GET() {
  return Response.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'NOT SET',
    VERCEL_URL: process.env.VERCEL_URL ?? 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  });
}
