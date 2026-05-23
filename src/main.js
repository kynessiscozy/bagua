const CURR_YEAR=new Date().getFullYear();
const TG='甲乙丙丁戊己庚辛壬癸'.split(''),DZ='子丑寅卯辰巳午未申酉戌亥'.split(''),SX='鼠牛虎兔龙蛇马羊猴鸡狗猪'.split(''),WX='木火土金水'.split('');
const GW={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const ZW={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const ZC={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
const WC={木:'#7ab648',火:'#d4654a',土:'#d4a04a',金:'#c8a45a',水:'#5AC8FA'};
const NY=['海中金','海中金','炉中火','炉中火','大林木','大林木','路旁土','路旁土','剑锋金','剑锋金','山头火','山头火','涧下水','涧下水','城头土','城头土','白蜡金','白蜡金','杨柳木','杨柳木','泉中水','泉中水','屋上土','屋上土','霹雳火','霹雳火','松柏木','松柏木','长流水','长流水','砂石金','砂石金','山下火','山下火','平地木','平地木','壁上土','壁上土','金箔金','金箔金','覆灯火','覆灯火','天河水','天河水','大驿土','大驿土','钗钏金','钗钏金','桑柘木','桑柘木','大溪水','大溪水','沙中土','沙中土','天上火','天上火','石榴木','石榴木','大海水','大海水'];
/* —— 十神表（修正版：按"五行生克 + 阴阳同异"严格生成）—— */
const SS=(function(){
  const yin={甲:0,丙:0,戊:0,庚:0,壬:0,乙:1,丁:1,己:1,辛:1,癸:1}; // 0=阳 1=阴
  const SH={木:'火',火:'土',土:'金',金:'水',水:'木'};
  const KE={木:'土',火:'金',土:'水',金:'木',水:'火'};
  const BS={木:'水',火:'木',土:'火',金:'土',水:'金'};
  const BK={木:'金',火:'水',土:'木',金:'火',水:'土'};
  const out={};
  TG.forEach(d=>{
    out[d]={};
    const dw=GW[d], dy=yin[d];
    TG.forEach(o=>{
      const ow=GW[o], oy=yin[o], same=(dy===oy);
      let r='';
      if(dw===ow)      r= same?'比肩':'劫财';
      else if(SH[dw]===ow) r= same?'食神':'伤官';
      else if(KE[dw]===ow) r= same?'偏财':'正财';
      else if(BK[dw]===ow) r= same?'七杀':'正官';
      else if(BS[dw]===ow) r= same?'偏印':'正印';
      out[d][o]=r;
    });
  });
  return out;
})();

/* ============================================================
   全局上下文工具 TJ —— 所有派生量的单一来源
   规则：任何"当前大运 / 当前流年 / 当前流月 / 年龄 / 十神 / 评分"
   必须经由 TJ.* 或 buildContext() 提供，禁止在下游函数中重复实现。
   ============================================================ */
const TJ={
  calcAge(by,bm,bd){
    if(!by)return 0;
    const now=new Date();
    const ty=now.getFullYear(),tm=now.getMonth()+1,td=now.getDate();
    let a=ty-by;
    if(bm&&bd&&(tm<bm||(tm===bm&&td<bd)))a--;
    return Math.max(0,a);
  },
  findDaYun(dy,age){
    if(!dy||!dy.ds||!dy.ds.length)return null;
    const ds=dy.ds;
    if(age<ds[0].as)return Object.assign({},ds[0],{_idx:0,_state:'before'});
    for(let i=0;i<ds.length;i++){
      if(age>=ds[i].as&&age<=ds[i].ae)return Object.assign({},ds[i],{_idx:i,_state:'current'});
    }
    return Object.assign({},ds[ds.length-1],{_idx:ds.length-1,_state:'after'});
  },
  findLiuNian(ln,year){
    if(!ln||!ln.length)return null;
    const y=year||CURR_YEAR;
    return ln.find(l=>l.y===y)||ln.find(l=>l.y>=y)||ln[ln.length-1];
  },
  findLiuYue(liuyue){
    if(!liuyue||!liuyue.length)return null;
    const now=new Date(),today=now.getTime();
    let best=null,bestDiff=Infinity;
    liuyue.forEach(lm=>{
      const mt=(lm.jq||'').match(/(\d+)月(\d+)日/);
      if(!mt)return;
      const dt=new Date(now.getFullYear(),parseInt(mt[1])-1,parseInt(mt[2]));
      const diff=today-dt.getTime();
      if(diff>=0&&diff<bestDiff){bestDiff=diff;best=lm;}
    });
    return best||liuyue[0];
  },
  ssOf(dg,g){return(dg&&g&&SS[dg])?SS[dg][g]:'';},
  isShunDaYun(b,gen){
    const yangGan=b.Y.gi%2===0;
    return(yangGan&&gen==='male')||(!yangGan&&gen!=='male');
  }
};

/* ============================================================
   TJX 推算内核 v1.0  ——  TianJi eXtended Engine
   理论来源：
     · 旺衰：《滴天髓阐微》（任铁樵）得令/得地/得势三维量化
     · 格局：《子平真诠》（沈孝瞻）正格、变格、从化格
     · 调候：《穷通宝鉴》月令调候用神表（十干四时）
     · 用神：扶抑·调候·通关·病药 四法综合
     · 十神：根/透/藏 与 生克 质量分析
     · 大运流年：刑冲合化 + 用忌 + 神煞触发 综合评分
   设计：纯函数 + 单一来源；输出挂在 ctx.tjx 命名空间。
   注意：所有评分采用 -100~+100 的统一量纲；UI 可自行映射。
   ============================================================ */

/* ============================================================
   V5 旺衰五维精算引擎 (内嵌版)
   升级自 V4 三维模型，新增：得气(穷通宝鉴气数法) + 得局(合局加持)
   同时增强：得令(人元司权+进气退气) + 得地(墓库开闭+禄位) + 得势(生克链传播)
   ============================================================ */
const __TJX_V5 = (function(){
  const BEI_SHENG = {木:'水',火:'木',土:'火',金:'土',水:'金'};
  const BEI_KE    = {木:'金',火:'水',土:'木',金:'火',水:'土'};

  // 人元司权表
  const MONTH_DUTY = {
    寅:[{g:'戊',d:7},{g:'丙',d:7},{g:'甲',d:16}],
    卯:[{g:'甲',d:10},{g:'乙',d:20}],
    辰:[{g:'乙',d:9},{g:'癸',d:3},{g:'戊',d:18}],
    巳:[{g:'戊',d:5},{g:'庚',d:5},{g:'丙',d:20}],
    午:[{g:'丙',d:10},{g:'己',d:9},{g:'丁',d:11}],
    未:[{g:'丁',d:9},{g:'乙',d:3},{g:'己',d:18}],
    申:[{g:'戊',d:7},{g:'己',d:7},{g:'壬',d:3},{g:'庚',d:13}],
    酉:[{g:'庚',d:10},{g:'辛',d:20}],
    戌:[{g:'辛',d:9},{g:'丁',d:3},{g:'戊',d:18}],
    亥:[{g:'戊',d:7},{g:'甲',d:5},{g:'壬',d:18}],
    子:[{g:'壬',d:10},{g:'癸',d:20}],
    丑:[{g:'癸',d:9},{g:'辛',d:3},{g:'己',d:18}]
  };

  const W_TABLE = {
    木:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},
    火:{火:'旺',土:'相',金:'死',水:'囚',木:'休'},
    土:{土:'旺',金:'相',水:'死',木:'囚',火:'休'},
    金:{金:'旺',水:'相',木:'死',火:'囚',土:'休'},
    水:{水:'旺',木:'相',火:'死',土:'囚',金:'休'}
  };

  const WX_STATE_SCORE = {旺:40,相:25,休:10,囚:-5,死:-18};

  const JIN_TUI_QI = {
    寅:{进:'火',退:'水'},卯:{进:'火',退:'水'},辰:{进:'金',退:'木'},
    巳:{进:'土',退:'木'},午:{进:'土',退:'木'},未:{进:'金',退:'火'},
    申:{进:'水',退:'土'},酉:{进:'水',退:'土'},戌:{进:'木',退:'金'},
    亥:{进:'木',退:'金'},子:{进:'木',退:'金'},丑:{进:'火',退:'水'}
  };

  const LU = {甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'};
  const DI_WANG = {甲:'卯',乙:'寅',丙:'午',丁:'巳',戊:'午',己:'巳',庚:'酉',辛:'申',壬:'子',癸:'亥'};
  const CHONG = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  const HE = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  const TOMB = {辰:'水',戌:'火',丑:'金',未:'木'};

  // 穷通宝鉴气数（精简：12日干×12月=144条）
  const QI_SHU = {
    甲:{寅:['丙','癸'],卯:['庚','丙'],辰:['庚','壬'],巳:['癸','庚'],午:['癸','庚'],未:['癸','庚'],申:['庚','壬'],酉:['庚','壬'],戌:['庚','壬'],亥:['庚','丁'],子:['丁','庚'],丑:['丁','庚']},
    乙:{寅:['丙','癸'],卯:['丙','癸'],辰:['癸','丙'],巳:['癸','丙'],午:['癸','丙'],未:['癸','丙'],申:['丙','癸'],酉:['癸','丙'],戌:['癸','丙'],亥:['丙','戊'],子:['丙','戊'],丑:['丙','戊']},
    丙:{寅:['壬','庚'],卯:['壬','己'],辰:['壬','庚'],巳:['壬','庚'],午:['壬','庚'],未:['壬','庚'],申:['壬','戊'],酉:['壬','戊'],戌:['壬','甲'],亥:['甲','戊'],子:['壬','戊'],丑:['壬','甲']},
    丁:{寅:['甲','庚'],卯:['甲','庚'],辰:['甲','庚'],巳:['甲','庚'],午:['壬','庚'],未:['甲','壬'],申:['甲','庚'],酉:['甲','庚'],戌:['甲','庚'],亥:['甲','庚'],子:['甲','庚'],丑:['甲','庚']},
    戊:{寅:['丙','甲'],卯:['丙','甲'],辰:['甲','丙'],巳:['甲','丙'],午:['壬','甲'],未:['甲','丙'],申:['丙','甲'],酉:['丙','甲'],戌:['甲','丙'],亥:['丙','甲'],子:['丙','甲'],丑:['丙','甲']},
    己:{寅:['丙','庚'],卯:['甲','癸'],辰:['丙','甲'],巳:['癸','丙'],午:['癸','丙'],未:['癸','丙'],申:['丙','癸'],酉:['丙','癸'],戌:['丙','癸'],亥:['丙','甲'],子:['丙','甲'],丑:['丙','甲']},
    庚:{寅:['戊','甲'],卯:['丁','甲'],辰:['甲','丁'],巳:['壬','戊'],午:['壬','己'],未:['壬','甲'],申:['丁','甲'],酉:['丁','甲'],戌:['甲','壬'],亥:['丁','丙'],子:['丁','甲'],丑:['丙','丁']},
    辛:{寅:['己','壬'],卯:['壬','甲'],辰:['壬','甲'],巳:['壬','甲'],午:['壬','己'],未:['壬','甲'],申:['壬','甲'],酉:['壬','甲'],戌:['壬','甲'],亥:['壬','丙'],子:['丙','戊'],丑:['丙','壬']},
    壬:{寅:['庚','戊'],卯:['戊','庚'],辰:['甲','庚'],巳:['壬','庚'],午:['癸','庚'],未:['辛','甲'],申:['戊','丁'],酉:['甲','庚'],戌:['甲','丙'],亥:['戊','丙'],子:['戊','丙'],丑:['丙','丁']},
    癸:{寅:['辛','丙'],卯:['庚','辛'],辰:['丙','辛'],巳:['辛','庚'],午:['庚','壬'],未:['庚','辛'],申:['丁','甲'],酉:['辛','丙'],戌:['辛','癸'],亥:['庚','辛'],子:['丙','辛'],丑:['丙','丁']}
  };

  // 十二长生权重（日干在各地支）
  const CS_WEIGHT = (function(){
    const cs = {
      甲:'亥子丑寅卯辰巳午未申酉戌',乙:'午巳辰卯寅丑子亥戌酉申未',
      丙:'寅卯辰巳午未申酉戌亥子丑',丁:'酉申未午巳辰卯寅丑子亥戌',
      戊:'寅卯辰巳午未申酉戌亥子丑',己:'酉申未午巳辰卯寅丑子亥戌',
      庚:'巳午未申酉戌亥子丑寅卯辰',辛:'子亥戌酉申未午巳辰卯寅丑',
      壬:'申酉戌亥子丑寅卯辰巳午未',癸:'卯寅丑子亥戌酉申未午巳辰'
    };
    const sw = {长:0.85,沐:0.45,冠:0.80,临:1.00,帝:0.95,衰:0.55,病:0.35,死:0.15,墓:0.25,绝:0.05,胎:0.40,养:0.50};
    const sn = ['长','沐','冠','临','帝','衰','病','死','墓','绝','胎','养'];
    const out = {};
    TG.forEach(g => { out[g] = {}; DZ.forEach((z,i) => { out[g][z] = sw[sn[cs[g].indexOf(z)]] || 0.5; }); });
    return out;
  })();

  // 地支藏干
  const ZC_W_V5 = {
    子:[['癸',1.0]],丑:[['己',1.0],['癸',0.7],['辛',0.5]],
    寅:[['甲',1.0],['丙',0.7],['戊',0.5]],卯:[['乙',1.0]],
    辰:[['戊',1.0],['乙',0.7],['癸',0.5]],巳:[['丙',1.0],['庚',0.7],['戊',0.5]],
    午:[['丁',1.0],['己',0.7]],未:[['己',1.0],['丁',0.7],['乙',0.5]],
    申:[['庚',1.0],['壬',0.7],['戊',0.5]],酉:[['辛',1.0]],
    戌:[['戊',1.0],['辛',0.7],['丁',0.5]],亥:[['壬',1.0],['甲',0.7]]
  };

  const DIMS = {deLing:0.25, deDi:0.30, deShi:0.20, deQi:0.15, deJu:0.10};

  function deLing(dg, mz, bd){
    const dw=GW[dg], mw=ZW[mz];
    const state=W_TABLE[mw][dw];
    let score=WX_STATE_SCORE[state]||0;
    let dutyGan=null;
    const duties=MONTH_DUTY[mz]||[];
    let ds=0;
    for(const d of duties){ds+=d.d;if(bd<=ds){dutyGan=d.g;break;}}
    if(!dutyGan&&duties.length)dutyGan=duties[duties.length-1].g;
    if(dutyGan&&GW[dutyGan]===dw)score+=8;
    else if(dutyGan&&GW[dutyGan]===BEI_SHENG[dw])score+=4;
    else if(dutyGan&&GW[dutyGan]===BEI_KE[dw])score-=6;
    const jt=JIN_TUI_QI[mz];
    let jtl='';
    if(jt){if(dw===jt.进){score+=6;jtl='进气';}else if(dw===jt.退){score-=6;jtl='退气';}}
    return{score:Math.round(score),state,dutyGan,jinTui:jtl};
  }

  function deDi(dg, zhiList){
    const dw=GW[dg];let score=0;
    const posW=[1.0,2.0,1.8,1.2],allZ=zhiList.map(z=>z.z);
    for(const item of zhiList){
      const{z,position}=item,wgt=posW[position];
      const csW=CS_WEIGHT[dg]&&CS_WEIGHT[dg][z]?CS_WEIGHT[dg][z]:0.3;
      score+=csW*15*wgt;
      const hidden=ZC_W_V5[z]||[];
      for(const[cg,hw] of hidden){
        const cw=GW[cg];
        if(cw===dw){
          let rs=hw*8*wgt;
          if(TOMB[z]===dw){
            const cz=CHONG[z];
            rs*=allZ.includes(cz)?1.8:0.4;
          }
          score+=rs;
        }else if(cw===BEI_SHENG[dw])score+=hw*5*wgt;
      }
      if(LU[dg]===z)score+=14*wgt;
      if(DI_WANG[dg]===z)score+=10*wgt;
    }
    return{score:Math.round(Math.min(score,60)*10)/10};
  }

  function deShi(dg, yg, mg, hg){
    const dw=GW[dg];let score=0;const chains=[];
    const gl=[{g:yg,pos:'年',dist:3},{g:mg,pos:'月',dist:1},{g:hg,pos:'时',dist:2}];
    for(const{g,pos,dist} of gl){
      if(!g)continue;
      const gw=GW[g],df=1.0/Math.sqrt(dist);
      if(gw===dw){score+=10*df;chains.push(pos+'比劫+'+Math.round(10*df));}
      else if(gw===BEI_SHENG[dw]){score+=7*df;chains.push(pos+'印生+'+Math.round(7*df));}
      else if(gw===ZSHENG){score-=5*df;chains.push(pos+'食伤-'+Math.round(5*df));}
      else if(gw===ZKE){score-=6*df;chains.push(pos+'财耗-'+Math.round(6*df));}
      else if(gw===BEI_KE[dw]){score-=9*df;chains.push(pos+'官杀-'+Math.round(9*df));}
    }
    if(yg&&mg){
      const yw=GW[yg],mw=GW[mg];
      if(ZSHENG&&ZSHENG[yw]===mw){if(ZSHENG[mw]===dw||BEI_SHENG[mw]===dw){score+=5;chains.push('连续相生链+5');}}
      if((ZKE&&ZKE[yw]===mw||BEI_KE[yw]===mw)&&(mw===dw||(ZSHENG&&ZSHENG[mw]===dw)||BEI_SHENG[mw]===dw)){score-=4;chains.push('阻隔-4');}
    }
    if(mg&&hg){
      const mw=GW[mg],hw=GW[hg];
      if(((BEI_KE[mw]===dw||(ZKE&&ZKE[mw]===dw)||(ZSHENG&&ZSHENG[mw]===dw))&&(BEI_KE[hw]===dw||(ZKE&&ZKE[hw]===dw)||(ZSHENG&&ZSHENG[hw]===dw)))&&(mw===hw||(ZSHENG&&ZSHENG[mw]===hw)||BEI_SHENG[mw]===hw)){score-=3;chains.push('合力作用-3');}
    }
    return{score:Math.round(score*10)/10,chains};
  }

  function deQi(dg, mz, allGan, allZhi){
    const qiList=QI_SHU[dg]&&QI_SHU[dg][mz]?QI_SHU[dg][mz]:[];
    if(!qiList.length)return{score:0,details:[],summary:'无数据'};
    const pw=new Set(),dw=GW[dg];
    allGan.forEach(g=>{if(g)pw.add(GW[g]);});
    allZhi.forEach(z=>{(ZC_W_V5[z]||[]).forEach(([cg])=>pw.add(GW[cg]));});
    let score=0;const found=[],missing=[];
    if(qiList[0]){
      const qw=GW[qiList[0]];
      if(pw.has(qw)&&qw!==dw){score+=15;found.push('一气'+qiList[0]+'✅');}else{score-=8;missing.push('一气'+qiList[0]+'❌');}
    }
    if(qiList[1]){
      const qw=GW[qiList[1]];
      if(pw.has(qw)&&qw!==dw){score+=8;found.push('二气'+qiList[1]+'✅');}else{score-=4;missing.push('二气'+qiList[1]+'❌');}
    }
    const agw=new Set(allGan.filter(Boolean).map(g=>GW[g]));
    if(qiList[0]&&agw.has(GW[qiList[0]])){score+=3;found.push('一气透干+3');}
    if(qiList[1]&&agw.has(GW[qiList[1]])){score+=2;found.push('二气透干+2');}
    return{score:Math.round(score),details:[...found,...missing],summary:found.length>=2?'全备':found.length===1?'有缺':'匮乏'};
  }

  function deJu(dg, zhiList){
    const dw=GW[dg],allZ=zhiList.map(z=>z.z),zc={};
    allZ.forEach(z=>{zc[z]=(zc[z]||0)+1;});
    let score=0;const details=[];
    const sanHe=[{zhi:['申','子','辰'],wx:'水'},{zhi:['亥','卯','未'],wx:'木'},{zhi:['寅','午','戌'],wx:'火'},{zhi:['巳','酉','丑'],wx:'金'}];
    for(const{zhi,wx} of sanHe){
      const p=zhi.filter(z=>zc[z]);
      if(p.length===3){
        if(wx===dw){score+=18;details.push('三合'+wx+'局+18');}
        else if(wx===BEI_SHENG[dw]){score+=14;details.push('三合'+wx+'生扶+14');}
        else if(wx===ZSHENG){score-=6;details.push('三合'+wx+'泄-6');}
      }else if(p.length===2){
        const mids=['子','卯','午','酉'];const hm=p.some(z=>mids.includes(z));
        if(hm){if(wx===dw){score+=10;details.push('半合'+wx+'(中神)+10');}else if(wx===BEI_SHENG[dw]){score+=7;details.push('半合'+wx+'生扶+7');}}
        else{if(wx===dw){score+=5;details.push('半合'+wx+'(缺中)+5');}else if(wx===BEI_SHENG[dw]){score+=3;details.push('半合'+wx+'生扶+3');}}
      }
    }
    const sanHui=[{zhi:['寅','卯','辰'],wx:'木'},{zhi:['巳','午','未'],wx:'火'},{zhi:['申','酉','戌'],wx:'金'},{zhi:['亥','子','丑'],wx:'水'}];
    for(const{zhi,wx} of sanHui){
      const p=zhi.filter(z=>zc[z]);
      if(p.length===3){
        if(wx===dw){score+=22;details.push('三会'+wx+'方+22');}
        else if(wx===BEI_SHENG[dw]){score+=16;details.push('三会'+wx+'生扶+16');}
        else if(wx===ZSHENG){score-=8;details.push('三会'+wx+'泄-8');}
      }else if(p.length===2){if(wx===dw){score+=6;details.push('三会缺一+6');}}
    }
    return{score:Math.round(score),details};
  }

  const ZSHENG = {木:'火',火:'土',土:'金',金:'水',水:'木'};
  const ZKE    = {木:'土',火:'金',土:'水',金:'木',水:'火'};

  function classifyLevel(ns){
    if(ns>=75)return{level:6,label:'极旺',extreme:true};
    if(ns>=45)return{level:5,label:'偏旺',extreme:false};
    if(ns>=15)return{level:4,label:'中和偏旺',extreme:false};
    if(ns>=-15)return{level:3,label:'中和',extreme:false};
    if(ns>=-45)return{level:2,label:'中和偏弱',extreme:false};
    if(ns>=-75)return{level:1,label:'偏弱',extreme:false};
    return{level:0,label:'极弱',extreme:true};
  }

  function compute(b, bd){
    const dg=b.D.g,mz=b.M.z,dw=GW[dg];
    const allGan=[b.Y.g,b.M.g,b.D.g,b.H.g];
    const allZhi=[b.Y.z,b.M.z,b.D.z,b.H.z];
    const ling=deLing(dg,mz,bd||15);
    const zhiList=[{z:b.Y.z,position:0},{z:b.M.z,position:1},{z:b.D.z,position:2},{z:b.H.z,position:3}];
    const di=deDi(dg,zhiList);
    const shi=deShi(dg,b.Y.g,b.M.g,b.H.g);
    const qi=deQi(dg,mz,allGan,allZhi);
    const ju=deJu(dg,zhiList);
    const nl=ling.score*0.55, nd=di.score*0.6, ns=shi.score*0.6, nq=qi.score*0.65, nj=ju.score*0.5;
    const tr=nl*DIMS.deLing+nd*DIMS.deDi+ns*DIMS.deShi+nq*DIMS.deQi+nj*DIMS.deJu;
    const total=Math.round(tr*4.2);
    const level=classifyLevel(total);
    const ec=[Math.abs(nl)>20,Math.abs(nd)>24,Math.abs(ns)>16,Math.abs(nq)>12,Math.abs(nj)>8].filter(Boolean).length;
    return{
      score:total,level:level.level,label:level.label,
      strong:total>=10,extreme:level.extreme||ec>=4,
      dw, dg, mz,
      dimensions:{
        deLing:{score:ling.score,state:ling.state,dutyGan:ling.dutyGan,jinTui:ling.jinTui},
        deDi:{score:di.score},
        deShi:{score:shi.score,chains:shi.chains},
        deQi:{score:qi.score,summary:qi.summary,details:qi.details},
        deJu:{score:ju.score,details:ju.details}
      }
    };
  }

  return{compute};
})();
const TJX = (function(){
  const SH={木:'火',火:'土',土:'金',金:'水',水:'木'};   // 五行相生
  const KE={木:'土',火:'金',土:'水',金:'木',水:'火'};   // 我克
  const BS={木:'水',火:'木',土:'火',金:'土',水:'金'};   // 生我
  const BK={木:'金',火:'水',土:'木',金:'火',水:'土'};   // 克我

  // 地支藏干本气/中气/余气 权重（沈孝瞻法）
  const ZC_W={
    子:[['癸',1.0]],
    丑:[['己',0.6],['癸',0.3],['辛',0.1]],
    寅:[['甲',0.6],['丙',0.3],['戊',0.1]],
    卯:[['乙',1.0]],
    辰:[['戊',0.6],['乙',0.3],['癸',0.1]],
    巳:[['丙',0.6],['庚',0.3],['戊',0.1]],
    午:[['丁',0.7],['己',0.3]],
    未:[['己',0.6],['丁',0.3],['乙',0.1]],
    申:[['庚',0.6],['壬',0.3],['戊',0.1]],
    酉:[['辛',1.0]],
    戌:[['戊',0.6],['辛',0.3],['丁',0.1]],
    亥:[['壬',0.7],['甲',0.3]]
  };

  // 十二长生表（日干在各地支的状态系数：越接近根越大）
  // 顺序：长生·沐浴·冠带·临官·帝旺·衰·病·死·墓·绝·胎·养
  const CS_W=[0.4,0.25,0.5,1.0,1.0,0.4,0.25,0.1,0.3,0.0,0.15,0.3];
  const CS_START={
    甲:11,乙:6,丙:2,丁:9,戊:2,己:9,庚:5,辛:0,壬:8,癸:3
  }; // 日干在哪个地支起"长生"（按 DZ 索引 子=0...亥=11 的"逆向位置"算）
  // 上述表参考子平：阳干顺行、阴干逆行
  const YANG_GAN={甲:1,丙:1,戊:1,庚:1,壬:1,乙:0,丁:0,己:0,辛:0,癸:0};

  function cs(dg,zhi){
    // 日干在某地支的"十二长生"权重
    const dzIdx={子:0,丑:1,寅:2,卯:3,辰:4,巳:5,午:6,未:7,申:8,酉:9,戌:10,亥:11};
    const start=CS_START[dg];
    if(start===undefined)return 0;
    const idx=dzIdx[zhi];
    const step=YANG_GAN[dg]?((idx-start+12)%12):((start-idx+12)%12);
    return CS_W[step]||0;
  }

  // —— 调候用神（穷通宝鉴精简表） ——
  // key: 日干+月令地支 → 主用神, 次用神
  const TIAO_HOU={
    // 甲木
    '甲子':['丁','庚'],'甲丑':['丙','丁'],'甲寅':['丙','癸'],'甲卯':['庚','戊'],
    '甲辰':['庚','戊'],'甲巳':['癸','丁'],'甲午':['癸','丁'],'甲未':['癸','丁'],
    '甲申':['庚','丁'],'甲酉':['庚','丁'],'甲戌':['庚','甲'],'甲亥':['庚','丁'],
    // 乙木
    '乙子':['丙','戊'],'乙丑':['丙','戊'],'乙寅':['丙','癸'],'乙卯':['丙','癸'],
    '乙辰':['癸','丙'],'乙巳':['癸','辛'],'乙午':['癸','丙'],'乙未':['癸','丙'],
    '乙申':['丙','癸'],'乙酉':['丙','癸'],'乙戌':['癸','辛'],'乙亥':['丙','戊'],
    // 丙火
    '丙子':['壬','戊'],'丙丑':['壬','甲'],'丙寅':['壬','庚'],'丙卯':['壬','己'],
    '丙辰':['壬','甲'],'丙巳':['壬','庚'],'丙午':['壬','庚'],'丙未':['壬','庚'],
    '丙申':['壬','戊'],'丙酉':['壬','癸'],'丙戌':['甲','壬'],'丙亥':['甲','戊'],
    // 丁火
    '丁子':['甲','庚'],'丁丑':['甲','庚'],'丁寅':['庚','甲'],'丁卯':['庚','甲'],
    '丁辰':['甲','庚'],'丁巳':['甲','庚'],'丁午':['壬','庚'],'丁未':['甲','壬'],
    '丁申':['甲','庚'],'丁酉':['甲','庚'],'丁戌':['甲','庚'],'丁亥':['甲','庚'],
    // 戊土
    '戊子':['丙','甲'],'戊丑':['丙','甲'],'戊寅':['丙','癸'],'戊卯':['丙','癸'],
    '戊辰':['甲','丙'],'戊巳':['甲','丙'],'戊午':['壬','甲'],'戊未':['癸','丙'],
    '戊申':['丙','癸'],'戊酉':['丙','癸'],'戊戌':['甲','丙'],'戊亥':['甲','丙'],
    // 己土
    '己子':['丙','甲'],'己丑':['丙','甲'],'己寅':['丙','甲'],'己卯':['甲','癸'],
    '己辰':['丙','癸'],'己巳':['癸','丙'],'己午':['癸','丙'],'己未':['癸','丙'],
    '己申':['丙','癸'],'己酉':['丙','癸'],'己戌':['甲','丙'],'己亥':['丙','甲'],
    // 庚金
    '庚子':['丁','甲'],'庚丑':['丙','丁'],'庚寅':['戊','甲'],'庚卯':['丁','甲'],
    '庚辰':['甲','丁'],'庚巳':['壬','戊'],'庚午':['壬','癸'],'庚未':['丁','甲'],
    '庚申':['丁','甲'],'庚酉':['丁','甲'],'庚戌':['甲','壬'],'庚亥':['丁','丙'],
    // 辛金
    '辛子':['丙','戊'],'辛丑':['丙','壬'],'辛寅':['己','壬'],'辛卯':['壬','甲'],
    '辛辰':['壬','甲'],'辛巳':['壬','甲'],'辛午':['壬','己'],'辛未':['壬','庚'],
    '辛申':['壬','戊'],'辛酉':['壬','甲'],'辛戌':['壬','甲'],'辛亥':['壬','丙'],
    // 壬水
    '壬子':['戊','丙'],'壬丑':['丙','丁'],'壬寅':['庚','戊'],'壬卯':['戊','辛'],
    '壬辰':['甲','庚'],'壬巳':['壬','庚'],'壬午':['癸','庚'],'壬未':['辛','甲'],
    '壬申':['戊','丁'],'壬酉':['甲','庚'],'壬戌':['甲','丙'],'壬亥':['戊','丙'],
    // 癸水
    '癸子':['丙','辛'],'癸丑':['丙','丁'],'癸寅':['辛','丙'],'癸卯':['庚','辛'],
    '癸辰':['丙','辛'],'癸巳':['辛','庚'],'癸午':['庚','壬'],'癸未':['庚','辛'],
    '癸申':['丁','甲'],'癸酉':['辛','丙'],'癸戌':['辛','癸'],'癸亥':['庚','辛']
  };

  // 旺相休囚死表（按月令五行对其他五行的状态）
  const W_TABLE={
    木:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},
    火:{火:'旺',土:'相',金:'死',水:'囚',木:'休'},
    土:{土:'旺',金:'相',水:'死',木:'囚',火:'休'},
    金:{金:'旺',水:'相',木:'死',火:'囚',土:'休'},
    水:{水:'旺',木:'相',火:'死',土:'囚',金:'休'}
  };

  /* ——— 1. 旺衰精算（三维：得令/得地/得势） ——— */
  /* ——— 1. 旺衰精算（V5 五维引擎：得令/得地/得势/得气/得局） ——— */
  function strength(b){
    var bd = (b._meta && b._meta.bd) ? b._meta.bd : 15;
    var v5r = __TJX_V5.compute(b, bd);
    return {
      dw: v5r.dw,
      monthState: v5r.dimensions.deLing.state,
      deLing: v5r.dimensions.deLing.score,
      deDi: v5r.dimensions.deDi.score,
      deShi: v5r.dimensions.deShi.score,
      score: v5r.score,
      level: v5r.level,
      label: v5r.label,
      strong: v5r.strong,
      extreme: v5r.extreme
    };
  }

  /* ——— 2. 调候用神 ——— */
  function tiaoHou(b){
    const key=b.D.g+b.M.z;
    const r=TIAO_HOU[key];
    if(!r)return null;
    return{primary:r[0], secondary:r[1], key};
  }

  /* ——— 3. 综合用神（扶抑+调候+通关+病药） ——— */
  function yongShen(b, str, th){
    const dw=str.dw;
    const cands={}; // 候选 → 分数
    const add=(wx,v,reason)=>{
      if(!wx)return;
      if(!cands[wx])cands[wx]={score:0,reasons:[]};
      cands[wx].score+=v;
      cands[wx].reasons.push(reason);
    };

    // (a) 扶抑：身旺抑（克泄耗），身弱扶（生比）
    if(str.strong){
      add(KE[dw],30,'扶抑：克身为用');
      add(SH[dw],25,'扶抑：泄秀为用');
      add(BK[dw],20,'扶抑：官杀制身');
    }else{
      add(BS[dw],30,'扶抑：印生身');
      add(dw,25,'扶抑：比劫帮身');
    }

    // (b) 调候：冬寒夏燥需调
    if(th){
      const primaryWx=GW[th.primary];
      const secondaryWx=GW[th.secondary];
      add(primaryWx,25,'调候：'+th.primary+'为主调候');
      add(secondaryWx,12,'调候：'+th.secondary+'为次调候');
    }

    // (c) 病药：找出命局最忌之神，取其克者
    const counts={};
    WX.forEach(w=>counts[w]=0);
    [b.Y.g,b.M.g,b.D.g,b.H.g].forEach(g=>counts[GW[g]]+=1);
    [b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>{
      (ZC_W[z]||[]).forEach(([cg,w])=>counts[GW[cg]]+=w);
    });
    let maxW='木',maxV=0;
    WX.forEach(w=>{if(w!==dw&&counts[w]>maxV){maxV=counts[w];maxW=w}});
    if(maxV>=3.5){
      add(KE[maxW],15,'病药：制'+maxW+'之病');
    }

    // (d) 通关：若两强对峙
    WX.forEach(a=>WX.forEach(b2=>{
      if(KE[a]===b2&&counts[a]>=2.5&&counts[b2]>=2.5){
        const tg=SH[a]; // 通关者
        if(tg!==dw||!str.strong){
          add(tg,10,'通关：化'+a+'生'+b2);
        }
      }
    }));

    // 排序取主用神
    const sorted=Object.entries(cands).sort((a,b)=>b[1].score-a[1].score);
    if(!sorted.length)return{primary:SH[dw],secondary:KE[dw],candidates:{},reasons:['默认取食伤']};
    return{
      primary: sorted[0][0],
      secondary: sorted[1]?sorted[1][0]:null,
      candidates: cands,
      reasons: sorted[0][1].reasons
    };
  }

  /* ——— 4. 格局判定（子平真诠） ——— */
  function pattern(b, ss, str){
    const out={main:null, type:'正格', detail:[], grade:'B'};
    const mz=b.M.z, mw=ZW[mz];
    const dg=b.D.g, dw=GW[dg];
    const monthHidden=(ZC_W[mz]||[]).map(x=>x[0]);
    const allG=[b.Y.g,b.M.g,b.H.g];

    // ① 月令本气透干优先
    const benqi=monthHidden[0];
    let lord=null;
    if(benqi && benqi!==dg){
      // 是否透干
      if(allG.includes(benqi)) lord=benqi;
      else if(monthHidden[1] && allG.includes(monthHidden[1])) lord=monthHidden[1];
      else lord=benqi; // 不透取本气
    }

    if(lord){
      const ssName=SS[dg][lord];
      const map={
        '正官':'正官格','七杀':'七杀格','偏官':'七杀格',
        '正财':'正财格','偏财':'偏财格',
        '正印':'正印格','偏印':'偏印格',
        '食神':'食神格','伤官':'伤官格',
        '比肩':'建禄格','劫财':'月刃格'
      };
      out.main=map[ssName]||'杂气格';
      out.detail.push('月令'+mz+'透'+lord+'('+ssName+')');
    }

    // ② 变格判断：极旺/极弱时考虑从格、化气格
    if(str.extreme){
      if(str.score<=-60){
        // 身极弱 → 看是否成从
        const cnt={财:0,官:0,食:0};
        [b.Y.g,b.M.g,b.H.g,b.Y.z,b.M.z,b.D.z,b.H.z].forEach(c=>{
          const w=c.length>1?0:1;
          if(!w&&!ZC_W[c])return;
          const gan=GW[c]?c:null;
          if(gan){
            const w2=GW[gan];
            if(w2===KE[dw])cnt.财++;
            if(w2===BK[dw])cnt.官++;
            if(w2===SH[dw])cnt.食++;
          }
        });
        const max=Math.max(cnt.财,cnt.官,cnt.食);
        if(max>=3){
          out.type='从格';
          out.main=cnt.财===max?'从财格':cnt.官===max?'从官杀格':'从儿格';
          out.grade='A';
          out.detail.push('日主极弱，从'+(cnt.财===max?'财':cnt.官===max?'官杀':'食伤'));
        }
      } else if(str.score>=60){
        // 身极旺 → 专旺格
        out.type='从强格';
        out.main='专旺格('+dw+')';
        out.grade='A';
        out.detail.push('日主极旺，五行专一');
      }
    }

    // ③ 评级：是否破格
    if(out.main && out.type==='正格'){
      // 有相神护卫 → A；有破坏 → C
      out.grade='B';
    }

    return out;
  }

  /* ——— 5. 十神质量评估（有根/透出/被破） ——— */
  function tenGodQuality(b, ss){
    const dg=b.D.g;
    const allG=[b.Y.g,b.M.g,b.H.g];
    const allZ=[b.Y.z,b.M.z,b.D.z,b.H.z];
    const result={};
    const tenGods=['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];

    tenGods.forEach(sg=>{
      let transparent=0, rooted=0, hidden=0;
      // 透干
      allG.forEach(g=>{ if(g && SS[dg][g]===sg) transparent++; });
      // 藏支
      allZ.forEach(z=>{
        (ZC_W[z]||[]).forEach(([cg,w])=>{
          if(SS[dg][cg]===sg) hidden+=w;
        });
      });
      rooted = transparent>0 && hidden>0.5;
      const quality = transparent*2 + hidden*1 + (rooted?1:0);
      result[sg]={transparent, hidden:Math.round(hidden*10)/10, rooted, quality:Math.round(quality*10)/10};
    });
    return result;
  }

  /* ——— 6. 干支互动：合、冲、刑、害、会 ——— */
  function interactions(b){
    const gz=[b.Y,b.M,b.D,b.H];
    const labels=['年','月','日','时'];
    const out={gan_he:[],zhi_he:[],zhi_chong:[],zhi_xing:[],zhi_hai:[],san_he:[],san_hui:[]};

    // 天干五合
    const ganHe={甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      if(ganHe[gz[i].g]===gz[j].g) out.gan_he.push({a:labels[i]+gz[i].g,b:labels[j]+gz[j].g});
    }

    // 地支六合
    const zhiHe={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
    // 地支六冲
    const zhiChong={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    // 地支相害
    const zhiHai={子:'未',未:'子',丑:'午',午:'丑',寅:'巳',巳:'寅',卯:'辰',辰:'卯',申:'亥',亥:'申',酉:'戌',戌:'酉'};
    // 地支相刑（不含三刑）
    const zhiXing=[['寅','巳'],['巳','申'],['申','寅'],['丑','戌'],['戌','未'],['未','丑'],['子','卯']];
    const ziXing=['辰','午','酉','亥']; // 自刑

    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      const a=gz[i].z, c=gz[j].z;
      if(zhiHe[a]===c) out.zhi_he.push({a:labels[i]+a,b:labels[j]+c});
      if(zhiChong[a]===c) out.zhi_chong.push({a:labels[i]+a,b:labels[j]+c});
      if(zhiHai[a]===c) out.zhi_hai.push({a:labels[i]+a,b:labels[j]+c});
      if(zhiXing.some(p=>(p[0]===a&&p[1]===c)||(p[0]===c&&p[1]===a))) out.zhi_xing.push({a:labels[i]+a,b:labels[j]+c});
    }
    // 自刑
    const zhCount={};
    [b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>{zhCount[z]=(zhCount[z]||0)+1});
    ziXing.forEach(z=>{ if(zhCount[z]>=2) out.zhi_xing.push({a:z,b:z,self:1}); });

    // 三合
    const sanHe=[['申','子','辰','水'],['亥','卯','未','木'],['寅','午','戌','火'],['巳','酉','丑','金']];
    sanHe.forEach(([a,b1,c,wx])=>{
      const has=[a,b1,c].filter(x=>zhCount[x]);
      if(has.length===3) out.san_he.push({zhi:a+b1+c,wx,full:1});
      else if(has.length===2) out.san_he.push({zhi:has.join(''),wx,full:0,half:1});
    });
    // 三会
    const sanHui=[['寅','卯','辰','木'],['巳','午','未','火'],['申','酉','戌','金'],['亥','子','丑','水']];
    sanHui.forEach(([a,b1,c,wx])=>{
      const has=[a,b1,c].filter(x=>zhCount[x]);
      if(has.length===3) out.san_hui.push({zhi:a+b1+c,wx});
    });

    return out;
  }

  /* ——— 7. 大运/流年高级评分（-100~100） ——— */
  function pillarScore(b, str, ys, gz){
    // gz: {g,z}
    if(!gz||!gz.g||!gz.z)return{score:0,reasons:[]};
    const dg=b.D.g, dw=str.dw;
    const ganWx=GW[gz.g], zhiWx=ZW[gz.z];
    let score=0;
    const reasons=[];

    // 天干层面
    if(ganWx===ys.primary){score+=30;reasons.push('天干为主用神'+ys.primary);}
    else if(ys.secondary&&ganWx===ys.secondary){score+=18;reasons.push('天干为次用神');}
    else if(str.strong){
      if(ganWx===KE[dw]){score+=15;reasons.push('财耗身（身旺喜财）');}
      else if(ganWx===SH[dw]){score+=12;reasons.push('食伤泄秀');}
      else if(ganWx===BK[dw]){score+=10;reasons.push('官杀制身');}
      else if(ganWx===BS[dw]){score-=15;reasons.push('印生身（身旺忌印）');}
      else if(ganWx===dw){score-=18;reasons.push('比劫帮身（身旺忌比劫）');}
    }else{
      if(ganWx===BS[dw]){score+=18;reasons.push('印星生身');}
      else if(ganWx===dw){score+=12;reasons.push('比劫帮身');}
      else if(ganWx===BK[dw]){score-=22;reasons.push('官杀克身（身弱大忌）');}
      else if(ganWx===KE[dw]){score-=12;reasons.push('财耗身（身弱难担）');}
      else if(ganWx===SH[dw]){score-=10;reasons.push('食伤泄气');}
    }

    // 地支层面（藏干加权）
    (ZC_W[gz.z]||[]).forEach(([cg,w])=>{
      const cw=GW[cg];
      if(cw===ys.primary)score+=15*w;
      else if(ys.secondary&&cw===ys.secondary)score+=8*w;
      else if(str.strong){
        if(cw===KE[dw])score+=8*w;
        else if(cw===dw)score-=10*w;
      }else{
        if(cw===BS[dw])score+=10*w;
        else if(cw===BK[dw])score-=12*w;
      }
    });

    // 刑冲（与日支、月支）
    const chongMap={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    if(chongMap[gz.z]===b.D.z){score-=15;reasons.push('冲日支（变动·健康注意）');}
    if(chongMap[gz.z]===b.M.z){score-=10;reasons.push('冲月支（事业·家庭变化）');}
    if(gz.z===b.Y.z){score-=5;reasons.push('伏吟年支（本命之年）');}

    // 天克地冲（大忌）
    const ganChong={甲:'庚',乙:'辛',丙:'壬',丁:'癸',戊:'甲',己:'乙',庚:'丙',辛:'丁',壬:'戊',癸:'己'};
    if(ganChong[gz.g]===b.D.g && chongMap[gz.z]===b.D.z){
      score-=25;reasons.push('天克地冲日柱（重大变动）');
    }

    score=Math.max(-100,Math.min(100,Math.round(score)));
    return{score,reasons,label: score>=60?'大吉':score>=30?'吉':score>=10?'平稳偏吉':score>=-10?'平':score>=-30?'平稳偏凶':score>=-60?'凶':'大凶'};
  }

  /* ——— 8. 流年事件类型预测 ——— */
  function yearEvents(b, dg, str, gz, dyGz){
    if(!gz)return[];
    const events=[];
    const lnSS=SS[dg][gz.g]||'';
    const dySS=dyGz?(SS[dg][dyGz.g]||''):'';
    const chongMap={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
    const heMap={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};

    // 十神事件
    if(lnSS==='正官'||lnSS==='七杀'){
      events.push({type:'事业',tag:str.strong?'升职/承担':'压力/受挫',weight:8});
    }
    if(lnSS==='正财'||lnSS==='偏财'){
      events.push({type:'财富',tag:str.strong?'进财机会':'破财/操劳',weight:8});
    }
    if(lnSS==='食神'||lnSS==='伤官'){
      events.push({type:'表达',tag:'创作/才华显露/子女',weight:6});
    }
    if(lnSS==='正印'||lnSS==='偏印'){
      events.push({type:'学习',tag:'进修/贵人/文书',weight:6});
    }
    if(lnSS==='比肩'||lnSS==='劫财'){
      events.push({type:'人际',tag:'合作/竞争/争财',weight:5});
    }

    // 配偶星动 → 感情事件
    const spouseStar = (b.D.gi%2===0)?'正财':'正官'; // 阳干以正财为妻，阴干以正官为夫
    if(lnSS===spouseStar || lnSS===(b.D.gi%2===0?'偏财':'七杀')){
      events.push({type:'感情',tag:'配偶星到位（婚恋机遇）',weight:9});
    }
    // 配偶宫(日支)被冲合
    if(chongMap[gz.z]===b.D.z) events.push({type:'感情',tag:'配偶宫被冲（关系动荡）',weight:7});
    if(heMap[gz.z]===b.D.z) events.push({type:'感情',tag:'配偶宫逢合（关系升温）',weight:7});

    // 岁运并临
    if(dyGz&&dyGz.g===gz.g&&dyGz.z===gz.z){
      events.push({type:'变动',tag:'岁运并临（人生关键节点·吉凶皆烈）',weight:10});
    }

    return events.sort((a,b)=>b.weight-a.weight);
  }

  /* ——— 9. 综合命局质量评级 ——— */
  function lifeGrade(str, yong, pat, ints){
    let g=60;
    // 中和最佳
    if(str.label==='中和'||str.label==='中和偏旺')g+=8;
    else if(str.extreme) g+= pat.type!=='正格' ? 12 : -8; // 成从/专旺则吉，半生不熟则凶
    // 用神有力
    if(yong.candidates[yong.primary]&&yong.candidates[yong.primary].score>=40)g+=8;
    // 格局成立
    if(pat.grade==='A')g+=12;
    else if(pat.grade==='B')g+=4;
    // 互动：合多吉，冲刑多凶（适度反而灵动）
    g += Math.min(ints.zhi_he.length*3,9);
    g += ints.san_he.filter(x=>x.full).length*5;
    g -= Math.min(ints.zhi_chong.length*4,12);
    g -= Math.min(ints.zhi_xing.length*3,9);

    g=Math.max(20,Math.min(95,Math.round(g)));
    const tier= g>=85?'上上':g>=75?'上中':g>=65?'中上':g>=55?'中中':g>=45?'中下':'下中';
    return{score:g, tier};
  }

  /* ——— 主入口：一次计算所有派生量 ——— */
  function compute(b, ss){
    const str = strength(b);
    const th  = tiaoHou(b);
    const yong= yongShen(b, str, th);
    const pat = pattern(b, ss, str);
    const tgq = tenGodQuality(b, ss);
    const ints= interactions(b);
    const life= lifeGrade(str, yong, pat, ints);
    return{
      strength:str,
      tiaoHou:th,
      yongShen:yong,
      pattern:pat,
      tenGodQuality:tgq,
      interactions:ints,
      lifeGrade:life,
      // 暴露评分函数供大运/流年调用
      pillarScore:(gz)=>pillarScore(b,str,yong,gz),
      yearEvents:(gz,dyGz)=>yearEvents(b,b.D.g,str,gz,dyGz)
    };
  }

  return{ compute, pillarScore, yearEvents, _const:{ZC_W,CS_W,TIAO_HOU,W_TABLE} };
})();


function calcYearScores(b,wx,ss,dySS,lnSS,tjx,cDy,cLn){
  const dg=b.D.g,dw=GW[dg];
  const lnBonus=lnSS.includes('官')?12:lnSS.includes('印')?10:lnSS.includes('财')?8:lnSS.includes('食')?6:lnSS.includes('比')?3:0;
  const dyBonus=dySS.includes('官')?8:dySS.includes('印')?7:dySS.includes('财')?6:dySS.includes('食')?5:0;
  const ysRatio=wx.c[wx.ys]/wx.t;
  const monthHelp=(ZW[b.M.z]===wx.ys||ZW[b.M.z]===wx.xs)?8:0;
  let career=52+ysRatio*35+lnBonus+dyBonus*0.5+monthHelp*0.3+(wx.st?3:0);
  let wealth=48+(wx.c[wx.KE[dw]]/wx.t)*30+(lnSS.includes('财')?15:0)+(dySS.includes('财')?8:0)+ysRatio*15+monthHelp*0.3;
  let love=50+(wx.c['火']+wx.c['水'])/wx.t*20+(lnSS.includes('财')||lnSS.includes('官')?10:0)+(ss.dzc.some(c=>c.s.includes('财')||c.s.includes('官'))?8:0)+ysRatio*12;
  let health=55+((wx.t-Math.abs(wx.c[wx.s]-wx.c[wx.w]))/wx.t)*25+(wx.c[wx.w]>1?8:0)+ysRatio*10+monthHelp*0.2;

  // —— TJX 高级修正：把大运/流年的精算评分按权重融合 ——
  if(tjx){
    // 命局基础品质（成格/中和/用神有力）修正所有维度的"天花板"
    const baseFix=(tjx.lifeGrade.score-60)*0.15;
    career+=baseFix; wealth+=baseFix; love+=baseFix*0.6; health+=baseFix*0.4;

    // 用流年精算分（-100~100）按 0.25 权重修正
    if(tjx.lnScore){
      const lf=tjx.lnScore.score*0.18;
      career+=lf; wealth+=lf*0.9; love+=lf*0.5; health+=lf*0.4;
    }
    // 大运精算分按 0.12 权重
    if(tjx.dyScore){
      const df=tjx.dyScore.score*0.10;
      career+=df; wealth+=df; love+=df*0.4; health+=df*0.5;
    }
    // 刑冲扣健康/感情分
    const ints=tjx.interactions;
    health-=Math.min(ints.zhi_chong.length*2.5,8);
    health-=Math.min(ints.zhi_xing.length*2,6);
    love-=Math.min(ints.zhi_chong.length*2,7);
    // 三合/三会加事业财富
    const triFull=ints.san_he.filter(x=>x.full).length+ints.san_hui.length;
    career+=triFull*3; wealth+=triFull*3;
  }

  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,Math.round(v)));
  return{
    career:clamp(career,18,98),
    wealth:clamp(wealth,18,97),
    love:clamp(love,20,96),
    health:clamp(health,25,96)
  };
}

function calcPattern(ss){
  const pa=[],ash=[ss.yg,ss.mg,ss.hg];
  if(ash.includes('正官'))pa.push('正官格');
  if(ash.includes('七杀'))pa.push('七杀格');
  if(ash.includes('正财')||ash.includes('偏财'))pa.push('财星格');
  if(ash.includes('食神'))pa.push('食神格');
  if(ash.includes('伤官'))pa.push('伤官格');
  if(ash.includes('正印')||ash.includes('偏印'))pa.push('印绶格');
  if(!pa.length)pa.push('杂气格');
  return pa;
}

function buildContext(args){
  const{b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,P,gen,q,city,input}=args;
  const dg=b.D.g,dw=GW[dg];
  const by=input.by,bm=input.bm,bd=input.bd;
  const age=TJ.calcAge(by,bm,bd);
  const cDy=TJ.findDaYun(dy,age);
  const cLn=TJ.findLiuNian(ln,CURR_YEAR);
  const cLm=TJ.findLiuYue(liuyue);
  const dySS=cDy?TJ.ssOf(dg,cDy.g):'';
  const lnSS=cLn?TJ.ssOf(dg,cLn.g):'';
  const lmSS=cLm?TJ.ssOf(dg,cLm.gz.charAt(0)):'';
  const gl=gen==='male'?'乾造':'坤造';
  const pa=calcPattern(ss);
  // 预先算一次 TJX 用于评分修正（compute 内成本可接受，可缓存）
  let _tjxPre=null;
  try{_tjxPre=TJX.compute(b,ss);
      if(cDy)_tjxPre.dyScore=_tjxPre.pillarScore({g:cDy.g,z:cDy.z});
      if(cLn)_tjxPre.lnScore=_tjxPre.pillarScore({g:cLn.g,z:cLn.z});
  }catch(e){}
  const sc=calcYearScores(b,wx,ss,dySS,lnSS,_tjxPre,cDy,cLn);
  const shun=TJ.isShunDaYun(b,gen);
  return{
    input,
    b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,pa,P,
    gen,q,city,gl,
    by,bm,bd,age,
    dg,dz:b.D.z,dw,
    cDy,cDyIdx:cDy?cDy._idx:0,cDySS:dySS,
    cLn,cLnSS:lnSS,
    cLm,cLmSS:lmSS,
    dyShun:shun,
    dySS,lnSS,lmSS,
    scores:sc,
    cs:sc.career,ws:sc.wealth,ls:sc.love,hs:sc.health,
    ssOf:g=>TJ.ssOf(dg,g),
    /* —— TJX 精算内核派生量（复用 _tjxPre 避免重算）—— */
    tjx: (function(){
      try{
        const k=_tjxPre||TJX.compute(b,ss);
        if(cDy&&!k.dyScore)k.dyScore=k.pillarScore({g:cDy.g,z:cDy.z});
        if(cLn&&!k.lnScore)k.lnScore=k.pillarScore({g:cLn.g,z:cLn.z});
        k.lnEvents = cLn?k.yearEvents({g:cLn.g,z:cLn.z},cDy?{g:cDy.g,z:cDy.z}:null):[];
        return k;
      }catch(e){console.warn('TJX compute failed',e);return null;}
    })()
  };
}

function getCtx(){return window._ctx||null;}

/* ============================================================
   AI 人生顾问 · 信息库 KB（结构化知识，便于检索+跳转）
   ----
   FAQ 字段：
     id      唯一编号
     q       标准问题
     kw      关键词（用于模糊命中）
     intent  意图分类（事业/财富/感情/健康/学业/居住/玄学/综合）
     anchor  命中后跳转锚点 {sec, card}  sec ∈ {s-ming,s-yun,s-rel,s-adv}
     answer  动态答案函数(ctx) → 四段式字符串
     related 相关 FAQ id 列表
   ============================================================ */
const KB={
  routes:{
    bazi:        {sec:'s-ming',card:'bazi',     name:'四柱八字'},
    wuxing:      {sec:'s-ming',card:'wuxing',   name:'五行能量'},
    persona:     {sec:'s-ming',card:'persona',  name:'人格画像'},
    timeline:    {sec:'s-ming',card:'timeline', name:'人生时间线'},
    trend:       {sec:'s-yun', card:'trend',    name:'年度核心趋势'},
    focus:       {sec:'s-yun', card:'focus',    name:'当下关注'},
    monthly:     {sec:'s-yun', card:'focus',    name:'本月提醒',  sub:'monthly'},
    risk:        {sec:'s-yun', card:'focus',    name:'风险预警',  sub:'risk'},
    health:      {sec:'s-yun', card:'focus',    name:'健康调养',  sub:'health'},
    dayun:       {sec:'s-yun', card:'dayun',    name:'大运时间轴'},
    liuyue:      {sec:'s-yun', card:'liuyue',   name:'流月详解'},
    loveMode:    {sec:'s-rel', card:'loveMode', name:'感情模式'},
    loveMatch:   {sec:'s-rel', card:'loveMatch',name:'适合对象'},
    loveRisk:    {sec:'s-rel', card:'loveRisk', name:'关系风险'},
    relAi:       {sec:'s-rel', card:'relAi',    name:'AI 关系分析'},
    todayAdv:    {sec:'s-adv', card:'todayAdv', name:'今日建议'},
    daySign:     {sec:'s-adv', card:'daySign',  name:'今日日签'}
  },
  // 术语词典（点击解释，可直接出条目）
  terms:[
    {t:'用神',  d:'命局中最能平衡日主、补救失衡的五行。用神入运则顺。',  see:['wuxing','timeline']},
    {t:'喜神',  d:'辅助用神、对命主有利的五行，仅次于用神。',           see:['wuxing']},
    {t:'忌神',  d:'与用神相克、削弱命主的五行，运行此五行宜守不宜攻。',  see:['wuxing','risk']},
    {t:'日主',  d:'出生日的天干，代表命主本人的本质属性。',             see:['bazi','persona']},
    {t:'十神',  d:'其他天干与日主的生克关系，分比劫/食伤/财官/印枭。',  see:['bazi','dayun']},
    {t:'大运',  d:'每十年一变的运程，由月柱推演，影响人生中长期走势。', see:['dayun','timeline']},
    {t:'流年',  d:'每年的天干地支组合，是当年运势的"短期主因"。',       see:['trend','liuyue']},
    {t:'流月',  d:'每月的干支，决定该月主要顺逆与节气节点。',           see:['liuyue','monthly']},
    {t:'纳音',  d:'年柱六十甲子对应的五行别名，主大方向气质。',         see:['bazi']},
    {t:'神煞',  d:'桃花/驿马/天乙/华盖/魁罡等吉凶星，标注命局特征。',  see:['bazi']},
    {t:'桃花',  d:'人缘与异性缘之星，旺则魅力强，须警惕烂桃花。',       see:['loveMode','loveMatch']},
    {t:'驿马',  d:'变动、远行、奔波之星，逢之多有迁移机会。',           see:['risk']},
    {t:'华盖',  d:'孤独、艺术、玄学之星，思考者气质。',                 see:['persona']},
    {t:'魁罡',  d:'庚辰/庚戌/壬辰/戊戌四日，主刚烈聪明。',              see:['persona']},
    {t:'真太阳时',d:'按出生地经度精算的太阳时，比北京时间更准。',       see:['bazi']},
    {t:'身旺',  d:'日主得令、得地、得势，能担财官，宜主动出击。',        see:['persona','trend']},
    {t:'身弱',  d:'日主无力，宜印比扶身，财官为忌时不可贪。',           see:['persona','trend']},
    {t:'本命年',d:'流年地支与年柱地支相同的年份，宜守不宜攻。',         see:['timeline']},
    {t:'冲太岁',d:'流年地支冲本命年支，主变动、动荡。',                 see:['risk']},
    {t:'空亡',  d:'日柱旬中所缺的两个地支，主漂泊、精神空虚。',         see:['bazi']}
  ],
  // FAQ 库
  faqs:[
    // —— 事业 ——
    {id:'c1', q:'我适合什么行业？', kw:['行业','职业','工作','干什么','适合什么'], intent:'事业', anchor:'persona',
      answer:(d)=>{
        const wx=d.wx.dw, ys=d.wx.ys;
        const mp={木:'教育/文创/园林/设计/木材/出版',火:'传媒/演艺/餐饮/能源/广告/电子',土:'地产/建材/农业/物流/陶艺/医疗',金:'金融/法律/机械/IT/珠宝/汽车',水:'贸易/物流/旅游/海运/咨询/科研'};
        return [
          `日主属${wx}，先天气场偏向${mp[wx].split('/').slice(0,2).join('与')}类行业。`,
          `用神为${ys}，所以${mp[ys]}类工作能助你顺势上升。`,
          `避开过于${d.wx.KE[wx]}属性的领域（容易耗损精神）。`,
          `结合当前大运${d.cDy.g}${d.cDy.z}（十神${d.cDySS}），${d.cDySS.includes('官')?'宜在大组织内争取上升':d.cDySS.includes('财')?'适合做销售/客户/项目':d.cDySS.includes('印')?'适合做研究/教育/顾问':'适合做内容/创意/自由职业'}。`
        ];
      }, related:['c2','c3','t1']},
    {id:'c2', q:'我适合创业吗？', kw:['创业','开公司','单干','自己干'], intent:'事业', anchor:'trend',
      answer:(d)=>{
        const ok=d.wx.st&&(d.cDySS.includes('财')||d.cDySS.includes('食')||d.cDySS.includes('伤'));
        return [
          ok?'命局支持创业，但要选对时机和合伙人。':'更适合先在大公司练内功，或采用副业验证模式。',
          `身${d.wx.st?'旺':'弱'}+大运十神${d.cDySS}：${ok?'能担风险，主动出击有回报':'当前抗风险能力不足，盲目all-in易折损'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁这步大运（${d.cDy.g}${d.cDy.z}）${ok?'是个不错的窗口':'更适合积累资源'}；${CURR_YEAR}流年${d.cLn.g}${d.cLn.z}（${d.cLnSS}）${d.cLnSS.includes('财')?'有偏财机会':'宜稳不宜攻'}。`,
          ok?'1) 现金流>梦想，先确保6个月生活费\n2) 找土/金属性的合伙人补己之短\n3) 秋季启动最佳':'1) 先用副业跑通商业模型\n2) 一年内别裸辞\n3) 加强用神'+d.wx.ys+'方位的人脉'
        ];
      }, related:['c1','f1','c5']},
    {id:'c3', q:'我适合升职还是跳槽？', kw:['升职','跳槽','换工作','跳','离职'], intent:'事业', anchor:'trend',
      answer:(d)=>{
        const go=d.lnSS.includes('官')||d.lnSS.includes('财')||d.cDySS.includes('官');
        return [
          go?'今年支持职位变动，建议主动出击。':'今年宜稳守，把当前位置做扎实。',
          `流年十神${d.lnSS}+大运十神${d.cDySS}：${go?'官财之气助力，外部贵人多':'气场偏内向，外动易受挫'}。`,
          `${CURR_YEAR}${go?'未来 3-5 个月是窗口，秋季尤佳':'建议等到明年春季再做大决策'}。`,
          go?'1) 先拿 Offer 再离职，杜绝裸辞\n2) 谈薪资时要硬，今年值\n3) 多见行业前辈':'1) 把手上项目做出代表作\n2) 多向直属上级表态\n3) 副业积累备用方向'
        ];
      }, related:['c2','c4']},
    {id:'c4', q:'我和领导关系怎样？', kw:['领导','上司','老板','上级','上面'], intent:'事业', anchor:'persona',
      answer:(d)=>{
        const has=d.ss.yg.includes('官')||d.ss.mg.includes('官');
        return [
          has?'命中带官星，与上级缘分较深，但需注意尊卑。':'命中官星不显，靠业绩与人品赢得上级认可更稳。',
          `日主${d.dg}（${d.wx.dw}），${d.wx.st?'身旺需收敛锋芒':'身弱宜借力上位'}。`,
          `当前流年${d.cLn.g}${d.cLn.z}（${d.lnSS}）${d.lnSS.includes('官')?'与上级互动密集':'更适合做事而非做关系'}。`,
          '1) 每周主动汇报进度\n2) 别在上级面前说同事坏话\n3) 重要决策前征询意见'
        ];
      }, related:['c3','c1']},
    {id:'c5', q:'我适合做管理还是技术？', kw:['管理','技术','带团队','一线','专业'], intent:'事业', anchor:'persona',
      answer:(d)=>{
        const mg=(d.ss.yg+d.ss.mg+d.ss.hg).includes('官')||d.wx.st;
        return [
          mg?'更适合带团队/做管理。':'更适合钻研专业/做技术高手。',
          `${d.wx.st?'身旺有担当':'身弱重精专'}，加上${d.ss.yg+'/'+d.ss.mg}的十神组合：${mg?'指挥力强':'内功深'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁大运${d.cDy.g}${d.cDy.z}：${d.cDySS.includes('官')?'是带团队的好阶段':'是专业突破期'}。`,
          mg?'1) 学一门项目管理方法论\n2) 多复盘人事冲突案例\n3) 关注下属成长':'1) 每月输出 1 篇深度文章\n2) 考行业顶级证书\n3) 在专业社群建立影响力'
        ];
      }, related:['c1','c3']},
    // —— 财富 ——
    {id:'f1', q:'我什么时候财运最好？', kw:['财运','发财','偏财','正财','钱','赚钱'], intent:'财富', anchor:'timeline',
      answer:(d)=>{
        const peaks=d.dy.ds.map(x=>({gz:x.g+x.z,as:x.as,ae:x.ae,ss:TJ.ssOf(d.dg,x.g)})).filter(x=>x.ss.includes('财'));
        const txt=peaks.length?peaks.map(p=>`${p.as}-${p.ae}岁（${p.gz}·${p.ss}）`).join('、'):'无明显财运大运，需靠正业积累';
        return [
          peaks.length?`你的"财运大运"集中在：${txt}。`:'命中财星不旺，宜走"稳健聚财"路线。',
          `日主${d.dg}（${d.wx.dw}），财星为${d.wx.KE[d.wx.dw]}。${d.wx.st?'身旺能担财':'身弱财为忌'}。`,
          `当前大运${d.cDy.g}${d.cDy.z}（${d.cDySS}）：${d.cDySS.includes('财')?'十年财路较活':'十年以专业积累为主'}。${CURR_YEAR}流年${d.lnSS.includes('财')?'是个不错的来财窗口':'以正财稳收为主'}。`,
          d.wx.st?'1) 用神'+d.wx.ys+'方位适合做投资\n2) 远离朋友借贷\n3) 适度配置股权/不动产':'1) 先把储蓄做厚\n2) 远离杠杆和高风险投机\n3) 副业 < 主业 1/3'
        ];
      }, related:['f2','f3','c2']},
    {id:'f2', q:'我适合投资吗？', kw:['投资','理财','基金','股票','炒股','买房','买股票'], intent:'财富', anchor:'trend',
      answer:(d)=>{
        const ok=d.lnSS.includes('财')&&d.wx.st;
        return [
          ok?'今年存在偏财机会，但忌贪心。':'今年以稳健储蓄/固收为主，远离高风险。',
          `身${d.wx.st?'旺':'弱'}+流年十神${d.lnSS}：${ok?'命局能担起波动':'抗回撤能力不足'}。`,
          `${CURR_YEAR}${ok?'农历七月前后是窗口':'全年保持现金为王'}。`,
          ok?'1) 小仓位试水，见好就收\n2) 别加杠杆\n3) 收益>30% 就分批止盈':'1) 远离加密货币、期权\n2) 把钱放货币基金或定存\n3) 不懂的不碰'
        ];
      }, related:['f1','c2']},
    {id:'f3', q:'我会不会破财？', kw:['破财','亏钱','损失','倒霉','坑','骗'], intent:'财富', anchor:'risk',
      answer:(d)=>{
        const risk=d.cDySS==='劫财'||d.lnSS==='劫财'||(d.wx.c[d.wx.KE[d.wx.dw]]/d.wx.t>0.4&&!d.wx.st);
        return [
          risk?'近期有破财信号，重点防范朋友借贷与冲动消费。':'整体财气平和，无显著破财风险。',
          `当前大运十神${d.cDySS}、流年十神${d.lnSS}：${risk?'比劫争财之象明显':'未见明显劫破信号'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁这步运${risk?'要特别注意担保、合伙、追高':'适合稳健配置'}。`,
          '1) 借钱必签纸面协议\n2) 不投自己不懂的项目\n3) 远离"稳赚"和"内部消息"'
        ];
      }, related:['f2','f1']},
    // —— 感情 ——
    {id:'l1', q:'我的正缘什么时候出现？', kw:['正缘','结婚','姻缘','另一半','对象','找对象','正桃花'], intent:'感情', anchor:'loveMode',
      answer:(d)=>{
        const star=d.gen==='male'?'财':'官';
        const peaks=d.dy.ds.map(x=>({gz:x.g+x.z,as:x.as,ae:x.ae,ss:TJ.ssOf(d.dg,x.g)})).filter(x=>x.ss.includes(star));
        return [
          peaks.length?`你的姻缘大运在：${peaks.map(p=>`${p.as}-${p.ae}岁（${p.gz}·${p.ss}）`).join('、')}。`:'命中配偶星不显，更可能在熟人引荐中遇到。',
          `${d.gen==='male'?'男命以财星为妻':'女命以官星为夫'}，五行属${d.wx.KE[d.wx.dw]}。`,
          `${CURR_YEAR}流年${d.cLn.g}${d.cLn.z}（${d.lnSS}）：${d.lnSS.includes(star)?'配偶星到位，未婚利结合':'感情节奏偏稳，宜深度经营'}。`,
          '1) 多去用神方位（'+d.wx.ys+'对应：'+({木:'东',火:'南',土:'中',金:'西',水:'北'})[d.wx.ys]+'）的活动\n2) 别在冲太岁月份做决定\n3) 朋友介绍优于陌生人社交'
        ];
      }, related:['l2','l3']},
    {id:'l2', q:'我感情的问题在哪？', kw:['感情问题','矛盾','吵架','分手','冷战','沟通'], intent:'感情', anchor:'loveRisk',
      answer:(d)=>{
        const issues=[];
        if(d.wx.st)issues.push('过于强势，容易忽略对方感受');
        if(!d.wx.st)issues.push('过度迁就，边界感弱导致委屈');
        if((d.ss.dzc||[]).some(c=>c.s.includes('伤官')))issues.push('言语锋利，沟通方式容易伤人');
        if(d.wx.c['火']>3)issues.push('情绪上头时不计后果');
        if(d.wx.c['水']>2.8)issues.push('思虑过多，容易猜疑');
        return [
          issues.length?'核心问题：'+issues[0]+'。':'命局感情场偏平和，无显著结构性问题。',
          `日主${d.dg}（${d.wx.dw}），${d.wx.st?'身旺':'身弱'}：${issues.join('、')||'相处节奏平稳'}。`,
          d.shensha&&d.shensha.some(s=>s.n==='桃花')?'命带桃花，异性缘强但需筛选。':'桃花不显，缘分多来自熟人。',
          '1) 每周固定一次"深度对话时间"\n2) 吵架不过夜，72 小时内必须复盘\n3) 给对方留独处空间'
        ];
      }, related:['l1','l3']},
    {id:'l3', q:'什么样的人适合我？', kw:['什么人适合','找什么样','理想型','配偶','另一半性格','相配'], intent:'感情', anchor:'loveMatch',
      answer:(d)=>{
        const mp={木:'稳重务实、土金属性强的人',火:'包容耐心、能给空间的人',土:'有上进心、能带来新意的人',金:'温柔细腻、善于沟通的人',水:'逻辑清晰、有安全感的人'};
        return [
          `适合${mp[d.wx.dw]}。`,
          `你日主属${d.wx.dw}，需要"${d.wx.KE[d.wx.dw]}/${d.wx.ys}"属性的人来平衡。`,
          `避开同样${d.wx.dw}属性、且性格强势的人（容易竞争）。`,
          '1) 看对方的"稳定输出能力"而非短期热情\n2) 注意对方原生家庭的财务习惯\n3) 三观大方向 > 兴趣爱好细节'
        ];
      }, related:['l1','l2']},
    {id:'l4', q:'今年桃花运怎样？', kw:['桃花','异性缘','艳遇','缘分','烂桃花'], intent:'感情', anchor:'loveMode',
      answer:(d)=>{
        const has=d.shensha&&d.shensha.some(s=>s.n==='桃花'||s.n==='红艳');
        const hot=d.lnSS.includes('财')||d.lnSS.includes('官');
        return [
          hot?'今年桃花气场旺，质量需筛选。':has?'命局桃花潜在，但需主动激发。':'桃花平淡，重在深耕已有关系。',
          `命中${has?'带桃花/红艳':'无显桃花'}+流年十神${d.lnSS}：${hot?'外缘多，但易遇虚情':'缘分浅，更利稳定关系'}。`,
          hot?'警惕已婚/异地等不稳定关系，烂桃花成本极高。':'平稳期适合修炼自身吸引力。',
          '1) 多参加 3 人以上小型聚会\n2) 别在喝酒后做承诺\n3) 已有伴侣者主动避嫌'
        ];
      }, related:['l1','l2']},
    // —— 健康 ——
    {id:'h1', q:'我身体哪里要注意？', kw:['健康','身体','病','哪里弱','器官','养生'], intent:'健康', anchor:'health',
      answer:(d)=>{
        const HM={木:'肝胆/眼睛',火:'心脏/血液',土:'脾胃/消化',金:'肺部/皮肤',水:'肾脏/泌尿'};
        return [
          `重点关注：${HM[d.wx.w]}（你最弱的五行）。`,
          `最旺五行为${d.wx.s}，对应${HM[d.wx.s]}也易过亢；最弱为${d.wx.w}，对应器官较脆弱。`,
          d.shensha&&d.shensha.some(s=>s.n==='天医')?'命带天医，对医疗/养生本能强，恢复力佳。':'无显著健康神煞，整体平衡。',
          '1) 每年做一次相关器官专项体检\n2) 饮食上多补'+d.wx.w+'属性食物\n3) 23 点前必须入睡'
        ];
      }, related:['h2','h3']},
    {id:'h2', q:'我容易失眠/焦虑吗？', kw:['失眠','焦虑','睡眠','压力','精神','烦躁','抑郁'], intent:'健康', anchor:'health',
      answer:(d)=>{
        const fy=d.wx.c['火']>2.5&&d.wx.dw!=='火';
        const sy=d.wx.c['水']>2.5&&d.wx.dw!=='水';
        return [
          (fy||sy)?'命局水火失衡，确实容易失眠/思虑过度。':'命局气场平和，睡眠问题主要来自外因。',
          fy?'火气过旺，心神难定，易半夜醒。':sy?'水气过重，思绪太多，难入睡。':'整体平衡，无显著结构性问题。',
          `${CURR_YEAR}流年${d.cLn.g}${d.cLn.z}：${d.lnSS.includes('官')?'压力指数较高，注意减压':'气场较稳'}。`,
          '1) 22 点后不刷手机\n2) 每天 30 分钟正念/冥想\n3) 卧室避免红色与电子产品'
        ];
      }, related:['h1']},
    {id:'h3', q:'我需要做什么养生？', kw:['养生','调养','保健','补','怎么调'], intent:'健康', anchor:'health',
      answer:(d)=>{
        const adv={木:'清淡饮食，少酒；多绿叶菜；舒展型运动如瑜伽',火:'清心降火，少辛辣；多苦味/红色食物；慢跑/游泳',土:'规律三餐，少甜腻；多黄色食物；散步/太极',金:'润肺，远烟尘；多白色食物（梨/百合）；呼吸训练',水:'温补，护肾；多黑色食物（黑豆/芝麻）；早睡为王'};
        return [
          `针对你日主${d.wx.dw}：${adv[d.wx.dw]}。`,
          `最弱${d.wx.w}对应${({木:'肝',火:'心',土:'脾',金:'肺',水:'肾'})[d.wx.w]}：${adv[d.wx.w]}。`,
          `用神${d.wx.ys}方位有助：${({木:'东方公园',火:'南方海岛',土:'家中静修',金:'西方山林',水:'北方湿地'})[d.wx.ys]}。`,
          '1) 节气日（立春/立夏等）调整饮食\n2) 每年体检报告横向对比\n3) 中医调理优于西药压制'
        ];
      }, related:['h1','h2']},
    // —— 学业 ——
    {id:'s1', q:'我适合继续读书/考研吗？', kw:['考研','学业','读书','考试','留学','深造','进修'], intent:'学业', anchor:'persona',
      answer:(d)=>{
        const ok=(d.ss.yg+d.ss.mg+d.ss.hg).includes('印')||d.shensha&&d.shensha.some(s=>s.n==='文昌');
        return [
          ok?'命局支持继续深造，学历能助力。':'比起学历，"实战经验+证书"对你更高效。',
          `命中${ok?'带印星/文昌':'无显文昌印星'}：${ok?'天生学术气场强':'更适合在实践中迭代'}。`,
          `${d.cDy.as}-${d.cDy.ae}岁大运${d.cDy.g}${d.cDy.z}（${d.cDySS}）：${d.cDySS.includes('印')?'是读书黄金期':'更适合做事而非读书'}。`,
          ok?'1) 选学校优于选专业\n2) 提前 1 年准备\n3) 找导师建立学术圈':'1) 在职考最有用的硬证书\n2) 投资课程而非学位\n3) 找业内 mentor 优于读名校'
        ];
      }, related:['c1','c5']},
    // —— 居住/出行 ——
    {id:'r1', q:'我适合搬家或出国吗？', kw:['搬家','出国','移民','换城市','迁移','远行','旅行'], intent:'居住', anchor:'risk',
      answer:(d)=>{
        const has=d.shensha&&d.shensha.some(s=>s.n==='驿马');
        return [
          has?'命带驿马，迁移变动是顺势而为，宜动不宜静。':'命中驿马不显，远迁阻力较大，需做好心理准备。',
          `日主${d.dg}（${d.wx.dw}）适合的方位：${({木:'东方/东南',火:'南方',土:'西南/东北/中部',金:'西方/西北',水:'北方'})[d.wx.ys]}（用神方位）。`,
          `${CURR_YEAR}${d.lnSS.includes('财')||d.lnSS.includes('官')?'流年有利变动':'流年宜稳'}。`,
          '1) 春季启动手续最佳\n2) 选择用神方位的城市/国家\n3) 大件物品分批运输降风险'
        ];
      }, related:['c3']},
    {id:'r2', q:'什么方位对我有利？', kw:['方位','风水','朝向','方向','东南西北'], intent:'居住', anchor:'wuxing',
      answer:(d)=>{
        const dirMap={木:'东/东南',火:'南/东南',土:'中/西南/东北',金:'西/西北',水:'北/西北'};
        return [
          `你的用神方位：${dirMap[d.wx.ys]}（用神${d.wx.ys}）。`,
          '住房选用神方位的城市/区域；办公桌朝向用神方位；床头避开忌神方位。',
          `忌神为${d.wx.KE[d.wx.dw]}（方位：${dirMap[d.wx.KE[d.wx.dw]]}），尽量避开长期居住。`,
          '1) 看房时带指南针\n2) 客厅主沙发面朝用神方位\n3) 卧室色调用用神对应色'
        ];
      }, related:['r1','h3']},
    // —— 玄学/术语 ——
    {id:'t1', q:'什么是用神？', kw:['用神','喜神','忌神','什么是用神'], intent:'玄学', anchor:'wuxing',
      answer:(d)=>{
        return [
          `你的用神是 ${d.wx.ys}，喜神是 ${d.wx.xs}。用神入运则顺。`,
          `用神是命局中最能平衡日主的五行——你的日主${d.wx.dw}${d.wx.st?'偏旺，需要被克泄':'偏弱，需要被生扶'}，因此用神为${d.wx.ys}。`,
          `下一步用神大运在：${(d.dy.ds.find(x=>GW[x.g]===d.wx.ys)||{}).g||'-'}${(d.dy.ds.find(x=>GW[x.g]===d.wx.ys)||{}).z||'-'}时段。`,
          '1) 多接触用神属性的人/事/物\n2) 用神对应色为主色调\n3) 避开忌神方位长期停留'
        ];
      }, related:['t2','r2']},
    {id:'t2', q:'什么是大运？', kw:['大运','十年运','大运是什么','怎么排'], intent:'玄学', anchor:'timeline',
      answer:(d)=>{
        return [
          '大运是从月柱推演的"十年运程"，由出生节气决定起运岁数与排序方向。',
          `你 ${d.dy.sa} 岁起运，${d.dyShun?'顺':'逆'}排（基于年柱阴阳与性别）。`,
          `当前在第 ${d.cDyIdx+1} 步：${d.cDy.g}${d.cDy.z}（${d.cDy.as}~${d.cDy.ae}岁）`,
          '1) 大运比流年影响更深远\n2) 干支各主前/后五年\n3) 用神运是黄金时期'
        ];
      }, related:['t1']},
    {id:'t3', q:'什么是身旺身弱？', kw:['身旺','身弱','身强','旺衰','旺还是弱'], intent:'玄学', anchor:'persona',
      answer:(d)=>{
        return [
          `你${d.wx.st?'身旺':'身弱'}。${d.wx.st?'能担财官，宜主动出击':'宜借助印比扶身，财官为忌时不可贪'}。`,
          '身旺=日主得令/得地/得势；身弱反之。判断要看月令、地支根基、天干助力。',
          `你的日主${d.wx.dw}在月令${d.b.M.z}：${(d.wx.dw===ZW[d.b.M.z])?'得令':(d.wx.SH&&d.wx.SH[d.wx.dw]===ZW[d.b.M.z])?'得气':'失令'}。`,
          d.wx.st?'1) 适合 All-in 主业\n2) 用神为克泄之物\n3) 避免比劫之运':'1) 适合稳健蓄势\n2) 用神为印比生扶\n3) 财官旺运须借力'
        ];
      }, related:['t1','t2']},
    // —— 综合/迷茫 ——
    {id:'g1', q:'我最近为什么压力大？', kw:['压力','焦虑','瓶颈','迷茫','烦','累','低谷'], intent:'综合', anchor:'monthly',
      answer:(d)=>{
        const ke=d.wx.KE[d.wx.dw];
        const heavy=d.cDySS.includes('官')||d.lnSS.includes('官')||d.lmSS.includes('官');
        return [
          heavy?'近期官杀气重，压力指数偏高。':'气场平和，压力多来自外因或自我要求过高。',
          `当前大运${d.cDy.g}${d.cDy.z}（${d.cDySS}）+ 流年${d.cLn.g}${d.cLn.z}（${d.lnSS}）+ 流月${d.cLm?d.cLm.gz:'-'}（${d.lmSS}）：${heavy?'三层叠加，主压力与升迁并存':'平和无明显冲克'}。`,
          d.wx.c[ke]/d.wx.t>0.3?`忌神${ke}偏旺，气场易耗损。`:'忌神不旺，能量恢复较快。',
          '1) 每天 15 分钟独处时间\n2) 用神'+d.wx.ys+'相关活动可补气\n3) 周末半天彻底不接工作'
        ];
      }, related:['h2','g2']},
    {id:'g2', q:'我未来 10 年走势如何？', kw:['未来','走势','10年','发展','人生','规划'], intent:'综合', anchor:'timeline',
      answer:(d)=>{
        const next=d.dy.ds[d.cDyIdx+1];
        return [
          `你正处在第 ${d.cDyIdx+1} 步大运 ${d.cDy.g}${d.cDy.z}（${d.cDy.as}~${d.cDy.ae}岁）。`,
          `本步十神${d.cDySS}：${d.cDySS.includes('官')?'仕途权位期':d.cDySS.includes('财')?'财富积累期':d.cDySS.includes('印')?'学养贵人期':d.cDySS==='食神'?'才华享受期':d.cDySS==='伤官'?'叛逆突破期':'过渡周期'}。`,
          next?`下一步 ${next.g}${next.z}（${next.as}~${next.ae}岁），十神${TJ.ssOf(d.dg,next.g)}，主题将转向${TJ.ssOf(d.dg,next.g).includes('财')?'财富':TJ.ssOf(d.dg,next.g).includes('官')?'权位':TJ.ssOf(d.dg,next.g).includes('印')?'学养':'内省'}。`:'已进入最后阶段，宜传承与沉淀。',
          '1) 切换大运前一年开始铺垫\n2) 用神运全力推进\n3) 忌神运转守势'
        ];
      }, related:['g1','t2']}
  ]
};

/* ============================================================
   AI 搜索引擎
   ============================================================ */
const KBSearch={
  // Levenshtein 距离归一化为 0~1 的相似度
  similar(a,b){
    a=String(a||'').toLowerCase();b=String(b||'').toLowerCase();
    if(!a||!b)return 0;
    if(a===b)return 1;
    if(a.includes(b)||b.includes(a))return 0.8;
    const m=a.length,n=b.length;
    if(Math.abs(m-n)>Math.max(m,n)*0.6)return 0;
    const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));
    for(let i=0;i<=m;i++)dp[i][0]=i;
    for(let j=0;j<=n;j++)dp[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
      dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
    }
    return 1-dp[m][n]/Math.max(m,n);
  },
  search(q,topK){
    topK=topK||3;
    const ql=(q||'').toLowerCase().trim();
    if(!ql)return[];
    const intents=(typeof extractIntents==='function')?extractIntents(q):[];
    const scored=KB.faqs.map(f=>{
      let sc=0;
      // 关键词命中（每词 +5）
      (f.kw||[]).forEach(k=>{if(ql.includes(k.toLowerCase()))sc+=5;});
      // 意图命中 +6
      if(intents.includes(f.intent))sc+=6;
      // 标题相似度（最高 8 分）
      sc+=this.similar(ql,f.q)*8;
      // 标题包含关键词时再加成
      if(ql.length>=2&&f.q.toLowerCase().includes(ql.slice(0,2)))sc+=2;
      return{f,sc};
    }).filter(x=>x.sc>2.5).sort((a,b)=>b.sc-a.sc).slice(0,topK);
    return scored;
  },
  // 联想：用于输入框实时下拉（前 N 条）
  suggest(q,topK){
    topK=topK||6;
    if(!q||q.length<1)return KB.faqs.slice(0,topK);
    return this.search(q,topK).map(x=>x.f);
  },
  // 按意图筛选（chips 分类用）
  byIntent(intent){
    return KB.faqs.filter(f=>f.intent===intent);
  },
  // 术语检索
  findTerm(q){
    const ql=(q||'').trim();
    return KB.terms.find(t=>ql.includes(t.t)||this.similar(ql,t.t)>0.7);
  }
};

/* ============================================================
   智能回答（优先 KB → 命中则直出，未命中走 API/fallback）
   ============================================================ */
function smartAnswer(q,ctx){
  if(!ctx)ctx=getCtx();if(!ctx)return null;
  // 1) 术语命中
  const term=KBSearch.findTerm(q);
  if(term&&q.length<=10){
    const links=(term.see||[]).map(k=>KB.routes[k]).filter(Boolean);
    return{
      kind:'term',
      title:term.t,
      sections:[{title:'释义',content:term.d}],
      links,
      related:[]
    };
  }
  // 2) FAQ 命中（高置信）
  const hits=KBSearch.search(q,3);
  if(hits.length&&hits[0].sc>=8){
    const f=hits[0].f;
    let lines;
    try{lines=f.answer(ctx);}catch(e){lines=['信息计算异常','','',''];}
    const route=KB.routes[f.anchor];
    return{
      kind:'faq',
      title:f.q,
      sections:[
        {title:'结论',content:lines[0]||'-'},
        {title:'命理原因',content:lines[1]||'-'},
        {title:'当前阶段',content:lines[2]||'-'},
        {title:'行动建议',content:lines[3]||'-'}
      ],
      links:route?[route]:[],
      related:(f.related||[]).map(rid=>KB.faqs.find(x=>x.id===rid)).filter(Boolean),
      confidence:hits[0].sc
    };
  }
  return null;
}

/* ============================================================
   跳转 + 高亮
   ============================================================ */
function jumpTo(secId,cardKey){
  // 关 AI 面板
  if(typeof closeAsk==='function')closeAsk();
  // 若 secId 为空，从 KB.routes 推断；同时取 sub（合并卡子区）
  let subKey=null,routeCard=cardKey;
  if(cardKey&&KB&&KB.routes&&KB.routes[cardKey]){
    const r=KB.routes[cardKey];
    if(!secId)secId=r.sec;
    if(r.sub)subKey=r.sub;
    routeCard=r.card; // 重定向到真正的 DOM data-card
  }
  // 切 tab
  const tab=document.querySelector('.tab-item[data-sec="'+secId+'"]');
  if(tab&&!tab.classList.contains('active'))tab.click();
  // 重写：使用 routeCard 进行查找
  cardKey=routeCard;
  // 滚动+高亮
  setTimeout(()=>{
    let el=null;
    if(cardKey){
      el=document.querySelector('[data-card="'+cardKey+'"]');
    }
    if(!el){
      el=document.getElementById(secId);
    }
    if(!el)return;
    el.scrollIntoView({behavior:'smooth',block:'center'});
    el.classList.add('tj-flash');
    setTimeout(()=>el.classList.remove('tj-flash'),1800);
    // 如果是合并卡的子区跳转，自动激活对应子 tab
    if(subKey){
      const sub=el.querySelector('.focus-tab[data-sub="'+subKey+'"]');
      if(sub)sub.click();
    }
    // 如果卡片是折叠状态，自动展开
    if(el.classList.contains('collapsed'))el.classList.remove('collapsed');
  },280);
}


const ZWG='命宫,兄弟宫,夫妻宫,子女宫,财帛宫,疾厄宫,迁移宫,交友宫,事业宫,田宅宫,福德宫,父母宫'.split(',');
const QD='休门,生门,伤门,杜门,景门,死门,惊门,开门'.split(','),QS='天蓬,天任,天冲,天辅,天英,天芮,天柱,天心,天禽'.split(','),QG='值符,腾蛇,太阴,六合,白虎,玄武,九地,九天'.split(','),QP='坎一宫,坤二宫,震三宫,巽四宫,中五宫,乾六宫,兑七宫,艮八宫,离九宫'.split(',');

const CD={},CG=[
{g:'直辖市',c:[{i:'beijing',n:'北京',o:116.4,a:39.9},{i:'shanghai',n:'上海',o:121.5,a:31.2},{i:'tianjin',n:'天津',o:117.2,a:39.1},{i:'chongqing',n:'重庆',o:106.6,a:29.6}]},
{g:'河北',c:[{i:'shijiazhuang',n:'石家庄',o:114.5,a:38},{i:'tangshan',n:'唐山',o:118.2,a:39.6},{i:'baoding',n:'保定',o:115.5,a:38.9},{i:'qinhuangdao',n:'秦皇岛',o:119.6,a:39.9}]},
{g:'辽宁',c:[{i:'shenyang',n:'沈阳',o:123.4,a:41.8},{i:'dalian',n:'大连',o:121.6,a:38.9}]},
{g:'吉林',c:[{i:'changchun',n:'长春',o:125.3,a:43.9}]},
{g:'黑龙江',c:[{i:'haerbin',n:'哈尔滨',o:126.6,a:45.8}]},
{g:'山西',c:[{i:'taiyuan',n:'太原',o:112.6,a:37.9}]},
{g:'内蒙古',c:[{i:'huhehaote',n:'呼和浩特',o:111.8,a:40.8}]},
{g:'江苏',c:[{i:'nanjing',n:'南京',o:118.8,a:32.1},{i:'suzhou',n:'苏州',o:120.6,a:31.3},{i:'wuxi',n:'无锡',o:120.3,a:31.6},{i:'changzhou',n:'常州',o:120,a:31.8},{i:'nantong',n:'南通',o:120.9,a:32},{i:'xuzhou',n:'徐州',o:117.3,a:34.3},{i:'yangzhou',n:'扬州',o:119.4,a:32.4}]},
{g:'浙江',c:[{i:'hangzhou',n:'杭州',o:120.2,a:30.3},{i:'ningbo',n:'宁波',o:121.6,a:29.9},{i:'wenzhou',n:'温州',o:120.7,a:28},{i:'jiaxing',n:'嘉兴',o:120.8,a:30.8},{i:'shaoxing',n:'绍兴',o:120.6,a:30},{i:'jinhua',n:'金华',o:119.7,a:29.1}]},
{g:'安徽',c:[{i:'hefei',n:'合肥',o:117.3,a:31.9},{i:'wuhu',n:'芜湖',o:118.4,a:31.3}]},
{g:'福建',c:[{i:'fuzhou',n:'福州',o:119.3,a:26.1},{i:'xiamen',n:'厦门',o:118.1,a:24.5},{i:'quanzhou',n:'泉州',o:118.7,a:24.9}]},
{g:'江西',c:[{i:'nanchang',n:'南昌',o:115.9,a:28.7}]},
{g:'山东',c:[{i:'jinan',n:'济南',o:117,a:36.7},{i:'qingdao',n:'青岛',o:120.4,a:36.1},{i:'yantai',n:'烟台',o:121.5,a:37.5},{i:'weihai',n:'威海',o:122.1,a:37.5}]},
{g:'河南',c:[{i:'zhengzhou',n:'郑州',o:113.7,a:34.8},{i:'luoyang',n:'洛阳',o:112.5,a:34.6},{i:'kaifeng',n:'开封',o:114.3,a:34.8}]},
{g:'湖北',c:[{i:'wuhan',n:'武汉',o:114.3,a:30.6},{i:'yichang',n:'宜昌',o:111.3,a:30.7}]},
{g:'湖南',c:[{i:'changsha',n:'长沙',o:113,a:28.2},{i:'hengyang',n:'衡阳',o:112.6,a:26.9}]},
{g:'广东',c:[{i:'guangzhou',n:'广州',o:113.3,a:23.1},{i:'shenzhen',n:'深圳',o:114.1,a:22.6},{i:'dongguan',n:'东莞',o:113.8,a:23.1},{i:'foshan',n:'佛山',o:113.1,a:23},{i:'zhuhai',n:'珠海',o:113.6,a:22.3},{i:'huizhou',n:'惠州',o:114.4,a:23.1},{i:'shantou',n:'汕头',o:116.7,a:23.4}]},
{g:'广西',c:[{i:'nanning',n:'南宁',o:108.4,a:22.8},{i:'guilin',n:'桂林',o:110.3,a:25.3}]},
{g:'海南',c:[{i:'haikou',n:'海口',o:110.4,a:20},{i:'sanya',n:'三亚',o:109.5,a:18.3}]},
{g:'四川',c:[{i:'chengdu',n:'成都',o:104.1,a:30.7},{i:'mianyang',n:'绵阳',o:104.7,a:31.5}]},
{g:'贵州',c:[{i:'guiyang',n:'贵阳',o:106.7,a:26.7}]},
{g:'云南',c:[{i:'kunming',n:'昆明',o:102.8,a:25},{i:'dali',n:'大理',o:100.2,a:25.6},{i:'lijiang',n:'丽江',o:100.2,a:26.9}]},
{g:'陕西',c:[{i:'xian',n:'西安',o:108.9,a:34.3}]},
{g:'甘肃',c:[{i:'lanzhou',n:'兰州',o:103.8,a:36.1}]},
{g:'新疆',c:[{i:'wulumuqi',n:'乌鲁木齐',o:87.6,a:43.8}]},
{g:'港澳台',c:[{i:'hongkong',n:'香港',o:114.2,a:22.3},{i:'macau',n:'澳门',o:113.5,a:22.2},{i:'taipei',n:'台北',o:121.6,a:25},{i:'kaohsiung',n:'高雄',o:120.3,a:22.6}]},
{g:'东亚',c:[{i:'tokyo',n:'东京',o:139.7,a:35.7},{i:'osaka',n:'大阪',o:135.5,a:34.7},{i:'seoul',n:'首尔',o:127,a:37.6},{i:'kyoto',n:'京都',o:135.8,a:35},{i:'busan',n:'釜山',o:129.1,a:35.2},{i:'fukuoka',n:'福冈',o:130.4,a:33.6}]},
{g:'东南亚',c:[{i:'singapore',n:'新加坡',o:103.8,a:1.4},{i:'bangkok',n:'曼谷',o:100.5,a:13.8},{i:'kualalumpur',n:'吉隆坡',o:101.7,a:3.1},{i:'jakarta',n:'雅加达',o:106.8,a:-6.2},{i:'hanoi',n:'河内',o:105.8,a:21},{i:'hochiminh',n:'胡志明',o:106.7,a:10.8},{i:'manila',n:'马尼拉',o:121,a:14.6}]},
{g:'欧美大洋洲',c:[{i:'london',n:'伦敦',o:-0.1,a:51.5},{i:'paris',n:'巴黎',o:2.4,a:48.9},{i:'berlin',n:'柏林',o:13.4,a:52.5},{i:'rome',n:'罗马',o:12.5,a:41.9},{i:'madrid',n:'马德里',o:-3.7,a:40.4},{i:'newyork',n:'纽约',o:-74,a:40.7},{i:'losangeles',n:'洛杉矶',o:-118.2,a:34.1},{i:'sanfrancisco',n:'旧金山',o:-122.4,a:37.8},{i:'chicago',n:'芝加哥',o:-87.6,a:41.9},{i:'toronto',n:'多伦多',o:-79.4,a:43.7},{i:'vancouver',n:'温哥华',o:-123.1,a:49.3},{i:'sydney',n:'悉尼',o:151.2,a:-33.9},{i:'melbourne',n:'墨尔本',o:145,a:-37.8},{i:'dubai',n:'迪拜',o:55.3,a:25.2},{i:'auckland',n:'奥克兰',o:174.7,a:-36.9},{i:'moscow',n:'莫斯科',o:37.6,a:55.8},{i:'istanbul',n:'伊斯坦布尔',o:28.9,a:41}]}
];
CG.forEach(g=>g.c.forEach(c=>{CD[c.i]={n:c.n,o:c.o,a:c.a,g:g.g}}));

const JQ_STR="AQMCBQMEBAQFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQMCBQMEBAUFBQYGBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBwkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBQYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkICgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMDBAQFBAYGBwYIBgkHCgYLBgAFAQMCBQMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAFAQMCBQMEBAUFBQYHBwcIBwkICgcLBwAFAQQCBAMEBAQFBAYGBwYIBgkHCgYLBgAFAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBQMEBAUFBQYHBwcIBwkICgcLBgAFAQMCBAMDBAQFBAYGBwYIBgkHCgYLBgAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgcLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkHCgYLBQAFAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBAYGBwYIBgkHCgYLBgAEAQMCBQMEBAUFBQYGBwcIBwkHCgYLBgAEAQMCBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCAwMDBAMFBAYFBwUIBgkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCAwMDBAMFBAYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCBAMEBAQFBQYGBwYIBwkHCgYLBgAEAQMCAwMDBAMFAwYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICBAMDBAQFBAYGBwYIBgkHCgYLBgAEAQMCAwMDBAMFAwYFBwUIBQkGCgULBQAEAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkHCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMDBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICAwMCBAMFAwYEBwUIBQkGCgULBQAEAQICAwMCBAMFAwYFBwUIBQkGCgULBQADAQICBAMDBAMFBAYFBwUIBgkGCgULBQADAQICBAMDBAQFBAYFBwYIBgkGCgYLBQAEAQICBAMDBAQFBAYFBwYIBgkHCgYLBgAE";

function _initJq(){const bin=atob(JQ_STR);const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);window._jqArr=arr;window._jqMaxYear=1900+Math.floor(arr.length/24)-1;}
function solarTermDate(year,n){
  // n: 0=立春 1=惊蛰 2=清明 3=立夏 4=芒种 5=小暑
  //    6=立秋 7=白露 8=寒露 9=立冬 10=大雪 11=小寒
  // Based on the tropical year calculation with leap year corrections
  // Reference year: 2000
  const C=[4.393,6.188,5.34,6.12,6.126,7.72,8.35,8.426,8.886,8.196,7.62,6.08];
  const M=[2,3,4,5,6,7,8,9,10,11,12,1];
  // More precise constants using the formula:
  // For the n-th solar term, the day in the month is:
  // day = floor(C[n] + 0.2422*(year-2000) - floor((year-2000)/4))
  // with small corrections for specific terms and years
  const D=[3.87,5.63,4.81,5.52,5.678,7.105,7.5,7.646,8.318,7.438,7.18,5.4055];
  const yCalc=(n===11)?year+1:year;
  const diff=yCalc-2000;
  const day=Math.floor(D[n]+0.2422*diff-Math.floor(diff/4));
  return[M[n],day];
}
function jqDate(y,n){
  // First try the lookup table for years 1900-1989
  if(y>=1900){
    if(!window._jqArr)_initJq();
    if(y<=window._jqMaxYear){
      const off=((y-1900)*12+n)*2;
      if(off+1<window._jqArr.length)return[window._jqArr[off]+1,window._jqArr[off+1]+1];
    }
  }
  // For years beyond the table, use formula
  return solarTermDate(y,n);
}
function getMonthPillar(year,month,day){let yp=year;const lc=jqDate(year,0);if(!lc)return{mi:2,yp:year};if(month<lc[0]||(month===lc[0]&&day<lc[1]))yp=year-1;let mi=10;for(let i=11;i>=0;i--){const j=jqDate(year,i);if(!j)continue;if(month>j[0]||(month===j[0]&&day>=j[1])){mi=i;break;}}return{mi,yp};}
function trueSolarTime(date,lon,useDST){let d=new Date(date);if(useDST&&d.getFullYear()>=1986&&d.getFullYear()<=1991){const m=d.getMonth()+1;if(m>=4&&m<=9)d=new Date(d.getTime()-3600000);}const offsetMin=(lon-120)*4;const doy=Math.floor((d-new Date(d.getFullYear(),0,0))/86400000);const B=2*Math.PI*(doy-1)/365;const eot=229.18*(0.000075+0.001868*Math.cos(B)-0.032077*Math.sin(B)-0.014615*Math.cos(2*B)-0.040849*Math.sin(2*B));const totalOffset=offsetMin+eot;return new Date(d.getTime()+totalOffset*60000);}
function resolveBirthDateTime(y,m,d,hh,mm,useTrueSolar,lon){let dt=new Date(y,m-1,d,hh,mm,0);let note='';if(useTrueSolar&&lon){dt=trueSolarTime(dt.getTime(),lon,true);note='已启用真太阳时换算（经度'+lon+'°）';}let by=dt.getFullYear(),bm=dt.getMonth()+1,bd=dt.getDate();let ch=dt.getHours(),cmin=dt.getMinutes();let totalMin=ch*60+cmin;let hourZhi;if(totalMin>=23*60){hourZhi=0;const next=new Date(Date.UTC(by,bm-1,bd+1));by=next.getUTCFullYear();bm=next.getUTCMonth()+1;bd=next.getUTCDate();}else if(totalMin<60){hourZhi=0;}else{hourZhi=Math.floor((totalMin-60)/120)+1;}return{year:by,month:bm,day:bd,hourZhi,note};}
function getDayPillarIndex(y,m,d){const anchor=new Date(Date.UTC(2000,0,1));const target=new Date(Date.UTC(y,m-1,d));const diff=Math.round((target-anchor)/86400000);return((54+diff)%60+60)%60;}
function mkBazi(y,m,d,hourZhi){const mp=getMonthPillar(y,m,d);const yp=mp.yp;const ygi=((yp-4)%10+10)%10;const yzi=((yp-4)%12+12)%12;const mzi=(mp.mi+2)%12;const monthGanBase=[2,4,6,8,0];const mgi=(monthGanBase[ygi%5]+mp.mi)%10;const dji=getDayPillarIndex(y,m,d);const dgi=dji%10;const dzi=dji%12;const hourGanBase=[0,2,4,6,8];const hgi=(hourGanBase[dgi%5]+hourZhi)%10;const nyi=((yp-4)%60+60)%60;return{Y:{g:TG[ygi],z:DZ[yzi],gi:ygi,zi:yzi},M:{g:TG[mgi],z:DZ[mzi],gi:mgi,zi:mzi},D:{g:TG[dgi],z:DZ[dzi],gi:dgi,zi:dzi},H:{g:TG[hgi],z:DZ[hourZhi],gi:hgi,zi:hourZhi},dj:dji,ny:NY[nyi],sx:SX[yzi]};}
function mkWx(b){const c={木:0,火:0,土:0,金:0,水:0};[b.Y.g,b.M.g,b.D.g,b.H.g].forEach(g=>c[GW[g]]+=1);[b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>c[ZW[z]]+=1);[b.Y.z,b.M.z,b.D.z,b.H.z].forEach(z=>{const cg=ZC[z];if(cg[0])c[GW[cg[0]]]+=0.6;if(cg[1])c[GW[cg[1]]]+=0.3;if(cg[2])c[GW[cg[2]]]+=0.1;});const dw=GW[b.D.g];let s='木',w='木';WX.forEach(x=>{if(c[x]>c[s])s=x;if(c[x]<c[w])w=x;});const t=Object.values(c).reduce((a,b)=>a+b,0);const SH={木:'火',火:'土',土:'金',金:'水',水:'木'};const KE={木:'土',火:'金',土:'水',金:'木',水:'火'};const BS={木:'水',火:'木',土:'火',金:'土',水:'金'};const BK={木:'金',火:'水',土:'木',金:'火',水:'土'};const monthWx=ZW[b.M.z];const deLing=(monthWx===dw||BS[dw]===monthWx)?2:(SH[dw]===monthWx?0.5:0);const selfP=c[dw]+c[BS[dw]]+deLing;const otherP=t-c[dw]-c[BS[dw]]+(2-deLing);const st=selfP>=otherP*0.85;let ys,xs;if(st){ys=SH[dw];xs=KE[dw];}else{ys=BS[dw];xs=dw;}return{c,dw,st,s,w,ys,xs,t,KE,SH,BS,BK,deLing};}
function mkSs(b){const d=b.D.g,t=SS[d];return{yg:t[b.Y.g],mg:t[b.M.g],hg:t[b.H.g],yzc:ZC[b.Y.z].map(g=>({g,s:t[g]})),mzc:ZC[b.M.z].map(g=>({g,s:t[g]})),dzc:ZC[b.D.z].map(g=>({g,s:t[g]})),hzc:ZC[b.H.z].map(g=>({g,s:t[g]}))};}
function mkShenSha(b){const r=[];const dz=DZ[b.D.zi],tg=TG[b.D.gi];const xunK={0:[10,11],1:[10,11],2:[0,1],3:[0,1],4:[2,3],5:[2,3],6:[4,5],7:[4,5],8:[6,7],9:[6,7]};const xk=xunK[Math.floor(b.dj/10)];if(xk)r.push({n:'空亡',v:DZ[xk[0]]+DZ[xk[1]],t:'日柱旬中空亡，多主漂泊、精神空虛，亦有机缘灵性'});const thMap={子:'酉',丑:'午',寅:'卯',卯:'子',辰:'酉',巳:'午',午:'卯',未:'子',申:'酉',酉:'午',戌:'卯',亥:'子'};const th=thMap[dz];if(th)r.push({n:'桃花',v:th,t:'人缘、感情、魅力之星'});const ymMap={子:'寅',丑:'亥',寅:'申',卯:'巳',辰:'寅',巳:'亥',午:'申',未:'巳',申:'寅',酉:'亥',戌:'申',亥:'巳'};const ym=ymMap[dz];if(ym)r.push({n:'驿马',v:ym,t:'变动、奔波、远行之星'});const tyMap={甲:'丑未',戊:'丑未',庚:'丑未',乙:'子申',己:'子申',丙:'亥酉',丁:'亥酉',壬:'卯巳',癸:'卯巳',辛:'午寅'};const ty=tyMap[tg];if(ty)r.push({n:'天乙贵人',v:ty,t:'逢凶化吉、贵人扶助'});const wcMap={甲:'巳',乙:'午',丙:'申',戊:'申',丁:'酉',己:'酉',庚:'亥',辛:'子',壬:'寅',癸:'卯'};const wc=wcMap[tg];if(wc)r.push({n:'文昌',v:wc,t:'学业、功名、文艺之星'});const jxMap={子:'子',丑:'酉',寅:'午',卯:'卯',辰:'子',巳:'酉',午:'午',未:'卯',申:'子',酉:'酉',戌:'午',亥:'卯'};const jx=jxMap[dz];if(jx)r.push({n:'将星',v:jx,t:'权威、领导、管理之星'});const hgMap={子:'辰',丑:'丑',寅:'戌',卯:'未',辰:'辰',巳:'丑',午:'戌',未:'未',申:'辰',酉:'丑',戌:'戌',亥:'未'};const hg=hgMap[dz];if(hg)r.push({n:'华盖',v:hg,t:'孤独、宗教、艺术、玄学之星'});const tyi=DZ[(b.M.zi+11)%12];r.push({n:'天医',v:tyi,t:'健康、医学、疗愈之星'});const hyMap={甲:'午',乙:'午',丙:'寅',丁:'未',戊:'辰',己:'辰',庚:'戌',辛:'酉',壬:'子',癸:'申'};const hy=hyMap[tg];if(hy)r.push({n:'红艳',v:hy,t:'情感丰富、风流多情'});const kg=['庚辰','庚戌','壬辰','戊戌'];if(kg.includes(b.D.g+b.D.z))r.push({n:'魁罡',v:b.D.g+b.D.z,t:'刚烈、聪明、果断，女命逢之婚姻多波折'});const yrMap={甲:'卯',乙:'寅',丙:'午',丁:'巳',戊:'午',己:'巳',庚:'酉',辛:'申',壬:'子',癸:'亥'};const yr=yrMap[tg];if(yr)r.push({n:'羊刃',v:yr,t:'刚强、锐利、胆大，喜七杀配合'});return r;}
function mkDy(b,gn,y){const yangGan=b.Y.gi%2===0;const isMale=gn==='male';const fw=(yangGan&&isMale)||(!yangGan&&!isMale);const bd=document.getElementById('bDate').value;const[by,bm,bd2]=bd.split('-').map(Number);const bObj=new Date(by,bm-1,bd2);let minDays=365;for(let i=0;i<12;i++){const j=jqDate(by,i);if(!j)continue;const jDate=new Date(by,j[0]-1,j[1]);if(fw){let diff=Math.round((jDate-bObj)/86400000);if(diff<=0){const j2=jqDate(by+1,i);if(j2){diff=Math.round((new Date(by+1,j2[0]-1,j2[1])-bObj)/86400000);}}if(diff>0&&diff<minDays)minDays=diff;}else{let diff=Math.round((bObj-jDate)/86400000);if(diff<=0){const j2=jqDate(by-1,i);if(j2){diff=Math.round((bObj-new Date(by-1,j2[0]-1,j2[1]))/86400000);}}if(diff>0&&diff<minDays)minDays=diff;}}const sa=Math.max(1,Math.round(minDays/3));const ds=[];for(let i=0;i<10;i++){const o=fw?(i+1):-(i+1);ds.push({g:TG[((b.M.gi+o)%10+10)%10],z:DZ[((b.M.zi+o)%12+12)%12],as:sa+i*10,ae:sa+i*10+9,ys:y+sa+i*10,ye:y+sa+i*10+9});}return{ds,sa};}
function mkLn(cy){const r=[];for(let y=cy-2;y<=cy+5;y++){const gi=((y-4)%10+10)%10,zi=((y-4)%12+12)%12;r.push({y,g:TG[gi],z:DZ[zi],sx:SX[zi]})}return r;}
function getLiuYue(year){const baseMap=[2,4,6,8,0];const ygi=((year-4)%10+10)%10;const startGan=(baseMap[ygi%5]+0)%10;const res=[];const names=['寅月(正月)','卯月(二月)','辰月(三月)','巳月(四月)','午月(五月)','未月(六月)','申月(七月)','酉月(八月)','戌月(九月)','亥月(十月)','子月(冬月)','丑月(腊月)'];const jieNames=['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'];for(let i=0;i<12;i++){const gi=(startGan+i)%10;const zi=(2+i)%12;const jq=jqDate(year,i);const jqStr=jq?`${jq[0]}月${jq[1]}日${jieNames[i]}`:'';res.push({name:names[i],gz:TG[gi]+DZ[zi],jq:jqStr});}return res;}
function mkZw(b){const ps=ZWG.map(n=>({n,m:[],a:[],s:[]}));const lunarDay=(b.dj%30)+1;const monthZhi=b.M.zi,hourZhi=b.H.zi;const mingGongZhi=(monthZhi-hourZhi+12)%12;const bodyGongZhi=(monthZhi+hourZhi)%12;const mgIdx=mingGongZhi;const mgGanIdx=(b.Y.gi+mgIdx)%10;const mgGZ=TG[mgGanIdx]+DZ[mgIdx];const mgNaYin=NY[((mgGanIdx-mgIdx%10+10)%10+mgIdx*2)%60]||'大驿土';const juMap={'金':4,'木':3,'水':2,'火':6,'土':5};const wuxingJu=juMap[mgNaYin.charAt(mgNaYin.length-1)]||5;const ziWeiPos=(Math.ceil(lunarDay/wuxingJu)*wuxingJu+mingGongZhi)%12;const zwS=['紫微','天机',null,'太阳','武曲','天同',null,'廉贞'];const zwO=[0,-1,-2,-3,-4,-5,-6,-7];zwS.forEach((s,i)=>{if(!s)return;ps[((ziWeiPos+zwO[i])%12+12)%12].m.push(s)});const tfP=((14-ziWeiPos)%12+12)%12;const tfS=['天府','太阴','贪狼','巨门','天相','天梁','七杀',null,null,null,null,'破军'];tfS.forEach((s,i)=>{if(!s)return;ps[(tfP+i)%12].m.push(s)});ps[(10-hourZhi+12)%12].a.push('文昌');ps[(hourZhi+4)%12].a.push('文曲');ps[(monthZhi+3)%12].a.push('左辅');ps[(11-monthZhi+12)%12].a.push('右弼');const tk={0:[1,7],1:[0,8],2:[3,5],3:[3,5],4:[1,7],5:[0,8],6:[7,1],7:[6,2],8:[3,5],9:[3,5]};ps[tk[b.Y.gi][0]].a.push('天魁');ps[tk[b.Y.gi][1]].a.push('天钺');ps[(b.Y.gi+3)%12].s.push('擎羊');ps[(b.Y.gi+1)%12].s.push('陀罗');ps[(b.Y.zi*3+2)%12].s.push('火星');ps[(b.Y.zi*2+10)%12].s.push('铃星');ps[(11-hourZhi+12)%12].s.push('地空');ps[(hourZhi+11)%12].s.push('地劫');const siHuaMap={甲:['廉贞','破军','武曲','太阳'],乙:['天机','天梁','紫微','太阴'],丙:['天同','天机','文昌','廉贞'],丁:['太阴','天同','天机','巨门'],戊:['贪狼','太阴','右弼','天机'],己:['武曲','贪狼','天梁','破军'],庚:['太阳','武曲','太阴','天同'],辛:['巨门','太阳','文曲','文昌'],壬:['天梁','紫微','左辅','武曲'],癸:['破军','巨门','太阴','贪狼']};const sh=siHuaMap[b.Y.g]||[];ps.forEach(p=>{p.m.forEach((s,idx)=>{if(sh[0]===s)p.m[idx]+='·禄';if(sh[1]===s)p.m[idx]+='·权';if(sh[2]===s)p.m[idx]+='·科';if(sh[3]===s)p.m[idx]+='·忌';});});return{ps,bp:(mingGongZhi+hourZhi+2)%12,mingGongZhi,bodyGongZhi};}
function mkQm(b){const monthZhi=b.M.zi;const yangDun=[2,3,4,5,6,7].includes(monthZhi);const juBase=yangDun?(b.dj%9+1):(10-b.dj%9);const ju=((juBase-1)%9)+1;const ps=[];const shiGan=b.H.gi;for(let i=0;i<9;i++){const di=yangDun?(ju-1+i)%8:((ju-1-i)%8+8)%8;const si=yangDun?(ju-1+i*2)%9:((ju-1-i*2)%9+9)%9;ps.push({p:QP[i],d:QD[di],s:QS[si],g:QG[(shiGan+i)%8],cc:i===4});}return{ps,ju,yangDun};}
function mkMh(b){const yearNum=b.Y.zi+1,monthNum=(b.M.zi-1)%12+1,dayNum=(b.dj%30)+1,hourNum=b.H.zi+1;const un=(yearNum+monthNum+dayNum)%8||8,ln2=(yearNum+monthNum+dayNum+hourNum)%8||8,cl=(yearNum+monthNum+dayNum+hourNum)%6||6;const gn=['乾','兑','离','震','巽','坎','艮','坤'],gs=['☰','☱','☲','☳','☴','☵','☶','☷'];const ge=['金','金','火','木','木','水','土','土'],gl=[[1,1,1],[1,1,0],[1,0,1],[0,0,1],[1,1,0],[0,1,0],[1,0,0],[0,0,0]];const ui=(un-1)%8,li=(ln2-1)%8;const hex=[...gl[li],...gl[ui]],chg=[...hex];chg[cl-1]=chg[cl-1]?0:1;const fg=ls=>gl.findIndex(g=>g[0]===ls[0]&&g[1]===ls[1]&&g[2]===ls[2]);const mui=Math.max(0,fg(chg.slice(3))),mli=Math.max(0,fg(chg.slice(0,3)));return{ug:gs[ui]+' '+gn[ui],lg:gs[li]+' '+gn[li],ul:gl[ui],ll:gl[li],ue:ge[ui],le:ge[li],cl,mu:gs[mui]+' '+gn[mui],ml:gs[mli]+' '+gn[mli],huUpper:hex.slice(2,5),huLower:hex.slice(1,4)};}
function mkSi(b){const mz=b.M.z;let s,se,sp,season;if('寅卯'.includes(mz)){s='春';se='木';sp='生发';season='春'}else if(mz==='辰'){s='春季末';se='土';sp='转化';season='春'}else if('巳午'.includes(mz)){s='夏';se='火';sp='旺盛';season='夏'}else if(mz==='未'){s='夏季末';se='土';sp='蕴藏';season='夏'}else if('申酉'.includes(mz)){s='秋';se='金';sp='收敛';season='秋'}else if(mz==='戌'){s='秋季末';se='土';sp='肃杀';season='秋'}else if('亥子'.includes(mz)){s='冬';se='水';sp='潜藏';season='冬'}else{s='冬季末';se='土';sp='待发';season='冬'}const W={春:{木:'旺',火:'相',土:'死',金:'囚',水:'休'},夏:{火:'旺',土:'相',金:'死',水:'囚',木:'休'},秋:{金:'旺',水:'相',木:'死',火:'囚',土:'休'},冬:{水:'旺',木:'相',火:'死',土:'囚',金:'休'}};let st=W[season][GW[b.D.g]];if('辰戌丑未'.includes(mz)&&GW[b.D.g]==='土')st='旺';return{s,se,sp,st,season};}
function applyTheme(yongShen){const themes={木:{h:145,s:'45%',l:'45%',m1:'rgba(40,140,80,0.28)',m2:'rgba(30,100,60,0.22)',m3:'rgba(20,80,45,0.14)',m4:'rgba(50,130,70,0.10)',m5:'rgba(25,90,50,0.14)',bg1:'#060d08',bg2:'#0c1a10',bg3:'#081208'},火:{h:8,s:'60%',l:'52%',m1:'rgba(180,60,40,0.28)',m2:'rgba(140,45,30,0.22)',m3:'rgba(100,35,25,0.16)',m4:'rgba(160,55,35,0.10)',m5:'rgba(120,40,28,0.14)',bg1:'#0d0806',bg2:'#1a100c',bg3:'#120c08'},土:{h:38,s:'55%',l:'56%',m1:'rgba(180,130,60,0.30)',m2:'rgba(120,80,40,0.25)',m3:'rgba(90,60,30,0.16)',m4:'rgba(160,100,50,0.10)',m5:'rgba(100,70,35,0.15)',bg1:'#0d0b08',bg2:'#14120e',bg3:'#0f0d0a'},金:{h:45,s:'15%',l:'65%',m1:'rgba(160,155,140,0.22)',m2:'rgba(130,125,110,0.18)',m3:'rgba(100,95,85,0.12)',m4:'rgba(150,145,130,0.08)',m5:'rgba(110,105,95,0.12)',bg1:'#0a0a0b',bg2:'#14141a',bg3:'#0f0f14'},水:{h:210,s:'50%',l:'50%',m1:'rgba(40,80,160,0.28)',m2:'rgba(30,60,130,0.22)',m3:'rgba(25,50,100,0.14)',m4:'rgba(45,75,140,0.10)',m5:'rgba(30,55,110,0.14)',bg1:'#06080d',bg2:'#0c101a',bg3:'#080c12'}};const t=themes[yongShen]||themes['土'];const root=document.documentElement.style;root.setProperty('--accent-h',t.h);root.setProperty('--accent-s',t.s);root.setProperty('--accent-l',t.l);root.setProperty('--m1',t.m1);root.setProperty('--m2',t.m2);root.setProperty('--m3',t.m3);root.setProperty('--m4',t.m4);root.setProperty('--m5',t.m5);root.setProperty('--bg1',t.bg1);root.setProperty('--bg2',t.bg2);root.setProperty('--bg3',t.bg3);}
function getShenShaLabels(b){const labels=[];const zh=[b.Y.z,b.M.z,b.D.z,b.H.z];const ch={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};const ha={'子':'未','未':'子','丑':'午','午':'丑','寅':'巳','巳':'寅','卯':'辰','辰':'卯','申':'亥','亥':'申','酉':'戌','戌':'酉'};const he={'子':'丑','丑':'子','寅':'亥','亥':'寅','卯':'戌','戌':'卯','辰':'酉','酉':'辰','巳':'申','申':'巳','午':'未','未':'午'};const po={'子':'酉','酉':'子','丑':'辰','辰':'丑','寅':'亥','亥':'寅','卯':'午','午':'卯','巳':'申','申':'巳','未':'戌','戌':'未'};const zx={'辰':'辰','午':'午','酉':'酉','亥':'亥'};const mp={green:{bg:'rgba(52,199,89,.10)',co:'rgba(122,182,72,.85)',bd:'rgba(52,199,89,.16)'},red:{bg:'rgba(255,59,48,.10)',co:'rgba(212,101,74,.85)',bd:'rgba(255,59,48,.16)'},orange:{bg:'rgba(255,149,0,.10)',co:'rgba(212,160,74,.85)',bd:'rgba(255,149,0,.16)'},yellow:{bg:'rgba(255,204,0,.10)',co:'rgba(200,164,90,.85)',bd:'rgba(255,204,0,.16)'}};for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=zh[i],bb=zh[j];if(ch[a]===bb)labels.push({t:a+bb+'·冲',...mp.red});if(ha[a]===bb)labels.push({t:a+bb+'·害',...mp.orange});if(he[a]===bb)labels.push({t:a+bb+'·合',...mp.green});if(po[a]===bb)labels.push({t:a+bb+'·破',...mp.yellow});if(zx[a]===bb)labels.push({t:a+'·自刑',...mp.red});}const zset=new Set(zh);if(zset.has('寅')&&zset.has('巳')&&zset.has('申'))labels.push({t:'寅巳申·三刑',...mp.red});if(zset.has('丑')&&zset.has('戌')&&zset.has('未'))labels.push({t:'丑戌未·三刑',...mp.red});return labels;}
function getTodayGZ(){const now=new Date();const y=now.getFullYear(),m=now.getMonth()+1,d=now.getDate();const dji=getDayPillarIndex(y,m,d);const dgi=dji%10,dzi=dji%12;const mp=getMonthPillar(y,m,d);const mzi=(mp.mi+2)%12;const mgi=([2,4,6,8,0][(((mp.yp-4)%10+10)%10)%5]+mp.mi)%10;const yp=mp.yp;const ygi=((yp-4)%10+10)%10, yzi=((yp-4)%12+12)%12;return TG[ygi]+DZ[yzi]+'年 '+TG[mgi]+DZ[mzi]+'月 '+TG[dgi]+DZ[dzi]+'日';}
function extractIntents(q){const ints=[];if(/事业|工作|职业|升职|跳槽|创业|职场|领导|下属|管理|项目/i.test(q))ints.push('事业');if(/感情|婚姻|爱情|对象|桃花|另一半|配偶|分手|复合|结婚|离婚|恋爱|异性|缘分|正缘/i.test(q))ints.push('感情');if(/财|钱|投资|收入|赚钱|股|基金|理财|薪水|工资|经济|负债|储蓄|消费|开支/i.test(q))ints.push('财运');if(/健康|身体|病|养生|疾病|医院|手术|失眠|精神|体质|锻炼|调养/i.test(q))ints.push('健康');if(/学业|考试|考研|留学|读书|学校|成绩|论文|面试|升学|考证|进修/i.test(q))ints.push('学业');if(/搬家|买房|装修|住|房产|租房|风水|方位|城市|出国|迁移|出行|旅途/i.test(q))ints.push('居住');if(!ints.length)ints.push('综合');return ints;}
function buildBaziContext(d){
  // d 即 ctx；按年龄严格定位，杜绝"兜底取首段"
  const b=d.b;
  const cDy=d.cDy||TJ.findDaYun(d.dy,d.age);
  const cLn=d.cLn||TJ.findLiuNian(d.ln,CURR_YEAR);
  const cLm=d.cLm||TJ.findLiuYue(d.liuyue);
  const dySS=cDy?TJ.ssOf(d.dg,cDy.g):'-';
  const lnSS=cLn?TJ.ssOf(d.dg,cLn.g):'-';
  const lmSS=cLm?TJ.ssOf(d.dg,cLm.gz.charAt(0)):'-';
  const lines=[
    `【四柱八字】${b.Y.g}${b.Y.z}年 ${b.M.g}${b.M.z}月 ${b.D.g}${b.D.z}日 ${b.H.g}${b.H.z}时`,
    `【性别 / 乾坤】${d.gen==='male'?'男 / 乾造':'女 / 坤造'}　出生地：${d.city?d.city.n:'未知'}　当前${d.age}岁`,
    `【日主】${d.dg}（${d.wx.dw}），${d.wx.st?'身旺':'身弱'}`,
    `【用神 / 喜神】${d.wx.ys} / ${d.wx.xs}　【忌神】${d.wx.KE[d.wx.dw]||'-'}`,
    `【格局】${d.pa&&d.pa.length?d.pa.join('、'):'普通格'}`,
    `【五行权重】木${d.wx.c['木'].toFixed(1)} 火${d.wx.c['火'].toFixed(1)} 土${d.wx.c['土'].toFixed(1)} 金${d.wx.c['金'].toFixed(1)} 水${d.wx.c['水'].toFixed(1)}（最旺:${d.wx.s} 最弱:${d.wx.w}）`,
    `【生肖 / 纳音】${b.sx}　${b.ny}`,
    `【神煞】${d.shensha&&d.shensha.length?d.shensha.map(s=>s.n+'('+s.v+')').join(' '):'无'}`,
    cDy?`【当前大运】${cDy.g}${cDy.z}（${cDy.as}~${cDy.ae}岁，${cDy.ys}~${cDy.ye}年），大运十神：${dySS}`:'',
    cLn?`【${CURR_YEAR}流年】${cLn.g}${cLn.z} ${cLn.sx}年，流年十神：${lnSS}`:'',
    cLm?`【当前流月】${cLm.name} ${cLm.gz}（${cLm.jq}），流月十神：${lmSS}`:'',
    `【${CURR_YEAR}运势评分】事业${d.cs} 财富${d.ws} 感情${d.ls} 健康${d.hs}`,
    d.liuyue?`【${CURR_YEAR}流月概览】`+d.liuyue.map(m=>m.name+':'+m.gz).join(' '):'',
    /* —— TJX 精算内核派生 —— */
    d.tjx?`【精算·旺衰】${d.tjx.strength.label}（综合分${d.tjx.strength.score}：得令${d.tjx.strength.deLing}+得地${Math.round(d.tjx.strength.deDi)}+得势${d.tjx.strength.deShi}）`:'',
    d.tjx&&d.tjx.tiaoHou?`【精算·调候】月令${b.M.z}，需${d.tjx.tiaoHou.primary}调候，次${d.tjx.tiaoHou.secondary}`:'',
    d.tjx?`【精算·用神】主用「${d.tjx.yongShen.primary}」+次用「${d.tjx.yongShen.secondary||'-'}」（依据：${(d.tjx.yongShen.reasons||[]).slice(0,2).join('；')}）`:'',
    d.tjx?`【精算·格局】${d.tjx.pattern.main||'-'}（${d.tjx.pattern.type}·评级${d.tjx.pattern.grade}）${d.tjx.pattern.detail.join('；')}`:'',
    d.tjx?`【精算·命局质量】${d.tjx.lifeGrade.tier}（${d.tjx.lifeGrade.score}分）`:'',
    d.tjx&&d.tjx.dyScore?`【精算·大运评分】${d.tjx.dyScore.score}（${d.tjx.dyScore.label}）—— ${(d.tjx.dyScore.reasons||[]).slice(0,3).join('；')}`:'',
    d.tjx&&d.tjx.lnScore?`【精算·流年评分】${d.tjx.lnScore.score}（${d.tjx.lnScore.label}）—— ${(d.tjx.lnScore.reasons||[]).slice(0,3).join('；')}`:'',
    d.tjx&&d.tjx.lnEvents&&d.tjx.lnEvents.length?`【精算·流年事件类型】${d.tjx.lnEvents.slice(0,5).map(e=>e.type+':'+e.tag).join(' / ')}`:'',
    d.tjx?(function(){
      const i=d.tjx.interactions;
      const arr=[];
      if(i.gan_he.length)arr.push('天干合:'+i.gan_he.map(x=>x.a+'-'+x.b).join(','));
      if(i.zhi_he.length)arr.push('地支合:'+i.zhi_he.map(x=>x.a+'-'+x.b).join(','));
      if(i.zhi_chong.length)arr.push('地支冲:'+i.zhi_chong.map(x=>x.a+'-'+x.b).join(','));
      if(i.zhi_xing.length)arr.push('地支刑:'+i.zhi_xing.map(x=>x.a+'-'+x.b).join(','));
      if(i.san_he.length)arr.push('三合:'+i.san_he.map(x=>x.zhi+'('+x.wx+(x.full?'·全':'·半')+')').join(','));
      if(i.san_hui.length)arr.push('三会:'+i.san_hui.map(x=>x.zhi+'('+x.wx+')').join(','));
      return arr.length?'【精算·干支互动】'+arr.join(' | '):'';
    })():''
  ];
  return lines.filter(Boolean).join('\n');
}
function formatAIText(text){let h=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\*\*(.+?)\*\*/g,'<span class="hl">$1</span>').replace(/【(.+?)】/g,'<span class="tg">$1</span>').replace(/#{1,4}\s*(.+)/g,'<h4>$1</h4>').split(/\n{2,}/).map(p=>p.trim()?`<p>${p.replace(/\n/g,'<br>')}</p>`:'').join('');return h||`<p>${text.replace(/\n/g,'<br>')}</p>`;}

function getPersona(dg,wx,st,ss){const P={甲:{思维:'目标导向，擅长搭建框架',情绪:'直来直去，不喜绕弯',人际:'领袖型，易成核心',决策:'果断，但易武断',压力:'目标未达成时焦躁'},乙:{思维:'灵活变通，善于借力',情绪:'细腻敏感，易内耗',人际:'润滑剂型，人缘好',决策:'犹豫但周全',压力:'被否定、被忽视时低落'},丙:{思维:'发散创意，喜新厌旧',情绪:'来得快去得快',人际:'阳光型，感染力强',决策:'凭直觉，敢赌',压力:'无聊、被束缚时崩溃'},丁:{思维:'深度钻研，追根究底',情绪:'内敛深沉，积压型',人际:'少而精，重质量',决策:'谨慎，谋定后动',压力:'不确定性、失控感'},戊:{思维:'务实落地，重可行性',情绪:'稳定迟缓，不易波动',人际:'可靠型，但略显沉闷',决策:'保守，厌恶风险',压力:'变动频繁、计划被打乱'},己:{思维:'调和矛盾，八面玲珑',情绪:'隐忍包容，自我消化',人际:'老好人，边界模糊',决策:'折中，和稀泥',压力:'冲突场面、被当工具人'},庚:{思维:'逻辑清晰，黑白分明',情绪:'刚硬直接，易冲突',人际:'义气型，兄弟多',决策:'快刀斩乱麻',压力:'不公平、被算计时暴怒'},辛:{思维:'精致挑剔，追求细节',情绪:'含蓄压抑，表面冷静',人际:'高冷型，慢热',决策:'反复比较，宁缺毋滥',压力:'粗制滥造、审美被毁'},壬:{思维:'宏观视野，系统思考',情绪:'随境而转，适应力强',人际:'广泛交际，三教九流',决策:'顺势而为，灵活调整',压力:'被困住、重复枯燥时抑郁'},癸:{思维:'洞察人心，直觉敏锐',情绪:'深沉暗涌，不易外露',人际:'倾听者型，易成知己',决策:'凭感觉，重视精神契合',压力:'被误解、精神孤立时低落'}};const base=P[dg]||P['甲'];const mode=st?'（偏主动型）':'（偏内敛型）';return{思维:base.思维+mode,情绪:base.情绪,人际:base.人际,决策:base.决策,压力:base.压力};}
function getTimeline(dy,by,wx,b,dg,gen,age){
  const ys=wx.ys,xs=wx.xs,KEys=wx.KE[ys],dw=wx.dw,yearZi=b.Y.zi;
  function scoreOne(g,z){
    let sc=55;const gw=GW[g],zw=ZW[z],ss=SS[dg][g];
    if(gw===ys)sc+=18;else if(gw===xs)sc+=12;else if(gw===KEys)sc-=12;else if(gw===dw)sc+=(wx.st?-5:8);
    if(zw===ys)sc+=15;else if(zw===xs)sc+=10;else if(zw===KEys)sc-=10;else if(zw===dw)sc+=(wx.st?-3:6);
    if(ss==='正官'||ss==='正印')sc+=5;
    if(ss==='正财')sc+=(wx.st?6:-3);
    if(ss==='偏财')sc+=(wx.st?5:-2);
    if(ss==='七杀')sc+=(wx.st?4:-6);
    if(ss==='伤官')sc+=(wx.st?6:-4);
    if(ss==='食神')sc+=3;
    if(ss==='偏印')sc+=(wx.st?-2:4);
    return Math.max(25,Math.min(95,Math.round(sc)));
  }
  return dy.ds.map((d,idx)=>{
    const gSS=SS[dg][d.g],gwx=GW[d.g],zwx=ZW[d.z],sc=scoreOne(d.g,d.z);
    const active=age>=d.as&&age<=d.ae,past=age>d.ae,future=age<d.as;
    const stage=d.as<20?'青春期':d.as<30?'立业期':d.as<40?'冲刺期':d.as<50?'丰盛期':d.as<60?'转型期':d.as<70?'成熟期':'晚晴期';
    let theme='过渡周期',ico='◆',tcol='#c8a45a';
    if(gSS==='正财'){theme='稳健聚财周期';ico='¥';tcol='#d4a04a';}
    else if(gSS==='偏财'){theme='机会财富周期';ico='¥';tcol='#d4a04a';}
    else if(gSS==='正官'){theme='仕途权位周期';ico='☗';tcol='#c8a45a';}
    else if(gSS==='七杀'){theme='挑战拼搏周期';ico='⚔';tcol='#d4654a';}
    else if(gSS==='正印'){theme='贵人学养周期';ico='☷';tcol='#8ab5c8';}
    else if(gSS==='偏印'){theme='玄学独修周期';ico='✶';tcol='#9a7abf';}
    else if(gSS==='食神'){theme='才华享受周期';ico='✿';tcol='#7ab648';}
    else if(gSS==='伤官'){theme='叛逆突破周期';ico='⚡';tcol='#d4b85a';}
    else if(gSS==='比肩'){theme='同行合作周期';ico='⚭';tcol='#8ab5c8';}
    else if(gSS==='劫财'){theme='竞争分利周期';ico='⚔';tcol='#d4654a';}
    const career=gSS.includes('官')?'职位易动，宜主动争取上升或带团队':gSS.includes('财')?'适合谈待遇、跑项目、跨界变现':gSS.includes('印')?'适合进修、考证、回归专业深耕':gSS==='食神'?'用作品/内容打开知名度的好时机':gSS==='伤官'?'易与上级摩擦，宜独立或自媒体':gSS==='比肩'?'人脉资源丰富，合伙优于单干':'稳守为主，少做颠覆性决策';
    const money=(gwx===ys||zwx===ys)?'用神入运，财源稳健':(gwx===KEys||zwx===KEys)?'忌神当道，宜守不宜攻、远离杠杆':gSS.includes('财')?'财星显现，正/偏财机会增多':gSS==='劫财'?'破财之运，谨防担保与朋友借贷':'平稳，无大起大落';
    const love=gSS==='劫财'?'同性竞争多，感情易有第三者':gen==='male'&&gSS.includes('财')?'妻星到位，未婚利结合':gen==='female'&&gSS.includes('官')?'夫星显现，感情有结果':gSS==='伤官'?'情绪起伏大，注意言辞':(zwx===dw||gwx===dw)?'比劫旺，桃花虽多易竞争':'感情平稳，宜深度经营';
    const health=(zwx===wx.w)?'最弱五行得补，体质转佳':(zwx===wx.s)?'最旺五行更旺，注意对应脏腑':(gwx===KEys&&zwx===KEys)?'气场不畅，宜规律作息+静修':'体能尚可，保持运动即可';
    const milestones=[];
    for(let yr=d.ys;yr<=d.ye;yr++){
      const zi=((yr-4)%12+12)%12,gi=((yr-4)%10+10)%10;
      if(zi===yearZi)milestones.push({y:yr,t:'本命年',age:d.as+(yr-d.ys),k:'mz'});
      if(GW[TG[gi]]===ys&&!milestones.find(m=>m.y===yr))milestones.push({y:yr,t:'用神流年',age:d.as+(yr-d.ys),k:'ys'});
    }
    return{idx,g:d.g,z:d.z,gz:d.g+d.z,as:d.as,ae:d.ae,ys:d.ys,ye:d.ye,gSS,gwx,zwx,sc,stage,theme,ico,tcol,career,money,love,health,milestones,active,past,future};
  });
}
function getMonthlyAlert(b,wx){const now=new Date();const m=now.getMonth();const mm=['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'][m];const mw=ZW[mm];const ke={木:'金',火:'水',土:'木',金:'火',水:'土'};let msg='';if(ke[wx.dw]===mw)msg='本月官杀气旺，注意情绪管理和职场压力，避免冲动决定。';else if(wx.ys===mw)msg='本月用神当令，能量充沛，适合推进重要计划与谈判。';else if(wx.SH[wx.dw]===mw)msg='本月食伤吐秀，创意与表达力增强，利输出与社交。';else if(wx.BS[wx.dw]===mw)msg='本月印星生身，适合学习、休息与向内沉淀。';else msg='本月气场平和，按部就班即可，宜整理与复盘。';const risks=[];if(wx.c['火']>2.5&&wx.dw!=='火')risks.push('注意心火旺盛，避免急躁');if(wx.c['水']>2.5&&wx.dw!=='水')risks.push('思绪过杂，宜简化目标');if(wx.st&&wx.c[wx.ys]<0.8)risks.push('用神被泄，精力不济');if(!wx.st&&wx.c[wx.BS[wx.dw]]>2)risks.push('印星过重，容易拖延');return{msg,risks};}
function getRiskWarning(b,wx,lnSS,dySS){const r=[];if(lnSS.includes('官杀'))r.push({t:'情绪波动',d:'官杀流年压力倍增，注意焦虑与睡眠'});if(lnSS.includes('比劫'))r.push({t:'合作风险',d:'比劫争财，合作与借贷需签清晰协议'});if(lnSS.includes('财')&&!wx.st)r.push({t:'财务压力',d:'身弱见财为忌，量力而行，忌高风险投机'});if(lnSS.includes('印')&&dySS.includes('食伤'))r.push({t:'决策摇摆',d:'印制食伤，想法多但落地难，需聚焦'});if(wx.c['火']<0.8||wx.c['水']<0.8)r.push({t:'睡眠问题',d:'水火不调，注意作息与睡眠质量'});if(!r.length)r.push({t:'气场平和',d:'无明显重大风险，稳中求进即可',safe:1});return r;}
function getRelationMode(dg,ss,gen){const map={甲:'独立型',乙:'依赖型',丙:'热情型',丁:'慢热型',戊:'务实型',己:'包容型',庚:'理性型',辛:'挑剔型',壬:'自由型',癸:'敏感型'};return map[dg]||'平衡型';}
function getSuitableType(wx,dg){const map={木:'情绪稳定、行动力强、土金偏旺的人',火:'包容性强、愿意给予空间的人',土:'有上进心、能带来新鲜感的人',金:'温柔细腻、善于沟通的人',水:'逻辑清晰、能给予安全感的人'};return map[wx.dw]||'五行互补、性格圆融的人';}
function getRelationRisks(wx,dg,ss){const r=[];if(wx.st)r.push('过于强势，容易忽略伴侣感受');if(!wx.st)r.push('过于迁就，边界感模糊导致委屈');if(ss.dzc.some(c=>c.s.includes('伤官')))r.push('言语锋利，易因沟通方式产生摩擦');if(wx.c['火']>3)r.push('情绪波动大，热情来得快去得也快');if(wx.c['水']>2.8)r.push('思虑过多，容易因猜疑产生隔阂');if(!r.length)r.push('暂无显著关系风险，保持真诚沟通即可');return r;}
function getDecisionAdvice(b,wx,dy,ln,scene){
  const ctx=getCtx();
  const age=ctx?ctx.age:(b._meta?TJ.calcAge(b._meta.by,b._meta.bm||1,b._meta.bd||1):0);
  const cDy=ctx?ctx.cDy:TJ.findDaYun(dy,age);
  const cLn=ctx?ctx.cLn:TJ.findLiuNian(ln,CURR_YEAR);
  if(!cDy||!cLn)return{label:'信息不足',window:'-',risk:'-',advice:'请先完整填写出生信息'};
  const dg=b.D.g,lnSS=TJ.ssOf(dg,cLn.g),dySS=TJ.ssOf(dg,cDy.g);
  if(scene==='跳槽'){const good=lnSS.includes('官')||lnSS.includes('财')||dySS.includes('官');return{label:good?'适合变动':'适合稳守',window:good?'未来3-5个月':'建议等到明年春季',risk:'情绪化决定',advice:'先拿Offer再离职，别裸辞'};}
  if(scene==='创业'){const good=wx.st&&(lnSS.includes('食')||lnSS.includes('伤')||lnSS.includes('财'));return{label:good?'可以尝试':'更适合联合创业',window:good?'秋季启动最佳':'先积累资源与人脉',risk:good?'资金链断裂':'单打独斗精力不足',advice:good?'找土金属性的合伙人':'先以副业验证模式'};}
  if(scene==='投资'){const good=lnSS.includes('财')&&wx.st;return{label:good?'偏财机会存在':'以稳健储蓄为主',window:good?'农历七月前后':'全年以固收为主',risk:'高风险短线操作',advice:good?'小仓位试水，见好就收':'远离杠杆与加密货币'};}
  return{label:'需结合具体时机',window:'近期非关键窗口',risk:'信息不足',advice:'建议先咨询专业顾问'};
}

function renderAll(b,wx,ss,dy,ln,zw,qm,mh,si,gen,q,city,by,shensha,liuyue){
  // —— 统一上下文（所有派生量的唯一来源）——
  const _input=(window._ctx&&window._ctx.input)?window._ctx.input:{by:by,bm:1,bd:1};
  const ctx=buildContext({b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,P:null,gen,q,city,input:_input});
  const dg=ctx.dg,dw=ctx.dw,age=ctx.age,cDy=ctx.cDy,cLn=ctx.cLn,lnSS=ctx.lnSS,dySS=ctx.dySS;
  // —— 评分/命格 全部来自 ctx，避免与其他位置算法不一致 ——
  const cs=ctx.cs,ws=ctx.ws,ls=ctx.ls,hs=ctx.hs;
  const pa=ctx.pa;
  const P={甲:{core:'刚正不阿，有领导才能，如参天大树般坚韧挺拔',career:'适合创业、管理、教育、建筑等行业，天生有号召力',money:'财运偏向正财，靠实力和努力赚钱',love:'感情中比较主动和强势，重情义但不善表达',social:'朋友圈广但知心朋友少，给人可靠感但有时显得固执'},乙:{core:'温柔敏感，适应力极强，如藤蔓般灵活变通',career:'适合文艺、设计、咨询、花艺、时尚等行业',money:'善于理财，懂得细水长流，小钱变大钱',love:'感情细腻体贴，善解人意，但容易委屈自己',social:'人缘很好，八面玲珑，要注意别太随和丢主见'},丙:{core:'热情开朗，光明磊落，如太阳般温暖照耀他人',career:'适合销售、演艺、传媒、餐饮、能源等行业',money:'来财快但花得也快，要注意节制',love:'感情热烈奔放，喜欢轰轰烈烈，热度来得快退得也快',social:'天生社交达人，朋友遍天下，但要防小人利用'},丁:{core:'内敛聪慧，心思缜密，如烛火般温暖而专注',career:'适合科研、技术、文化、中医、心理咨询等',money:'财运稳定但偏保守，适合做长期投资',love:'感情专一深沉，重视精神交流，一旦爱了就很长久',social:'朋友不多但质量高，看人很准，内心丰富不轻露'},戊:{core:'稳重厚实，诚信可靠，如大山般沉稳包容',career:'适合地产、农业、金融、物流等行业，稳扎稳打',money:'偏财运不错，有意外之财，但要防借钱不还',love:'感情稳定持久，给人安全感，但要多制造浪漫',social:'值得信赖，别人有事第一个想到你，要学会拒绝'},己:{core:'包容万物，善于调和矛盾，如田园般滋养万物',career:'适合服务业、教育、HR、餐饮、农业等',money:'善于积少成多，不爱冒险但理财有道',love:'温和善解人意，容易吸引异性，但要学会表达感受',social:'人缘极好，是朋友圈润滑剂，防止被当老好人'},庚:{core:'果断刚毅，正义感强，如宝剑般锋利决断',career:'适合法律、金融、军警、外科医生等',money:'赚钱能力强但花钱大方，注意开源节流',love:'感情直接，爱憎分明，不喜欢拐弯抹角',social:'讲义气，朋友有困难一定帮，但脾气硬易冲突'},辛:{core:'精致细腻，审美独到，如珠玉般璀璨内敛',career:'适合珠宝、金融、美妆、艺术、品质管理等',money:'对钱敏感，善于发现商机，但过于谨慎会错过机会',love:'感情含蓄内敛，追求完美另一半，宁缺毋滥',social:'表面冷淡内心热情，交友有高标准重质量'},壬:{core:'智慧深邃，思维开阔，如大海般博大包容',career:'适合贸易、物流、科技、咨询、旅游等',money:'财运起伏大，适合做流动性强的生意',love:'感情丰富不受拘束，不喜欢被束缚，需要自由空间',social:'交友广泛三教九流都能聊，真心朋友需时间沉淀'},癸:{core:'敏锐灵动，善于洞察人心，如细雨般润物无声',career:'适合心理学、医学、占卜、文学、IT等',money:'偏财运好，常有意想不到的收入，但要注意别被骗',love:'感情深沉细腻，重视精神契合，容易暗恋',social:'朋友不多但都很铁，善于倾听，是天生心灵导师'}};
  const HM={木:{o:'肝胆',a:'多食绿蔬'},火:{o:'心脏',a:'适量运动'},土:{o:'脾胃',a:'饮食规律'},金:{o:'肺部',a:'远离烟尘'},水:{o:'肾脏',a:'充足睡眠'}};
  const gl=gen==='male'?'乾造':'坤造';
  const siS={旺:'得令强旺',相:'得气充足',休:'休囚需扶',囚:'受困宜补',死:'失令需生'}[si.st]||'平';
  const curveD=dy.ds.map((_,i)=>Math.round(Math.min(95,Math.max(30,50+Math.sin(i*.7)*20+Math.cos(i*.5)*10+(wx.c[GW[dy.ds[i].g]]||0)*5))));

  document.getElementById('p2Title').textContent=`${b.D.g}${b.D.z}日 · ${gl}`;
  if(b._meta&&b._meta.useTrueSolar){document.getElementById('p2Title').textContent+=` · 真太阳时${DZ[b._meta.hourZhi]}时`;}

  let H='';

  H+=`<div class="sec active" id="s-ming">`;
  H+=renderQuickRead('ming',ctx);
  const aiSummary=buildAISummary(b,wx,ss,dy,ln,pa,P,gen,si,age);
  H+=`<div class="glass card-1 ai-sum collapsible"><div class="ai-sum-label">✦ AI 命盘摘要 <span class="ai-sum-toggle" onclick="this.closest('.ai-sum').classList.toggle('expanded')">展开 ▾</span></div><div class="ai-sum-body">${aiSummary}</div></div>`;

  H+=`<div class="glass card-2" data-card="bazi"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div><div class="card-tt">四柱八字</div><div class="card-st">${gl} · ${city.n} · ${b.sx}年 · ${b.ny}${b._meta&&b._meta.useTrueSolar?' · 真太阳时':''}</div></div></div>`;
  H+=`<div class="pls">${[{l:'年柱',p:b.Y,s:ss.yg},{l:'月柱',p:b.M,s:ss.mg},{l:'日柱',p:b.D,s:'日元',dm:1},{l:'时柱',p:b.H,s:ss.hg}].map(x=>`<div class="pl ${x.dm?'dm':''}" onclick="this.classList.toggle('open')"><div class="pl-l">${x.l}</div><div class="pl-g">${x.p.g}</div><div class="pl-z" style="color:${WC[ZW[x.p.z]]}">${x.p.z}</div><div class="pl-i"><span class="wdot" style="background:${WC[GW[x.p.g]]}"></span>${GW[x.p.g]} · ${x.s}</div><div class="pl-xd"><div style="padding-top:6px;font-size:.62em;color:rgba(255,255,255,.45);line-height:1.7;border-top:1px solid rgba(255,255,255,.06);margin-top:4px">${ZC[x.p.z].map((g,idx)=>`<div style="display:flex;align-items:center;gap:4px"><span class="wdot" style="background:${WC[GW[g]]}"></span><span style="color:rgba(255,255,255,.6)">${g}</span><span style="color:var(--ac-dim)">${SS[b.D.g][g]}</span><span style="font-size:.85em;color:rgba(255,255,255,.25)">${['主气','中气','余气'][idx]}</span></div>`).join('')}</div></div></div>`).join('')}</div>`;
  H+=`<div class="ig">${[['日主',`${dg}${dw}·${wx.st?'身旺':'身弱'}`],['命格',pa.join('、')],['用神',`<span style="color:${WC[wx.ys]}">${wx.ys}</span>`],['喜神',`<span style="color:${WX.includes(wx.xs)?WC[wx.xs]:'#fff'}">${wx.xs}</span>`],['纳音',b.ny],['四时',`${si.s}令·${siS}`]].map(x=>`<div class="ii"><div class="il">${x[0]}</div><div class="iv">${x[1]}</div></div>`).join('')}</div>`;
  H+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${getShenShaLabels(b).map(l=>`<span class="sstag" style="background:${l.bg};color:${l.co};border:1px solid ${l.bd}">${l.t}</span>`).join('')}</div>`;
  H+=`</div>`;

  H+=`<div class="glass card-2" data-card="wuxing"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/></svg></div><div><div class="card-tt">五行能量模型</div></div></div>`;
  H+=`${WX.map(w=>{const pc=Math.round(wx.c[w]/wx.t*100);const label=pc>=70?'极强':pc>=55?'偏强':pc>=40?'一般':pc>=25?'偏弱':'不足';return`<div class="wxr"><div class="wxl" style="color:${WC[w]}">${w}</div><div class="wxt"><div class="wxf" style="width:0%;background:${WC[w]}" data-w="${pc}%">${pc}%</div></div><div class="wxv">${pc}% ${label}</div></div>`}).join('')}`;
  H+=`<div class="at" style="margin-top:6px"><p>你属于典型的「<span class="hl">${wx.s}旺型人格</span>」${wx.s==='木'?'，行动力强，但容易精神内耗':wx.s==='火'?'，热情有感染力，但容易急躁':wx.s==='土'?'，稳重可靠，但容易固执':wx.s==='金'?'，果断锐利，但容易冷漠':''}。需要增强<span class="tg">${wx.w}</span>属性以平衡。</p></div></div>`;

  const persona=getPersona(dg,wx,wx.st,ss);
  H+=`<div class="glass card-2" data-card="persona"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div><div class="card-tt">人格画像</div><div class="card-st">基于日主与格局推导</div></div></div>`;
  H+=`<div class="portrait-grid">${Object.entries(persona).map(([k,v])=>`<div class="port-item"><div class="port-label">${k}</div><div class="port-val">${v}</div></div>`).join('')}</div></div>`;

  const tlData=getTimeline(dy,by,wx,b,dg,gen,age);
  const tlMin=Math.min(...tlData.map(t=>t.sc)),tlMax=Math.max(...tlData.map(t=>t.sc));
  const cvW=300,cvH=70,padL=8,padR=8,padT=10,padB=14;
  const stepX=(cvW-padL-padR)/(tlData.length-1);
  const ptOf=(s,i)=>{const x=padL+i*stepX;const norm=tlMax===tlMin?0.5:(s-tlMin)/(tlMax-tlMin);const y=padT+(cvH-padT-padB)*(1-norm);return[x,y];};
  const pts=tlData.map((t,i)=>ptOf(t.sc,i));
  const pathD=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const areaD=pathD+` L${pts[pts.length-1][0].toFixed(1)} ${cvH-padB} L${pts[0][0].toFixed(1)} ${cvH-padB} Z`;
  const startYear=by+dy.sa;
  H+=`<div class="glass card-2" data-card="timeline"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div><div><div class="card-tt">人生时间线 · 大运十程</div><div class="card-st">${dy.sa}岁起运 · ${startYear}年入大运 · ${(b.Y.gi%2===0)===(gen==='male')?'顺':'逆'}排</div></div></div>`;
  H+=`<div class="tl-curve-wrap"><svg viewBox="0 0 ${cvW} ${cvH}" preserveAspectRatio="none" class="tl-curve"><defs><linearGradient id="tlGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--ac)" stop-opacity=".45"/><stop offset="1" stop-color="var(--ac)" stop-opacity="0"/></linearGradient></defs><path d="${areaD}" fill="url(#tlGrad)"/><path d="${pathD}" fill="none" stroke="var(--ac5)" stroke-width="1.5" stroke-linejoin="round"/>${pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${tlData[i].active?3.5:2.2}" fill="${tlData[i].active?'var(--ac)':tlData[i].past?'rgba(255,255,255,.25)':'var(--ac5)'}"/>`).join('')}</svg><div class="tl-curve-axis">${tlData.map(t=>`<span class="${t.active?'on':''}">${t.as}</span>`).join('')}</div></div>`;
  H+=`<div class="tl-legend"><span><i style="background:var(--ac)"></i>当前大运</span><span><i style="background:rgba(255,255,255,.25)"></i>已过</span><span><i style="background:var(--ac5)"></i>未来</span></div>`;
  H+=`<div class="tl-list">${tlData.map(t=>{
    const stars='★★★★★'.split('').map((s,i)=>`<span style="color:${i<Math.round(t.sc/20)?t.tcol:'rgba(255,255,255,.12)'}">${s}</span>`).join('');
    const stateCls=t.active?'active':t.past?'past':'future';
    const msHtml=t.milestones.length?`<div class="tl-ms">${t.milestones.map(m=>`<span class="tl-ms-pill ${m.k}">${m.y}年·${m.age}岁·${m.t}</span>`).join('')}</div>`:'';
    return `<div class="tl-card ${stateCls}" onclick="this.classList.toggle(\'open\')">
      <div class="tl-card-hd">
        <div class="tl-card-l">
          <div class="tl-gz"><span style="color:${WC[t.gwx]}">${t.g}</span><span style="color:${WC[t.zwx]}">${t.z}</span></div>
          <div class="tl-meta"><span class="tl-ss">${t.gSS}</span><span class="tl-stage">${t.stage}</span></div>
        </div>
        <div class="tl-card-m">
          <div class="tl-age-r">${t.as}<span>~</span>${t.ae}<small>岁</small></div>
          <div class="tl-year-r">${t.ys} - ${t.ye}</div>
        </div>
        <div class="tl-card-r">
          <div class="tl-theme" style="color:${t.tcol}">${t.ico} ${t.theme}</div>
          <div class="tl-stars">${stars}<span class="tl-sc">${t.sc}</span></div>
        </div>
      </div>
      <div class="tl-detail">
        <div class="tl-quad">
          <div class="tl-q"><div class="tl-q-h">事业</div><div class="tl-q-b">${t.career}</div></div>
          <div class="tl-q"><div class="tl-q-h">财富</div><div class="tl-q-b">${t.money}</div></div>
          <div class="tl-q"><div class="tl-q-h">感情</div><div class="tl-q-b">${t.love}</div></div>
          <div class="tl-q"><div class="tl-q-h">健康</div><div class="tl-q-b">${t.health}</div></div>
        </div>
        ${msHtml}
      </div>
    </div>`;
  }).join('')}</div>`;
  H+=`<div class="tl-foot">※ 大运十年一变，干主前五年、支主后五年；分数为命局用神匹配度的相对参考。</div></div>`;
  H+=`</div>`;

  H+=`<div class="sec" id="s-yun">`;
  H+=renderQuickRead('yun',ctx);
  H+=`<div class="glass card-1" data-card="trend"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 20h18M6 16V9M10 16V5M14 16V8M18 16V3"/></svg></div><div><div class="card-tt">${CURR_YEAR}年核心趋势</div><div class="card-st">${cLn.g}${cLn.z} ${cLn.sx}年 · ${lnSS}</div></div></div>`;
  H+=`<div class="y-hero">${[{l:'事业',v:cs,c:'#c8a45a'},{l:'财运',v:ws,c:'#d4a04a'},{l:'感情',v:ls,c:'#d4654a'},{l:'健康',v:hs,c:'#7ab648'}].map(x=>`<div class="y-hero-item"><div class="y-hero-label">${x.l}</div><div class="y-hero-stars">${'★★★★★'.split('').map((s,i)=>`<span style="color:${i<Math.round(x.v/20)?x.c:'rgba(255,255,255,0.12)'}">${s}</span>`).join('')}</div><div class="y-hero-score">${x.v}分</div></div>`).join('')}</div>`;
  H+=`<div class="at"><p>今年<span class="hl">${cLn.g}${cLn.z}</span>年，流年十神为「<span class="tg">${lnSS}</span>」。${cs>72?'整体势能向上，适合主动进取。':'整体以稳为主，厚积薄发。'}当前<span class="hl">${cDy.g}${cDy.z}</span>大运，${dySS.includes('官')?'事业压力与机遇并存':dySS.includes('财')?'财运通道打开':dySS.includes('印')?'适合学习沉淀':''}。</p></div></div>`;

  // —— 合并卡：⚠ 当下关注（本月 + 风险 + 健康）——
  const ma=getMonthlyAlert(b,wx);
  const risks=getRiskWarning(b,wx,lnSS,dySS);
  const _av_yun={g:wx.ys==='木'?'翡翠、木质饰品':wx.ys==='火'?'红玛瑙、紫水晶':wx.ys==='土'?'黄水晶、陶瓷':wx.ys==='金'?'白水晶、金属':'黑曜石、海蓝宝',f:wx.ys==='木'?'绿色蔬菜、酸味食物':wx.ys==='火'?'红色食物、苦味茶':wx.ys==='土'?'谷物、根茎类':wx.ys==='金'?'白色食品、百合':'黑色食品、海鲜'};
  // 严重度评估：决定默认显示哪个子 tab（任一子区如果"高风险"则定位过去）
  const hasHardRisk=risks.some(r=>!r.safe);
  const defaultFocus=hasHardRisk?'risk':(ma.risks&&ma.risks.length?'monthly':'risk');
  H+=`<div class="glass card-2 focus-card" data-card="focus"><div class="card-hd"><div class="card-ic" style="color:#d4654a;background:rgba(212,101,74,.12);border-color:rgba(212,101,74,.20)"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div><div class="card-tt">⚠ 当下关注</div><div class="card-st">${getTodayGZ().split(' ').pop()} · 本月 · 风险 · 健康</div></div></div>`;
  // 子 tab 头
  H+=`<div class="focus-tabs">
    <button class="focus-tab ${defaultFocus==='monthly'?'active':''}" data-sub="monthly" onclick="focusSwitchTab(this)"><span class="focus-tab-ic">🗓</span> 本月${ma.risks&&ma.risks.length?'<span class="focus-dot"></span>':''}</button>
    <button class="focus-tab ${defaultFocus==='risk'?'active':''}" data-sub="risk" onclick="focusSwitchTab(this)"><span class="focus-tab-ic">⚡</span> 风险${hasHardRisk?'<span class="focus-dot red"></span>':''}</button>
    <button class="focus-tab ${defaultFocus==='health'?'active':''}" data-sub="health" onclick="focusSwitchTab(this)"><span class="focus-tab-ic">⚕</span> 健康</button>
  </div>`;
  // monthly 子区
  H+=`<div class="focus-pane ${defaultFocus==='monthly'?'active':''}" data-sub="monthly">
    <div class="at"><p>${ma.msg}</p></div>
    ${ma.risks&&ma.risks.length?`<div class="risk-row" style="margin-top:6px">${ma.risks.map(r=>`<span class="risk-pill">⚡ ${r}</span>`).join('')}</div>`:'<div class="focus-empty">本月暂无突出提醒</div>'}
  </div>`;
  // risk 子区
  H+=`<div class="focus-pane ${defaultFocus==='risk'?'active':''}" data-sub="risk">
    <div class="risk-row">${risks.map(r=>`<span class="risk-pill ${r.safe?'safe':''}">${r.safe?'✓':'⚠'} ${r.t}</span>`).join('')}</div>
    <div class="at" style="font-size:.8em;margin-top:6px"><p>${risks.map(r=>`· ${r.t}：${r.d}`).join('<br>')}</p></div>
  </div>`;
  // health 子区
  H+=`<div class="focus-pane ${defaultFocus==='health'?'active':''}" data-sub="health">
    <div class="at"><p>最弱五行<span class="hl">${wx.w}</span>，重点关注<span class="tc">${HM[wx.w].o}</span>。${HM[wx.w].a}。</p><p>用神饰品推荐：<span class="hl">${_av_yun.g}</span>　·　日常多食<span class="hl">${_av_yun.f}</span>。</p></div>
  </div>`;
  H+=`</div>`;


  H+=`<div class="glass card-2" data-card="dayun"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 12c2-4 5-7 10-7s8 3 10 7c-2 4-5 7-10 7s-8-3-10-7z"/><circle cx="12" cy="12" r="3"/></svg></div><div><div class="card-tt">大运时间轴</div></div></div>`;
  H+=`<div class="tl" id="daYunTl">${dy.ds.map((d,idx)=>{const c=age>=d.as&&age<=d.ae;const dySS=SS[dg][d.g];return`<div class="ti ${c?'cu':''}"><div class="ta">${d.as}-${d.ae}岁</div><div class="tg2">${d.g}${d.z}</div><div class="ty">${d.ys}-${d.ye}</div><div style="font-size:.55em;color:var(--ac-dim);margin-top:2px">${dySS}</div>${c?'<div class="tb">当前</div>':''}</div>`}).join('')}</div>`;
  H+=`<div class="crvw" style="margin:14px 0;padding:14px;background:rgba(255,255,255,0.03);border-radius:var(--rs)"><div style="font-size:.68em;color:rgba(255,255,255,0.3);font-weight:500;letter-spacing:1px;margin-bottom:8px">运势曲线</div><canvas id="cvC" width="700" height="170" style="width:100%;height:auto"></canvas></div></div>`;


  H+=`<div class="glass card-2" data-card="liuyue"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 20h18M6 16V9M10 16V5M14 16V8M18 16V3"/></svg></div><div><div class="card-tt">${CURR_YEAR}年流月</div><div class="card-st">点击月份查看详解</div></div></div><div class="lym-grid">${liuyue.map((lm,idx)=>{const now=new Date();const curMonth=now.getMonth();const isCur=(idx===curMonth);const lmSS=SS[dg][lm.gz.charAt(0)];return`<div class="lym-item ${isCur?'current':''}" onclick="openMonthModal(${idx},'${lm.name}','${lm.gz}','${lm.jq}','${lmSS}')"><div class="lym-name">${lm.name}</div><div class="lym-gz">${lm.gz}</div><div class="lym-jq">${lm.jq}</div><div class="lym-ss">${lmSS}</div></div>`}).join('')}</div></div>`;
  H+=`</div>`;

  const rmode=getRelationMode(dg,ss,gen);
  const stype=getSuitableType(wx,dg);
  const rrisks=getRelationRisks(wx,dg,ss);
  H+=`<div class="sec" id="s-rel">`;
  H+=renderQuickRead('rel',ctx);
  H+=`<div class="glass card-1" data-card="loveMode"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div><div><div class="card-tt">感情模式</div></div></div>`;
  H+=`<div class="rel-mode"><div class="rel-mode-item hl">${rmode}</div></div>`;
  H+=`<div class="at"><p>你的感情底色带有「<span class="hl">${rmode}</span>」的特质。${P[dg].love}。在亲密关系中，${wx.st?'你习惯主导节奏，需注意给对方留出表达空间':'你习惯配合与迁就，需建立清晰的自我边界'}。</p></div></div>`;

  H+=`<div class="glass card-2" data-card="loveMatch"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg></div><div><div class="card-tt">适合对象</div></div></div>`;
  H+=`<div class="at"><p>从五行互补与十神配合来看，你更适合：<span class="hl">${stype}</span>。</p><p>对方的日主属性以<span class="tg">${wx.ys==='木'?'土金':wx.ys==='火'?'金水':wx.ys==='土'?'木水':wx.ys==='金'?'火木':'火土'}</span>为佳，能够补足你的用神能量。</p></div></div>`;

  H+=`<div class="glass card-2" data-card="loveRisk"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div><div><div class="card-tt">关系风险</div></div></div>`;
  H+=`<div class="risk-row">${rrisks.map(r=>`<span class="risk-pill">${r}</span>`).join('')}</div></div>`;

  H+=`<div class="glass card-1" data-card="relAi"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div><div><div class="card-tt">AI 关系分析</div><div class="card-st">输入对方信息，查看相处节奏与长期稳定性</div></div></div>`;
  H+=`<div class="hh-form" id="relForm"><div><div class="fd" style="margin-bottom:10px"><label>对方出生日期</label><input type="date" id="rDate" value="1992-08-20"></div><div class="fd" style="margin-bottom:10px"><label>对方出生时间</label><input type="time" id="rTime" value="06:00" style="font-family:var(--sf)"></div><div class="fd" style="margin-bottom:10px"><label>对方性别</label><select id="rGen"><option value="male">男</option><option value="female" selected>女</option></select></div></div></div>`;
  H+=`<div class="cta-row" style="margin-top:10px"><button class="cta" style="padding:12px 28px;font-size:.95em;letter-spacing:1px" onclick="calcRelation()">开始分析</button></div>`;
  H+=`<div id="relResult" style="margin-top:10px"></div></div>`;
  H+=`</div>`;

  

  const av={c:wx.ys==='木'?'青绿色':wx.ys==='火'?'红色、紫色':wx.ys==='土'?'黄色、棕色':wx.ys==='金'?'白色、银色':'黑色、蓝色',n:wx.ys==='木'?'3、8':wx.ys==='火'?'2、7':wx.ys==='土'?'5、0':wx.ys==='金'?'4、9':'1、6',d:wx.ys==='木'?'东方':wx.ys==='火'?'南方':wx.ys==='土'?'中央':wx.ys==='金'?'西方':'北方',g:wx.ys==='木'?'翡翠、木质饰品':wx.ys==='火'?'红玛瑙、紫水晶':wx.ys==='土'?'黄水晶、陶瓷':wx.ys==='金'?'白水晶、金属':'黑曜石、海蓝宝',t:wx.ys==='木'?'寅卯时（3-7点）':wx.ys==='火'?'巳午时（9-13点）':wx.ys==='土'?'辰丑时（7-9点,1-3点）':wx.ys==='金'?'申酉时（15-19点）':'亥子时（21-1点）',f:wx.ys==='木'?'绿色蔬菜、酸味食物':wx.ys==='火'?'红色食物、苦味茶':wx.ys==='土'?'谷物、根茎类':wx.ys==='金'?'白色食品、百合':'黑色食品、海鲜'};
  const todayJ=getTodayGZ();
  H+=`<div class="sec" id="s-adv">`;
  H+=`<div class="glass card-1" data-card="todayAdv"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><div><div class="card-tt">今日建议</div><div class="card-st">${todayJ}</div></div></div>`;
  H+=`<div class="adv-grid">`;
  H+=`<div class="adv-card"><div class="adv-hd">🟢 宜</div><div class="adv-body"><span class="adv-tag yi">谈合作</span><span class="adv-tag yi">学习充电</span><span class="adv-tag yi">制定计划</span><span class="adv-tag yi">整理房间</span></div></div>`;
  H+=`<div class="adv-card"><div class="adv-hd">🔴 忌</div><div class="adv-body"><span class="adv-tag ji">冲动消费</span><span class="adv-tag ji">情绪化沟通</span><span class="adv-tag ji">重大签约</span><span class="adv-tag ji">熬夜透支</span></div></div>`;
  H+=`<div class="adv-card"><div class="adv-hd">🧭 开运方向</div><div class="adv-body">幸运色：<span class="hl">${av.c}</span><br>有利方位：<span class="hl">${av.d}</span><br>旺运元素：<span class="hl">${wx.ys}</span><br>吉时：<span class="hl">${av.t}</span></div></div>`;
  H+=`<div class="adv-card"><div class="adv-hd">💼 职业建议</div><div class="adv-body">适合靠近<span class="hl">${wx.ys}</span>属性领域：<br>${wx.ys==='木'?'内容表达、品牌、教育、园艺':wx.ys==='火'?'能源、传媒、餐饮、互联网':wx.ys==='土'?'地产、金融、建筑、农业':wx.ys==='金'?'法律、机械、珠宝、精密制造':'贸易、物流、科技、旅游'}</div></div>`;
  H+=`</div></div>`;


  H+=`<div class="glass card-2" data-card="daySign"><div class="card-hd"><div class="card-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div><div class="card-tt">今日日签</div><div class="card-st">${todayJ}</div></div></div>`;
  H+=`<div style="display:flex;gap:10px;align-items:center;padding:8px 0"><div style="flex:1;padding:14px 10px;border-radius:var(--rs);background:rgba(255,255,255,0.04);text-align:center;border:1px solid rgba(255,255,255,0.05);cursor:pointer;transition:background .2s" onmouseover="this.style.background='var(--ac3)'" onmouseout="this.style.background='rgba(255,255,255,0.04)'" onclick="showRiQian()"><div style="font-size:1.2em;margin-bottom:4px">📜</div><div style="font-size:.78em;color:var(--ac-text);font-weight:500">查看今日日签</div><div style="font-size:.65em;color:rgba(255,255,255,0.35);margin-top:3px">宜忌 · 干支 · 吉凶</div></div></div></div>`;
  H+=`</div>`;

  document.getElementById('p2Inner').innerHTML=H;
  // —— 唯一全局上下文（_baziData / _reportData 作兼容别名）——
  ctx.P=P;ctx.shensha=shensha;ctx.liuyue=liuyue;ctx.zw=zw;ctx.qm=qm;ctx.mh=mh;
  window._ctx=ctx;
  window._baziData=ctx;
  window._reportData=ctx;

  requestAnimationFrame(()=>{
    document.querySelectorAll('.wxf,.ff').forEach(el=>{setTimeout(()=>{el.style.width=el.dataset.w},200)});
    const tl=document.getElementById('daYunTl');
    if(tl){const cu=tl.querySelector('.ti.cu');if(cu){cu.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});}}
  });
}

