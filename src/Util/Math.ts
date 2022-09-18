export function isPowerOf2(value:number):boolean {
    return (value & (value - 1)) == 0;
}

export function mod(a: number, b: number): number {
    return a - (Math.floor(a / b) * b);
}

export function rgbToArray(xyz:IRGB):Float32Array {
    return new Float32Array([xyz.r, xyz.g, xyz.b]);
}

export function rgbaToArray(xyz:IRGBA):Float32Array {
    return new Float32Array([xyz.r, xyz.g, xyz.b, xyz.a]);
}

export function xyzToArray(xyz:{x:number,y:number,z:number}):Float32Array {
    return new Float32Array([xyz.x, xyz.y, xyz.z]);
}

export function xyzwToArray(xyz:{x:number,y:number,z:number,w:number}):Float32Array {
    return new Float32Array([xyz.x, xyz.y, xyz.z, xyz.w]);
}

export function arrayToXyz(arr:Float32Array|number[]):{x:number,y:number,z:number} {
    return {x: arr[0], y: arr[1], z: arr[2]}
}

export function arrayToXyzw(arr:Float32Array|number[]):{x:number,y:number,z:number,w:number} {
    return {x: arr[0], y: arr[1], z: arr[2], w:arr[3]}
}

export function arrayToRgb(arr:Float32Array|number[]):IRGB {
    return {r: arr[0], g: arr[1], b: arr[2]}
}

export function arrayToRgba(arr:Float32Array|number[]):IRGBA {
    return {r: arr[0], g: arr[1], b: arr[2], a:arr[3]}
}

export interface IRGB {
    r: number,
    g: number,
    b: number
}

export interface IRGBA {
    r: number,
    g: number,
    b: number,
    a: number
}

export interface IXY {
    x: number,
    y: number
}

export interface IXYZ {
    x: number,
    y: number,
    z: number
}

export interface IXYZW {
    x: number,
    y: number,
    z: number,
    w: number
}

/**
 * Returns an euler angle representation of a quaternion
 * @param  {vec3} out Euler angles, pitch-yaw-roll
 * @param  {quat} mat Quaternion
 * @return {vec3} out
 */
export function getEuler(out:number[], quat:number[]) {
    let x = quat[0],
        y = quat[1],
        z = quat[2],
        w = quat[3],
        x2 = x * x,
        y2 = y * y,
        z2 = z * z,
        w2 = w * w;
    let unit = x2 + y2 + z2 + w2;
    let test = x * w - y * z;
    if (test > 0.499995 * unit) { //TODO: Use glmatrix.EPSILON
        // singularity at the north pole
        out[0] = Math.PI / 2;
        out[1] = 2 * Math.atan2(y, x);
        out[2] = 0;
    } else if (test < -0.499995 * unit) { //TODO: Use glmatrix.EPSILON
        // singularity at the south pole
        out[0] = -Math.PI / 2;
        out[1] = 2 * Math.atan2(y, x);
        out[2] = 0;
    } else {
        out[0] = Math.asin(2 * (x * z - w * y));
        out[1] = Math.atan2(2 * (x * w + y * z), 1 - 2 * (z2 + w2));
        out[2] = Math.atan2(2 * (x * y + z * w), 1 - 2 * (y2 + z2));
    }
    // TODO: Return them as degrees and not as radians
    return out;
}
