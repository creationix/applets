/**
 * @typedef {{location:number,vertex:WebGLBuffer,index:WebGLBuffer}} IndexedBufferInfo
 */

/**
 * @typedef {{location:WebGLUniformLocation,size:number,type:number}} UniformInfo
 */

/**
 * @typedef {{[name:string]:UniformInfo}} UniformInfos
 */

/**
* @typedef {{location:number,size:number,type:number,buffer:WebGLBuffer}} AttributeInfo
*/

/**
* @typedef {{[name:string]:AttributeInfo} AttributeInfos
*/

/**
 * @typedef {Object} ProgramInfo
 * @property {WebGLProgram} program
 * @property {UniformInfos} uniforms
 * @property {AttributeInfos} attributes
 */

/**
 * @typedef {Object} BufferInfo
 * @property {number} numElements
 * @property {WebGLBuffer|null} indices
 * @property {AttributeInfos} attribs
 */

/**
 * Load an image as a promise
 * @param {string} src
 */
async function loadImage (src) {
  const img = document.createElement('img');
  img.setAttribute('src', src);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });
  return img
}

/**
 * Create a program from shader source and look up attribute and uniform reflection data.
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertSource
 * @param {string} fragSource
 * @returns {ProgramInfo}
 */
function createProgram (gl, vertSource, fragSource) {
  const vert = gl.createShader(gl.VERTEX_SHADER);
  if (!vert) throw new Error('Problem creating new vertex shader')
  const frag = gl.createShader(gl.FRAGMENT_SHADER);
  if (!frag) throw new Error('Problem creating new fragment shader')
  gl.shaderSource(vert, vertSource);
  gl.shaderSource(frag, fragSource);
  gl.compileShader(vert);
  gl.compileShader(frag);
  const program = gl.createProgram();
  if (!program) throw new Error('Problem creating new shader program')
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const messages = [gl.getProgramInfoLog(program)];
    const vertMessage = gl.getShaderInfoLog(vert);
    if (vertMessage) messages.push(vertMessage);
    const fragMessage = gl.getShaderInfoLog(frag);
    if (fragMessage) messages.push(fragMessage);
    throw new Error(messages.join('\n'))
  }
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

  /** @type {UniformInfos} */
  const uniforms = {};
  for (let i = 0; i < numUniforms; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) throw new Error('Problem reflecting uniform')
    const { name, size, type } = info;
    const location = gl.getUniformLocation(program, name);
    uniforms[name] = { location, size, type };
  }
  /** @type {AttributeInfos} */
  const attributes = {};
  const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < numAttributes; i++) {
    const info = gl.getActiveAttrib(program, i);
    if (!info) throw new Error('Problem reflecting attribute')
    const { name, size, type } = info;
    const location = gl.getAttribLocation(program, name);
    attributes[name] = { location, size, type };
  }
  return { program, uniforms, attributes }
}

const typeSizes = {
  0x8b51: 3, // vec3
  0x8b52: 4 // vec4
};

/**
 * @param {WebGL2RenderingContext} gl
 * @param {AttributeInfos} attribs
 * @param {{[name:string]:Float32Array|Uint8Array|null}} arrays
 * @returns {BufferInfo}
 */
function createBuffer (gl, attribs, arrays) {
  /** @type {number} */
  let numElements;
  /** @type {WebGLBuffer?} */
  let indices = null;

  const hasIndex = !!arrays.indices;

  function setNum (num) {
    if (numElements === undefined) {
      numElements = num;
    } else if (numElements !== num) {
      throw new Error('Element number mismatch')
    }
  }
  for (const name in arrays) {
    const array = arrays[name];
    const isIndex = name === 'indices';
    const target = isIndex ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Problem creating buffer')
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, array, gl.STATIC_DRAW);
    gl.bindBuffer(target, null);

    if (isIndex) {
      indices = buffer;
      setNum(array.length);
    } else {
      const info = attribs[name];
      info.buffer = buffer;
      if (!hasIndex) {
        const typeSize = typeSizes[info.type];
        if (!typeSize) throw new Error(`No known size for type 0x${info.type.toString(16)}`)
        setNum(array.length / typeSize);
      }
    }
  }
  return { numElements, indices, attribs }
}

/**
 * Create a cubemap from a single texture.
 * The texture needs to be 2 wide by 3 tall in the following arrangement.
 *   +x -x
 *   +y -x
 *   +z -z
 * @param {WebGL2RenderingContext} gl
 * @param {HTMLImageElement} img
 */
function createCubeMap (gl, img) {
  const width = img.width / 2;
  const height = img.height / 3;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = gl.createTexture();
  if (!texture) throw new Error('Problem creating cubemap texture')
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
  ctx.drawImage(img, 0, 0, width, height, 0, 0, width, height);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  ctx.drawImage(img, width, 0, width, height, 0, 0, width, height);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  ctx.drawImage(img, 0, height, width, height, 0, 0, width, height);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  ctx.drawImage(img, width, height, width, height, 0, 0, width, height);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  ctx.drawImage(img, 0, height * 2, width, height, 0, 0, width, height);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  ctx.drawImage(img, width, height * 2, width, height, 0, 0, width, height);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  return texture
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {number} w
 * @param {number} h
 * @param {number} d
 * @param {HTMLImageElement} img
 */
function createArrayTexture (gl, w, h, d, img) {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Problem creating array texture')
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, w, h, d);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, w, h, d, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
  return texture
}

const attributeSetters = {
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {number} location
     * @param {number} size
     * @param {WebGLBuffer} value
     */
  0x8b51: function setFloatVec3Buffer (gl, location, size, value) {
    gl.bindBuffer(gl.ARRAY_BUFFER, value);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
  },
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {number} location
     * @param {number} size
     * @param {WebGLBuffer} value
     */
  0x8b52: function setFloatVec4Buffer (gl, location, size, value) {
    gl.bindBuffer(gl.ARRAY_BUFFER, value);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 0, 0);
  }
};

