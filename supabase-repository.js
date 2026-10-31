/* 공개 가상 데이터 전용. Auth 호출 없이 Data API의 anon 역할로 GET/POST만 사용. */
(function(root){
 'use strict';
 const C=typeof module!=='undefined'&&module.exports?require('./core.js'):root.KPICore;
 function validateConfig(config){
  const url=String(config?.supabaseUrl||'').trim(),key=String(config?.supabasePublishableKey||'').trim();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw Error('config.js의 프로젝트 URL을 확인하세요.');
  if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))throw Error('config.js에는 sb_publishable_로 시작하는 공개용 키를 입력하세요. 비밀키는 사용할 수 없습니다.');
  return {url:url.replace(/\/$/,''),key};
 }
 function createPublicRepository(config,fetcher=root.fetch?.bind(root)){
  const {url,key}=validateConfig(config);
  const endpoint=url+'/rest/v1/kpi_shared_records';
  if(!fetcher)throw Error('이 브라우저는 데이터 연결을 지원하지 않습니다.');
  async function request(query,options={}){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{
    const response=await fetcher(endpoint+query,{...options,signal:controller.signal,cache:'no-store',credentials:'omit',headers:{apikey:key,...options.headers}});
    let body;try{body=await response.json();}catch{throw Error('DB 응답을 읽지 못했습니다. 다시 읽기를 눌러 확인하세요.');}
    if(!response.ok){
     if(body?.code==='23505')throw Error('같은 월·부서가 이미 있습니다. 다른 월 또는 부서를 입력하세요.');
     if(response.status===401||response.status===403)throw Error('공개 키 또는 DB 조회·추가 권한을 확인하세요.');
     if(response.status===404)throw Error('공동실습_DB설정.sql을 실행해 kpi_shared_records 테이블을 준비하세요.');
     throw Error('DB 요청에 실패했습니다. 입력값과 테이블 제약을 확인하세요. (HTTP '+response.status+')');
    }
    return {body,response};
   }catch(e){
    if(e.name==='AbortError'||e instanceof TypeError)throw Error('연결이 끊겼거나 응답이 늦습니다. 추가 요청이었다면 저장됐을 수 있으니 다시 읽기로 먼저 확인하세요.');
    throw e;
   }finally{clearTimeout(timer);}
  }
  function record(row){return {...C.validateRecord(row),id:String(row.id),created_at:row.created_at};}
  return {
   mode:'shared',
   async list(){
    const rows=[];let total=null;
    // 서버의 기본 행 제한보다 많아도 전체 합계를 계산. 큰 자료는 잘린 합계 대신 오류 표시.
    while(true){
     const {body,response}=await request('?select=id,month,team,target,actual,created_at&order=created_at.asc,id.asc&offset='+rows.length+'&limit=500',{headers:{Prefer:'count=exact'}});
     if(!Array.isArray(body))throw Error('DB 데이터 형식이 올바르지 않습니다.');
     const range=response.headers.get('content-range'),match=range?.match(/\/(\d+)$/);
     if(!match)throw Error('전체 건수를 확인하지 못했습니다. 일부 데이터로 합계를 표시하지 않습니다.');
     const nextTotal=Number(match[1]);
     if(total!==null&&total!==nextTotal)throw Error('조회 중 데이터가 추가되었습니다. 다시 읽기를 눌러 주세요.');
     total=nextTotal;rows.push(...body.map(record));
     if(rows.length>=total)break;
     if(!body.length||rows.length>=100000)throw Error('전체 데이터를 읽지 못했습니다. 일부 데이터로 합계를 표시하지 않습니다.');
    }
    return rows;
   },
   async save(input){
    const values=C.validateRecord(input);
    const {body}=await request('',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(values)});
    if(!Array.isArray(body)||body.length!==1)throw Error('저장 응답을 확인하지 못했습니다. 다시 읽기로 저장 여부를 확인하세요.');
    return record(body[0]);
   }
  };
 }
 const api={createPublicRepository,validateConfig};root.KPIPublicRepository=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
