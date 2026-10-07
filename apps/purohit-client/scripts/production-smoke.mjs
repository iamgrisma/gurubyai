import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const required=['app.json','eas.json','app/_layout.tsx','app/+html.tsx','app/index.tsx','app/discover.tsx','app/guruba/[id].tsx','app/service/[id].tsx','app/book/[serviceId].tsx','app/bookings.tsx','app/booking/[id].tsx','app/messages.tsx','app/message/[id].tsx','app/wallet.tsx','app/profile.tsx','app/locations.tsx','app/notifications.tsx','src/data/supabase.ts','src/data/contracts.ts','src/hooks/useAuth.ts','src/platform/notifications.ts','public/robots.txt','public/sitemap.xml'];
const missing=required.filter(p=>!fs.existsSync(path.join(root,p)));
if(missing.length){console.error('Missing required production files:',missing.join(', '));process.exit(1);}
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.expo','dist'].includes(e.name))continue;const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(/\.(ts|tsx|js|json)$/.test(e.name))files.push(f);}}
walk(root);
const privileged=files.filter(f=>/service_role|SUPABASE_SERVICE_ROLE|sb_secret_/i.test(fs.readFileSync(f,'utf8')));
if(privileged.length){console.error('Privileged Supabase credential reference found:',privileged.map(f=>path.relative(root,f)).join(', '));process.exit(1);}
const robots=fs.readFileSync(path.join(root,'public/robots.txt'),'utf8');
const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
if(!robots.includes('Sitemap: https://purohit.pages.dev/sitemap.xml')||robots.includes('purohit-app.pages.dev'))throw new Error('Robots sitemap URL is stale or incorrect');
if(!sitemap.includes('https://purohit.pages.dev/'))throw new Error('Sitemap domain is stale or missing');
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
if(!app.expo?.name||!app.expo?.slug||!app.expo?.scheme)throw new Error('Expo name, slug, and deep-link scheme are required');
console.log('Purohit production smoke checks passed:',required.length,'required files; SEO files/domain valid; no privileged client credential references; Expo identity/deep-link config present.');