/**
 * @param {WebGL2RenderingContext} gl
 * @param {AttributeInfos} attributeInfo
 * @param {BufferInfo} bufferInfo
 */
function setBuffersAndAttributes (gl, bufferInfo) {
  const { attribs, indices } = bufferInfo;
  for (const name in attribs) {
    const info = attribs[name];
    if (!info) throw new Error(`Unknown attribute '${name}'`)
    const { location, size, type, buffer } = info;
    const setter = attributeSetters[type];
    if (!setter) throw new Error(`Unsupported type 0x${type.toString(16)}`)
    setter(gl, location, size, buffer);
  }
  if (indices) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  }
}

const uniformSetters = {
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {WebGLUniformLocation} location
     * @param {number} size
     * @param {Float32Array} value
     */
  0x8b5c: function setFloatMat4 (gl, location, size, value) {
    gl.uniformMatrix4fv(location, false, value);
  },
  0x8b51: function setFloatVec3 (gl, location, size, value) {
    gl.uniform3fv(location, value);
  },
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {WebGLUniformLocation} location
     * @param {number} size
     * @param {WebGLTexture} value
     */
  0x8b60: function setSamplerCube (gl, location, size, value) {
    gl.uniform1i(location, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, value);
    gl.bindSampler(0, null);
  },
  /**
     * @param {WebGL2RenderingContext} gl
     * @param {WebGLUniformLocation} location
     * @param {number} size
     * @param {WebGLTexture} value
     */
  0x8dc1: function setSampler2dArray (gl, location, size, value) {
    gl.uniform1i(location, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, value);
    gl.bindSampler(0, null);
  }
};

/**
 * @param {WebGL2RenderingContext} gl
 * @param {UniformInfos} uniformInfo
 * @param {{[name:string]:WebGLTexture|Float32Array}} uniforms
 */
function setUniforms (gl, uniformInfo, uniforms) {
  for (const name in uniforms) {
    const info = uniformInfo[name];
    if (!info) throw new Error(`Unknown uniform '${name}'`)
    const value = uniforms[name];
    const { location, size, type } = info;
    const setter = uniformSetters[type];
    if (!setter) throw new Error(`Unsupported type 0x${type.toString(16)}`)
    setter(gl, location, size, value);
  }
}

const vert$1 = `#version 300 es
  precision highp float;

  in vec3 position;
  uniform mat4 viewProjection;

  out vec3 texCoord;

  void main() {
      gl_Position = viewProjection * vec4(position, 1);
      texCoord = position;
  }
`;

const frag$1 = `#version 300 es
  precision highp float;

  in vec3 texCoord;
  out vec4 fragColor;
  uniform samplerCube cubemap;

  void main (void) {
    fragColor = texture(cubemap, texCoord);
  }
`;

/**
 * @param {WebGL2RenderingContext} gl
 */
async function makeSky (gl, url) {
  const skyImage = loadImage(url);

  const programInfo = createProgram(gl, vert$1, frag$1);

  const bufferInfo = createBuffer(gl, programInfo.attributes, {
    position: new Float32Array([
      500, 500, 500,
      500, 500, -500,
      500, -500, 500,
      500, -500, -500,
      -500, 500, 500,
      -500, 500, -500,
      -500, -500, 500,
      -500, -500, -500
    ]),
    indices: new Uint8Array([
      0, 3, 2, 3, 0, 1, // +X
      4, 7, 5, 7, 4, 6, // -X
      0, 5, 1, 5, 0, 4, // +Y
      2, 7, 6, 7, 2, 3, // -Y
      0, 6, 4, 6, 0, 2, // +Z
      1, 7, 3, 7, 1, 5 // -Z
    ])
  });

  /**
   * Skybox texture
   */
  const cubemap = createCubeMap(gl, await skyImage);

  return drawSky

  /**
   * Draw the skybox
   * @param {Float32Array} viewProjection
   */
  function drawSky (viewProjection) {
    gl.useProgram(programInfo.program);
    setUniforms(gl, programInfo.uniforms, { viewProjection, cubemap });
    setBuffersAndAttributes(gl, bufferInfo);
    gl.drawElements(gl.TRIANGLES, bufferInfo.numElements, gl.UNSIGNED_BYTE, 0);
  }
}

/**
 * Common utilities
 * @module glMatrix
 */

// Configuration Constants
const EPSILON = 0.000001;
let ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;

if (!Math.hypot) Math.hypot = function() {
  var y = 0, i = arguments.length;
  while (i--) y += arguments[i] * arguments[i];
  return Math.sqrt(y);
};

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
function create$4() {
  let out = new ARRAY_TYPE(3);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
  return out;
}

/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */
function length(a) {
  let x = a[0];
  let y = a[1];
  let z = a[2];
  return Math.hypot(x, y, z);
}

/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */
function fromValues(x, y, z) {
  let out = new ARRAY_TYPE(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/**
 * Set the components of a vec3 to the given values
 *
 * @param {vec3} out the receiving vector
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} out
 */
function set(out, x, y, z) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}

/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */
function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}

/**
 * Adds two vec3's after scaling the second operand by a scalar value
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @param {Number} scale the amount to scale b by before adding
 * @returns {vec3} out
 */
function scaleAndAdd(out, a, b, scale) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  return out;
}

/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */
function normalize$2(out, a) {
  let x = a[0];
  let y = a[1];
  let z = a[2];
  let len = x * x + y * y + z * z;
  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }
  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}

/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */
function cross(out, a, b) {
  let ax = a[0],
    ay = a[1],
    az = a[2];
  let bx = b[0],
    by = b[1],
    bz = b[2];

  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}