/* ====== 信息密度优化：速读卡 + 章节导航 ====== */
function renderQuickRead(secKey,d){
  if(!d)return '';
  const dg=d.dg,wx=d.wx,cDy=d.cDy,cLn=d.cLn,cLm=d.cLm;
  const items=[];
  if(secKey==='ming'){
    items.push({l:'日主',v:dg+wx.dw,c:wx.dw});
    items.push({l:'强弱',v:wx.st?'身旺':'身弱'});
    items.push({l:'用神',v:wx.ys,c:wx.ys});
    items.push({l:'格局',v:(d.pa&&d.pa[0])||'平和'});
    const summary='命局以「<b>'+dg+wx.dw+'</b>」为本，'+(wx.st?'气场刚强宜主动':'气场柔顺宜借力')+'，关键在用神「<b style="color:'+WC[wx.ys]+'">'+wx.ys+'</b>」的把握。';
    return _qrCard('命盘速读',items,summary,[
      {k:'bazi',t:'查看四柱→'},{k:'wuxing',t:'五行结构→'},{k:'timeline',t:'十程大运→'}
    ]);
  }
  if(secKey==='yun'){
    items.push({l:'流年',v:cLn?cLn.g+cLn.z:'-',c:cLn?GW[cLn.g]:''});
    items.push({l:'十神',v:d.cLnSS||'-'});
    items.push({l:'事业',v:d.cs+'分'});
    items.push({l:'财运',v:d.ws+'分'});
    const tone=d.cs>72?'势能向上':d.cs>55?'平稳推进':'守势为主';
    const summary='今年「<b>'+(cLn?cLn.g+cLn.z:'-')+'</b>」流年十神「<b>'+d.cLnSS+'</b>」，整体'+tone+'。当前大运「<b>'+cDy.g+cDy.z+'</b>」（'+cDy.as+'~'+cDy.ae+'岁）'+(d.cDySS.includes('财')?'，财路已开':d.cDySS.includes('官')?'，仕途明朗':d.cDySS.includes('印')?'，宜学养沉淀':'，宜稳中求进')+'。';
    return _qrCard('运势速读',items,summary,[
      {k:'trend',t:'四维评分→'},{k:'dayun',t:'大运时间轴→'},{k:'liuyue',t:'本月详解→'}
    ]);
  }
  if(secKey==='rel'){
    const star=d.gen==='male'?'财星(妻)':'官星(夫)';
    const hasPeach=d.shensha&&d.shensha.some(x=>x.n==='桃花'||x.n==='红艳');
    items.push({l:'配偶星',v:star});
    items.push({l:'桃花',v:hasPeach?'命带':'不显'});
    items.push({l:'感情节奏',v:wx.st?'主导型':'迁就型'});
    items.push({l:'流年合婚',v:d.cLnSS.includes(d.gen==='male'?'财':'官')?'利结合':'宜深耕'});
    const summary='你的'+star+'代表伴侣特质，性格上属于「<b>'+(wx.st?'主导型':'迁就型')+'</b>」。'+(hasPeach?'命带桃花，异性缘充足但需筛选；':'桃花不显，缘分多来自熟人介绍；')+(d.cLnSS.includes(d.gen==='male'?'财':'官')?'今年配偶星到位，未婚利结合。':'今年感情节奏偏稳，宜深耕已有关系。');
    return _qrCard('关系速读',items,summary,[
      {k:'loveMode',t:'相处模式→'},{k:'loveMatch',t:'适合对象→'},{k:'relAi',t:'AI 双盘合参→'}
    ]);
  }
  return '';
}
function _qrCard(title,items,summary,actions){
  const itemsHtml=items.map(it=>`<div class="qr-item"><div class="qr-l">${it.l}</div><div class="qr-v"${it.c&&WC[it.c]?' style="color:'+WC[it.c]+'"':''}>${it.v}</div></div>`).join('');
  const actsHtml=(actions||[]).map(a=>`<button class="qr-act" onclick="jumpTo(null,'${a.k}')">${a.t}</button>`).join('');
  return `<div class="qr-card"><div class="qr-head"><span class="qr-badge">速读</span><span class="qr-title">${title}</span></div><div class="qr-grid">${itemsHtml}</div><div class="qr-summary">${summary}</div><div class="qr-acts">${actsHtml}</div></div>`;
}

