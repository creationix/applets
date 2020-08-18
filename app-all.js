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

// 1 bit of precision leftover

function generateBlock (x, y, z, w, h, d, right, left, top, bottom, front, back) {
  return [
    // x, y, z, normal index | texture coordinate index | texture index
    x + w, y + 0, z + 0, RIGHT | BR(d, h) | right,
    x + w, y + h, z + 0, RIGHT | TR(d) | right,
    x + w, y + 0, z + d, RIGHT | BL(d, h) | right,
    x + w, y + 0, z + d, RIGHT | BL(d, h) | right,
    x + w, y + h, z + 0, RIGHT | TR(d) | right,
    x + w, y + h, z + d, RIGHT | TL() | right,
    x + 0, y + 0, z + 0, LEFT | BL(d, h) | left,
    x + 0, y + 0, z + d, LEFT | BR(d, h) | left,
    x + 0, y + h, z + 0, LEFT | TL() | left,
    x + 0, y + h, z + 0, LEFT | TL() | left,
    x + 0, y + 0, z + d, LEFT | BR(d, h) | left,
    x + 0, y + h, z + d, LEFT | TR(d) | left,
    x + 0, y + h, z + 0, TOP | TL() | top,
    x + 0, y + h, z + d, TOP | BL(w, d) | top,
    x + w, y + h, z + 0, TOP | TR(w) | top,
    x + w, y + h, z + 0, TOP | TR(w) | top,
    x + 0, y + h, z + d, TOP | BL(w, d) | top,
    x + w, y + h, z + d, TOP | BR(w, d) | top,
    x + 0, y + 0, z + 0, BOTTOM | TR(w) | bottom,
    x + w, y + 0, z + 0, BOTTOM | TL() | bottom,
    x + 0, y + 0, z + d, BOTTOM | BR(w, d) | bottom,
    x + 0, y + 0, z + d, BOTTOM | BR(w, d) | bottom,
    x + w, y + 0, z + 0, BOTTOM | TL() | bottom,
    x + w, y + 0, z + d, BOTTOM | BL(w, d) | bottom,
    x + 0, y + 0, z + d, FRONT | BL(w, h) | front,
    x + w, y + 0, z + d, FRONT | BR(w, h) | front,
    x + 0, y + h, z + d, FRONT | TL() | front,
    x + 0, y + h, z + d, FRONT | TL() | front,
    x + w, y + 0, z + d, FRONT | BR(w, h) | front,
    x + w, y + h, z + d, FRONT | TR(w) | front,
    x + 0, y + 0, z + 0, BACK | BR(w, h) | back,
    x + 0, y + h, z + 0, BACK | TR(w) | back,
    x + w, y + 0, z + 0, BACK | BL(w, h) | back,
    x + w, y + 0, z + 0, BACK | BL(w, h) | back,
    x + 0, y + h, z + 0, BACK | TR(w) | back,
    x + w, y + h, z + 0, BACK | TL() | back
  ]
}
// Define the geometry and store it in buffer objects
var data = new Float32Array([
  ...generateBlock(0, 0, 0, 16, 1, 16, STONE, STONE, STONE, STONE, STONE, STONE),
  ...generateBlock(0, 1, 0, 16, 1, 16, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK, DIRT_BLOCK),

  ...generateBlock(0, 2, 0, 5, 1, 16, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),
  ...generateBlock(14, 2, 0, 2, 1, 16, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),
  ...generateBlock(5, 2, 0, 9, 1, 4, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),
  ...generateBlock(5, 2, 11, 9, 1, 5, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE, GRASS_BLOCK_TOP, DIRT_BLOCK, GRASS_BLOCK_SIDE, GRASS_BLOCK_SIDE),

  ...generateBlock(5, 2, 4, 9, 1, 7, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE, COBBLESTONE),
  ...generateBlock(5, 3, 4, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),
  ...generateBlock(5, 3, 10, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),
  ...generateBlock(13, 3, 4, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),
  ...generateBlock(13, 3, 10, 1, 5, 1, OAK_LOG, OAK_LOG, OAK_END, OAK_END, OAK_LOG, OAK_LOG),

  ...generateBlock(5, 3, 5, 1, 2, 5, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
  ...generateBlock(5, 6, 5, 1, 2, 5, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
  ...generateBlock(5, 8, 6, 1, 1, 3, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
  ...generateBlock(5, 9, 7, 1, 1, 1, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG, STRIPPED_OAK_END, STRIPPED_OAK_END, STRIPPED_OAK_LOG, STRIPPED_OAK_LOG),
  ...generateBlock(5, 5, 5, 1, 1, 5, GLASS, GLASS, GLASS, GLASS, GLASS, GLASS),

  ...generateBlock(6, 3, 4, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(12, 3, 4, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 3, 4, 5, 1, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 6, 4, 5, 2, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 4, 4, 5, 2, 1, GLASS, GLASS, GLASS, GLASS, GLASS, GLASS),

  ...generateBlock(6, 3, 10, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(12, 3, 10, 1, 5, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 3, 10, 5, 1, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 6, 10, 5, 2, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),
  ...generateBlock(7, 4, 10, 5, 2, 1, GLASS, GLASS, GLASS, GLASS, GLASS, GLASS),
  ...generateBlock(7, 6, 10, 5, 2, 1, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS, OAK_PLANKS),

  ...generateBlock(1, 3, 2, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
  ...generateBlock(2, 3, 4, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
  ...generateBlock(3, 3, 3, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
  ...generateBlock(2, 3, 2, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),
  ...generateBlock(4, 3, 1, 1, 1, 1, PUMPKIN_SIDE, PUMPKIN_SIDE, PUMPKIN_TOP, PUMPKIN_TOP, PUMPKIN_SIDE, PUMPKIN_SIDE),

  ...generateBlock(6, 3, 5, 2, 2, 3, HAY_SIDE, HAY_SIDE, HAY_TOP, HAY_TOP, HAY_SIDE, HAY_SIDE),
  ...generateBlock(8, 3, 5, 1, 1, 1, BARREL_SIDE, BARREL_SIDE, BARREL_TOP, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE),
  ...generateBlock(6, 3, 8, 1, 1, 1, BARREL_SIDE, BARREL_SIDE, BARREL_OPEN, BARREL_BOTTOM, BARREL_SIDE, BARREL_SIDE),

  ...generateBlock(6, 3, 9, 2, 3, 1, BOOKSHELF, BOOKSHELF, OAK_PLANKS, OAK_PLANKS, BOOKSHELF, BOOKSHELF),
  ...generateBlock(9, 3, 9, 1, 1, 1, FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT),
  ...generateBlock(10, 3, 9, 1, 1, 1, FURNACE_SIDE, FURNACE_SIDE, FURNACE_BOTTOM, FURNACE_BOTTOM, FURNACE_SIDE, FURNACE_FRONT_ON),
  ...generateBlock(11, 3, 9, 1, 1, 1, MUSIC_BOX_SIDE, MUSIC_BOX_SIDE, MUSIC_BOX_TOP, MUSIC_BOX_TOP, MUSIC_BOX_SIDE, MUSIC_BOX_SIDE),

  ...generateBlock(11, 3, 5, 1, 1, 1, LOOM_SIDE, LOOM_SIDE, LOOM_TOP, OAK_PLANKS, LOOM_FRONT, LOOM_SIDE),
  ...generateBlock(12, 3, 5, 1, 1, 1, CRAFTING_TABLE_SIDE, CRAFTING_TABLE_SIDE, CRAFTING_TABLE_TOP, OAK_PLANKS, CRAFTING_TABLE_FRONT, CRAFTING_TABLE_SIDE)

]);

/**
 * @param {WebGL2RenderingContext} gl
 */
async function renderer (gl) {
  // Load shaders and texture
  const [img, program] = await Promise.all([
    loadImage('minecraft-block-textures.webp'),
    loadProgram(gl, 'shader-vert.glsl', 'shader-frag.glsl')
  ]);
  gl.useProgram(program);

  // Load uniform locations.
  const projectionVar = gl.getUniformLocation(program, 'projection');
  const texVar = gl.getUniformLocation(program, 'tex');
  const viewVar = gl.getUniformLocation(program, 'view');

  const lightPosVar = gl.getUniformLocation(program, 'lightPos');
  const lightColorVar = gl.getUniformLocation(program, 'lightColor');
  const ambientColorVar = gl.getUniformLocation(program, 'ambientColor');

  gl.activeTexture(gl.TEXTURE0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, tex);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 16, 16, 32);
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, 16, 16, 32, gl.RGBA, gl.UNSIGNED_BYTE, img);
  // gl.generateMipmap(gl.TEXTURE_2D_ARRAY)
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.uniform1i(texVar, 0); // Note 0, not gl.TEXTURE0

  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) throw new Error('Problem creating buffer')
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Associate the shader programs to buffer objects
  const coordinates = gl.getAttribLocation(program, 'coordinates');
  gl.enableVertexAttribArray(coordinates);
  gl.vertexAttribPointer(coordinates, 4, gl.FLOAT, false, 0, 0);

  gl.clearColor(0, 0, 0, 0.5);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);

  return {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     */
    updateViewport (x, y, w, h) {
      gl.viewport(x, y, w, h);
    },
    /**
     * @param {Float32Array} P projection transform mat4
     */
    updateProjection (P) {
      gl.uniformMatrix4fv(projectionVar, false, P);
    },
    /**
     * @param {Float32Array} V view transform mat4
     */
    updateView (V) {
      gl.uniformMatrix4fv(viewVar, false, V);
    },
    clear () {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    },
    /**
     * @param {number} time time of day in hours 0=midnight 12=noon
     */
    draw (time) {
      const a = time / 12 * Math.PI;
      // Sun position and moon position.
      gl.uniform3f(lightPosVar, Math.sin(a) * 100, -Math.abs(Math.cos(a) * 100), 0);
      gl.uniform3f(lightColorVar, 1, 0.9, 0.8);
      gl.uniform3f(ambientColorVar, 0.2, 0.2, 0.2);

      //   gl.drawArrays(gl.LINES, 0, data.length >> 2)
      gl.drawArrays(gl.TRIANGLES, 0, data.length >> 2);
    }
  }
}

/**
 * Load two shaders from files and compile into a program.
 * @param {WebGL2RenderingContext} gl rendering context
 * @param {string} vertFile path to vertex shader file
 * @param {string} fragFile path to fragment shader file
 * @returns {Promise<WebGLProgram>}
 */
async function loadProgram (gl, vertFile, fragFile) {
  const program = gl.createProgram();
  const [vert, frag] = await Promise.all([
    loadShader(gl, vertFile, gl.VERTEX_SHADER),
    loadShader(gl, fragFile, gl.FRAGMENT_SHADER)
  ]);
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  return program
}

/**
 * Load a shader from a file using fetch.
 * @param {string} path
 * @param {number} type
 * @returns {Promise<WebGLShader>}
 */
async function loadShader (gl, path, type) {
  const res = await window.fetch(path);
  const source = await res.text();
  const shader = gl.createShader(type);
  if (!shader) throw new Error(`GLERROR ${gl.getError()}: Problem creating shader`)
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader))
  }
  return shader
}

/**
 * @param {string} path path to image file
 * @returns {Promise<HTMLImageElement>}
 */
async function loadImage (path) {
  const img = document.createElement('img');
  img.setAttribute('src', path);
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
  return img
}

/**
 * Common utilities
 * @module glMatrix
 */
let ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;

if (!Math.hypot) Math.hypot = function() {
  var y = 0, i = arguments.length;
  while (i--) y += arguments[i] * arguments[i];
  return Math.sqrt(y);
};

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
 * Generates a matrix that makes something look at something else.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */
function targetTo(out, eye, target, up) {
  let eyex = eye[0],
    eyey = eye[1],
    eyez = eye[2],
    upx = up[0],
    upy = up[1],
    upz = up[2];

  let z0 = eyex - target[0],
    z1 = eyey - target[1],
    z2 = eyez - target[2];

  let len = z0 * z0 + z1 * z1 + z2 * z2;
  if (len > 0) {
    len = 1 / Math.sqrt(len);
    z0 *= len;
    z1 *= len;
    z2 *= len;
  }

  let x0 = upy * z2 - upz * z1,
    x1 = upz * z0 - upx * z2,
    x2 = upx * z1 - upy * z0;

  len = x0 * x0 + x1 * x1 + x2 * x2;
  if (len > 0) {
    len = 1 / Math.sqrt(len);
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  out[0] = x0;
  out[1] = x1;
  out[2] = x2;
  out[3] = 0;
  out[4] = z1 * x2 - z2 * x1;
  out[5] = z2 * x0 - z0 * x2;
  out[6] = z0 * x1 - z1 * x0;
  out[7] = 0;
  out[8] = z0;
  out[9] = z1;
  out[10] = z2;
  out[11] = 0;
  out[12] = eyex;
  out[13] = eyey;
  out[14] = eyez;
  out[15] = 1;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */
function create() {
  let out = new ARRAY_TYPE(3);
  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
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
function normalize(out, a) {
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
const forEach = (function () {
  let vec = create();

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
})();

document.body.textContent = '';
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

/** @type {number} Width of viewport in pixels */
let width;
/** @type {number} Height of viewport in pixels */
let height;
const ctx = canvas.getContext('webgl2', {
  antialias: true,
  preserveDrawingBuffer: false
});
if (!ctx) throw new Error('Problem getting webgl2 context')

const M = new Float32Array(16);

renderer(ctx).then(scene => {
  // Auto resize canvas to fit in the window and have proper perspective.
  function resize () {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.setAttribute('width', width);
    canvas.setAttribute('height', height);
    scene.updateViewport(0, 0, width, height);
    scene.updateProjection(perspective(M, 1, width / height, 0.1, 100));
  }
  window.onresize = resize;
  resize();

  const center = [8, 5, 8];
  const up = [0, 1, 0];

  /** @type {number|null} */
  let anglex = null;
  /** @type {number|null} */
  let angley = null;
  window.onmousemove = (/** @type {MouseEvent} */ evt) => {
    anglex = evt.clientX * 0.02;
    angley = evt.clientY * 0.02;
  };

  window.requestAnimationFrame(render);
  function render () {
    const nowx = anglex || Date.now() * 0.001;
    const nowy = angley || Date.now() * 0.0003;
    const camera = [Math.sin(nowx) * 16, Math.sin(nowy) * 16, Math.cos(nowx) * 16];
    targetTo(M, scaleAndAdd(camera, center, normalize(camera, camera), 15), center, up);
    invert(M, M);
    scene.updateView(M);
    scene.clear();
    scene.draw(Date.now() * 0.001);

    window.requestAnimationFrame(render);
  }
});
//# sourceMappingURL=app-all.js.map