/**
 * Rotate a 3D vector around the y-axis
 * @param {vec3} out The receiving vec3
 * @param {ReadonlyVec3} a The vec3 point to rotate
 * @param {ReadonlyVec3} b The origin of the rotation
 * @param {Number} rad The angle of rotation in radians
 * @returns {vec3} out
 */
function rotateY$1(out, a, b, rad) {
  let p = [],
    r = [];
  //Translate point to the origin
  p[0] = a[0] - b[0];
  p[1] = a[1] - b[1];
  p[2] = a[2] - b[2];

  //perform rotation
  r[0] = p[2] * Math.sin(rad) + p[0] * Math.cos(rad);
  r[1] = p[1];
  r[2] = p[2] * Math.cos(rad) - p[0] * Math.sin(rad);

  //translate to correct position
  out[0] = r[0] + b[0];
  out[1] = r[1] + b[1];
  out[2] = r[2] + b[2];

  return out;
}

/**
 * Alias for {@link vec3.length}
 * @function
 */
const len = length;

/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
((function () {
  let vec = create$4();

  return function (a, stride, offset, count, fn, arg) {
    let i, l;
    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
}))();

// 10 bits for texture index
const BARREL_TOP = 0;
const BARREL_SIDE = 1;
const BARREL_BOTTOM = 2;
const BARREL_OPEN = 3;
const BOOKSHELF = 4;
const OAK_PLANKS = 5;
const OAK_LOG = 6;
const OAK_END = 7;
const STRIPPED_OAK_LOG = 8;
const STRIPPED_OAK_END = 9;
const STONE = 10;
const GRASS_BLOCK_TOP = 11;
const GRASS_BLOCK_SIDE = 12;
const DIRT_BLOCK = 13;
const HAY_TOP = 14;
const HAY_SIDE = 15;
const GLASS = 16;
const FURNACE_BOTTOM = 17;
const FURNACE_SIDE = 18;
const FURNACE_FRONT = 19;
const FURNACE_FRONT_ON = 20;
const MUSIC_BOX_TOP = 21;
const MUSIC_BOX_SIDE = 22;
const LOOM_TOP = 23;
const LOOM_FRONT = 24;
const LOOM_SIDE = 25;
const COBBLESTONE = 26;
const CRAFTING_TABLE_TOP = 27;
const CRAFTING_TABLE_FRONT = 28;
const CRAFTING_TABLE_SIDE = 29;
const PUMPKIN_TOP = 30;
const PUMPKIN_SIDE = 31;

// 1 bit of precision leftover

const blocks = {
  barrel: [BARREL_SIDE, BARREL_SIDE, BARREL_TOP, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE],
  barrelOpen: [BARREL_SIDE, BARREL_SIDE, BARREL_OPEN, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE],
  bookshelf: [BOOKSHELF, BOOKSHELF, OAK_PLANKS, OAK_PLANKS, BOOKSHELF, BOOKSHELF],
  cobblestone: [COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE],
  craftingTable: [CRAFTING_TABLE_SIDE, CRAFTING_TABLE_SIDE, CRAFTING_TABLE_TOP, OAK_PLANKS, CRAFTING_TABLE_FRONT, CRAFTING_TABLE_SIDE],
  dirt: [DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK],
  furnace: [FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT],
  furnaceOn: [FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT_ON],
  glass: [GLASS, GLASS, GLASS, GLASS, GLASS, GLASS],
  grass: [GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE],
  hay: [HAY_SIDE, HAY_SIDE, HAY_TOP, HAY_TOP, HAY_SIDE, HAY_SIDE],
  loom: [LOOM_SIDE, LOOM_SIDE, LOOM_TOP, OAK_PLANKS, LOOM_FRONT, LOOM_SIDE],
  musicBox: [MUSIC_BOX_SIDE, MUSIC_BOX_SIDE, MUSIC_BOX_TOP, MUSIC_BOX_TOP, MUSIC_BOX_SIDE, MUSIC_BOX_SIDE],
  oakLog: [OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG],
  oakPlanks: [OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS],
  pumpkin: [PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE],
  stone: [STONE, STONE, STONE, STONE, STONE, STONE],
  strippedOak: [STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG]
};

const transLevel = {
  glass: 1
};

const blockNames = Object.keys(blocks);
blockNames.forEach((n, i) => { blocks[n].index = i; });

/*

Pull block out of toolbag using controller (small haptic feedback)
  Press joypad to toggle toolbag and move to select device
  this also has smooth snapping and light haptic feedback
  grid of tools is zoomed bigger in middle and maybe curves back in 3d space
  press gripper to clone an item from the toolbar
block tracks controller smoothly, maybe smaller than 100% or less than 100% opacity.
an in-air grid of blue vertices glows near block and fades away
when the block is near an aligned position it grows to proper size, grows more opaque and even moved into aligned position
with tiny haptic feedback
if close to grid when let go, snap fully into place with stronger haptic
if not close, drift in space slowly and slow to a stop.
pressing trigger while still gripped will clone/stamp a block to nearest grid "can" be removed by grabbing them with gripper
*/

// Block Orientations
// top can be up, down, east, west, north, south
// front can be any of the 4 touching whatever up is.
// 24 total orientations
// 5 bits can store all combinations
// 10 bits left for block type index (1024 "total" in system)

/* base 6
0 east
1 west
2 up
3 down
4 south
5 north

      02 03 04 05
      12 13 14 15
20 21       24 25
30 31       34 35
40 41 42 43
50 51 52 53

n cannot be paired with either of:
  a = n - (n % 2)
  b = a + 1

00 east
01 west
02 up
03 down
04 south
05 north

*/

/**
 * @param {number} d direction index (0=+x 1=-x 2=+y 3=-y 4=+z 5=-z)
 * @returns {[number,number,number`]}
 */
function directionToNormal (d) {
  const s = (d & 1) ? -1 : 1;
  return (d & 4) ? [0, 0, s] : (d & 2) ? [0, s, 0] : [s, 0, 0]
}

/**
 * @param {number} o orientation index from 0-31 mapping to the 24 different block orientations.
 * @returns {[number,number]} direction indices of top and front of block.
 */
function orientationToDirections (o) {
  o += 2;
  return [(o / 6) | 0, o % 6]
}

/**
 * @param {number} o orientation index from 0-31 mapping to the 24 different block orientations.
 * @returns {[[number,number,number],[number,number,number]]}
 */
function orientationToNormals (o) {
  return orientationToDirections(o).map(directionToNormal)
}

// Face Orientations
// Each face can be rotated 4 directions in 90 degree clockwise increments
// down faces down for sides, down faces front for top and bottom.
// 2 bits for face rotation.
// 10 bits for texture index
// 6 bits free

// 5 bits for orientation, rest for type
const chunk = new Uint16Array(16 * 16 * 16);

function setBlocks (chunk, x, y, z, w, h, d, block, orientation = 24) {
  const blockIndex = block.index + 1;
  for (let i = x; i < x + w; i++) {
    for (let j = y; j < y + h; j++) {
      for (let k = z; k < z + d; k++) {
        chunk[i + j * 16 + k * 256] = (blockIndex << 5) | orientation;
      }
    }
  }
}

setBlocks(chunk, 0, 0, 0, 16, 1, 16, blocks.stone);
setBlocks(chunk, 0, 1, 0, 16, 1, 16, blocks.dirt);
setBlocks(chunk, 0, 2, 0, 5, 1, 16, blocks.grass);
setBlocks(chunk, 14, 2, 0, 2, 1, 16, blocks.grass);
setBlocks(chunk, 5, 2, 0, 9, 1, 4, blocks.grass);
setBlocks(chunk, 5, 2, 11, 9, 1, 5, blocks.grass);
setBlocks(chunk, 5, 2, 4, 9, 1, 7, blocks.cobblestone);
setBlocks(chunk, 5, 3, 4, 1, 5, 1, blocks.oakLog);
setBlocks(chunk, 5, 3, 10, 1, 5, 1, blocks.oakLog);
setBlocks(chunk, 13, 3, 4, 1, 5, 1, blocks.oakLog);
setBlocks(chunk, 13, 3, 10, 1, 5, 1, blocks.oakLog);
setBlocks(chunk, 5, 3, 5, 1, 2, 5, blocks.strippedOak);
setBlocks(chunk, 5, 6, 5, 1, 2, 5, blocks.strippedOak);
setBlocks(chunk, 5, 8, 6, 1, 1, 3, blocks.strippedOak);
setBlocks(chunk, 5, 9, 7, 1, 1, 1, blocks.strippedOak);
setBlocks(chunk, 5, 5, 5, 1, 1, 5, blocks.glass);
setBlocks(chunk, 6, 3, 4, 1, 5, 1, blocks.oakPlanks);
setBlocks(chunk, 12, 3, 4, 1, 5, 1, blocks.oakPlanks);
setBlocks(chunk, 7, 3, 4, 5, 1, 1, blocks.oakPlanks);
setBlocks(chunk, 7, 6, 4, 5, 2, 1, blocks.oakPlanks);
setBlocks(chunk, 7, 4, 4, 5, 2, 1, blocks.glass);
setBlocks(chunk, 6, 3, 10, 1, 5, 1, blocks.oakPlanks);
setBlocks(chunk, 12, 3, 10, 1, 5, 1, blocks.oakPlanks);
setBlocks(chunk, 7, 3, 10, 5, 1, 1, blocks.oakPlanks);
setBlocks(chunk, 7, 6, 10, 5, 2, 1, blocks.oakPlanks);
setBlocks(chunk, 7, 4, 10, 5, 2, 1, blocks.glass);
setBlocks(chunk, 7, 6, 10, 5, 2, 1, blocks.oakPlanks);
setBlocks(chunk, 1, 3, 2, 1, 1, 1, blocks.pumpkin);
setBlocks(chunk, 2, 3, 4, 1, 1, 1, blocks.pumpkin);
setBlocks(chunk, 3, 3, 3, 1, 1, 1, blocks.pumpkin);
setBlocks(chunk, 2, 3, 2, 1, 1, 1, blocks.pumpkin);
setBlocks(chunk, 4, 3, 1, 1, 1, 1, blocks.pumpkin);
setBlocks(chunk, 6, 3, 5, 2, 2, 3, blocks.hay);
setBlocks(chunk, 8, 3, 5, 1, 1, 1, blocks.barrel);
setBlocks(chunk, 6, 3, 8, 1, 1, 1, blocks.barrelOpen);
setBlocks(chunk, 6, 3, 9, 2, 3, 1, blocks.bookshelf);
setBlocks(chunk, 9, 3, 9, 1, 1, 1, blocks.furnace);
setBlocks(chunk, 10, 3, 9, 1, 1, 1, blocks.furnaceOn);
setBlocks(chunk, 11, 3, 9, 1, 1, 1, blocks.musicBox);
setBlocks(chunk, 11, 3, 5, 1, 1, 1, blocks.loom);
setBlocks(chunk, 12, 3, 5, 1, 1, 1, blocks.craftingTable);

if (import.meta.main) {
  for (let i = 0; i < 32; i++) {
    const [t, f] = orientationToNormals(i);
    // console.log(i, orientationToDirections(i))
    if (dot(t, f)) continue
    console.log(i, t, f);
  }
}

// 5 bits for texture x coordinate (needs 0-16 range)
// 5 bits for texture y coordinate (needs 0-16 range)
const TL = (w, h) => 0;
const BL = (w, h) => h << 10;
const TR = (w, h) => w << 15;
const BR = (w, h) => w << 15 | h << 10;

// 3 bits for normal index
const RIGHT = 0 << 20; // 1,0,0
const LEFT = 1 << 20; // -1,0,0
const TOP = 2 << 20; // 0,1,0
const BOTTOM = 3 << 20; // 0,-1,0
const FRONT = 4 << 20; // 0,0,1
const BACK = 5 << 20; // 0,0,-1

/**
 * @param {Uint16Array} chunk
 * @returns {Float32Array}
 */
function generateMesh (chunk) {
  const mesh = [];
  const faces = new Uint8Array(256);

  // Right Side
  for (let x = 0; x < 16; x++) { drawSide(x, 0, 4, 8, 1, 0); }
  // Left Side
  for (let x = 0; x < 16; x++) { drawSide(x, 0, 4, 8, -1, 1); }
  // Top Side
  for (let y = 0; y < 16; y++) { drawSide(y, 4, 8, 0, 1, 2); }
  // Bottom Side
  for (let y = 0; y < 16; y++) { drawSide(y, 4, 8, 0, -1, 3); }
  // Front Side
  for (let z = 0; z < 16; z++) { drawSide(z, 8, 0, 4, 1, 4); }
  // Back Side
  for (let z = 0; z < 16; z++) { drawSide(z, 8, 0, 4, -1, 5); }

  function drawSide (x, xShift, yShift, zShift, faceSign, faceIndex) {
    // First pass, calculate which faces in the 16x16 plan grid we want to draw.
    for (let z = 0; z < 16; z++) {
      for (let y = 0; y < 16; y++) {
        const i = y | (z << 4);
        const self = chunk[(x << xShift) | (y << yShift) | (z << zShift)];

        // If the block isn't set, nothing to draw
        if (!self) {
          faces[i] = 0;
          continue
        }

        // If the face is covered by a same or more opaque block, don't draw
        const nx = x + faceSign;
        const next = (nx < 0 || nx >= 16) ? 0
          : chunk[(nx << xShift) | (y << yShift) | (z << zShift)];
        const blockName = blockNames[(self >> 5) - 1];
        if (next) {
          const selfTrans = transLevel[blockName] || 0;
          const nextName = blockNames[(next >> 5) - 1];
          const nextTrans = transLevel[nextName] || 0;
          if (selfTrans >= nextTrans) {
            faces[i] = 0;
            continue
          }
        }

        // Mark the face for drawing.
        faces[i] = blocks[blockName][faceIndex] + 1;
      }
    }

    // Second pass, look for maximum sized rectangles and generate mesh data.
    for (let z = 0; z < 16; z++) {
      for (let y = 0; y < 16; y++) {
        const i = y | (z << 4);
        let face = faces[i];
        if (!face) continue

        let h = 0;
        while (y + h < 16) {
          const j = i + h;
          if (faces[j] !== face) {
            break
          }
          h++;
        }

        let d = 0;
        while (z + d < 16) {
          let good = true;
          for (let hh = 0; hh < h; hh++) {
            const j = i + hh + (d << 4);
            if (faces[j] !== face) {
              good = false;
              break
            }
          }
          if (!good) break
          for (let hh = 0; hh < h; hh++) {
            const j = i + hh + (d << 4);
            faces[j] = 0;
          }
          d++;
        }

        face--;

        if (faceIndex === 0) {
          mesh.push(
            x + 1, y + 0, z + 0, RIGHT | BR(d, h) | face,
            x + 1, y + h, z + 0, RIGHT | TR(d) | face,
            x + 1, y + 0, z + d, RIGHT | BL(d, h) | face,
            x + 1, y + 0, z + d, RIGHT | BL(d, h) | face,
            x + 1, y + h, z + 0, RIGHT | TR(d) | face,
            x + 1, y + h, z + d, RIGHT | TL() | face
          );
        } else if (faceIndex === 1) {
          mesh.push(
            x + 0, y + 0, z + 0, LEFT | BL(d, h) | face,
            x + 0, y + 0, z + d, LEFT | BR(d, h) | face,
            x + 0, y + h, z + 0, LEFT | TL() | face,
            x + 0, y + h, z + 0, LEFT | TL() | face,
            x + 0, y + 0, z + d, LEFT | BR(d, h) | face,
            x + 0, y + h, z + d, LEFT | TR(d) | face
          );
        } else if (faceIndex === 2) {
          mesh.push(
            z + 0, x + 1, y + 0, TOP | TL() | face,
            z + 0, x + 1, y + h, TOP | BL(d, h) | face,
            z + d, x + 1, y + 0, TOP | TR(d) | face,
            z + d, x + 1, y + 0, TOP | TR(d) | face,
            z + 0, x + 1, y + h, TOP | BL(d, h) | face,
            z + d, x + 1, y + h, TOP | BR(d, h) | face
          );
        } else if (faceIndex === 3) {
          mesh.push(
            z + 0, x + 0, y + 0, BOTTOM | TR(d) | face,
            z + d, x + 0, y + 0, BOTTOM | TL() | face,
            z + 0, x + 0, y + h, BOTTOM | BR(d, h) | face,
            z + 0, x + 0, y + h, BOTTOM | BR(d, h) | face,
            z + d, x + 0, y + 0, BOTTOM | TL() | face,
            z + d, x + 0, y + h, BOTTOM | BL(d, h) | face
          );
        } else if (faceIndex === 4) {
          mesh.push(
            y + 0, z + 0, x + 1, FRONT | BL(h, d) | face,
            y + h, z + 0, x + 1, FRONT | BR(h, d) | face,
            y + 0, z + d, x + 1, FRONT | TL() | face,
            y + 0, z + d, x + 1, FRONT | TL() | face,
            y + h, z + 0, x + 1, FRONT | BR(h, d) | face,
            y + h, z + d, x + 1, FRONT | TR(h) | face
          );
        } else if (faceIndex === 5) {
          mesh.push(
            y + 0, z + 0, x + 0, BACK | BR(h, d) | face,
            y + 0, z + d, x + 0, BACK | TR(h) | face,
            y + h, z + 0, x + 0, BACK | BL(h, d) | face,
            y + h, z + 0, x + 0, BACK | BL(h, d) | face,
            y + 0, z + d, x + 0, BACK | TR(h) | face,
            y + h, z + d, x + 0, BACK | TL() | face
          );
        }
      }
    }
  }
  //   console.log('quad count', mesh.length / 24)
  return new Float32Array(mesh)
}

const vert = `#version 300 es
  precision highp float;

  uniform mat4 viewProjection;

  in vec4 data;

  out vec3 uv;
  out vec3 normal;
  out vec3 position;

  void main(void) {
    gl_Position = viewProjection * vec4(data.xyz, 1.0);

    int meta = int(data.w);
    int ni = meta >> 20;
    int ns = 1-(ni & 1)*2;
    uv = vec3((meta >> 15) & 0x1f, (meta >> 10) & 0x1f, meta & 0x3ff);
    normal = (ni&4)==4 ? vec3(0,0,ns) : (ni&2)==2 ? vec3(0,ns,0) : vec3(ns,0,0);
    position = data.xyz;
  }
`;

const frag = `#version 300 es
  precision highp float;

  uniform highp sampler2DArray blocks;
  uniform vec3 light1Pos;
  uniform vec3 light2Pos;
  uniform vec3 eyePos;

  in vec3 uv;
  in vec3 normal;
  in vec3 position;

  out vec4 outColor;

  void main(void) {
    vec4 textureColor = texture(blocks, uv);
    if (textureColor.a < 0.5) {
      discard;
    }
    float ambient = .2;

    vec3 lightDir = normalize(light1Pos - position);
    float diff = max(dot(normal, lightDir), 0.0)*.6;
    vec3 viewDir = normalize(eyePos - position);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.)*.2;
    float light1 = diff + spec;
    
    lightDir = normalize(light2Pos - position);
    diff = max(dot(normal, lightDir), 0.0)*.6;
    reflectDir = reflect(-lightDir, normal);
    spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.)*.2;
    float light2 = diff + spec;

    outColor = vec4(vec3(ambient + light1 + light2),1) * textureColor;
    // outColor = vec4(normal * 0.5 + 0.5, 1);
  }
`;

/** Block textures image */
const img = loadImage('../imgs/minecraft-block-textures.avif');
// const img2 = loadImage('../imgs/blank.avif')

/**
 * @param {WebGL2RenderingContext} gl
 */
async function makeChunk(gl) {
  const programInfo = createProgram(gl, vert, frag);
  const bufferInfo = createBuffer(gl, programInfo.attributes, { data: generateMesh(chunk) });
  const blocks = createArrayTexture(gl, 16, 16, 32, await img);
  // const border = createArrayTexture(gl, 16, 16, 32, await img2)

  setInterval(() => {
    let i;
    do { i = Math.floor(Math.random() * 4096); } while (!chunk[i])
    let x = (i >> 0) & 15;
    let y = (i >> 4) & 15;
    let z = (i >> 8) & 15;
    do {
      x = Math.min(16, Math.max(0, x + Math.floor(Math.random() * 3) - 1));
      y = Math.min(16, Math.max(0, y + Math.floor(Math.random() * 3) - 1));
      z = Math.min(16, Math.max(0, z + Math.floor(Math.random() * 3) - 1));
    } while (chunk[x | (y << 4) | (z << 8)])
    chunk[x | (y << 4) | (z << 8)] = chunk[i];
    chunk[i] = 0;

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferInfo.attribs.data.buffer);
    const newMesh = generateMesh(chunk);
    bufferInfo.numElements = newMesh.length >> 2;
    gl.bufferData(gl.ARRAY_BUFFER, newMesh, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }, 500);

  return drawChunk

  /**
   * Draw the chunk
   * @param {Float32Array} viewProjection
   */
  function drawChunk(viewProjection, { eyePos, light1Pos, light2Pos }) {
    gl.useProgram(programInfo.program);
    setUniforms(gl, programInfo.uniforms, { viewProjection, blocks, eyePos, light1Pos, light2Pos });
    setBuffersAndAttributes(gl, bufferInfo);
    gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);
    // setUniforms(gl, programInfo.uniforms, { blocks: border, position })
    // gl.drawArrays(gl.LINES, 0, bufferInfo.numElements)
  }
}