function buildAISummary(b,wx,ss,dy,ln,pa,P,gen,si,age){
  // —— 与 renderAll 共享 ctx，保证 AI 摘要与界面显示完全一致 ——
  const _c=getCtx();
  const cDy=(_c&&_c.cDy)||TJ.findDaYun(dy,age);
  const cLn=(_c&&_c.cLn)||TJ.findLiuNian(ln,CURR_YEAR);
  const dg=b.D.g;
  const persona=P[dg]||P['甲'];
  const phase=age<28?'前期积累':age<38?'突破发力':age<48?'沉淀守成':'影响力期';
  return`你属于典型的「<span class="hl">${wx.ys}${wx.st?'成长型':'滋养型'}</span>命格」。${persona.core.substring(0,20)}。前期${age<30?'积累较慢，但30岁后':'有所积累，'}<span class="hl">${phase}</span>事业运${cDy.g===wx.ys?'明显增强':'趋于稳健'}。<br><br>适合：<br>· ${persona.career.split('、').slice(0,3).join('、')}<br><br>当前阶段最需要：<span class="hl">稳定节奏，而不是频繁改变方向</span>。${wx.st?'身旺能担财官，宜主动出击':'身弱喜印比扶身，宜借势借力'}。`;
}

function calcRelation(){
  const d=window._baziData;if(!d)return;
  const rd=document.getElementById('rDate').value,rt=document.getElementById('rTime').value||'06:00',rg=document.getElementById('rGen').value;
  if(!rd)return alert('请填写对方出生日期');
  const [y2,m2,d02]=rd.split('-').map(Number),[hh2,mm2]=rt.split(':').map(Number);
  const r2=resolveBirthDateTime(y2,m2,d02,hh2,mm2,false);
  const b2=mkBazi(r2.year,r2.month,r2.day,r2.hourZhi);
  const wx2=mkWx(b2),ss2=mkSs(b2);
  let score=65,notes=[];
  const sxMatch={鼠:'牛',牛:'鼠',虎:'猪',猪:'虎',兔:'狗',狗:'兔',龙:'鸡',鸡:'龙',蛇:'猴',猴:'蛇',马:'羊',羊:'马'};
  const sxChong={鼠:'马',马:'鼠',牛:'羊',羊:'牛',虎:'猴',猴:'虎',兔:'鸡',鸡:'兔',龙:'狗',狗:'龙',蛇:'猪',猪:'蛇'};
  if(sxMatch[d.b.sx]===b2.sx){score+=10;notes.push('生肖相合，属相投缘');}
  else if(sxChong[d.b.sx]===b2.sx){score-=8;notes.push('生肖相冲，需更多包容');}
  const dg1=d.b.D.g,dg2=b2.D.g;
  const ganHe={'甲':'己','己':'甲','乙':'庚','庚':'乙','丙':'辛','辛':'丙','丁':'壬','壬':'丁','戊':'癸','癸':'戊'};
  if(ganHe[dg1]===dg2){score+=8;notes.push('日干天合，精神契合度高');}
  const w1s=Object.entries(d.wx.c).sort((a,b)=>b[1]-a[1])[0][0],w1w=Object.entries(d.wx.c).sort((a,b)=>a[1]-b[1])[0][0];
  const w2s=Object.entries(wx2.c).sort((a,b)=>b[1]-a[1])[0][0],w2w=Object.entries(wx2.c).sort((a,b)=>a[1]-b[1])[0][0];
  if(w1s===w2w||w2s===w1w){score+=6;notes.push('五行互补，如天作之合');}
  score=Math.max(30,Math.min(99,score));
  const grade=score>=85?'上婚（极佳）':score>=70?'中婚（良好）':score>=55?'下婚（一般）':'需慎重';
  const gColor=score>=85?'#7ab648':score>=70?'#c8a45a':score>=55?'#d4a04a':'#d4654a';
  let H=`<div class="glass card-2"><div class="card-hd"><div class="card-ic">💞</div><div><div class="card-tt">AI 关系分析结果</div></div></div>`;
  H+=`<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px"><div style="flex:1"><div style="font-size:1.8em;font-weight:700;color:${gColor}">${score}分</div><div style="font-size:.78em;color:rgba(255,255,255,0.4)">${grade}</div></div><div style="flex:2"><div class="hh-bar"><div class="hh-fill" style="width:0%;background:${gColor}" data-w="${score}%"></div></div></div></div>`;
  H+=`<div style="font-size:.82em;line-height:1.8;color:rgba(255,255,255,0.6)">${notes.map(t=>`· ${t}`).join('<br>')}</div>`;
  H+=`<div class="at"><h4>相处节奏</h4><p>${d.gen==='male'?'男方':'女方'}日主${dg1}，${d.gen==='male'?'女方':'男方'}日主${dg2}。${ganHe[dg1]===dg2?'双方天干相合，初期吸引力强，相处节奏偏快':'双方天干无明显合冲，相处节奏循序渐进，需时间磨合'}。</p>`;
  H+=`<h4>冲突点</h4><p>${sxChong[d.b.sx]===b2.sx?'生肖相冲，价值观与生活习惯差异较大，遇事容易对立':'无明显生肖冲克，冲突多来自沟通方式而非本质矛盾'}。</p>`;
  H+=`<h4>长期稳定性</h4><p>综合评分<span class="hl">${score}分</span>，属于<span class="hl">${grade}</span>。${score>=70?'长期稳定性良好，若能共同经营，白头偕老概率高':'需要双方持续投入经营，通过五行互补与环境调和可大幅提升稳定性'}。</p></div></div>`;
  document.getElementById('relResult').innerHTML=H;
  requestAnimationFrame(()=>{document.querySelectorAll('.hh-fill').forEach(el=>setTimeout(()=>el.style.width=el.dataset.w,150));});
}

