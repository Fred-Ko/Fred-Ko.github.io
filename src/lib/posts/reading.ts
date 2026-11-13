import {createHash} from 'node:crypto';
import {markdownToHtml} from 'satteri';
import {legacyPosts} from './legacy.ts';
/** 기존 28개의 렌더러 차이로 분수가 바뀌지 않도록 원문이 같은 경우 원래 값을 보존한다. */
export function readingMinutes(post:{id:string;body?:string}):number {
 const body=(post.body??'').replaceAll('\r\n','\n').trim();
 const previous=legacyPosts[post.id];
 if(previous&&createHash('sha256').update(body).digest('hex')===previous.bodySha256)return previous.minutes;
 // Jekyll number_of_words:'auto' 및 180단어/분 정수 나눗셈과 같은 규칙.
 const text=markdownToHtml(body).html.replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,'');
 const cjk=text.match(/[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}\p{Script=Hangul}]/gu)?.length??0;
 const words=cjk ? cjk+(text.match(/[^\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}\p{Script=Hangul}\s]+/gu)?.length??0) : text.split(/\s+/).filter(Boolean).length;
 return Math.max(1,Math.floor(words/180));
}