/**
 * @param {WebGL2RenderingContext} gl
 */
async function makeScene(gl) {
  const [drawSky, drawChunk] = await Promise.all([
    makeSky(gl, `../imgs/${['blue', 'orange', 'cyan'][Math.floor(Math.random() * 3)]}-sky.avif`),
    makeChunk(gl)
  ]);

  return drawScene

  /**
   * Draw the scene
   * @param {Float32Array} viewProjection
   */
  function drawScene(viewProjection, positions) {
    drawChunk(viewProjection, positions);
    drawSky(viewProjection, positions);
  }
}

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */
function create$3() {
  let out = new ARRAY_TYPE(16);
  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */
function invert(out, a) {
  let a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  let a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  let a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  let a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  let b00 = a00 * a11 - a01 * a10;
  let b01 = a00 * a12 - a02 * a10;
  let b02 = a00 * a13 - a03 * a10;
  let b03 = a01 * a12 - a02 * a11;
  let b04 = a01 * a13 - a03 * a11;
  let b05 = a02 * a13 - a03 * a12;
  let b06 = a20 * a31 - a21 * a30;
  let b07 = a20 * a32 - a22 * a30;
  let b08 = a20 * a33 - a23 * a30;
  let b09 = a21 * a32 - a22 * a31;
  let b10 = a21 * a33 - a23 * a31;
  let b11 = a22 * a33 - a23 * a32;

  // Calculate the determinant
  let det =
    b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }
  det = 1.0 / det;

  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

  return out;
}

