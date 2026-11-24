import { verifySession } from "./wu03-live-session.mjs";
try { console.log(JSON.stringify(await verifySession())); }
catch { console.error(JSON.stringify({verdict:"FAIL",reason:"Session verification or cleanup failed; inspect isolated configuration and revoke test sessions if needed"})); process.exitCode=1; }
