#version 300 es
precision mediump float;

in vec4 coordinates;

uniform mat4 view;
uniform mat4 projection;

out float textureIndex;
out vec3 textureCoord;
out vec3 normal;
out vec3 position;

void main(void) {
    position = coordinates.xyz;
    gl_Position = projection * view * vec4(coordinates.xyz, 1.0);
    int meta = int(coordinates.w);
    textureCoord = vec3((meta >> 15) & 0x1f, (meta >> 10) & 0x1f, meta & 0x3ff);
    int ni = meta >> 20;
    int ns = (ni & 1)*2-1;
    normal = (ni&4)==4 ? vec3(ns,0,0) : (ni&2)==2 ? vec3(0,ns,0) : vec3(0,0,ns);
}