/* 데이터 접근 경계. 네트워크나 실제 DB 호출을 하지 않는 메모리 저장소입니다. */
(function(root){
 'use strict';
 const C=typeof module!=='undefined'&&module.exports?require('./core.js'):root.KPICore;
 function createSampleRepository(seed=C.SAMPLE){
  let rows=seed.map((row,i)=>({...C.validateRecord(row),id:'sample-'+i}));
  let next=rows.length;
  return {
   mode:'sample',
   async list(){return rows.map(row=>({...row}));},
   async save(input){
    const record=C.validateRecord(input);
    if(rows.some(row=>C.key(row)===C.key(record)))throw Error('같은 월·부서가 이미 있습니다. 다른 월 또는 부서를 입력하세요.');
    const saved={...record,id:'sample-'+next++};rows.push(saved);return {...saved};
   }
  };
 }
 const api={createSampleRepository};root.KPIRepository=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