function drawCurve(data,dys,age){
  const cv=document.getElementById('cvC');if(!cv)return;
  if(!cv.offsetParent){setTimeout(()=>drawCurve(data,dys,age),50);return;}
  if(!data||!data.length||data.length<2)return;
  const dpr=window.devicePixelRatio||1;const rect=cv.getBoundingClientRect();
  const cssW=Math.max(1,Math.round(rect.width)),cssH=170;
  if(cv.width!==Math.round(cssW*dpr)||cv.height!==Math.round(cssH*dpr)){cv.width=Math.round(cssW*dpr);cv.height=Math.round(cssH*dpr);cv.style.width=cssW+'px';cv.style.height=cssH+'px';}
  const ctx=cv.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);ctx.scale(dpr,dpr);
  const w=cssW,h=cssH;const p={t:14,b:26,l:30,r:14},cw=w-p.l-p.r,ch=h-p.t-p.b;
  [0,50,100].forEach(v=>{const y=p.t+ch-(v/100)*ch;ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.stroke()});
  const grad=ctx.createLinearGradient(0,p.t,0,h-p.b);const _ac=window._accentRGB||[200,164,90];grad.addColorStop(0,`rgba(${_ac},0.18)`);grad.addColorStop(1,`rgba(${_ac},0)`);
  ctx.beginPath();data.forEach((v,i)=>{const x=p.l+i*(cw/(data.length-1)),y=p.t+ch-(v/100)*ch;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});ctx.lineTo(p.l+(data.length-1)*(cw/(data.length-1)),p.t+ch);ctx.lineTo(p.l,p.t+ch);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();data.forEach((v,i)=>{const x=p.l+i*(cw/(data.length-1)),y=p.t+ch-(v/100)*ch;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});ctx.strokeStyle=`rgba(${_ac},0.5)`;ctx.lineWidth=2;ctx.stroke();
  data.forEach((v,i)=>{const x=p.l+i*(cw/(data.length-1)),y=p.t+ch-(v/100)*ch;const cu=age>=dys[i].as&&age<=dys[i].ae;ctx.beginPath();ctx.arc(x,y,cu?5:2.5,0,Math.PI*2);ctx.fillStyle=cu?`rgb(${_ac})`:`rgba(${_ac},.35)`;ctx.fill();if(cu){ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.strokeStyle=`rgba(${_ac},.2)`;ctx.lineWidth=2;ctx.stroke()}ctx.fillStyle='rgba(255,255,255,.25)';ctx.font='7px sans-serif';ctx.textAlign='center';ctx.fillText(dys[i].g+dys[i].z,x,h-p.b+11);ctx.fillText(dys[i].as+'岁',x,h-p.b+20);});
}

