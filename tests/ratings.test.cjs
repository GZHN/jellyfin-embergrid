const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(){
 let user='alice',server='https://one/';const store=new Map();
 const source=fs.readFileSync(__dirname+'/../Jellyfin-Embergrid-Episode-Ratings.js','utf8').replace("    document.addEventListener('viewshow'", "    window.testApi={cacheGet,cacheSet,fetchDataset,mergeData,ratingStyle,loadPanel,watch};\n    document.addEventListener('viewshow'");
 const ctx={window:{addEventListener(){},ApiClient:{getJSON(){},getUrl:p=>{if(!p)throw Error('Url name cannot be empty');return server+p;},accessToken:()=>true,getCurrentUserId:()=>user}},document:{addEventListener(){},querySelector:()=>null,createElement:()=>({className:'',textContent:'',type:'',style:{},dataset:{},setAttribute(){},addEventListener(){},appendChild(){},append(){},replaceChildren(){},querySelector:()=>null,focus(){}})},sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},location:{origin:'https://one/',pathname:'/web/',hash:'#/details?id=series'},URLSearchParams,AbortSignal,console,setTimeout,clearTimeout,setInterval(){},requestAnimationFrame(){},MutationObserver:class{observe(){}disconnect(){}}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,api:ctx.window.testApi,user:v=>user=v,server:v=>{server=v;ctx.location.origin=v;}};
}
test('cache separates users and servers',()=>{const s=setup();s.api.cacheSet('item',{id:1});assert.equal(s.api.cacheGet('item').id,1);s.user('bob');assert.equal(s.api.cacheGet('item'),null);s.user('alice');s.server('https://two/');assert.equal(s.api.cacheGet('item'),null);});
test('missing datasets are cached and requests have a timeout signal',async()=>{const s=setup();let calls=0;s.ctx.fetch=async(url,opts)=>{calls++;assert.ok(opts.signal);return {ok:false,status:404};};assert.equal(await s.api.fetchDataset('tt123'),null);assert.equal(await s.api.fetchDataset('tt123'),null);assert.equal(calls,1);});
test('dataset failures are retried instead of cached',async()=>{const s=setup();let calls=0;s.ctx.fetch=async()=>{calls++;return {ok:false,status:503};};await assert.rejects(s.api.fetchDataset('tt123'));await assert.rejects(s.api.fetchDataset('tt123'));assert.equal(calls,2);});
test('merge preserves combined files, names and dataset ratings',()=>{const s=setup();const result=s.api.mergeData({1:{1:9.6}},{seasonsByNum:{1:[{ep:1,epEnd:2,jfId:'local',rating:8,name:'Combined',airDate:'2020-01-01'}]},seasonIds:{1:'season'}});assert.equal(result[0].episodes[0].rating,9.6);assert.equal(result[0].episodes[1].jfId,'local');assert.equal(result[0].episodes[1].name,'Combined');});
test('heatmap palette boundaries and unrated values',()=>{const s=setup();assert.match(s.api.ratingStyle(9.6),/#1da1f2/);assert.match(s.api.ratingStyle(9.5),/#186a3b/);assert.match(s.api.ratingStyle(7),/#f4d03f/);assert.match(s.api.ratingStyle(4.9),/#633974/);assert.equal(s.api.ratingStyle(null),'');});
test('panel failure remains retryable',async()=>{const s=setup();s.ctx.window.ApiClient.getJSON=async()=>{throw Error('offline');};const body={innerHTML:'',replaceChildren(){},append(){},appendChild(){}};const root={dataset:{itemId:'id',loaded:'0',loading:'0'},querySelector:()=>body,isConnected:true};await s.api.loadPanel(root);assert.equal(root.dataset.loaded,'0');assert.equal(root.dataset.loading,'0');});

test('watch tolerates season containers that have not mounted yet',()=>{const s=setup();let searches=0;const view={querySelector(){searches++;return null;}};s.api.watch(view,{});s.api.watch(view,{});assert.equal(searches,2);});

test('cache scope never asks Jellyfin for an empty URL name',()=>{const s=setup();assert.doesNotThrow(()=>s.api.cacheSet('probe',1));assert.equal(s.api.cacheGet('probe'),1);});

test('scope works even if every Jellyfin URL call throws',()=>{const s=setup();s.ctx.window.ApiClient.getUrl=()=>{throw Error('Url name cannot be empty');};assert.doesNotThrow(()=>s.api.cacheSet('probe',2));assert.equal(s.api.cacheGet('probe'),2);});