/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */
function multiply(out, a, b) {
  let a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  let a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  let a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  let a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  // Cache only the current line of the second matrix
  let b0 = b[0],
    b1 = b[1],
    b2 = b[2],
    b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

/**
 * Creates a matrix from a quaternion rotation and vector translation
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @returns {mat4} out
 */
function fromRotationTranslation(out, q, v) {
  // Quaternion math
  let x = q[0],
    y = q[1],
    z = q[2],
    w = q[3];
  let x2 = x + x;
  let y2 = y + y;
  let z2 = z + z;

  let xx = x * x2;
  let xy = x * y2;
  let xz = x * z2;
  let yy = y * y2;
  let yz = y * z2;
  let zz = z * z2;
  let wx = w * x2;
  let wy = w * y2;
  let wz = w * z2;

  out[0] = 1 - (yy + zz);
  out[1] = xy + wz;
  out[2] = xz - wy;
  out[3] = 0;
  out[4] = xy - wz;
  out[5] = 1 - (xx + zz);
  out[6] = yz + wx;
  out[7] = 0;
  out[8] = xz + wy;
  out[9] = yz - wx;
  out[10] = 1 - (xx + yy);
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;

  return out;
}

/**
 * Generates a perspective projection matrix with the given bounds.
 * Passing null/undefined/no value for far will generate infinite projection matrix.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} fovy Vertical field of view in radians
 * @param {number} aspect Aspect ratio. typically viewport width/height
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum, can be null or Infinity
 * @returns {mat4} out
 */
function perspective(out, fovy, aspect, near, far) {
  let f = 1.0 / Math.tan(fovy / 2),
    nf;
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[15] = 0;
  if (far != null && far !== Infinity) {
    nf = 1 / (near - far);
    out[10] = (far + near) * nf;
    out[14] = 2 * far * near * nf;
  } else {
    out[10] = -1;
    out[14] = -2 * near;
  }
  return out;
}

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */
function create$2() {
  let out = new ARRAY_TYPE(9);
  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }
  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */
function create$1() {
  let out = new ARRAY_TYPE(4);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }
  return out;
}