function copyReport(){
  const d=getCtx();if(!d){alert('暂无可复制的报告');return;}
  const cDy=d.cDy,cLn=d.cLn;
  const lines=[
    '【天机·八字命理报告】',
    `${d.b.Y.g}${d.b.Y.z}年 ${d.b.M.g}${d.b.M.z}月 ${d.b.D.g}${d.b.D.z}日 ${d.b.H.g}${d.b.H.z}时 · ${d.gl} · ${d.age}岁`,
    `日主：${d.dg}${d.dw} · ${d.wx.st?'身旺':'身弱'} · 用神${d.wx.ys}/喜神${d.wx.xs}`,
    `格局：${d.pa?d.pa.join('、'):'-'} · 纳音${d.b.ny}`,
    cDy?`当前大运：${cDy.g}${cDy.z}（${cDy.as}~${cDy.ae}岁，十神:${d.dySS}）`:'',
    cLn?`${CURR_YEAR}流年：${cLn.g}${cLn.z}${cLn.sx}年（十神:${d.lnSS}）`:'',
    `${CURR_YEAR}年运势 — 事业${d.cs} / 财富${d.ws} / 感情${d.ls} / 健康${d.hs}`,
    d.P&&d.P[d.dg]?`性格：${d.P[d.dg].core}`:'',
    d.P&&d.P[d.dg]?`事业：${d.P[d.dg].career}`:'',
    '',
    '— 由天机·东方人生决策系统生成'
  ].filter(Boolean).join('\n');
  navigator.clipboard.writeText(lines).then(()=>alert('报告摘要已复制'),()=>alert('复制失败，请手动选择文本'));
}

