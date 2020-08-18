#version 300 es
precision mediump float;

uniform mediump sampler2DArray tex;
uniform vec3 lightPos;
uniform vec3 lightColor;
uniform vec3 ambientColor;

in vec3 textureCoord;
in vec3 normal;
in vec3 position;

out vec4 outColor;

void main(void) {
    vec4 textureColor = texture(tex, textureCoord);
    if (textureColor.a < 0.5) discard;

    vec3 lightDir = normalize(lightPos - position);  
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = diff * lightColor;
    outColor = vec4((ambientColor + diffuse) * textureColor.xyz, textureColor.a);
    // outColor =textureColor * vec4((normal + vec3(1,1,1)) *.5,1));
}