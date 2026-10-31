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
 const repo=window.KPIRepository.createSampleRepository(),notice=$('notice'),form=$('record-form'),save=$('save-record');
 const show=(message,error=false)=>{notice.textContent=message;notice.className='message'+(error?' error':'');notice.setAttribute('role',error?'alert':'status');};
 async function reload(){ $('reload').disabled=true;show('데이터를 읽는 중입니다.');
 try{setRows(await repo.list());show('');}catch(e){setRows([]);$('empty').hidden=true;for(const id of ['total-target','total-actual','total-rate','total-count'])$(id).textContent='—';show('데이터를 읽지 못했습니다. '+e.message,true);}finally{$('reload').disabled=false;} }
 form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;show('저장 중입니다.');
 try{const input=Object.fromEntries(new FormData(form));await repo.save(input);setRows(await repo.list());$('filter-month').value=input.month;$('filter-team').value=input.team.trim();draw();form.reset();show('샘플에 추가했습니다. 새로고침하면 초기화됩니다.');}catch(e){show('저장하지 못했습니다. '+e.message,true);}finally{save.disabled=false;}});
 $('reload').onclick=reload;reload();
})();