function showPage2(){document.getElementById('page1').classList.add('hidden');const p2=document.getElementById('page2');p2.classList.remove('hidden');p2.classList.add('active');document.getElementById('tabBar').classList.add('show');const aiDock=document.getElementById('aiDock');if(aiDock)aiDock.classList.add('show');document.getElementById('p2Scroll').scrollTop=0;requestAnimationFrame(()=>{if(typeof window._rebindTilt==='function')window._rebindTilt();if(typeof window._injectCardToggles==='function')window._injectCardToggles();});}
function goBack(){applyTheme('土');['page2'].forEach(id=>{document.getElementById(id).classList.remove('active');document.getElementById(id).classList.add('hidden');});document.getElementById('page1').classList.remove('hidden');document.getElementById('tabBar').classList.remove('show');const aiDock=document.getElementById('aiDock');if(aiDock)aiDock.classList.remove('show');}
function scrollToForm(){document.getElementById('formCard').scrollIntoView({behavior:'smooth',block:'center'});}

function switchTab(el){
  document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));el.classList.add('active');
  // 切换 sec 时让卡片重新错落入场（重置动画）
  const targetSec=document.getElementById(el.dataset.sec);
  if(targetSec){
    targetSec.querySelectorAll('.glass').forEach(c=>{c.style.animation='none';void c.offsetWidth;c.style.animation='';});
  }
  const secId=el.dataset.sec;document.querySelectorAll('.sec').forEach(s=>s.classList.remove('active'));const target=document.getElementById(secId);if(target){target.classList.add('active');}
  document.getElementById('p2Scroll').scrollTop=0;
  if(secId==='s-ming'||secId==='s-yun'){requestAnimationFrame(()=>{document.querySelectorAll('.wxf,.ff').forEach(el=>{el.style.width='0%';setTimeout(()=>{el.style.width=el.dataset.w},50)});});}
  if(secId==='s-yun'){requestAnimationFrame(()=>{const cv=document.getElementById('cvC');if(cv&&cv._data)drawCurve(cv._data,cv._dys,cv._age);const tl=document.getElementById('daYunTl');if(tl){const cu=tl.querySelector('.ti.cu');if(cu){setTimeout(()=>cu.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}),100);}}});}
}

