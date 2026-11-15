import { chromium, expect } from '@playwright/test';
import { MESSAGES } from '../../../src/i18n/messages.ts';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const phase=process.argv[2] ?? 'before', port=process.argv[3] ?? '4180';
const fixedZoom=process.argv[4]==='fixed';
const directory=`${root}/docs/reviews/compare-first-screen/${phase}`;
await mkdir(directory,{recursive:true});
const browser=await chromium.launch();
for(const viewport of (fixedZoom ? [{width:1366,height:768}] : process.argv[4]==='phone' ? [{width:390,height:844}] : [{width:1366,height:768},{width:1440,height:900},{width:390,height:844}])) for(const lang of ['en','zh']) {
 const t=MESSAGES[lang], workers=[],errors=[];
 const context=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
 const page=await context.newPage();
 page.on('worker',worker=>workers.push(worker.url())); page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(value=>localStorage.setItem('ghost-rehearsal.lang',value),lang);
 await page.goto(`http://127.0.0.1:${port}/ghost-rehearsal/`);
 await page.getByRole('dialog').getByRole('button',{name:t.eventSetup.demo,exact:true}).click();
 if (!await page.getByRole('button',{name:t.guide.start,exact:true}).isVisible()) await page.locator('.side-collapse').click();
 await page.getByRole('button',{name:t.guide.start,exact:true}).click();
 await expect(page.locator('.people-stats b')).toHaveText(['12','9','279']);
 await expect(page.getByLabel(t.dock.timeline,{exact:true})).toBeEnabled();
 // A hidden phone replay control is changed through its native input event, without revealing another view.
 await page.getByLabel(t.dock.timeline,{exact:true}).evaluate(input=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'210');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect(page.getByLabel(t.dock.timeline,{exact:true})).toHaveValue('210');
 await page.evaluate(()=>document.fonts.ready);
 if(fixedZoom) {
   await page.waitForTimeout(350);
   for(const flow of await page.locator('.canvas-pane .react-flow').all()) {
     const bounds=await flow.boundingBox();
     await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
     const scale=()=>flow.locator('.react-flow__viewport').evaluate(element=>Number(element.style.transform.match(/scale\(([^)]+)/)?.[1]));
     for(const target of [0.5,0.6]) {
       await page.mouse.wheel(0,Math.log2(await scale()/target)/0.002);
       await expect.poll(scale).toBeCloseTo(target,5);
       await page.waitForTimeout(200);
     }
   }
 }
 const screenshot=async(screen)=>{
   if(fixedZoom) await page.mouse.move(0,0);
   if(viewport.width>980) await page.evaluate(()=>{window.scrollTo(0,0);for(const el of document.querySelectorAll('.workspace,.is-report,.dock-body,.ghost-detail,.people-list'))el.scrollTop=0;});
   await page.waitForTimeout(350);
   const geometry=await page.evaluate(()=>{
     const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
     const visible=el=>{let r=el.getBoundingClientRect(),left=0,top=0,right=innerWidth,bottom=innerHeight; for(let p=el.parentElement;p;p=p.parentElement){const s=getComputedStyle(p),q=p.getBoundingClientRect();if(/auto|hidden|clip|scroll/.test(s.overflowY)){top=Math.max(top,q.top);bottom=Math.min(bottom,q.bottom);}if(/auto|hidden|clip|scroll/.test(s.overflowX)){left=Math.max(left,q.left);right=Math.min(right,q.right);}}return r.width>0&&r.height>0&&r.left>=left-1&&r.right<=right+1&&r.top>=top-1&&r.bottom<=bottom+1;};
     return {innerWidth,innerHeight,documentWidth:document.documentElement.scrollWidth,devicePixelRatio,zoom:getComputedStyle(document.documentElement).zoom,scrollY,
       canvases:[...document.querySelectorAll('.canvas-pane')].map(p=>({pane:rect(p),flow:rect(p.querySelector('.react-flow')),viewport:p.querySelector('.react-flow__viewport').getAttribute('style'),zoom:Number(p.querySelector('.react-flow__viewport').style.transform.match(/scale\(([^)]+)/)?.[1]),stages:[...p.querySelectorAll('.stage-card')].map(s=>({name:s.querySelector('.card-name').textContent,rect:rect(s),fullyVisible:visible(s)}))})),
       elements:Object.fromEntries(['.topbar','.guided-demo','.comparison-identities','.comparison-settings','.stage-head','.comparison-live','.run-state-card','.dock','.dock-body','.ghost-card','.ghost-futures','.diff-note','.lanes','.ghost-stories'].map(sel=>{const el=document.querySelector(sel);return [sel,el?{rect:rect(el),fullyVisible:visible(el),text:el.innerText}:null];})),
       lanes:[...document.querySelectorAll('.lane')].map(el=>({rect:rect(el),fullyVisible:visible(el)})),
       report:document.querySelector('.compare-report')?.innerText,
       scope:document.querySelector('.statistics-scope')?.textContent,
       project:localStorage.getItem('ghost-rehearsal.draft.v1')
     };
   });
   if(fixedZoom) for(const canvas of geometry.canvases) expect(canvas.zoom).toBeCloseTo(0.6,5);
   const file=`${screen}-${viewport.width}x${viewport.height}-${lang}${fixedZoom?'-fixed-zoom':''}`;
   await page.screenshot({path:`${directory}/${file}.png`,fullPage:false,animations:'disabled'});
   const project=JSON.parse(geometry.project);delete geometry.project;
   const scenario=project.scenarios.at(-1);
   await writeFile(`${directory}/${file}.json`,JSON.stringify({phase,lang,viewport,scrollPolicy:viewport.width>980?'first-screen zero scroll':'natural UI navigation; no manual scroll',case:'A/B/C guide synthetic Open House A/B',seed:scenario?.seed,replayTime:210,basis:'cutoff',waitingThreshold:60,guest:screen==='journey-divergence'?'side-stream:10':null,guideStep:screen==='journey-divergence'?2:0,arrangement:'auto',runMode:'run_to_completion',requestedCanvasZoom:fixedZoom?0.6:null,pointerPosition:fixedZoom?[0,0]:null,canvasZoomPolicy:fixedZoom?'native mouse wheel to 0.5 then 0.6 per canvas':'default automatic fit after layout',pageZoom:1,reducedMotion:'reduce',projectSha256:createHash('sha256').update(JSON.stringify(project)).digest('hex'),scenarios:project.scenarios.map(s=>({id:s.id,seed:s.seed,cutoff:s.observationCutoff,horizon:s.horizon})),workers,errors,geometry},null,2));
   console.log(file,geometry.canvases.map(c=>c.flow.height),geometry.lanes.map(l=>l.fullyVisible));
 };
 await screenshot('overview');
 const guide=page.getByRole('region',{name:t.guide.title,exact:true});
 await guide.getByRole('button',{name:t.guide.actions[0],exact:true}).click();
 await guide.getByRole('button',{name:t.guide.actions[1],exact:true}).click();
 await expect(page.locator('.ghost-id code')).toHaveText('side-stream:10');
 await expect(page.locator('.diff-note')).toContainText('03:30');
 await expect(page.getByLabel(t.dock.timeline,{exact:true})).toHaveValue('210');
 await screenshot('journey-divergence');
 await context.close();
}
await browser.close();