/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */
function normalize$1(out, a) {
  let x = a[0];
  let y = a[1];
  let z = a[2];
  let w = a[3];
  let len = x * x + y * y + z * z + w * w;
  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }
  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}

/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */
((function() {
  let vec = create$1();

  return function(a, stride, offset, count, fn, arg) {
    let i, l;
    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
}))();

/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */
function create() {
  let out = new ARRAY_TYPE(4);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
  out[3] = 1;
  return out;
}

/**
 * Set a quat to the identity quaternion
 *
 * @param {quat} out the receiving quaternion
 * @returns {quat} out
 */
function identity(out) {
  out[0] = 0;
  out[1] = 0;
  out[2] = 0;
  out[3] = 1;
  return out;
}

/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/
function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  let s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}

/**
 * Rotates a quaternion by the given angle about the X axis
 *
 * @param {quat} out quat receiving operation result
 * @param {ReadonlyQuat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
function rotateX(out, a, rad) {
  rad *= 0.5;

  let ax = a[0],
    ay = a[1],
    az = a[2],
    aw = a[3];
  let bx = Math.sin(rad),
    bw = Math.cos(rad);

  out[0] = ax * bw + aw * bx;
  out[1] = ay * bw + az * bx;
  out[2] = az * bw - ay * bx;
  out[3] = aw * bw - ax * bx;
  return out;
}

/**
 * Rotates a quaternion by the given angle about the Y axis
 *
 * @param {quat} out quat receiving operation result
 * @param {ReadonlyQuat} a quat to rotate
 * @param {number} rad angle (in radians) to rotate
 * @returns {quat} out
 */
