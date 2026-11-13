import type {APIRoute} from 'astro';
import {getPosts,lastModified,publishedAt} from '../lib/posts';
import {site,absolute,xml} from '../lib/site';
export const GET:APIRoute=async()=>{
 const posts=(await getPosts()).slice(0,5);
 const body=`<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>${site.url}/</id><title>${xml(site.title)}</title><subtitle>${xml(site.description)}</subtitle><updated>${new Date().toISOString()}</updated><author><name>${site.author}</name><uri>${site.url}/</uri></author><link rel="self" type="application/atom+xml" href="${site.url}/feed.xml"/><link rel="alternate" type="text/html" hreflang="ko" href="${site.url}/"/><generator uri="https://astro.build/">Astro</generator><rights>© ${new Date().getFullYear()} ${site.author}</rights><icon>${site.url}/assets/img/favicons/favicon.ico?v=green-bear-1</icon><logo>${site.url}/assets/img/favicons/favicon-96x96.png?v=green-bear-1</logo>${posts.map(p=>`<entry><id>${absolute(p.data.permalink)}</id><title>${xml(p.data.title)}</title><link rel="alternate" type="text/html" title="${xml(p.data.title)}" href="${absolute(p.data.permalink)}"/><published>${publishedAt(p).toISOString()}</published><updated>${lastModified(p).toISOString()}</updated><content type="text/html" src="${absolute(p.data.permalink)}"/><author><name>${site.author}</name></author>${p.data.categories.map(c=>`<category term="${xml(c)}"/>`).join('')}<summary>${xml(p.data.description)}</summary></entry>`).join('')}</feed>`;
 return new Response(body,{headers:{'content-type':'application/atom+xml; charset=utf-8'}});
};
