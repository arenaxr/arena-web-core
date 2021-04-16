/*
Copyright (c) 2011, Daniel Guerrero
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Uses the new array typed in javascript to binary base64 encode/decode
 * at the moment just decodes a binary base64 encoded
 * into either an ArrayBuffer (decodeArrayBuffer)
 * or into an Uint8Array (decode)
 *
 * References:
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array
 */

export const Base64Binary = {
	_keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

  charCode: function (char) {
    switch(char) {
      case 'A': return 0;
      case 'B': return 1;
      case 'C': return 2;
      case 'D': return 3;
      case 'E': return 4;
      case 'F': return 5;
      case 'G': return 6;
      case 'H': return 7;
      case 'I': return 8;
      case 'J': return 9;
      case 'K': return 10;
      case 'L': return 11;
      case 'M': return 12;
      case 'N': return 13;
      case 'O': return 14;
      case 'P': return 15;
      case 'Q': return 16;
      case 'R': return 17;
      case 'S': return 18;
      case 'T': return 19;
      case 'U': return 20;
      case 'V': return 21;
      case 'W': return 22;
      case 'X': return 23;
      case 'Y': return 24;
      case 'Z': return 25;
      case 'a': return 26;
      case 'b': return 27;
      case 'c': return 28;
      case 'd': return 29;
      case 'e': return 30;
      case 'f': return 31;
      case 'g': return 32;
      case 'h': return 33;
      case 'i': return 34;
      case 'j': return 35;
      case 'k': return 36;
      case 'l': return 37;
      case 'm': return 38;
      case 'n': return 39;
      case 'o': return 40;
      case 'p': return 41;
      case 'q': return 42;
      case 'r': return 43;
      case 's': return 44;
      case 't': return 45;
      case 'u': return 46;
      case 'v': return 47;
      case 'w': return 48;
      case 'x': return 49;
      case 'y': return 50;
      case 'z': return 51;
      case '0': return 52;
      case '1': return 53;
      case '2': return 54;
      case '3': return 55;
      case '4': return 56;
      case '5': return 57;
      case '6': return 58;
      case '7': return 59;
      case '8': return 60;
      case '9': return 61;
      case '+': return 62;
      case '/': return 63;
      case '=': return 64;
    };
  },

	/* will return a  Uint8Array type */
	decodeArrayBuffer: function(input) {
		var bytes = (input.length/4) * 3;
		var ab = new ArrayBuffer(bytes);
		this.decode(input, ab);

		return ab;
	},

	removePaddingChars: function(input){
		var lkey = this._keyStr.indexOf(input.charAt(input.length - 1));
		if(lkey == 64){
			return input.substring(0,input.length - 1);
		}
		return input;
	},

	decode: function (input, arrayBuffer) {
		//get last chars to see if are valid
		input = this.removePaddingChars(input);
		input = this.removePaddingChars(input);

		var bytes = parseInt((input.length / 4) * 3, 10);

		var uarray;
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
		var j = 0;

		if (arrayBuffer)
			uarray = new Uint8Array(arrayBuffer);
		else
			uarray = new Uint8Array(bytes);

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		for (i=0; i<bytes; i+=3) {
			//get the 3 octects in 4 ascii chars
			//enc1 = this._keyStr.indexOf(input.charAt(j++));
			//enc2 = this._keyStr.indexOf(input.charAt(j++));
			//enc3 = this._keyStr.indexOf(input.charAt(j++));
			//enc4 = this._keyStr.indexOf(input.charAt(j++));

      enc1 = this.charCode(input.charAt(j++));
			enc2 = this.charCode(input.charAt(j++));
			enc3 = this.charCode(input.charAt(j++));
			enc4 = this.charCode(input.charAt(j++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			uarray[i] = chr1;
			if (enc3 != 64) uarray[i+1] = chr2;
			if (enc4 != 64) uarray[i+2] = chr3;
		}

		return uarray;
	}
}