function rotateY(out, a, rad) {
  rad *= 0.5;

  let ax = a[0],
    ay = a[1],
    az = a[2],
    aw = a[3];
  let by = Math.sin(rad),
    bw = Math.cos(rad);

  out[0] = ax * bw - az * by;
  out[1] = ay * bw + aw * by;
  out[2] = az * bw + ax * by;
  out[3] = aw * bw - ay * by;
  return out;
}

/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */
function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  let ax = a[0],
    ay = a[1],
    az = a[2],
    aw = a[3];
  let bx = b[0],
    by = b[1],
    bz = b[2],
    bw = b[3];

  let omega, cosom, sinom, scale0, scale1;

  // calc cosine
  cosom = ax * bx + ay * by + az * bz + aw * bw;
  // adjust signs (if necessary)
  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  }
  // calculate coefficients
  if (1.0 - cosom > EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  }
  // calculate final values
  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;

  return out;
}

/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */
function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  let fTrace = m[0] + m[4] + m[8];
  let fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w
    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)
    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    let i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    let j = (i + 1) % 3;
    let k = (i + 2) % 3;

    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}

/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */
const normalize = normalize$1;

/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */
((function() {
  let tmpvec3 = create$4();
  let xUnitVec3 = fromValues(1, 0, 0);
  let yUnitVec3 = fromValues(0, 1, 0);

  return function(out, a, b) {
    let dot$1 = dot(a, b);
    if (dot$1 < -0.999999) {
      cross(tmpvec3, xUnitVec3, a);
      if (len(tmpvec3) < 0.000001) cross(tmpvec3, yUnitVec3, a);
      normalize$2(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot$1 > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot$1;
      return normalize(out, out);
    }
  };
}))();

/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */
((function() {
  let temp1 = create();
  let temp2 = create();

  return function(out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));

    return out;
  };
}))();

/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */
((function() {
  let matr = create$2();

  return function(out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];

    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];

    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];

    return normalize(out, fromMat3(out, matr));
  };
}))();

// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('service-worker.js').then(function () {
//     console.log('Service Worker Registered')
//   })
// }

// document.body.textContent = ''
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

/** @type {number} Width of viewport in pixels */
let width;
/** @type {number} Height of viewport in pixels */
let height;
const ctx = canvas.getContext('webgl2', {
  antialias: true,
  preserveDrawingBuffer: true
});
if (!ctx) throw new Error('Problem getting webgl2 context')
const gl = ctx;

const P = create$3();
const V = create$3();

gl.clearColor(0, 0, 0, 1);
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);

makeScene(gl).then(drawScene => {
  // Auto resize canvas to fit in the window and have proper perspective.
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);
    gl.viewport(0, 0, width, height);
  }
  window.onresize = resize;
  resize();

  const move = {
    KeyQ: 0,
    KeyE: 0,
    KeyW: 0,
    KeyA: 0,
    KeyS: 0,
    KeyD: 0,
    joyX: 0,
    joyY: 0,
    joyZ: 0,
    get z() { return move.KeyW - move.KeyS + move.joyY },
    get x() { return move.KeyA - move.KeyD - move.joyX },
    get y() { return move.KeyQ - move.KeyE - move.joyZ },
    get speed() { return move.ControlLeft ? 0.008 : 0.004 },
    get fov() { return move.ControlLeft ? 75 : 60 },
    rotateY: 0,
    rotateX: 0
  };

  window.onkeydown = evt => {
    if (typeof move[evt.code] !== 'number') return
    evt.preventDefault();
    if (evt.repeat) return
    move[evt.code] = 1;
    // console.log(move.x, move.y, move.z)
  };

  window.onkeyup = evt => {
    if (typeof move[evt.code] !== 'number') return
    evt.preventDefault();
    move[evt.code] = 0;
    // console.log(move.x, move.y, move.z)
  };

  /**
   * @param {number} mx
   * @param {number} my
   */
  function onDrag(mx, my) {
    move.rotateY -= mx * 0.4;
    while (move.rotateY < 0) move.rotateY += 360;
    while (move.rotateY >= 360) move.rotateY -= 360;
    move.rotateX = Math.max(-90, Math.min(90, move.rotateX - my * 0.5));
  }

  function onJoy(x, y) {
    move.joyX = Math.min(1, Math.max(-1, (x - 100) / 75));
    move.joyY = Math.min(1, Math.max(-1, (y - 100) / 75));
  }

  function onFly(y) {
    move.joyZ = Math.min(1, Math.max(-1, (y - 100) / 75));
  }

  window.onmousemove = evt => {
    if (document.pointerLockElement !== document.body) return
    evt.preventDefault();
    onDrag(evt.movementX, evt.movementY);
  };

  document.body.onclick = evt => {
    document.body.requestPointerLock();
    document.body.requestFullscreen();
  };

  /** @type {{[id:number]:{clientX:number,clientY:number,isRotate:boolean}}} */
  const touches = {};
  let touch = false;
  window.addEventListener('touchstart', evt => {
    if (!touch) {
      touch = true;
      document.getElementById('arrows').style.display = 'block';
      document.getElementById('fly').style.display = 'block';
    }
    evt.preventDefault();
    for (const { identifier, clientX, clientY } of evt.changedTouches) {
      const y = window.innerHeight - clientY;
      const x = clientX;
      if (y >= 25 && y <= 175) {
        if (x >= 25 && x <= 175) {
          touches[identifier] = { mode: 'joy' };
          return onJoy(x, y)
        }
        const rx = window.innerWidth - clientX;
        if (rx >= 25 && rx <= 75) {
          touches[identifier] = { mode: 'fly' };
          return onFly(y)
        }
      }
      touches[identifier] = { clientX, clientY, mode: 'drag' };
    }
  });

  window.addEventListener('touchend', evt => {
    evt.preventDefault();
    for (const { identifier } of evt.changedTouches) {
      const { mode } = touches[identifier];
      delete touches[identifier];
      if (mode === 'joy') {
        move.joyX = 0;
        move.joyY = 0;
      } else if (mode === 'fly') {
        move.joyZ = 0;
      }
    }
  });

  window.addEventListener('touchmove', evt => {
    evt.preventDefault();
    for (const { identifier, clientX, clientY } of evt.changedTouches) {
      const touch = touches[identifier];
      if (touch.mode === 'drag') {
        const mx = clientX - touch.clientX;
        const my = clientY - touch.clientY;
        touch.clientX = clientX;
        touch.clientY = clientY;
        onDrag(mx, my);
      } else if (touch.mode === 'joy') {
        onJoy(clientX, window.innerHeight - clientY);
      } else if (touch.mode === 'fly') {
        onFly(window.innerHeight - clientY);
      }
    }
  });

  let time = Date.now();

  const position = create$4();
  set(position, 10, 4.5, 8);

  const T = create$4();
  const Q = create();

  window.requestAnimationFrame(render);
  function render() {
    const now = Date.now();
    const delta = time - now;
    time = now;
    const dist = delta * move.speed;
    const ry = move.rotateY * Math.PI / 180;
    const rx = move.rotateX * Math.PI / 180;

    // Movement is enabled when pointer is locked
    const l = length(set(T, move.x, move.y, move.z));
    if (l > 1) scale(T, T, 1 / l);
    scaleAndAdd(position, position, rotateY$1(T, T, [0, 0, 0], ry), dist);

    identity(Q);
    rotateY(Q, Q, ry);
    rotateX(Q, Q, rx);

    fromRotationTranslation(V, Q, position);

    perspective(P, move.fov * Math.PI / 180, width / height, 0.1, 1000);

    multiply(V, P, invert(V, V));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawScene(V, { light1Pos: position, light2Pos: [8, 20, 8], eyePos: position });

    window.requestAnimationFrame(render);
  }
});
