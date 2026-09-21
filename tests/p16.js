'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const source = fs.readFileSync(process.argv[2] || __dirname + '/../dist/video.js', 'utf8');
const sandbox = {Cea708Stream: function(){}, Uint8Array, TextDecoder,
  within708TextBlock: b => b >= 0x20 && b <= 0x7f || b >= 0xa0 && b <= 0xff,
  get708CharFromCode: b => b === 0x7f ? '♪' : String.fromCharCode(b)};
vm.createContext(sandbox);
for (const name of ['handleText', 'multiByteCharacter', 'pushServiceBlock']) {
  const begin = source.indexOf('    Cea708Stream.prototype.' + name + ' =');
  assert(begin >= 0);
  const end = source.indexOf('\n    };', begin) + '\n    };'.length;
  vm.runInContext(source.slice(begin, end), sandbox);
}
function decode(bytes, length = bytes.length, encoding) {
  let text = '';
  const win = {pendingNewLine:false, isEmpty:()=>!text,
    newLine:()=>{text+='\n';}, addText:c=>{text+=c;}, clearText:()=>{text='';}};
  const stream = new sandbox.Cea708Stream();
  stream.current708Packet = {data:bytes};
  stream.services = {1:{currentWindow:win, textDecoder_:encoding ? new TextDecoder(encoding) : null}};
  stream.getPts = () => 123;
  stream.pushServiceBlock(1,0,length);
  return text;
}
const encode = text => Array.from(text).flatMap(c => c.charCodeAt(0) > 255 ? [0x18,c.charCodeAt(0)>>8,c.charCodeAt(0)&255] : [c.charCodeAt(0)]);
assert.equal(decode(encode('Здравей, България! English 123.')), 'Здравей, България! English 123.');
for (let cp=0x400;cp<=0x52f;cp++) {
  assert.equal(decode([0x18,cp>>8,cp&255,0x21]), String.fromCharCode(cp)+'!');
}
assert.equal(decode([0x18,0,0x41,0x42]), 'AB');
assert.equal(decode([0x41,0x18]), 'A');
assert.equal(decode([0x41,0x18,0x42]), 'A');
assert.equal(decode([0x41,0x18,4,0x41,0x42],3), 'A'); // following block is not consumed
assert.equal(decode([0x41,0x0d,0x42]), 'A\nB');
assert.equal(decode([0x41,0xa3,0x7f]), 'A£♪');
assert.equal(decode([0x18,0xb0,0xa1],3,'euc-kr'), '가'); // explicit legacy decoder retained
assert.equal(decode([0x18,0,0x41],3,'euc-kr'), 'A'); // no leading NUL
console.log('P16: 304 Cyrillic codepoints, mixed Latin, parameter consumption, truncation/service boundaries, newline and explicit legacy encoding passed');
