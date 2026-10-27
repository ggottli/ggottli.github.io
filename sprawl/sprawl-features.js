// Sprawl — text featurizer shared by the browser runtime (sprawl.js) and the trainer (model/train.js).
// Turns a card's text into a sparse list of hashed feature indices. Pure, deterministic, no DOM.
(function(root){
'use strict';
const BUCKETS = 4096;

// FNV-1a 32-bit
function hash(str){ let h=0x811c9dc5; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,0x01000193); } return (h>>>0)%BUCKETS; }

// collapse the things that vary endlessly (numbers, urls, times) into stable tokens
function normalize(text){
  let s=' '+String(text).toLowerCase()+' ';
  s=s.replace(/https?:\/\/\S+|www\.\S+/g,' <url> ')
     .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,' <email> ')
     .replace(/(^|\s)#[0-9a-f]{3,8}(?=\s|$)/g,'$1 <hex> ')
     .replace(/\b(rgb|rgba|hsl|hsla)\([^)]*\)/g,' <cssfn> ')
     .replace(/\[( |x)\]/gi,' <cb> ')
     .replace(/(^|\s)@(\d{4}-\d{2}-\d{2}|[a-z]+)/g,'$1 <at> ')
     .replace(/(^|\s)#[\w-]+/g,'$1 <tag> ')
     .replace(/\b\d{4}-\d{1,2}-\d{1,2}\b/g,' <date> ')
     .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g,' <date> ')
     .replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/g,' <time> ')
     .replace(/\b\d{1,2}:\d{2}\b/g,' <clock> ')
     .replace(/\b\d*d\d+\b/g,' <dice> ')
     .replace(/[$€£₹¥]\s*\d[\d,]*(\.\d+)?\s*(k|m|bn)?\b/g,' <money> ')
     .replace(/\b\d[\d,]*(\.\d+)?\s*%/g,' <pct> ')
     .replace(/\b\d[\d,]*(\.\d+)?\s*(k|m|bn)\b/g,' <bignum> ')
     .replace(/\b\d[\d,]*(\.\d+)?\b/g,' <num> ');
  return s;
}
const TOK=/<[a-z]+>|[a-z]+(?:'[a-z]+)?|[+\-*/^=?!":;,()>#@•-]/g;

function featurize(text){
  const raw=String(text||''), lines=raw.split('\n').map(l=>l.trim()).filter(Boolean), first=lines[0]||'';
  const n=normalize(raw), toks=n.match(TOK)||[];
  const f=new Set();
  const add=s=>f.add(hash(s));
  toks.forEach((t,i)=>{ add('w:'+t); if(i<toks.length-1) add('b:'+t+'_'+toks[i+1]); });
  if(toks.length){ add('first:'+toks[0]); add('last:'+toks[toks.length-1]); if(toks.length>1) add('first2:'+toks[0]+'_'+toks[1]); }
  const c=n.replace(/\s+/g,' ');
  for(let i=0;i<c.length-2;i++) add('c:'+c.slice(i,i+3));
  const words=toks.filter(t=>/^[a-z<]/.test(t)).length;
  add('f:lines='+Math.min(lines.length,4)); add('f:words='+(words<=2?words:words<=4?'3-4':words<=8?'5-8':words<=16?'9-16':'17+'));
  if(/\?\s*$/.test(raw.trim())) add('f:q'); if(/!/.test(raw)) add('f:excl');
  if(/^\s*([-*•]|\d+[.)])\s/.test(first)) add('f:bullet'); if(/^#{1,3}\s/.test(first)) add('f:hash'); if(/^(>|"|“)/.test(first)) add('f:quote');
  if(first.length<=40 && first===first.toUpperCase() && /[A-Z]/.test(first)) add('f:caps');
  if(/[A-Z][a-z]+ [A-Z][a-z]+/.test(first)) add('f:titlecase');
  if(/\bor\b/.test(n)) add('f:or'); if(/,/.test(raw)) add('f:comma'); if(/:/.test(raw)) add('f:colon');
  if(/<time>|<clock>/.test(n)) add('f:time'); if(/<date>/.test(n)) add('f:date'); if(/<num>/.test(n)) add('f:num'); if(/<money>/.test(n)) add('f:money');
  if(/\b(mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)(day|nesday|sday|urday|rsday)?\b|\b(today|tomorrow|tonight|tmrw|weekend)\b/.test(n)) add('f:dayword');
  if(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\s+<num>/.test(n)) add('f:monthday');
  if(/\b(min|mins|minutes?|hours?|hrs?|secs?|seconds?)\b/.test(n)) add('f:duration');
  if(/\b(km|kms|miles?|mi|kg|kgs|lbs?|pounds?|oz|ft|feet|inch|inches|cm|mm|m|meters?|litres?|liters?|ml|gallons?|cups?|celsius|fahrenheit|mph|kph|gb|mb|kb|tb)\b/.test(n)) add('f:unit');
  if(/\b(pst|est|cst|mst|gmt|utc|bst|cet|ist|jst|aest|sgt|hkt)\b/.test(n)) add('f:tz');
  if(raw.length>160) add('f:long');
  return [...f];
}
const api={featurize, normalize, BUCKETS, hash};
if(typeof module!=='undefined' && module.exports) module.exports=api; else root.SprawlFeatures=api;
})(typeof window!=='undefined'?window:globalThis);
