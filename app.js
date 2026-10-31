'use strict';
(()=>{
 const C=window.KPICore,$=id=>document.getElementById(id);
 let rows=[],options={};
 const fmt=v=>BigInt(v).toLocaleString('ko-KR');
 function selectOptions(id,values){const el=$(id),selected=el.value;el.replaceChildren(new Option('전체',''));[...new Set(values)].sort().forEach(v=>el.add(new Option(v,v)));if([...el.options].some(o=>o.value===selected))el.value=selected;}
 function draw(){
  const data=C.filterRecords(rows,$('filter-month').value,$('filter-team').value);
  const total=C.summarize(data);$('total-target').textContent=fmt(total.target)+'원';$('total-actual').textContent=fmt(total.actual)+'원';$('total-rate').textContent=total.rate;$('total-count').textContent=total.count+'건';
  $('rows').replaceChildren();$('chart').replaceChildren();
  $('empty').hidden=!!data.length;
  $('owner-head').hidden=!options.showOwner;$('action-head').hidden=!options.editable;
  for(const r of data){const tr=document.createElement('tr');
   const cells=[r.month,r.team,fmt(r.target),fmt(r.actual),C.summarize([r]).rate];
   if(options.showOwner)cells.push(r.user_id||'샘플');
   for(const value of cells){const td=document.createElement('td');td.textContent=value;tr.append(td);}
   if(options.editable){const td=document.createElement('td');for(const [label,handler] of [['수정',options.onEdit],['삭제',options.onDelete]]){const b=document.createElement('button');b.textContent=label;b.type='button';b.disabled=!!options.busy;b.onclick=()=>handler?.(r);td.append(b);}tr.append(td);}
   $('rows').append(tr);
  }
  for(const team of [...new Set(data.map(r=>r.team))]){
   const summary=C.summarize(data.filter(r=>r.team===team)),bar=document.createElement('div');bar.className='barrow';
   const label=document.createElement('span');label.textContent=team;
   const track=document.createElement('div');track.className='track';const fill=document.createElement('div');fill.className='fill';
   fill.style.width=(summary.rate==='목표 미설정'?0:Math.min(100,Number(summary.rate.slice(0,-1))))+'%';track.append(fill);
   const rate=document.createElement('span');rate.textContent=summary.rate;bar.append(label,track,rate);$('chart').append(bar);
  }
 }
 function setRows(next,opts={}){rows=next;options=opts;selectOptions('filter-month',rows.map(r=>r.month));selectOptions('filter-team',rows.map(r=>r.team));selectOptions('filter-user',rows.map(r=>r.user_id||'샘플'));$('user-filter-label').hidden=!options.showOwner;draw();}
 for(const id of ['filter-month','filter-team','filter-user'])$(id).onchange=draw;
 $('filter-reset').onclick=()=>{for(const id of ['filter-month','filter-team','filter-user'])$(id).value='';draw();};
 window.KPIDashboard={setRows,draw};

 const notice=$('notice'),form=$('record-form'),save=$('save-record');
 let repo=null,busy=false;
 const show=(message,error=false)=>{notice.textContent=message;notice.className='message'+(error?' error':'');notice.setAttribute('role',error?'alert':'status');};
 function lock(value){busy=value;save.disabled=value||!repo;$('reload').disabled=value;for(const el of form.elements)el.disabled=value||!repo;}
 function unavailable(){setRows([]);$('empty').hidden=true;for(const id of ['total-target','total-actual','total-rate','total-count'])$(id).textContent='—';$('mode-label').textContent='공동 실습 모드 · 연결 확인 필요';}
 async function reload(){
  if(busy)return;lock(true);show('공동 실습 데이터를 읽는 중입니다.');
  try{
   if(!repo)repo=window.KPIPublicRepository.createPublicRepository(window.KPI_PUBLIC_CONFIG);
   setRows(await repo.list());$('mode-label').textContent='공동 실습 모드 · DB 연결됨';show('');
  }catch(e){unavailable();show('읽기 실패: '+e.message,true);}
  finally{lock(false);}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!repo)return;
  lock(true);show('공동 DB에 추가하는 중입니다.');let committed=false;
  try{
   const input=Object.fromEntries(new FormData(form));
   // disabled 필드는 FormData에서 제외되므로 별도로 읽습니다.
   for(const name of ['month','team','target','actual'])input[name]=form.elements.namedItem(name).value;
   await repo.save(input);committed=true;form.reset();
   const data=await repo.list();setRows(data);$('filter-month').value=input.month;$('filter-team').value=input.team.trim();draw();
   $('mode-label').textContent='공동 실습 모드 · DB 연결됨';show('공동 DB에 추가했습니다. 모든 방문자가 볼 수 있습니다.');
  }catch(e){
   if(committed){unavailable();show('DB 추가는 완료했지만 목록을 다시 읽지 못했습니다. 다시 추가하지 말고 다시 읽기를 눌러 주세요. '+e.message,true);}
   else show('추가 결과: '+e.message,true);
  }finally{lock(false);}
 });
 $('reload').onclick=reload;reload();
})();
