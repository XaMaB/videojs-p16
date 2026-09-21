'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const source = fs.readFileSync(__dirname + '/../dist/video.js', 'utf8');
const sandbox = {Cea708Stream:function(){}, window:{VTTCue:class {
  constructor(start,end,text){this.startTime=start;this.endTime=end;this.text=text;}
}}, tryUpdateStyle:(el,k,v)=>{el.style[k]=v;}};
vm.createContext(sandbox);
for (const name of ['flushDisplayed','pushCaption']) {
  const start = source.indexOf('    Cea708Stream.prototype.'+name+' =');
  const end = source.indexOf('\n    };',start)+7;
  vm.runInContext(source.slice(start,end),sandbox);
}
let start = source.indexOf('  const addCaptionData = function');
let end = source.indexOf('\n  };',start)+5;
vm.runInContext(source.slice(start,end)+'\nthis.addCaptionData=addCaptionData;',sandbox);
start = source.indexOf('    updateDisplayState(track) {');
end = source.indexOf('\n    }',start)+6;
vm.runInContext('this.Display=class { '+source.slice(start,end)+' };',sandbox);
const window = {columnIdx:null,visible:1,isEmpty:()=>false,getText:()=> 'Пример\nнов ред',relativePositioning:1,
  anchorHorizontal:30,anchorVertical:75,anchorPoint:0,rowCount:1,columnCount:37,
  winAttr:{justify:0,fillRed:0,fillGreen:0,fillBlue:0,fillOpacity:3},
  penColor:{fgRed:3,fgGreen:3,fgBlue:3,fgOpacity:0,bgRed:0,bgGreen:0,bgBlue:0,bgOpacity:2}};
const service = {startPts:90000,serviceNum:1,windows:[window,...Array.from({length:7},()=>({visible:0}))]};
const stream = new sandbox.Cea708Stream();
let caption;
stream.trigger = (event,value)=>{caption=value;};
stream.flushDisplayed(180000,service);
assert.equal(caption.text,'Пример\nнов ред');
assert.equal(caption.startPts,90000);assert.equal(caption.endPts,180000);
window.penColor.bgOpacity=0;
assert.equal(caption.cea708Windows[0].penColor.bgOpacity,2,'snapshot is independent');
caption=JSON.parse(JSON.stringify(caption)); // worker-like round trip
caption.startTime=1;caption.endTime=2;
const cues=[];
const add = c=>sandbox.addCaptionData({captionArray:[c],timestampOffset:10,inbandTextTracks:{cc708_1:{addCue:x=>cues.push(x)}}});
add(caption);
const cue=cues[0];
assert.equal(cue.startTime,11);assert.equal(cue.endTime,12);
assert.equal(cue.align,'left');assert.equal(cue.positionAlign,'line-left');
assert.equal(cue.position,30*100/99);assert.equal(cue.line,75*100/99);
assert.equal(cue.snapToLines,false);assert.equal(cue.size,100-cue.position);
const display = new sandbox.Display();
display.player_={options_:{},textTrackSettings:{getValues:()=>({})}};
cue.displayState={style:{},firstChild:{style:{}}};
display.updateDisplayState({activeCues:[cue]});
assert.equal(cue.displayState.firstChild.style.backgroundColor,'rgba(0, 0, 0, 0.5)');
assert.equal(cue.displayState.style.backgroundColor,'rgba(0, 0, 0, 0)');
for(const [opacity,alpha] of [[0,1],[1,1],[2,0.5],[3,0]]) {
  cue.cea708Style.penColor.bgOpacity=opacity;
  display.updateDisplayState({activeCues:[cue]});
  assert.equal(cue.displayState.firstChild.style.backgroundColor,`rgba(0, 0, 0, ${alpha})`);
}
display.player_.textTrackSettings.getValues=()=>({backgroundColor:'#ff0000'});
display.updateDisplayState({activeCues:[cue]});
assert.equal(cue.displayState.firstChild.style.backgroundColor,'#ff0000','viewer preference wins');
display.player_.options_.cea708UseStreamStyles=true;
display.updateDisplayState({activeCues:[cue]});
assert.equal(cue.displayState.firstChild.style.backgroundColor,'rgba(0, 0, 0, 0)','explicit stream-style choice wins');
for (let anchor=0;anchor<9;anchor++) {
  caption.cea708Windows[0].anchorPoint=anchor;add(caption);
  assert.equal(cues.at(-1).positionAlign,['line-left','center','line-right'][anchor%3]);
  assert.equal(cues.at(-1).lineAlign,['start','center','end'][Math.floor(anchor/3)]);
}
add({stream:'cc708_1',startTime:1,endTime:2,text:'legacy'});
assert.equal(cues.at(-1).text,'legacy');assert.equal(cues.at(-1).cea708Style,undefined);
add({stream:'cc708_1',startTime:1,endTime:2,content:[{text:'608',line:12,position:10}]});
assert.equal(cues.at(-1).line,12);assert.equal(cues.at(-1).cea708Style,undefined);
console.log('Presentation: worker metadata, frozen snapshots, anchors, opacity, viewer overrides, unchanged timestamps and 608/legacy fallback passed');
