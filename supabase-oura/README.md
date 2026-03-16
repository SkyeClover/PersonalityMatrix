# Oura OAuth callback (Supabase Edge Function)

Deploy this function to handle Oura OAuth for the Personality Matrix app. Tokens are passed back in the URL fragment; nothing is stored on the server.

## Deploy

From this directory:

```bash
cd supabase-oura
supabase link --project-ref kqartenbpatatdkikkgj
supabase secrets set OURA_CLIENT_ID="<your-oura-client-id>"
supabase secrets set OURA_CLIENT_SECRET="<your-oura-client-secret>"
supabase secrets set OURA_REDIRECT_URI="https://kqartenbpatatdkikkgj.supabase.co/functions/v1/oura-callback"
supabase secrets set OURA_RETURN_URL="https://personalitymatrix.walkerjacob.com"
supabase functions deploy oura-callback
```

Add the Redirect URI in the Oura dashboard: `https://kqartenbpatatdkikkgj.supabase.co/functions/v1/oura-callback`
