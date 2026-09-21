'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync(process.argv[2] || __dirname+'/../dist/video.js','utf8');
const s={Cea708Stream:function(){},get708CharFromCode:c=>String.fromCharCode(c)};
vm.createContext(s);
let begin=src.indexOf('    var Cea708Window = function'),end=src.indexOf('    var Cea708Service = function',begin);
vm.runInContext(src.slice(begin,end),s);
for(const name of ['setPenLocation','handleText','multiByteCharacter']) {
  begin=src.indexOf('    Cea708Stream.prototype.'+name+' =');end=src.indexOf('\n    };',begin)+7;
  vm.runInContext(src.slice(begin,end),s);
}
const w=new s.Cea708Window(0);w.virtualRowCount=2;w.columnCount=37;w.visible=1;
w.relativePositioning=1;w.winAttr.printDirection=0;
const stream=new s.Cea708Stream(),service={currentWindow:w};let now=0;const snapshots=[];
stream.getPts=()=>now;stream.flushDisplayed=pts=>snapshots.push([pts,w.getText()]);
function put(row,col,text){
  stream.current708Packet={data:[0x92,row,col]};stream.setPenLocation(0,service,3);
  for(const c of text){
    const cp=c.codePointAt(0);
    if(cp>255){stream.current708Packet={data:[0x18,cp>>8,cp&255]};stream.multiByteCharacter(0,service,3);}
    else {stream.current708Packet={data:[cp]};stream.handleText(0,service);}
  }
}
put(0,0,'Горният ред остава');put(1,0,'Долу');
now=90000;put(1,4,' една');
assert.equal(w.getText(),'Горният ред остава\nДолу една','SPL append must not scroll');
now=108000;put(1,9,' дума');
assert.equal(w.getText(),'Горният ред остава\nДолу една дума');
assert.equal(snapshots.at(-1)[0],108000);
assert.equal(snapshots.at(-1)[1],'Горният ред остава\nДолу една','old state ends before writing');
put(1,5,'нова');assert.equal(w.getText(),'Горният ред остава\nДолу нова дума','in-place correction preserves suffix');
put(0,0,'Т');assert.equal(w.getText().split('\n')[0],'Торният ред остава','explicit upper-row correction is honored');
w.clearText();put(1,3,'X');assert.equal(w.getText(),'\n   X','sparse coordinates');
w.backspace();assert.equal(w.getText(),'\n','backspace at cursor');
w.clearText();put(0,0,'ABCD');put(0,2,'');w.backspace();assert.equal(w.getText(),'A CD');
w.clearText();put(0,0,'first');w.pendingNewLine=true;
stream.current708Packet={data:[88]};stream.handleText(0,service);
assert.equal(w.getText(),'first\nX','real CR still moves to the next row');
w.pendingNewLine=true;stream.handleText(0,service);
assert.equal(w.getText(),'X\nX','real CR at bottom still scrolls');
w.clearText();put(0,37,'AB');assert.equal(w.getText().trim(),'A','bounded to declared columns');
w.clearText();w.addText('legacy');w.newLine(0);w.addText('two');w.newLine(1);w.addText('three');
assert.equal(w.getText(),'two\nthree','legacy CR-only rolling is unchanged');
const other=new s.Cea708Window(1);assert.equal(other.getText(),'','window state is isolated');
w.clearText();put(0,0,'keep');
stream.current708Packet={data:[0x92,1,10]};
const before=w.getText(),column=w.columnIdx;
assert.equal(stream.setPenLocation(0,service,2),1);
assert.equal(w.getText(),before);assert.equal(w.columnIdx,column,'truncated SPL cannot change cursor');
w.visible=0;const count=snapshots.length;put(1,0,'hidden');
assert.equal(snapshots.length,count,'hidden preparation does not publish');w.visible=1;
for(let cycle=0;cycle<1000;cycle++){
  w.clearText();put(0,0,'frozen '+cycle);put(1,0,'');
  let lower='';
  for(const word of ['едно',' две',' три',' четири']){
    put(1,Array.from(lower).length,word);lower+=word;
    assert.equal(w.getText(),'frozen '+cycle+'\n'+lower);
  }
}
console.log('Cursor: incremental words, Cyrillic, overwrite, sparse cells, bounds, backspace, CR, timing and window isolation passed');