async function calc(){
  const bd=document.getElementById('bDate').value;if(!bd)return alert('请选择出生日期');
  const timeStr=document.getElementById('bTime').value||'09:00';const[hh,mm]=timeStr.split(':').map(Number);
  const bp=document.getElementById('bPlace').value||'beijing';const gen=document.getElementById('bGen').value;
  const q=document.getElementById('bQ').value;
  const useTrueSolar=document.getElementById('swTrueSolar').classList.contains('on');
  const[y,m,d]=bd.split('-').map(Number);const city=CD[bp]||{n:'未知',o:116.4,a:39.9};
  const ld=document.getElementById('ldov');ld.classList.add('on');document.getElementById('btnGo2').disabled=true;
  const pb=document.getElementById('ldbf'),st=document.getElementById('ldst');
  const steps=['排列四柱…','推算五行…','分析十神…','查神煞…','排大运…','安紫微盘…','起奇门盘…','梅花起卦…','排流月…','综合合参…','生成报告…'];
  for(let i=0;i<steps.length;i++){st.textContent=steps[i];pb.style.width=(((i+1)/steps.length)*100)+'%';await new Promise(r=>setTimeout(r,220));}
  try{
    const resolved=resolveBirthDateTime(y,m,d,hh,mm,useTrueSolar,city.o);
    const b=mkBazi(resolved.year,resolved.month,resolved.day,resolved.hourZhi);
    const wx=mkWx(b),ss=mkSs(b),dy=mkDy(b,gen,y),ln=mkLn(CURR_YEAR),zw=mkZw(b),qm=mkQm(b),mh=mkMh(b),si=mkSi(b);
    const shensha=mkShenSha(b);const liuyue=getLiuYue(CURR_YEAR);
    b._meta={hourZhi:resolved.hourZhi,useTrueSolar:resolved.note?true:false,by:y,bm:m,bd:d};
    // —— 预构造 ctx（renderAll 内会再用 ctx.input 重建完整 ctx）——
    const _input={by:y,bm:m,bd:d,bd_raw:bd,timeStr,bp,gen,q,useTrueSolar};
    const _preCtx=buildContext({b,wx,ss,dy,ln,zw,qm,mh,si,shensha,liuyue,P:null,gen,q,city,input:_input});
    window._ctx=_preCtx;window._baziData=_preCtx;window._reportData=_preCtx;
    applyTheme(wx.ys);
    const accentMap={木:[70,160,90],火:[200,80,60],土:[200,164,90],金:[170,165,150],水:[70,120,200]};
    window._accentRGB=accentMap[wx.ys]||accentMap['土'];
    renderAll(b,wx,ss,dy,ln,zw,qm,mh,si,gen,q,city,y,shensha,liuyue);
    const cv=document.getElementById('cvC');if(cv){cv._data=dy.ds.map((_,i)=>Math.round(Math.min(95,Math.max(30,50+Math.sin(i*.7)*20+Math.cos(i*.5)*10+(wx.c[GW[dy.ds[i].g]]||0)*5))));cv._dys=dy.ds;cv._age=CURR_YEAR-y}
    ld.classList.remove('on');document.getElementById('btnGo2').disabled=false;
    showPage2();
    document.querySelectorAll('.tab-item')[0].click();
  }catch(e){
    ld.classList.remove('on');document.getElementById('btnGo2').disabled=false;
    console.error(e);
    alert('推演出错：'+e.message+'\n\n建议：请检查输入信息是否正确，或刷新页面重试。');
  }
}

const AI_CFG_KEY='tj_ai_config_v1';
const AI_CHAT_KEY='tj_ai_chat_v1';
function escapeHTML(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function trimAIChat(list){
  return (list||[]).filter(m=>m&&m.role&&typeof m.content==='string').slice(-40);
}
function getAIChat(){
  try{return trimAIChat(JSON.parse(localStorage.getItem(AI_CHAT_KEY)||'[]'));}catch(e){return [];}
}
function saveAIChat(list){
  try{localStorage.setItem(AI_CHAT_KEY,JSON.stringify(trimAIChat(list)));}catch(e){}
}
function renderAIChat(){
  const el=document.getElementById('askResult');
  if(!el)return;
  const list=getAIChat();
  if(!list.length){
    el.innerHTML='<div class="ai-chat-empty">可以连续追问，我会保留最近 20 轮对话。</div>';
    return;
  }
  el.innerHTML=list.map(m=>{
    const html=m.html||formatAIText(m.content);
    return `<div class="ai-msg ${m.role}${m.pending?' pending':''}" data-mid="${m.id||''}"><div class="ai-bubble">${m.role==='user'?escapeHTML(m.content).replace(/\n/g,'<br>'):html}</div></div>`;
  }).join('');
  el.scrollTop=el.scrollHeight;
}
function collapseAIPresets(){
  const sheet=document.getElementById('aiSheet');
  if(sheet)sheet.classList.add('ai-presets-collapsed');
}
function syncAIPresetsState(){
  const sheet=document.getElementById('aiSheet');
  if(sheet)sheet.classList.toggle('ai-presets-collapsed',getAIChat().length>0);
}
function addAIChat(role,content,html,pending){
  const list=getAIChat();
  const msg={id:String(Date.now())+Math.random().toString(16).slice(2),role,content:String(content||''),html:html||'',pending:!!pending,ts:Date.now()};
  list.push(msg);
  saveAIChat(list);
  renderAIChat();
  return msg.id;
}
function updateAIChat(id,content,html,pending){
  const list=getAIChat();
  const msg=list.find(m=>m.id===id);
  if(msg){
    msg.content=String(content||'');
    msg.html=html||'';
    msg.pending=!!pending;
    saveAIChat(list);
    renderAIChat();
  }
}
function getAIHistoryForPrompt(){
  return getAIChat().filter(m=>!m.pending&&m.content).slice(-40).map(m=>({role:m.role==='user'?'user':'assistant',content:m.content}));
}
function getAIConfig(){
  try{
    const cfg=JSON.parse(localStorage.getItem(AI_CFG_KEY)||'{}');
    return {
      provider:cfg.provider||'openai',
      key:cfg.key||'',
      baseUrl:cfg.baseUrl||'https://api.openai.com/v1',
      model:cfg.model||'gpt-4.1-mini'
    };
  }catch(e){
    return {provider:'openai',key:'',baseUrl:'https://api.openai.com/v1',model:'gpt-4.1-mini'};
  }
}
function applyAIConfigToForm(){
  const cfg=getAIConfig();
  const provider=document.getElementById('aiProvider'),key=document.getElementById('aiKey'),base=document.getElementById('aiBaseUrl'),model=document.getElementById('aiModel'),hint=document.getElementById('aiConfigHint');
  if(provider)provider.value=cfg.provider;
  if(key)key.value=cfg.key;
  if(base)base.value=cfg.baseUrl;
  if(model)model.value=cfg.model;
  if(hint)hint.textContent=cfg.key?'已启用 AI 驱动回答；信息库仍会优先命中。':'未配置时使用本地智能解读。';
}
function toggleAIConfig(){
  const box=document.getElementById('aiConfig');
  if(!box)return;
  box.classList.toggle('open');
  if(box.classList.contains('open'))applyAIConfigToForm();
}
function saveAIConfig(){
  const provider=document.getElementById('aiProvider').value;
  const key=document.getElementById('aiKey').value.trim();
  const baseUrl=(document.getElementById('aiBaseUrl').value.trim()||'https://api.openai.com/v1').replace(/\/+$/,'');
  const model=document.getElementById('aiModel').value.trim()||(provider==='anthropic'?'claude-sonnet-4-20250514':'gpt-4.1-mini');
  try{localStorage.setItem(AI_CFG_KEY,JSON.stringify({provider,key,baseUrl,model}));}catch(e){}
  applyAIConfigToForm();
  alert('AI 设置已保存');
}
function clearAIConfig(){
  try{localStorage.removeItem(AI_CFG_KEY);}catch(e){}
  applyAIConfigToForm();
}
async function callAIProvider(q,ctx,systemPrompt,history,onDelta){
  const cfg=getAIConfig();
  if(!cfg.key)throw new Error('AI_NOT_CONFIGURED');
  const msgs=(history&&history.length)?history:[{role:'user',content:q}];
  if(cfg.provider==='anthropic'){
    const resp=await fetch((cfg.baseUrl||'https://api.anthropic.com/v1').replace(/\/+$/,'')+'/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':cfg.key,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:cfg.model,max_tokens:700,stream:true,system:systemPrompt+"\n用户命盘：\n"+ctx,messages:msgs})
    });
    if(!resp.ok)throw new Error('API '+resp.status);
    const reader=resp.body.getReader(),dec=new TextDecoder();let full='',buf='';
    while(true){
      const {done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split('\n');buf=lines.pop()||'';
      for(const ln of lines){
        if(!ln.startsWith('data: '))continue;
        const raw=ln.slice(6).trim();if(raw==='[DONE]')break;
        try{const js=JSON.parse(raw);if(js.type==='content_block_delta'&&js.delta?.type==='text_delta'){full+=js.delta.text;onDelta(full);}}catch(e){}
      }
    }
    return full;
  }
  const resp=await fetch((cfg.baseUrl||'https://api.openai.com/v1').replace(/\/+$/,'')+'/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+cfg.key},
    body:JSON.stringify({model:cfg.model,max_tokens:700,stream:true,messages:[{role:'system',content:systemPrompt+"\n用户命盘：\n"+ctx},...msgs]})
  });
  if(!resp.ok)throw new Error('API '+resp.status);
  const reader=resp.body.getReader(),dec=new TextDecoder();let full='',buf='';
  while(true){
    const {done,value}=await reader.read();if(done)break;
    buf+=dec.decode(value,{stream:true});
    const lines=buf.split('\n');buf=lines.pop()||'';
    for(const ln of lines){
      if(!ln.startsWith('data: '))continue;
      const raw=ln.slice(6).trim();if(raw==='[DONE]')break;
      try{const js=JSON.parse(raw);const delta=js.choices?.[0]?.delta?.content||'';if(delta){full+=delta;onDelta(full);}}catch(e){}
    }
  }
  return full;
}
function openAsk(){
  document.getElementById('aiOverlay').classList.add('open');
  document.getElementById('aiSheet').classList.add('open');
  applyAIConfigToForm();
  renderAIChat();
  syncAIPresetsState();
  // 默认填充热门 chips
  aiRefreshChips('hot');
  setTimeout(()=>document.getElementById('askInput').focus(),300);
}
function closeAsk(){
  document.getElementById('aiOverlay').classList.remove('open');
  document.getElementById('aiSheet').classList.remove('open');
  document.getElementById('askInput').value='';
  document.getElementById('aiSuggest').classList.remove('show');
}
function doAsk(q){
  if(!document.getElementById('aiSheet').classList.contains('open'))openAsk();
  document.getElementById('askInput').value=q;
  document.getElementById('aiSuggest').classList.remove('show');
  collapseAIPresets();
  generateAnswer(q);
}
function doAskCustom(){
  const q=document.getElementById('askInput').value.trim();
  if(!q)return;
  document.getElementById('askInput').value='';
  document.getElementById('aiSuggest').classList.remove('show');
  collapseAIPresets();
  generateAnswer(q);
}
// —— 切换分类 ——
function aiSwitchCat(el){
  document.querySelectorAll('.ai-cat').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  aiRefreshChips(el.dataset.cat);
}
// —— 刷新当前分类下的快捷问题 chips ——
function aiRefreshChips(cat){
  const wrap=document.getElementById('aiChips');
  if(!wrap)return;
  let list=[];
  if(cat==='hot'){
    // 热门：每个意图各 1 条
    const seen=new Set();
    ['事业','财富','感情','健康','学业','居住','玄学'].forEach(it=>{
      const f=KB.faqs.find(x=>x.intent===it&&!seen.has(x.id));
      if(f){list.push(f);seen.add(f.id);}
    });
  }else if(cat==='玄学'){
    // 玄学分类同时显示术语
    list=KBSearch.byIntent('玄学');
  }else{
    list=KBSearch.byIntent(cat);
  }
  wrap.innerHTML=list.map(f=>`<div class="ai-chip" onclick="doAsk('${f.q.replace(/'/g,"\\'")}')">${f.q}</div>`).join('');
  // 玄学分类附加术语速查
  if(cat==='玄学'){
    wrap.innerHTML+='<div class="ai-divider">术语速查</div>';
    wrap.innerHTML+=KB.terms.slice(0,12).map(t=>`<div class="ai-chip term" onclick="doAsk('${t.t}')">${t.t}</div>`).join('');
  }
}
// —— 输入实时联想 ——
function aiOnInputSuggest(){
  const inp=document.getElementById('askInput');
  const sug=document.getElementById('aiSuggest');
  if(!inp||!sug)return;
  const q=inp.value.trim();
  if(!q){sug.classList.remove('show');return;}
  const items=KBSearch.suggest(q,6);
  if(!items.length){sug.classList.remove('show');return;}
  sug.innerHTML=items.map(f=>{
    const route=KB.routes[f.anchor];
    return `<div class="ai-sugg-item" onclick="doAsk('${f.q.replace(/'/g,"\\'")}')">
      <span class="ai-sugg-q">${f.q}</span>
      <span class="ai-sugg-tag">${f.intent}${route?' · '+route.name:''}</span>
    </div>`;
  }).join('');
  sug.classList.add('show');
}

async function generateAnswer(q){
  const d=getCtx();
  addAIChat('user',q);
  if(!d){
    addAIChat('assistant','请先完成命盘排盘，再进行提问。','<div class="ai-empty">请先完成命盘排盘，再进行提问。<br><button class="ai-btn-go" onclick="closeAsk();goBack();">前往填写出生信息 →</button></div>');
    return;
  }
  // —— 步骤 1：智能信息库匹配 ——
  const kbRes=smartAnswer(q,d);
  if(kbRes){
    const kbHtml=renderSmartAnswer(kbRes,q);
    const kbText=kbRes.sections.map(s=>`${s.title}：${String(s.content||'')}`).join('\n');
    addAIChat('assistant',kbText,kbHtml);
    return;
  }
  // —— 步骤 2：调用已配置 AI API（流式）——
  const assistantId=addAIChat('assistant','思考中...','<div class="ai-typing"><span></span><span></span><span></span></div>',true);
  const ctx=buildBaziContext(d);
  const systemPrompt=`你是「天机」AI人生顾问，精通四柱八字、五行、十神、大运流年。作答必须遵循以下四段式结构（用中文）：
【结论】：30字内直接回答
【命理原因】：结合命盘天干地支、五行、十神解释原因，100字
【当前阶段】：结合当前大运与流年说明阶段特征，80字
【行动建议】：给出1-3条可执行的具体建议，80字
语言专业而亲切，术语后附白话。必须参考最近对话上下文回答追问，遇到“继续”“具体点”“为什么”等追问时承接上一轮。总字数不超过300字。`;
  try{
    const cfg=getAIConfig();
    const history=getAIHistoryForPrompt();
    const full=await callAIProvider(q,ctx,systemPrompt,history,(txt)=>{
      updateAIChat(assistantId,txt,`<div class="ai-provider-badge">AI 驱动 · ${cfg.provider==='anthropic'?'Anthropic':'OpenAI'} · ${cfg.model}</div>`+formatStandardAnswer(txt),true);
    });
    if(!full)throw new Error('empty');
    // AI 回答之后，自动附加"相关页面跳转"按钮
    const intents=extractIntents(q);
    const links=buildRelatedRoutes(intents);
    let finalHtml=`<div class="ai-provider-badge">AI 驱动 · ${cfg.provider==='anthropic'?'Anthropic':'OpenAI'} · ${cfg.model}</div>`+formatStandardAnswer(full);
    if(links.length){
      finalHtml+=renderRouteButtons(links,'前往相关页面查看');
    }
    updateAIChat(assistantId,full,finalHtml,false);
  }catch(e){generateAnswerFallback(q,d,null,assistantId);}
}

// —— 渲染 KB 命中结果 ——
function renderSmartAnswer(res,q){
  const head=`<div class="ai-kb-head"><span class="ai-kb-badge">${res.kind==='term'?'📖 术语':'💡 信息库'}</span><span class="ai-kb-q">${res.title}</span></div>`;
  const body=res.sections.map((s,i)=>`<div class="ai-step"><div class="ai-step-icon">${i+1}</div><div class="ai-step-body"><div class="ai-step-title">${s.title}</div><div class="ai-step-text">${String(s.content||'').replace(/\n/g,'<br>')}</div></div></div>`).join('');
  let footer='';
  if(res.links&&res.links.length){
    footer+=renderRouteButtons(res.links,res.kind==='term'?'查看相关卡片':'前往查看详细数据');
  }
  if(res.related&&res.related.length){
    footer+=`<div class="ai-related"><div class="ai-related-h">你可能还想问</div><div class="ai-related-list">${res.related.map(r=>`<div class="ai-chip small" onclick="doAsk('${r.q.replace(/'/g,"\\'")}')">${r.q}</div>`).join('')}</div></div>`;
  }
  return head+'<div class="ai-body-inner">'+body+footer+'</div>';
}

// —— 渲染跳转按钮组 ——
function renderRouteButtons(routes,label){
  if(!routes||!routes.length)return '';
  return `<div class="ai-routes"><div class="ai-routes-h">${label||'相关页面'}</div><div class="ai-routes-list">${routes.map(r=>`<button class="ai-route-btn" onclick="jumpTo('${r.sec}','${r.card}')">→ ${r.name}</button>`).join('')}</div></div>`;
}

// —— 根据意图自动推断相关页面 ——
function buildRelatedRoutes(intents){
  const map={
    '事业':['persona','trend','timeline'],
    '财富':['trend','timeline','risk'],
    '感情':['loveMode','loveMatch','loveRisk'],
    '健康':['health','monthly'],
    '学业':['persona','timeline'],
    '居住':['risk','wuxing'],
    '玄学':['wuxing','bazi','timeline'],
    '综合':['trend','monthly','todayAdv']
  };
  const seen=new Set();const out=[];
  intents.forEach(it=>(map[it]||[]).forEach(k=>{
    if(seen.has(k))return;seen.add(k);
    if(KB.routes[k])out.push(KB.routes[k]);
  }));
  return out.slice(0,3);
}
function formatStandardAnswer(text){
  const sections=[];
  const titles=['结论','命理原因','当前阶段','行动建议'];
  titles.forEach((t,idx)=>{
    const m=text.match(new RegExp(`【${t}】[:：]([\\s\\S]*?)(?=【${titles[idx+1]||'END'}】|$)`));
    if(m)sections.push({title:t,content:m[1].trim()});
  });
  if(!sections.length)return formatAIText(text);
  return sections.map((s,i)=>`<div class="ai-step"><div class="ai-step-icon">${i+1}</div><div class="ai-step-body"><div class="ai-step-title">${s.title}</div><div class="ai-step-text">${s.content.replace(/\n/g,'<br>')}</div></div></div>`).join('');
}
function generateAnswerFallback(q,d,el,chatId){
  // —— 直接读 ctx ——
  const age=d.age,cDy=d.cDy,cLn=d.cLn;
  const lnSS=d.lnSS||TJ.ssOf(d.dg,cLn&&cLn.g),dySS=d.dySS||TJ.ssOf(d.dg,cDy&&cDy.g);
  const intents=extractIntents(q);
  let conclusion='',reason='',phase='',action='';
  if(intents.includes('事业')){
    conclusion=dySS.includes('官')||lnSS.includes('官')?'今年事业有上升通道':'今年事业宜稳守不宜冒进';
    reason=`日主${d.dg}，当前大运${cDy.g}${cDy.z}，十神为${dySS}；${CURR_YEAR}流年${cLn.g}${cLn.z}为${lnSS}。`+(dySS.includes('官')?'官杀主压力与机遇并存':'食伤生财利于创意变现');
    phase=`${cDy.as}-${cDy.ae}岁为`+(dySS.includes('官')?'事业打拼期':'积累蓄势期')+'，今年'+(lnSS.includes('官')?'有贵人提携':'需自力更生')+'。';
    action='1. 主动向上司争取核心项目\n2. 每天预留1小时深度学习';
  }else if(intents.includes('感情')){
    conclusion=d.shensha.some(s=>s.n==='桃花')?'今年桃花运旺，注意筛选':'今年感情节奏偏稳，宜经营';
    reason=`日主${d.dg}，${d.gen==='male'?'财星':'官星'}代表异性缘。当前`+(d.shensha.some(s=>s.n==='桃花')?'命局带桃花，异性缘天生较强':'桃花不显，缘分多来自熟人介绍')+'。';
    phase=`${CURR_YEAR}年${cLn.g}${cLn.z}，流年十神${lnSS}，`+(lnSS.includes(d.gen==='male'?'财':'官')?'配偶星透出，有利婚恋':'感情气场平和，以陪伴为主')+'。';
    action='1. 多参加行业聚会拓展圈子\n2. 避免在冲太岁月份做重大感情决定';
  }else if(intents.includes('财运')){
    conclusion=lnSS.includes('财')?'今年有偏财窗口，但忌贪心':'今年财运平稳，重在守成';
    reason=`日主${d.dg}，`+(d.wx.st?'身旺能担财':'身弱财为忌')+`。${CURR_YEAR}年`+(lnSS.includes('财')?'财星流年，来财机会增多':'财星未透，以正财为主')+'。';
    phase=`当前大运${cDy.g}${cDy.z}，`+(dySS.includes('财')?'十年财路较活':'十年以积累专业技能为主')+'。';
    action='1. 建立6个月应急储蓄\n2. 远离高杠杆投机';
  }else{
    conclusion='整体气场平和，稳中求进是最佳策略';
    reason=`日主${d.dg}属${GW[d.dg]}，`+(d.wx.st?'身旺':'身弱')+'，用神'+d.wx.ys+'。当前无明显吉凶冲克。';
    phase=`${cDy.as}-${cDy.ae}岁为人生`+(age<30?'探索':age<40?'突破':'沉淀')+'期，'+CURR_YEAR+'年宜'+(d.wx.ys==='木'?'拓展人脉':d.wx.ys==='火'?'展示才华':d.wx.ys==='土'?'深耕专长':d.wx.ys==='金'?'精进技术':'沉淀思考')+'。';
    action='1. 保持现有作息\n2. 每月复盘一次目标进度';
  }
  const text=`【结论】：${conclusion}\n\n【命理原因】：${reason}\n\n【当前阶段】：${phase}\n\n【行动建议】：${action}`;
  let html=formatStandardAnswer(text);
  // —— 兜底回答末尾也附跳转按钮 ——
  const links=buildRelatedRoutes(intents);
  if(links.length)html+=renderRouteButtons(links,'前往相关页面查看');
  if(chatId)updateAIChat(chatId,text,html,false);
  else if(el){
    el.innerHTML='<div class="ai-body-inner">'+html+'</div>';
    requestAnimationFrame(()=>{el.scrollIntoView({behavior:'smooth',block:'nearest'});});
  }else addAIChat('assistant',text,html);
}

