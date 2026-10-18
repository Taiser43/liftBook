const fs = require('fs');
const { Buffer } = require('buffer');

const parseBuffer = (buffer) => {
    if (buffer.length < 10) return null;
    
    // Check "ID3"
    if (buffer[0] !== 0x49 || buffer[1] !== 0x44 || buffer[2] !== 0x33) {
      return null;
    }
    
    const version = buffer[3];
    const size = (buffer[6] << 21) | (buffer[7] << 14) | (buffer[8] << 7) | buffer[9];
    
    let offset = 10;
    let title = null;
    let artist = null;
    
    while (offset < buffer.length && offset < size + 10) {
      if (buffer[offset] === 0) break; // Padding reached
      
      const frameId = buffer.toString('utf8', offset, offset + 4);
      let frameSize = 0;
      
      if (version === 3) {
        frameSize = buffer.readUInt32BE(offset + 4);
      } else if (version === 4) {
        frameSize = (buffer[offset+4] << 21) | (buffer[offset+5] << 14) | (buffer[offset+6] << 7) | buffer[offset+7];
      } else {
        break; // Unsupported ID3 version
      }
      
      const frameDataOffset = offset + 10;
      if (frameDataOffset + frameSize > buffer.length) break;
      
      const frameData = buffer.slice(frameDataOffset, frameDataOffset + frameSize);
      
      if (frameId === 'TIT2') {
        const encoding = frameData[0];
        title = encoding === 1 || encoding === 2 
          ? frameData.slice(1).toString('utf16le').replace(/\0/g, '')
          : frameData.slice(1).toString('utf8').replace(/\0/g, '');
      } else if (frameId === 'TPE1') {
        const encoding = frameData[0];
        artist = encoding === 1 || encoding === 2 
          ? frameData.slice(1).toString('utf16le').replace(/\0/g, '')
          : frameData.slice(1).toString('utf8').replace(/\0/g, '');
      }
      offset += 10 + frameSize;
    }
    
    return { title, artist };
};

// Create a dummy id3v2.3 buffer
const b = Buffer.alloc(100);
b.write("ID3");
b[3] = 3; // version 3
b[4] = 0; // rev
b[5] = 0; // flags
b[6] = 0; b[7] = 0; b[8] = 0; b[9] = 25; // size

// TIT2
b.write("TIT2", 10);
b.writeUInt32BE(5, 14); // size
b[18] = 0; b[19] = 0; // flags
b[20] = 0; // encoding utf8
b.write("Test", 21);

console.log(parseBuffer(b));
