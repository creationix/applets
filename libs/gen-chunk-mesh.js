import { transLevel, blockNames, blocks } from './blocks.js'

// 5 bits for texture x coordinate (needs 0-16 range)
// 5 bits for texture y coordinate (needs 0-16 range)
const TL = (w, h) => 0
const BL = (w, h) => h << 10
const TR = (w, h) => w << 15
const BR = (w, h) => w << 15 | h << 10

// 3 bits for normal index
const RIGHT = 0 << 20 // 1,0,0
const LEFT = 1 << 20 // -1,0,0
const TOP = 2 << 20 // 0,1,0
const BOTTOM = 3 << 20 // 0,-1,0
const FRONT = 4 << 20 // 0,0,1
const BACK = 5 << 20 // 0,0,-1

/**
 * @param {Uint16Array} chunk
 * @returns {Float32Array}
 */
export default function generateMesh (chunk) {
  const mesh = []
  const faces = new Uint8Array(256)

  // Right Side
  for (let x = 0; x < 16; x++) { drawSide(x, 0, 4, 8, 1, 0) }
  // Left Side
  for (let x = 0; x < 16; x++) { drawSide(x, 0, 4, 8, -1, 1) }
  // Top Side
  for (let y = 0; y < 16; y++) { drawSide(y, 4, 8, 0, 1, 2) }
  // Bottom Side
  for (let y = 0; y < 16; y++) { drawSide(y, 4, 8, 0, -1, 3) }
  // Front Side
  for (let z = 0; z < 16; z++) { drawSide(z, 8, 0, 4, 1, 4) }
  // Back Side
  for (let z = 0; z < 16; z++) { drawSide(z, 8, 0, 4, -1, 5) }

  function drawSide (x, xShift, yShift, zShift, faceSign, faceIndex) {
    // First pass, calculate which faces in the 16x16 plan grid we want to draw.
    for (let z = 0; z < 16; z++) {
      for (let y = 0; y < 16; y++) {
        const i = y | (z << 4)
        const self = chunk[(x << xShift) | (y << yShift) | (z << zShift)]

        // If the block isn't set, nothing to draw
        if (!self) {
          faces[i] = 0
          continue
        }

        // If the face is covered by a same or more opaque block, don't draw
        const nx = x + faceSign
        const next = (nx < 0 || nx >= 16) ? 0
          : chunk[(nx << xShift) | (y << yShift) | (z << zShift)]
        const blockName = blockNames[(self >> 5) - 1]
        if (next) {
          const selfTrans = transLevel[blockName] || 0
          const nextName = blockNames[(next >> 5) - 1]
          const nextTrans = transLevel[nextName] || 0
          if (selfTrans >= nextTrans) {
            faces[i] = 0
            continue
          }
        }

        // Mark the face for drawing.
        faces[i] = blocks[blockName][faceIndex] + 1
      }
    }

    // Second pass, look for maximum sized rectangles and generate mesh data.
    for (let z = 0; z < 16; z++) {
      for (let y = 0; y < 16; y++) {
        const i = y | (z << 4)
        let face = faces[i]
        if (!face) continue

        let h = 0
        while (y + h < 16) {
          const j = i + h
          if (faces[j] !== face) {
            break
          }
          h++
        }

        let d = 0
        while (z + d < 16) {
          let good = true
          for (let hh = 0; hh < h; hh++) {
            const j = i + hh + (d << 4)
            if (faces[j] !== face) {
              good = false
              break
            }
          }
          if (!good) break
          for (let hh = 0; hh < h; hh++) {
            const j = i + hh + (d << 4)
            faces[j] = 0
          }
          d++
        }

        face--

        if (faceIndex === 0) {
          mesh.push(
            x + 1, y + 0, z + 0, RIGHT | BR(d, h) | face,
            x + 1, y + h, z + 0, RIGHT | TR(d, h) | face,
            x + 1, y + 0, z + d, RIGHT | BL(d, h) | face,
            x + 1, y + 0, z + d, RIGHT | BL(d, h) | face,
            x + 1, y + h, z + 0, RIGHT | TR(d, h) | face,
            x + 1, y + h, z + d, RIGHT | TL(d, h) | face
          )
        } else if (faceIndex === 1) {
          mesh.push(
            x + 0, y + 0, z + 0, LEFT | BL(d, h) | face,
            x + 0, y + 0, z + d, LEFT | BR(d, h) | face,
            x + 0, y + h, z + 0, LEFT | TL(d, h) | face,
            x + 0, y + h, z + 0, LEFT | TL(d, h) | face,
            x + 0, y + 0, z + d, LEFT | BR(d, h) | face,
            x + 0, y + h, z + d, LEFT | TR(d, h) | face
          )
        } else if (faceIndex === 2) {
          mesh.push(
            z + 0, x + 1, y + 0, TOP | TL(d, h) | face,
            z + 0, x + 1, y + h, TOP | BL(d, h) | face,
            z + d, x + 1, y + 0, TOP | TR(d, h) | face,
            z + d, x + 1, y + 0, TOP | TR(d, h) | face,
            z + 0, x + 1, y + h, TOP | BL(d, h) | face,
            z + d, x + 1, y + h, TOP | BR(d, h) | face
          )
        } else if (faceIndex === 3) {
          mesh.push(
            z + 0, x + 0, y + 0, BOTTOM | TR(d, h) | face,
            z + d, x + 0, y + 0, BOTTOM | TL(d, h) | face,
            z + 0, x + 0, y + h, BOTTOM | BR(d, h) | face,
            z + 0, x + 0, y + h, BOTTOM | BR(d, h) | face,
            z + d, x + 0, y + 0, BOTTOM | TL(d, h) | face,
            z + d, x + 0, y + h, BOTTOM | BL(d, h) | face
          )
        } else if (faceIndex === 4) {
          mesh.push(
            y + 0, z + 0, x + 1, FRONT | BL(h, d) | face,
            y + h, z + 0, x + 1, FRONT | BR(h, d) | face,
            y + 0, z + d, x + 1, FRONT | TL(h, d) | face,
            y + 0, z + d, x + 1, FRONT | TL(h, d) | face,
            y + h, z + 0, x + 1, FRONT | BR(h, d) | face,
            y + h, z + d, x + 1, FRONT | TR(h, d) | face
          )
        } else if (faceIndex === 5) {
          mesh.push(
            y + 0, z + 0, x + 0, BACK | BR(h, d) | face,
            y + 0, z + d, x + 0, BACK | TR(h, d) | face,
            y + h, z + 0, x + 0, BACK | BL(h, d) | face,
            y + h, z + 0, x + 0, BACK | BL(h, d) | face,
            y + 0, z + d, x + 0, BACK | TR(h, d) | face,
            y + h, z + d, x + 0, BACK | TL(h, d) | face
          )
        }
      }
    }
  }
  //   console.log('quad count', mesh.length / 24)
  return new Float32Array(mesh)
}