function renderRiQian(){
  const now=new Date();const y=now.getFullYear(),m=now.getMonth()+1,d=now.getDate();
  const dji=getDayPillarIndex(y,m,d);const dgi=dji%10,dzi=dji%12;const dg=TG[dgi],dz=DZ[dzi];
  let jie='';for(let i=0;i<12;i++){const j=jqDate(y,i);if(j){if(m>j[0]||(m===j[0]&&d>=j[1]))jie=['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'][i];}}
  const ch={'子':'午','午':'子','丑':'未','未':'丑','寅':'申','申':'寅','卯':'酉','酉':'卯','辰':'戌','戌':'辰','巳':'亥','亥':'巳'};
  const sxm={'子':'鼠','丑':'牛','寅':'虎','卯':'兔','辰':'龙','巳':'蛇','午':'马','未':'羊','申':'猴','酉':'鸡','戌':'狗','亥':'猪'};
  const todaySX=sxm[dz],chongSX=sxm[ch[dz]];
  const sxjx={'鼠':'天贵','牛':'天德','虎':'天马','兔':'文昌','龙':'紫微','蛇':'红鸾','马':'将星','羊':'天医','猴':'驿马','鸡':'桃花','狗':'华盖','猪':'福星'};
  let yi=[],ji=['与'+chongSX+'相冲者大事需谨慎'];let yj='';
  if('甲乙'.includes(dg)){yi.push('种植','出行','会友');ji.push('动土','开矿');yj='木气生发之日，宜动不宜静，早起行好运，利谋新事。';}
  else if('丙丁'.includes(dg)){yi.push('文书','庆典','装饰');ji.push('涉水','冷库作业');yj='火德当令，光明在前，利文书庆典，忌口舌争执。';}
  else if('戊己'.includes(dg)){yi.push('置业','收纳','祭祀');ji.push('嫁娶','远行');yj='土性厚重，稳中求进，忌冒进求快，适合整理收纳。';}
  else if('庚辛'.includes(dg)){yi.push('裁决','交易','修造');ji.push('宴饮','借贷');yj='金气锐利，当断则断，利裁决交易，忌优柔寡断。';}
  else{yi.push('流通','迁移','沐浴');ji.push('签约','婚嫁');yj='水势汪洋，顺势而为，宜流通迁移，忌固守一域。';}
  return`<div style="text-align:center;margin-bottom:14px"><div style="font-family:var(--serif);font-size:1.6em;color:var(--ac-text);margin-bottom:4px">${dg}${dz}日</div><div style="font-size:.75em;color:var(--ac-dim)">${y}年${m}月${d}日${jie?' · '+jie+'后':''}</div></div>
  <div style="display:flex;gap:8px;margin:12px 0"><div style="flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center"><div style="font-size:.65em;color:rgba(255,255,255,.35);margin-bottom:4px">生肖</div><div style="font-size:1.1em;font-weight:600">${todaySX}</div></div><div style="flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center"><div style="font-size:.65em;color:rgba(255,255,255,.35);margin-bottom:4px">冲煞</div><div style="font-size:1.1em;font-weight:600;color:#d4654a">冲${chongSX}</div></div><div style="flex:1;padding:10px;border-radius:10px;background:rgba(255,255,255,0.04);text-align:center"><div style="font-size:.65em;color:rgba(255,255,255,.35);margin-bottom:4px">吉神</div><div style="font-size:1.1em;font-weight:600;color:#7ab648">${sxjx[todaySX]||'天德'}</div></div></div>
  <div style="margin:10px 0"><div style="font-size:.75em;color:var(--ac-dim);margin-bottom:6px">🟢 今日宜</div><div style="display:flex;flex-wrap:wrap;gap:6px">${yi.map(x=>`<span class="tg tj">${x}</span>`).join('')}</div></div>
  <div style="margin:10px 0"><div style="font-size:.75em;color:var(--ac-dim);margin-bottom:6px">🔴 今日忌</div><div style="display:flex;flex-wrap:wrap;gap:6px">${ji.map(x=>`<span class="tg tc">${x}</span>`).join('')}</div></div>
  <div style="font-size:.78em;color:rgba(255,255,255,.55);margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)"><b>一句话日签：</b>${yj}</div>`;
}
function showRiQian(){const baseHtml=renderRiQian();document.getElementById('rqResult').innerHTML=baseHtml;document.getElementById('rqModal').classList.add('open');}
function closeRq(){document.getElementById('rqModal').classList.remove('open');}


function openMonthModal(idx,name,gz,jq,ss){
  const d=window._baziData;if(!d)return;
  const dg=d.dg;
  const monthAnalysis={
    '比肩':'本月比肩当令，自我意识增强，适合独立行动与团队协作，但需防过度竞争消耗精力。',
    '劫财':'本月劫财临旺，易有意外支出或人际摩擦，理财需谨慎，防朋友借贷不还。',
    '食神':'本月食神吐秀，创意与表达力强，适合学习新技能、展示才华、社交联谊。',
    '伤官':'本月伤官透出，思维活跃但易言辞过激，注意沟通方式，利创新突破与变革。',
    '偏财':'本月偏财星动，有意外收入机会，但忌贪心冒进，适可而止见好就收。',
    '正财':'本月正财当旺，适合稳健理财、谈薪资、收款项，财运平稳上升。',
    '七杀':'本月七杀压身，压力较大但机遇并存，适合攻坚克难、挑战自我、突破瓶颈。',
    '正官':'本月正官临旺，事业运佳，适合争取晋升、考试认证、建立规则与秩序。',
    '偏印':'本月偏印当令，适合学习研究、向内探索，但需防思虑过多、情绪低落。',
    '正印':'本月正印生身，贵人运旺，适合拜师学习、获取资源支持、充电提升。'
  };
  const analysis=monthAnalysis[ss]||'本月气场平和，按部就班即可，宜整理与复盘。';
  const yi=['学习充电','整理规划','与人沟通','运动健身'];
  const ji=['冲动决定','熬夜透支','大额投资','口舌是非'];
  const el=document.getElementById('monthModalContent');
  el.innerHTML=`<div class="mm-title">${name} · ${gz}</div>
    <div class="mm-row"><span class="mm-label">十神</span><span class="mm-value">${ss}</span></div>
    <div class="mm-row"><span class="mm-label">节气</span><span class="mm-value">${jq||'待查'}</span></div>
    <div class="mm-row"><span class="mm-label">日主</span><span class="mm-value">${dg}</span></div>
    <div style="margin:14px 0;font-size:.82em;color:rgba(255,245,220,0.75);line-height:1.8">${analysis}</div>
    <div style="margin:10px 0"><div style="font-size:.7em;color:rgba(122,182,72,.8);margin-bottom:6px">🟢 本月宜</div><div style="display:flex;flex-wrap:wrap;gap:4px">${yi.map(x=>`<span class="mm-tag yi">宜${x}</span>`).join('')}</div></div>
    <div style="margin:10px 0"><div style="font-size:.7em;color:rgba(212,101,74,.8);margin-bottom:6px">🔴 本月忌</div><div style="display:flex;flex-wrap:wrap;gap:4px">${ji.map(x=>`<span class="mm-tag ji">忌${x}</span>`).join('')}</div></div>`;
  document.getElementById('monthModal').classList.add('open');
}
function closeMonthModal(){document.getElementById('monthModal').classList.remove('open');}

function selChip(el){const wrap=document.getElementById('qChips');wrap.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');document.getElementById('bQ').value=el.dataset.q;}

const DB_NAME='TJ_Bazi',DB_VER=2;
let _db=null;
function initDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_VER);r.onerror=()=>rej(r.error);r.onsuccess=(e)=>{_db=e.target.result;res(_db);};r.onupgradeneeded=(e)=>{const d=e.target.result;if(!d.objectStoreNames.contains('profiles')){const s=d.createObjectStore('profiles',{keyPath:'id',autoIncrement:true});s.createIndex('updatedAt','updatedAt',{unique:false});}};});}
function dbPut(p){return new Promise((res,rej)=>{if(!_db)return rej('DB未就绪');const t=_db.transaction('profiles','readwrite'),s=t.objectStore('profiles');const r=s.put(p);r.onsuccess=(e)=>res(e.target.result);r.onerror=()=>rej(r.error);});}
function dbGetAll(){return new Promise((res,rej)=>{if(!_db)return res([]);const t=_db.transaction('profiles','readonly'),s=t.objectStore('profiles');const r=s.index('updatedAt').openCursor(null,'prev');const arr=[];r.onsuccess=(e)=>{const c=e.target.result;if(c){arr.push(c.value);c.continue();}else res(arr);};r.onerror=()=>rej(r.error);});}
function dbDel(id){return new Promise((res,rej)=>{if(!_db)return rej('DB未就绪');const t=_db.transaction('profiles','readwrite'),s=t.objectStore('profiles');const r=s.delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
function saveCurrentProfile(name){
  const d=getCtx();
  const input=d&&(d._input||d.input);
  if(!d||!input)return Promise.reject('无当前命盘数据');
  // 仅持久化"原始输入"，避免存入巨大对象
  const rec={bd:input.bd_raw||input.bd,timeStr:input.timeStr,bp:input.bp,gen:input.gen,q:input.q,useTrueSolar:!!input.useTrueSolar,name,createdAt:Date.now(),updatedAt:Date.now()};
  return dbPut(rec);
}
async function renderProfiles(){try{const list=await dbGetAll();const zone=document.getElementById('profileZone');const grid=document.getElementById('profileGrid');const empty=document.getElementById('profileEmpty');const recentZone=document.getElementById('recentZone');const recentGrid=document.getElementById('recentGrid');
  if(!list.length){if(grid)grid.innerHTML='';if(empty)empty.style.display='block';if(zone)zone.style.display='block';if(recentZone)recentZone.style.display='none';return;}
  if(empty)empty.style.display='none';if(zone)zone.style.display='block';
  if(recentZone){recentZone.style.display='block';recentGrid.innerHTML=list.slice(0,3).map(p=>{const city=CD[p.bp]||{n:'未知'};const dg=p.bd?mkBazi(...p.bd.split('-').map(Number).concat([0])).D.g:'';const _bd=(p.bd||'1990-1-1').split('-').map(Number);const dy=mkDy(mkBazi(_bd[0],_bd[1],_bd[2],0),p.gen||'male',_bd[0]);const age=TJ.calcAge(_bd[0],_bd[1]||1,_bd[2]||1);const cDy=TJ.findDaYun(dy,age)||dy.ds[0];return`<div class="r-card" onclick="loadProfile(${p.id})"><div class="r-ava">${(p.name||'未').charAt(0)}</div><div class="r-info"><div class="r-name">${(p.name||'未命名').replace(/</g,'&lt;')}</div><div class="r-meta">当前大运：${cDy.g}${cDy.z} · ${CURR_YEAR}运势：${'★★★★☆'}<br>最近关注：${p.q||'综合'}</div></div><div class="r-arrow">›</div></div>`;}).join('');}
  if(grid)grid.innerHTML=list.slice(0,8).map(p=>{const city=CD[p.bp]||{n:'未知'};const d=new Date(p.updatedAt);return`<div class="r-card" onclick="loadProfile(${p.id})"><div class="r-ava">${(p.name||'未').charAt(0)}</div><div class="r-info"><div class="r-name">${(p.name||'未命名').replace(/</g,'&lt;')}</div><div class="r-meta">${p.bd||''} · ${city.n} · ${p.gen==='male'?'男':'女'}${p.useTrueSolar?'·真':''}</div></div><div style="position:absolute;top:6px;right:8px;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.9em;color:rgba(255,255,255,0.25);cursor:pointer;transition:all .15s;z-index:2" onclick="event.stopPropagation();deleteProfile(${p.id})">×</div></div>`;}).join('');
}catch(e){console.log('renderProfiles',e);}}
async function loadProfile(id){try{const list=await dbGetAll();const p=list.find(x=>x.id===id);if(!p)return;document.getElementById('bDate').value=p.bd||'';document.getElementById('bTime').value=p.timeStr||'09:00';document.getElementById('bPlace').value=p.bp||'';document.getElementById('cInp').value=(CD[p.bp]||{n:''}).n;document.getElementById('bGen').value=p.gen||'male';document.getElementById('bQ').value=p.q||'';const sw=document.getElementById('swTrueSolar');if(sw){if(p.useTrueSolar)sw.classList.add('on');else sw.classList.remove('on');document.getElementById('swText').textContent=(sw.classList.contains('on')?'开启':'关闭')+'真太阳时（按出生地经度精确换算时辰）';}const chips=document.getElementById('qChips');if(chips){chips.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active',c.dataset.q===p.q));}calc();}catch(e){console.log('loadProfile',e);}}
async function deleteProfile(id){try{await dbDel(id);renderProfiles();}catch(e){console.log('deleteProfile',e);}}
function openSaveModal(){document.getElementById('saveModal').classList.add('open');const n=document.getElementById('saveName');n.value='';n.focus();}
function closeSaveModal(){document.getElementById('saveModal').classList.remove('open');}
function confirmSaveProfile(){const name=document.getElementById('saveName').value.trim();if(!name){alert('请输入档案名称');return;}saveCurrentProfile(name).then(()=>{closeSaveModal();renderProfiles();alert('已保存到档案库');}).catch(e=>alert('保存失败：'+e));}
async function exportProfiles(){try{const list=await dbGetAll();const blob=new Blob([JSON.stringify(list,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='天机档案_'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(a.href);}catch(e){alert('导出失败');}}
async function handleImport(input){const file=input.files[0];if(!file)return;try{const text=await file.text();const arr=JSON.parse(text);if(!Array.isArray(arr))throw new Error('格式错误');let count=0;for(const p of arr){if(p.bd&&p.bp&&p.gen){delete p.id;p.updatedAt=Date.now();await dbPut(p);count++;}}renderProfiles();alert(`成功导入 ${count} 条档案`);}catch(e){alert('导入失败：'+e.message);}input.value='';}

(function(){const inp=document.getElementById('cInp'),hid=document.getElementById('bPlace'),dd=document.getElementById('cDD');let ai=-1;
function rdd(f){let h='',n=0;const q=(f||'').toLowerCase();CG.forEach(g=>{const m=g.c.filter(c=>!q||c.n.includes(q)||c.i.includes(q)||g.g.includes(q));if(!m.length)return;h+=`<div class="cg">${g.g}</div>`;m.forEach(c=>{h+=`<div class="co" data-i="${c.i}" data-n="${c.n}"><span>${c.n}</span><span class="cp">${g.g}</span></div>`;n++})});if(!n)h='<div style="padding:18px;text-align:center;color:rgba(255,255,255,0.3);font-size:.82em">未找到</div>';dd.innerHTML=h;ai=-1;dd.querySelectorAll('.co').forEach(el=>{el.addEventListener('mousedown',e=>{e.preventDefault();sel(el.dataset.i,el.dataset.n)})});}
function sel(i,n){hid.value=i;inp.value=n;dd.classList.remove('show')}
inp.addEventListener('focus',()=>{rdd(inp.value===(CD[hid.value]||{}).n?'':inp.value);dd.classList.add('show')});
inp.addEventListener('input',()=>{rdd(inp.value);dd.classList.add('show')});
inp.addEventListener('blur',()=>setTimeout(()=>dd.classList.remove('show'),150));
inp.addEventListener('keydown',e=>{const opts=dd.querySelectorAll('.co');if(e.key==='ArrowDown'){e.preventDefault();ai=Math.min(ai+1,opts.length-1);opts.forEach((o,i)=>o.classList.toggle('act',i===ai));if(opts[ai])opts[ai].scrollIntoView({block:'nearest'})}else if(e.key==='ArrowUp'){e.preventDefault();ai=Math.max(ai-1,0);opts.forEach((o,i)=>o.classList.toggle('act',i===ai))}else if(e.key==='Enter'){e.preventDefault();if(ai>=0&&opts[ai])sel(opts[ai].dataset.i,opts[ai].dataset.n)}else if(e.key==='Escape')dd.classList.remove('show')})})();

document.addEventListener('DOMContentLoaded',()=>{
  initDB().then(()=>renderProfiles()).catch(e=>console.log('DB init',e));
  const ai=document.getElementById('askInput');
  if(ai){
    ai.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doAskCustom()}});
    ai.addEventListener('input',aiOnInputSuggest);
    ai.addEventListener('focus',aiOnInputSuggest);
    ai.addEventListener('blur',()=>setTimeout(()=>{const s=document.getElementById('aiSuggest');if(s)s.classList.remove('show');},200));
  }
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const ask=document.getElementById('aiSheet');if(ask&&ask.classList.contains('open')){closeAsk();return;}
      const save=document.getElementById('saveModal');if(save&&save.classList.contains('open')){closeSaveModal();return;}
      const rq=document.getElementById('rqModal');if(rq&&rq.classList.contains('open')){closeRq();return;}
      const p2=document.getElementById('page2');if(p2&&(p2.classList.contains('active')||!p2.classList.contains('hidden'))){goBack();return;}
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='p'){e.preventDefault();window.print();return;}
    if((e.ctrlKey||e.metaKey)&&e.key==='c'){const p2=document.getElementById('page2');if(p2&&p2.classList.contains('active')){e.preventDefault();copyReport();return;}}
    const p2=document.getElementById('page2');
    if(p2&&p2.classList.contains('active')){if(e.key>='1'&&e.key<='4'){const tabs=document.querySelectorAll('.tab-item');const idx=parseInt(e.key,10)-1;if(tabs[idx]){tabs[idx].click();return;}}}
  });
});


/* ====== 卡片折叠功能 ====== */
(function(){
  // —— 默认折叠：本地存储记录"用户已展开的卡片" ——
  const LS_KEY='tj_expanded_cards';
  function loadExpanded(){
    try{return JSON.parse(localStorage.getItem(LS_KEY)||'[]');}catch(e){return [];}
  }
  function saveExpanded(arr){
    try{localStorage.setItem(LS_KEY,JSON.stringify(arr));}catch(e){}
  }
  // 给所有 .glass.card-2 自动注入折叠按钮（card-1 默认不折叠 = 主信息）
  function injectToggles(){
    const expanded=loadExpanded();
    document.querySelectorAll('#page2 .glass.card-2[data-card]:not([data-collapsible])').forEach(el=>{
      const hd=el.querySelector('.card-hd');
      if(!hd)return;
      const btn=document.createElement('button');
      btn.className='card-toggle';
      btn.type='button';
      btn.title='折叠/展开';
      btn.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>';
      hd.appendChild(btn);
      el.setAttribute('data-collapsible','1');
      const onToggle=function(e){
        if(e.target.closest('button:not(.card-toggle),a,input,select,svg.no-toggle'))return;
        toggleCard(el);
      };
      btn.addEventListener('click',e=>{e.stopPropagation();toggleCard(el);});
      hd.style.cursor='pointer';
      hd.addEventListener('click',onToggle);
      // —— 默认折叠：只有用户曾展开过的卡片才保持展开 ——
      const key=el.getAttribute('data-card');
      if(!expanded.includes(key))el.classList.add('collapsed');
    });
  }
  function toggleCard(el){
    const key=el.getAttribute('data-card');
    el.classList.toggle('collapsed');
    if(!key)return;
    let list=loadExpanded();
    if(el.classList.contains('collapsed')){
      list=list.filter(k=>k!==key);
    }else{
      if(!list.includes(key))list.push(key);
    }
    saveExpanded(list);
  }
  window._injectCardToggles=injectToggles;
})();

/* ====== 合并卡：⚠ 当下关注 子 tab 切换 ====== */
function focusSwitchTab(btn){
  const card=btn.closest('.focus-card');
  if(!card)return;
  const sub=btn.dataset.sub;
  card.querySelectorAll('.focus-tab').forEach(t=>t.classList.toggle('active',t===btn));
  card.querySelectorAll('.focus-pane').forEach(p=>p.classList.toggle('active',p.dataset.sub===sub));
}

/* ====== 信息密度：紧凑/详细 切换 + 返回顶部 ====== */
function toggleDensity(){
  document.body.classList.toggle('density-compact');
  const btn=document.getElementById('densityToggle');
  if(btn)btn.classList.toggle('on',document.body.classList.contains('density-compact'));
  try{localStorage.setItem('tj_density',document.body.classList.contains('density-compact')?'1':'0');}catch(e){}
}
(function(){
  // 还原上次设置
  try{if(localStorage.getItem('tj_density')==='1')document.body.classList.add('density-compact');}catch(e){}
  // 滚动监听显示返回顶部
  window.addEventListener('load',()=>{
    const sc=document.getElementById('p2Scroll');
    const btn=document.getElementById('backToTop');
    if(!sc||!btn)return;
    let ticking=false;
    sc.addEventListener('scroll',()=>{
      if(ticking)return;
      ticking=true;
      requestAnimationFrame(()=>{
        btn.classList.toggle('show',sc.scrollTop>200);
        ticking=false;
      });
    },{passive:true});
    if(document.getElementById('densityToggle')&&document.body.classList.contains('density-compact')){
      document.getElementById('densityToggle').classList.add('on');
    }
  });
})();

/* =========================================================
   首页：粒子 + 鼠标跟随 + 卡片视差 + body.home 自动切换
   ========================================================= */
(function(){
  const ROOT=document.documentElement;
  const isMobile=window.matchMedia('(hover:none)').matches;

  // ---- body.home 状态管理（page1 显示时启用首页特效）----
  function applyHomeState(){
    const p1=document.getElementById('page1');
    const p2=document.getElementById('page2');
    const onHome=p1&&!p1.classList.contains('hidden')&&(!p2||p2.classList.contains('hidden')||!p2.classList.contains('active'));
    document.body.classList.toggle('home',onHome);
  }
  // 初始
  document.addEventListener('DOMContentLoaded',applyHomeState);
  // 监听 page1/page2 class 改动
  const obs=new MutationObserver(()=>applyHomeState());
  window.addEventListener('load',()=>{
    const p1=document.getElementById('page1'),p2=document.getElementById('page2');
    if(p1)obs.observe(p1,{attributes:true,attributeFilter:['class']});
    if(p2)obs.observe(p2,{attributes:true,attributeFilter:['class']});
    applyHomeState();
  });

  // ---- 鼠标跟随光球（含 lerp 拖尾）----
  if(!isMobile){
    const dot=document.getElementById('tjCursorDot');
    const ring=document.getElementById('tjCursorRing');
    if(dot&&ring){
      let mx=window.innerWidth/2,my=window.innerHeight/2;
      let dx=mx,dy=my,rx=mx,ry=my;
      let pressed=false;
      window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.classList.remove('hide');ring.classList.remove('hide');},{passive:true});
      window.addEventListener('mouseleave',()=>{dot.classList.add('hide');ring.classList.add('hide');});
      window.addEventListener('mousedown',()=>{pressed=true;ring.classList.add('active');});
      window.addEventListener('mouseup',()=>{pressed=false;ring.classList.remove('active');});
      // hover 检测：交互元素
      document.addEventListener('mouseover',e=>{
        const t=e.target;
        if(t&&t.closest&&t.closest('button,a,input,select,textarea,.chip,.cta,.tab-item,.r-card,.pf-card,.ai-chip,.ai-cat,.ai-route-btn,.tl-card,.lym-item,[onclick],[data-q]')){
          dot.classList.add('hover');ring.classList.add('hover');
        }
      });
      document.addEventListener('mouseout',e=>{
        const t=e.target;
        if(t&&t.closest&&t.closest('button,a,input,select,textarea,.chip,.cta,.tab-item,.r-card,.pf-card,.ai-chip,.ai-cat,.ai-route-btn,.tl-card,.lym-item,[onclick],[data-q]')){
          dot.classList.remove('hover');ring.classList.remove('hover');
        }
      });
      function tick(){
        dx+=(mx-dx)*0.4;dy+=(my-dy)*0.4;
        rx+=(mx-rx)*0.18;ry+=(my-ry)*0.18;
        dot.style.transform='translate3d('+dx+'px,'+dy+'px,0) translate(-50%,-50%)';
        ring.style.transform='translate3d('+rx+'px,'+ry+'px,0) translate(-50%,-50%)';
        requestAnimationFrame(tick);
      }
      tick();
    }
  }

  // ---- 粒子系统 ----
  const cv=document.getElementById('tjParticles');
  if(cv){
    const ctx=cv.getContext('2d');
    let W=0,H=0,DPR=Math.min(window.devicePixelRatio||1,2);
    let parts=[];
    let mouseX=-9999,mouseY=-9999;
    function resize(){
      W=window.innerWidth;H=window.innerHeight;
      cv.width=W*DPR;cv.height=H*DPR;
      cv.style.width=W+'px';cv.style.height=H+'px';
      ctx.setTransform(DPR,0,0,DPR,0,0);
      const target=Math.min(70,Math.max(30,Math.floor(W*H/22000)));
      parts=[];
      for(let i=0;i<target;i++){
        parts.push({
          x:Math.random()*W,
          y:Math.random()*H,
          vx:(Math.random()-0.5)*0.18,
          vy:(Math.random()-0.5)*0.18,
          r:Math.random()*1.4+0.4,
          a:Math.random()*0.6+0.25,
          twinkle:Math.random()*Math.PI*2
        });
      }
    }
    window.addEventListener('mousemove',e=>{mouseX=e.clientX;mouseY=e.clientY;},{passive:true});
    window.addEventListener('mouseleave',()=>{mouseX=-9999;mouseY=-9999;});

    let running=true;
    document.addEventListener('visibilitychange',()=>{running=!document.hidden;if(running)tick();});

    function tick(){
      if(!running)return;
      // 仅当 body.home 时才绘制
      if(!document.body.classList.contains('home')){
        ctx.clearRect(0,0,W,H);
        requestAnimationFrame(tick);return;
      }
      ctx.clearRect(0,0,W,H);
      // 取当前主题色
      const styles=getComputedStyle(document.documentElement);
      const h=styles.getPropertyValue('--accent-h').trim()||'38';
      const sat=styles.getPropertyValue('--accent-s').trim()||'55%';

      // 画连接线
      for(let i=0;i<parts.length;i++){
        const p=parts[i];
        for(let j=i+1;j<parts.length;j++){
          const q=parts[j];
          const dx=p.x-q.x,dy=p.y-q.y;
          const d2=dx*dx+dy*dy;
          if(d2<11000){
            const alpha=(1-d2/11000)*0.18;
            ctx.strokeStyle='hsla('+h+','+sat+',65%,'+alpha+')';
            ctx.lineWidth=0.5;
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
          }
        }
      }
      // 画粒子 + 鼠标交互
      for(const p of parts){
        p.x+=p.vx;p.y+=p.vy;
        p.twinkle+=0.04;
        if(p.x<0)p.x=W;else if(p.x>W)p.x=0;
        if(p.y<0)p.y=H;else if(p.y>H)p.y=0;
        // 鼠标排斥（轻微）
        const dx=p.x-mouseX,dy=p.y-mouseY;
        const d2=dx*dx+dy*dy;
        if(d2<14400){
          const f=(1-d2/14400)*0.6;
          p.x+=dx*f*0.04;p.y+=dy*f*0.04;
        }
        const tw=0.7+Math.sin(p.twinkle)*0.3;
        ctx.fillStyle='hsla('+h+','+sat+',75%,'+(p.a*tw)+')';
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    resize();
    window.addEventListener('resize',resize);
    tick();
  }

  // ---- 表单卡片视差倾斜 ----
  function bindTilt(el){
    if(!el||isMobile)return;
    let raf=null;
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      const x=e.clientX-r.left,y=e.clientY-r.top;
      const px=x/r.width,py=y/r.height;
      // 光点位置（CSS 变量驱动 ::before 径向光）
      el.style.setProperty('--mx',(px*100).toFixed(1)+'%');
      el.style.setProperty('--my',(py*100).toFixed(1)+'%');
      if(raf)cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const rx=(0.5-py)*4,ry=(px-0.5)*4;
        el.style.transform='perspective(900px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg)';
      });
    });
    el.addEventListener('mouseleave',()=>{
      el.style.transform='perspective(900px) rotateX(0) rotateY(0)';
      el.style.setProperty('--mx','50%');el.style.setProperty('--my','50%');
    });
  }
  // —— 全局：绑定到 .home-card 与所有 page2 内的 .glass 卡片 ——
  function bindAllTilt(){
    document.querySelectorAll('.home-card:not([data-tilted])').forEach(el=>{bindTilt(el);el.setAttribute('data-tilted','1');});
    document.querySelectorAll('#page2 .glass:not([data-tilted])').forEach(el=>{bindTilt(el);el.setAttribute('data-tilted','1');});
  }
  window.addEventListener('load',bindAllTilt);
  // 推算完成后 page2 内容会被重渲染，提供一个全局钩子
  window._rebindTilt=bindAllTilt;

  // ---- CTA 按钮涟漪 ----
  document.addEventListener('click',e=>{
    const btn=e.target&&e.target.closest&&e.target.closest('.cta');
    if(!btn||btn.disabled)return;
    const r=btn.getBoundingClientRect();
    const x=e.clientX-r.left,y=e.clientY-r.top;
    const size=Math.max(r.width,r.height);
    const rip=document.createElement('span');
    rip.className='cta-ripple';
    rip.style.width=rip.style.height=size+'px';
    rip.style.left=(x-size/2)+'px';rip.style.top=(y-size/2)+'px';
    btn.appendChild(rip);
    setTimeout(()=>rip.remove(),700);
  });
})();

