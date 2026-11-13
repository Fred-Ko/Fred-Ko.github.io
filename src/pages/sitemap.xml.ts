import type {APIRoute} from 'astro';
import {getPosts,taxonomy,lastModified} from '../lib/posts';
import {site,absolute,xml,pageHref} from '../lib/site';
export const GET:APIRoute=async()=>{
 const posts=await getPosts();
 const paths=['/','/about/','/archives/','/tags/','/categories/',...Array.from({length:Math.ceil(posts.length/site.pageSize)-1},(_,i)=>pageHref(i+2)),...taxonomy(posts,'tags').map(t=>`/tags/${t.slug}/`),...taxonomy(posts,'categories').map(t=>`/categories/${t.slug}/`)];
 const body=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path=>`<url><loc>${xml(absolute(path))}</loc></url>`).join('')}${posts.map(p=>`<url><loc>${xml(absolute(p.data.permalink))}</loc><lastmod>${lastModified(p).toISOString()}</lastmod></url>`).join('')}</urlset>`;
 return new Response(body,{headers:{'content-type':'application/xml; charset=utf-8'}});
};
