import { chromium } from 'playwright';
import { startServer } from './seo/serve.mjs';
const server = await startServer(8099);
const BASE = server.url;
const res=[]; const ck=(n,p,d='')=>{res.push({n,p,d});console.log(`${p?'  PASS':'  FAIL'}  ${n}${d?'  — '+d:''}`)};
const b=await chromium.launch();
const c=await b.newContext(); const p=await c.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));

// Role page
await p.goto(`${BASE}/roles/hr-generalist/`,{waitUntil:'networkidle'}); await p.waitForTimeout(300);
ck('role page loads clean', errs.length===0, errs[0]||'');
ck('has H1', (await p.locator('h1').count())===1);
ck('title set', (await p.title()).includes('HR Generalist'), await p.title());
const ld=await p.evaluate(()=>[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)));
ck('valid JSON-LD parses', ld.length===1 && Array.isArray(ld[0]['@graph']));
ck('FAQPage schema present', JSON.stringify(ld).includes('FAQPage'));
ck('canonical set', !!(await p.locator('link[rel=canonical]').getAttribute('href')));
ck('meta description set', ((await p.locator('meta[name=description]').getAttribute('content'))||'').length>80);
ck('analytics layer on SEO page', await p.evaluate(()=>!!window.dw));
const neg=await p.locator('.callout.warn').count();
ck('negative-savings warning shown for HR', neg>=1);

// Deep link must prefill the calculator
const link=await p.locator('.cta a.btn').getAttribute('href');
ck('CTA deep-links with role+level', link.includes('role=hr')&&link.includes('level=mid'), link);
await p.goto(BASE+link,{waitUntil:'networkidle'}); await p.waitForTimeout(600);
const pre=await p.evaluate(()=>({fn:document.getElementById('p_function').value,lv:document.getElementById('p_level').value}));
ck('deep link actually prefills calculator', pre.fn==='hr'&&pre.lv==='mid', JSON.stringify(pre));

// Hub + sitemap
await p.goto(`${BASE}/roles/`,{waitUntil:'networkidle'});
ck('hub lists 12 roles', (await p.locator('tbody tr').count())===12, String(await p.locator('tbody tr').count()));
const sm=await p.goto(`${BASE}/sitemap.xml`);
ck('sitemap serves 200', sm.status()===200);
const smUrls = ((await sm.text()).match(/<loc>/g)||[]).length;
ck('sitemap has 25 urls', smUrls===25, String(smUrls));

// Mobile render check
await p.setViewportSize({width:390,height:844});
await p.goto(`${BASE}/roles/software-engineer/`,{waitUntil:'networkidle'});
const oflow=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
ck('no horizontal overflow on mobile', !oflow);
await p.screenshot({path:'/tmp/role-mobile.png',fullPage:false});
await p.setViewportSize({width:1280,height:900});
await p.goto(`${BASE}/roles/hr-generalist/`,{waitUntil:'networkidle'});
await p.screenshot({path:'/tmp/role-desktop.png',fullPage:false});
await b.close();
await server.close();
const f=res.filter(r=>!r.p);
console.log(`\nRESULT: ${res.length-f.length}/${res.length} passed`);
if(f.length){f.forEach(x=>console.log('  - '+x.n+' '+x.d));process.exit(1)}
