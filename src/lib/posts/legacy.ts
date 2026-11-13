import data from '../../data/legacy-posts.json' with {type:'json'};
interface LegacyPost {
 source:string;
 publishedAt:string;
 order:number;
 minutes:number;
 bodySha256:string;
}
/** 기존 글의 발행일·동률 정렬·읽기 시간을 보존하는 운영 데이터. */
export const legacyPosts:Readonly<Record<string,LegacyPost>>=data;
