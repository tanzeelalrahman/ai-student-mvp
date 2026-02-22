export async function GET() {
  return Response.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    grokKeyExists: !!process.env.XAI_API_KEY,
  })
}